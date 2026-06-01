import {
  IdempotencyConflictError,
  IdempotencyInFlightError,
} from '../../domain/payment/payment.errors'
import type { IdempotencyStore } from '../../domain/ports/idempotency-store.port'
import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionPlanRegistry } from '../../domain/ports/subscription-plan-registry.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import { SubscriptionDataIncompleteError } from '../../domain/subscription/subscription.errors'
import { Customer } from '../../domain/value-objects/customer'
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key'
import { Money } from '../../domain/value-objects/money'
import type { Logger } from '../../infrastructure/logging/logger'
import { type SubscriptionView, toSubscriptionView } from '../mappers/subscription-view'
import { buildCyclePayment } from '../subscription/cycle-payment'
import type { CreateSubscriptionCommand } from './create-subscription.command'

export interface CreateSubscriptionConfig {
  idempotencyTtlSeconds: number
  idempotencyInFlightTtlSeconds: number
}

/**
 * Caso de uso: cria uma assinatura de cartão de forma idempotente. A Efí gerencia
 * a recorrência (cobra o cartão guardado a cada ciclo). Fluxo: reusa/cria o plano →
 * cria a assinatura na Efí (síncrono — o `payment_token` é de vida curta) →
 * persiste o agregado; se a resposta expõe a 1ª cobrança, cria o pagamento-ciclo.
 * Os ciclos seguintes são criados pelo handler de notificação.
 */
export class CreateSubscriptionService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly planRegistry: SubscriptionPlanRegistry,
    private readonly gateway: PaymentGateway,
    private readonly idempotency: IdempotencyStore,
    private readonly config: CreateSubscriptionConfig,
    private readonly logger: Logger,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<SubscriptionView> {
    const reservation = await this.idempotency.reserve({
      consumerId: command.consumerId,
      key: command.idempotencyKey,
      requestHash: command.requestHash,
      inFlightTtlSeconds: this.config.idempotencyInFlightTtlSeconds,
    })

    if (reservation.kind === 'existing') {
      const existing = reservation.record
      if (existing.requestHash !== command.requestHash) throw new IdempotencyConflictError()
      if (existing.state === 'IN_FLIGHT') throw new IdempotencyInFlightError()
      this.logger.info('subscription.idempotent_replay', {
        consumerId: command.consumerId,
        idempotencyKey: command.idempotencyKey,
      })
      return existing.responseBody as SubscriptionView
    }

    const { reservationId } = reservation
    // Efeito colateral irreversível: criar plano/assinatura na Efí é NÃO idempotente.
    // Em falha após o efeito NÃO liberamos a reserva (um retry criaria 2ª assinatura
    // → cobraria de novo a cada ciclo); deixa IN_FLIGHT até o TTL curto reciclar.
    const sideEffects = { committed: false }
    try {
      const view = await this.process(command, sideEffects)
      await this.idempotency.complete({
        consumerId: command.consumerId,
        key: command.idempotencyKey,
        reservationId,
        responseStatus: 201,
        responseBody: view,
        ttlSeconds: this.config.idempotencyTtlSeconds,
      })
      return view
    } catch (error) {
      if (sideEffects.committed) {
        this.logger.error('subscription.failed_after_side_effect', {
          consumerId: command.consumerId,
          idempotencyKey: command.idempotencyKey,
          error: error instanceof Error ? error.message : String(error),
        })
      } else {
        await this.idempotency.release(command.consumerId, command.idempotencyKey, reservationId)
      }
      throw error
    }
  }

  private async process(
    command: CreateSubscriptionCommand,
    sideEffects: { committed: boolean },
  ): Promise<SubscriptionView> {
    const amount = Money.fromCents(command.amountInCents)
    const idempotencyKey = IdempotencyKey.create(command.idempotencyKey)

    // Assinatura de cartão exige pagador completo + nascimento + endereço de cobrança.
    if (!command.customer) throw new SubscriptionDataIncompleteError('customer')
    const customer = Customer.create(command.customer)
    if (!customer.phone) throw new SubscriptionDataIncompleteError('customer.phone')
    if (!customer.address) throw new SubscriptionDataIncompleteError('customer.address')
    const birth = command.customer.birth
    if (!birth) throw new SubscriptionDataIncompleteError('customer.birth')
    if (!command.card) throw new ValidationError('Dados do cartão são obrigatórios')

    const provider = this.gateway.provider
    const repeats = command.repeats ?? null

    // Plano: reusa o mapeado p/ (intervalo, repetições) ou cria um novo na Efí.
    let planId = await this.planRegistry.find(provider, command.intervalMonths, repeats)
    if (!planId) {
      sideEffects.committed = true // criar um plano na Efí é efeito colateral (não idempotente)
      const created = await this.gateway.createPlan({
        name: planName(command.intervalMonths, repeats),
        intervalMonths: command.intervalMonths,
        repeats,
      })
      planId = await this.planRegistry.register({
        provider,
        intervalMonths: command.intervalMonths,
        repeats,
        providerPlanId: created.planId,
        name: planName(command.intervalMonths, repeats),
      })
    }

    const subscription = SubscriptionAggregate.create({
      consumerId: command.consumerId,
      amount,
      card: { brand: command.card.brand, last4: command.card.last4 },
      providerPlanId: planId,
      intervalMonths: command.intervalMonths,
      repeats,
      idempotencyKey,
      customer,
      description: command.description,
      metadata: command.metadata,
    })

    sideEffects.committed = true
    const created = await this.gateway.createCardSubscription({
      subscriptionId: subscription.id,
      planId,
      amount,
      itemName: command.description,
      paymentToken: command.card.token,
      customer: {
        name: customer.name,
        cpf: customer.document.value,
        email: customer.email,
        phone: customer.phone,
        birth,
      },
      billingAddress: customer.address,
      description: command.description,
    })

    subscription.registerProviderSubscription(created.providerSubscriptionId)
    if (created.status === 'ACTIVE') subscription.activate()

    // 1ª cobrança (quando a resposta de criação a expõe): cria o pagamento-ciclo
    // síncrono (como o cartão avulso) e sincroniza a assinatura. Os ciclos seguintes
    // vêm pelo handler de notificação. `recordCharge` é idempotente por chargeId.
    let cyclePayment: ReturnType<typeof buildCyclePayment> | undefined
    if (created.firstChargeId) {
      const firstStatus = created.firstChargeStatus ?? 'PENDING'
      cyclePayment = buildCyclePayment({
        subscription,
        chargeId: created.firstChargeId,
        status: firstStatus,
      })
      if (firstStatus === 'PAID') {
        subscription.activate()
        subscription.recordCharge(created.firstChargeId)
      }
    }

    await this.subscriptions.save(subscription)
    if (cyclePayment) await this.payments.save(cyclePayment)

    this.logger.info('subscription.created', {
      subscriptionId: subscription.id,
      consumerId: subscription.consumerId,
      providerSubscriptionId: subscription.providerSubscriptionId,
      status: subscription.status,
    })

    return toSubscriptionView(subscription)
  }
}

/** Nome do plano na Efí, derivado de (intervalo, repetições). Não inclui valor. */
function planName(intervalMonths: number, repeats: number | null): string {
  const cadence = intervalMonths === 1 ? 'mensal' : `a cada ${intervalMonths} meses`
  const span = repeats === null ? 'ilimitada' : `${repeats}x`
  return `Assinatura ${cadence} (${span})`
}
