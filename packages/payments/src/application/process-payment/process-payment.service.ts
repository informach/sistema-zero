import { type BoletoRequest, PaymentAggregate } from '../../domain/payment/payment.aggregate'
import {
  BoletoDataIncompleteError,
  CardDataIncompleteError,
  IdempotencyConflictError,
  IdempotencyInFlightError,
  UnsupportedPaymentMethodError,
} from '../../domain/payment/payment.errors'
import type { IdempotencyStore } from '../../domain/ports/idempotency-store.port'
import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { Customer } from '../../domain/value-objects/customer'
import { IdempotencyKey } from '../../domain/value-objects/idempotency-key'
import { Money } from '../../domain/value-objects/money'
import { PaymentMethod } from '../../domain/value-objects/payment-method'
import type { Logger } from '../../infrastructure/logging/logger'
import { type PaymentView, toPaymentView } from '../mappers/payment-view'
import { buildBoletoChargeInput } from './boleto-charge-input'
import type { ProcessPaymentCommand } from './process-payment.command'

export interface ProcessPaymentConfig {
  /** Chave Pix da conta recebedora (para criar a cobrança). */
  pixKey: string
  /** TTL longo (segundos) da resposta idempotente já concluída. */
  idempotencyTtlSeconds: number
  /**
   * TTL curto (segundos) da reserva `IN_FLIGHT`. Passado esse tempo sem
   * concluir, a reserva é reciclável (cobre crash entre reserve e complete).
   */
  idempotencyInFlightTtlSeconds: number
  /**
   * Quando true, NÃO cria a cobrança na Efí dentro da request: aceita e
   * persiste (PENDING) e o `ChargeCreationWorker` cria depois (modo pico).
   */
  asyncChargeCreation: boolean
  /** Dias até o vencimento do boleto quando a requisição não informar. */
  boletoDefaultExpiresDays: number
}

/**
 * Caso de uso central: processa uma solicitação de pagamento de forma
 * idempotente. Orquestra domínio + provedor + persistência transacional.
 *
 * Pix e boleto são processados ponta-a-ponta (síncrono ou assíncrono); cartão é
 * processado SEMPRE de forma síncrona (o `payment_token` é de vida curta).
 */
export class ProcessPaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly idempotency: IdempotencyStore,
    private readonly config: ProcessPaymentConfig,
    private readonly logger: Logger,
  ) {}

  async execute(command: ProcessPaymentCommand): Promise<PaymentView> {
    // 1) Idempotência: reserva atômica da chave, escopada por consumidor.
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
      // Concluída antes: devolve a resposta original (sem reprocessar).
      this.logger.info('payment.idempotent_replay', {
        consumerId: command.consumerId,
        idempotencyKey: command.idempotencyKey,
      })
      return existing.responseBody as PaymentView
    }

    const { reservationId } = reservation
    // Rastreia se já houve efeito colateral irreversível (cobrança no provedor ou
    // persistência do agregado). Em caso afirmativo NÃO liberamos a reserva no erro.
    const sideEffects = { committed: false }
    try {
      const view = await this.process(command, sideEffects)
      await this.idempotency.complete({
        consumerId: command.consumerId,
        key: command.idempotencyKey,
        reservationId,
        // 201 quando a cobrança já saiu (tem QR/boleto/cartão); 202 quando só aceita (modo async).
        responseStatus: view.pix || view.boleto || view.card ? 201 : 202,
        responseBody: view,
        ttlSeconds: this.config.idempotencyTtlSeconds,
      })
      return view
    } catch (error) {
      if (sideEffects.committed) {
        // A cobrança/persistência já pode ter surtido efeito. Liberar a reserva
        // permitiria que um retry com a MESMA chave gerasse um NOVO paymentId →
        // NOVO txid/boleto → cobrança DUPLICADA (nem o txid determinístico do Pix
        // protege, pois o id muda a cada tentativa). Mantemos a reserva IN_FLIGHT:
        // retries veem 409 até o TTL curto reciclá-la (recuperação de crash).
        // TODO: concluir a idempotência na MESMA transação do save() fecha de vez
        // a janela pós-TTL (mudança maior — ver revisão).
        this.logger.error('payment.failed_after_side_effect', {
          consumerId: command.consumerId,
          idempotencyKey: command.idempotencyKey,
          error: error instanceof Error ? error.message : String(error),
        })
      } else {
        // Falha ANTES de qualquer efeito colateral (validação, método não suportado,
        // conflito): seguro liberar para permitir nova tentativa.
        await this.idempotency.release(command.consumerId, command.idempotencyKey, reservationId)
      }
      throw error
    }
  }

  private async process(
    command: ProcessPaymentCommand,
    sideEffects: { committed: boolean },
  ): Promise<PaymentView> {
    const amount = Money.fromCents(command.amountInCents)
    const idempotencyKey = IdempotencyKey.create(command.idempotencyKey)
    const method = this.buildMethod(command)
    const customer = command.customer ? Customer.create(command.customer) : undefined

    switch (method.type) {
      case 'PIX':
        return this.processPix(command, amount, method, idempotencyKey, customer, sideEffects)
      case 'BOLETO':
        return this.processBoleto(command, amount, method, idempotencyKey, customer, sideEffects)
      case 'CREDIT_CARD':
        return this.processCreditCard(
          command,
          amount,
          method,
          idempotencyKey,
          customer,
          sideEffects,
        )
      default:
        throw new UnsupportedPaymentMethodError(method.type)
    }
  }

  private async processPix(
    command: ProcessPaymentCommand,
    amount: Money,
    method: PaymentMethod,
    idempotencyKey: IdempotencyKey,
    customer: Customer | undefined,
    sideEffects: { committed: boolean },
  ): Promise<PaymentView> {
    const payment = PaymentAggregate.create({
      consumerId: command.consumerId,
      amount,
      method,
      idempotencyKey,
      customer,
      description: command.description,
      metadata: command.metadata,
    })

    // Modo pico (opt-in): aceita e persiste sem chamar a Efí na request. O
    // ChargeCreationWorker cria a cobrança depois; o cliente consulta GET /payments/:id.
    if (this.config.asyncChargeCreation) {
      return this.acceptAsync(payment, sideEffects)
    }

    // A partir daqui há efeito colateral no provedor. Marca ANTES da chamada: ela
    // PODE criar a cobrança mesmo lançando (resposta perdida), e um retry geraria
    // um novo paymentId → novo txid → cobrança duplicada.
    sideEffects.committed = true
    const charge = await this.gateway.createPixCharge({
      paymentId: payment.id,
      amount,
      pixKey: this.config.pixKey,
      description: command.description,
      payerMessage: command.payerMessage,
      expiresInSeconds: command.expiresInSeconds,
      idempotencyKey: command.idempotencyKey,
    })

    payment.registerProviderCharge({
      providerPaymentId: charge.providerPaymentId,
      txid: charge.txid,
      pixQrCode: {
        copiaECola: charge.copiaECola,
        imagemQrcodeBase64: charge.imagemQrcodeBase64,
        locationId: charge.locationId,
      },
      expiresAt: charge.expiresAt,
    })

    // Persiste agregado + evento de domínio (outbox) na mesma transação.
    await this.payments.save(payment)

    this.logger.info('payment.created', {
      paymentId: payment.id,
      consumerId: payment.consumerId,
      method: payment.method.type,
      txid: payment.txid,
    })

    return toPaymentView(payment)
  }

  private async processBoleto(
    command: ProcessPaymentCommand,
    amount: Money,
    method: PaymentMethod,
    idempotencyKey: IdempotencyKey,
    customer: Customer | undefined,
    sideEffects: { committed: boolean },
  ): Promise<PaymentView> {
    // Boleto exige pagador completo (a Efí rejeita sem documento/endereço).
    // Validamos AGORA — antes de aceitar (202) ou criar (201) — para que o modo
    // assíncrono nunca aceite um boleto que o worker jamais conseguirá emitir.
    if (!customer) throw new BoletoDataIncompleteError('customer')
    if (!customer.phone) throw new BoletoDataIncompleteError('customer.phone')
    if (!customer.address) throw new BoletoDataIncompleteError('customer.address')

    const boletoRequest: BoletoRequest = {
      dueDate: resolveBoletoDueDate(command.boleto, this.config.boletoDefaultExpiresDays),
      fine: command.boleto?.fine,
      interest: command.boleto?.interest,
      discount: command.boleto?.discount,
      message: command.boleto?.message,
      daysToWriteOff: command.boleto?.daysToWriteOff,
    }

    const payment = PaymentAggregate.create({
      consumerId: command.consumerId,
      amount,
      method,
      idempotencyKey,
      customer,
      description: command.description,
      metadata: command.metadata,
      boletoRequest,
    })

    if (this.config.asyncChargeCreation) {
      return this.acceptAsync(payment, sideEffects)
    }

    // Boleto NÃO é idempotente no provedor (POST gera novo charge_id). Marca ANTES
    // do POST: se a resposta se perder, não liberamos a reserva — um retry criaria
    // um 2º boleto. Ver nota em execute().
    sideEffects.committed = true
    const charge = await this.gateway.createBoletoCharge(buildBoletoChargeInput(payment))

    payment.registerProviderCharge({
      providerPaymentId: charge.providerPaymentId,
      boleto: {
        barcode: charge.barcode,
        digitableLine: charge.digitableLine,
        pdfUrl: charge.pdfUrl,
      },
      expiresAt: charge.expiresAt,
    })

    await this.payments.save(payment)

    this.logger.info('payment.created', {
      paymentId: payment.id,
      consumerId: payment.consumerId,
      method: payment.method.type,
      providerPaymentId: payment.providerPaymentId,
    })

    return toPaymentView(payment)
  }

  private async processCreditCard(
    command: ProcessPaymentCommand,
    amount: Money,
    method: PaymentMethod,
    idempotencyKey: IdempotencyKey,
    customer: Customer | undefined,
    sideEffects: { committed: boolean },
  ): Promise<PaymentView> {
    // Cartão exige pagador completo + nascimento + endereço de cobrança (a Efí
    // rejeita sem esses dados). Validamos AGORA, antes de qualquer efeito colateral.
    if (!customer) throw new CardDataIncompleteError('customer')
    if (!customer.phone) throw new CardDataIncompleteError('customer.phone')
    if (!customer.address) throw new CardDataIncompleteError('customer.address')
    const birth = command.customer?.birth
    if (!birth) throw new CardDataIncompleteError('customer.birth')
    // `buildMethod` já garante o cartão para CREDIT_CARD; extraímos do VO (fonte da verdade).
    const card = method.match({
      pix: () => undefined,
      boleto: () => undefined,
      creditCard: (c) => c,
    })
    if (!card) throw new CardDataIncompleteError('card')
    // `CardData.token` é opcional (ciclos de assinatura não o têm), mas cobrança
    // avulsa SEMPRE exige o token — `PaymentMethod.creditCard` já garante; guarda
    // aqui também estreita o tipo para a chamada do gateway.
    if (!card.token) throw new CardDataIncompleteError('card.token')

    const payment = PaymentAggregate.create({
      consumerId: command.consumerId,
      amount,
      method,
      idempotencyKey,
      customer,
      description: command.description,
      metadata: command.metadata,
    })

    // Cartão é SEMPRE síncrono: o `payment_token` é de vida curta e o POST não é
    // idempotente — deferir ao ChargeCreationWorker arriscaria token expirado /
    // cobrança duplicada. Por isso IGNORAMOS `config.asyncChargeCreation` aqui.
    sideEffects.committed = true
    const charge = await this.gateway.createCardCharge({
      paymentId: payment.id,
      amount,
      installments: card.installments,
      paymentToken: card.token,
      customer: {
        name: customer.name,
        cpf: customer.document.value,
        email: customer.email,
        phone: customer.phone,
        birth,
      },
      billingAddress: customer.address,
      description: command.description,
      idempotencyKey: command.idempotencyKey,
    })

    payment.registerProviderCharge({ providerPaymentId: charge.providerPaymentId })

    // A resposta one-step já é (quase sempre) terminal: approved→PAID, unpaid→FAILED.
    // `waiting` permanece PENDING e é fechado pela reconciliação/notificação.
    if (charge.status === 'PAID') {
      payment.markPaid()
    } else if (charge.status === 'FAILED') {
      payment.markFailed('Cartão recusado pelo provedor')
    }

    await this.payments.save(payment)

    this.logger.info('payment.created', {
      paymentId: payment.id,
      consumerId: payment.consumerId,
      method: payment.method.type,
      providerPaymentId: payment.providerPaymentId,
      status: payment.status,
    })

    return toPaymentView(payment)
  }

  /** Caminho assíncrono comum (Pix/boleto): persiste PENDING e responde 202. */
  private async acceptAsync(
    payment: PaymentAggregate,
    sideEffects: { committed: boolean },
  ): Promise<PaymentView> {
    // Persistir o agregado é efeito colateral: se o INSERT comitar mas o complete()
    // falhar depois, liberar deixaria a unique (consumerId,key) barrar o retry.
    sideEffects.committed = true
    await this.payments.save(payment)
    this.logger.info('payment.accepted_async', {
      paymentId: payment.id,
      consumerId: payment.consumerId,
      method: payment.method.type,
    })
    return toPaymentView(payment)
  }

  private buildMethod(command: ProcessPaymentCommand): PaymentMethod {
    switch (command.method) {
      case 'PIX':
        return PaymentMethod.pix()
      case 'BOLETO':
        return PaymentMethod.boleto()
      case 'CREDIT_CARD':
        if (!command.card) throw new ValidationError('Dados do cartão são obrigatórios')
        return PaymentMethod.creditCard(command.card)
    }
  }
}

/**
 * Resolve o vencimento do boleto (YYYY-MM-DD, UTC) no momento da requisição —
 * assim o modo assíncrono usa a data pretendida, não a data em que o worker rodar.
 */
function resolveBoletoDueDate(
  boleto: ProcessPaymentCommand['boleto'],
  defaultDays: number,
): string {
  if (boleto?.dueDate) return boleto.dueDate
  const days = boleto?.expiresInDays ?? defaultDays
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
