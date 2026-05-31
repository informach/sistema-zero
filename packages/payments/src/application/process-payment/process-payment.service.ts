import { PaymentAggregate } from '../../domain/payment/payment.aggregate'
import {
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
}

/**
 * Caso de uso central: processa uma solicitação de pagamento de forma
 * idempotente. Orquestra domínio + provedor + persistência transacional.
 *
 * Nesta fatia vertical apenas o Pix é processado ponta-a-ponta; boleto e cartão
 * retornam `UnsupportedPaymentMethodError` até seus adapters serem adicionados.
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
    const existing = await this.idempotency.reserve({
      consumerId: command.consumerId,
      key: command.idempotencyKey,
      requestHash: command.requestHash,
      inFlightTtlSeconds: this.config.idempotencyInFlightTtlSeconds,
    })

    if (existing) {
      if (existing.requestHash !== command.requestHash) throw new IdempotencyConflictError()
      if (existing.state === 'IN_FLIGHT') throw new IdempotencyInFlightError()
      // Concluída antes: devolve a resposta original (sem reprocessar).
      this.logger.info('payment.idempotent_replay', {
        consumerId: command.consumerId,
        idempotencyKey: command.idempotencyKey,
      })
      return existing.responseBody as PaymentView
    }

    try {
      const view = await this.process(command)
      await this.idempotency.complete({
        consumerId: command.consumerId,
        key: command.idempotencyKey,
        // 201 quando a cobrança já saiu (tem QR); 202 quando só aceita (modo async).
        responseStatus: view.pix ? 201 : 202,
        responseBody: view,
        ttlSeconds: this.config.idempotencyTtlSeconds,
      })
      return view
    } catch (error) {
      // Libera a reserva para permitir nova tentativa após corrigir o problema.
      await this.idempotency.release(command.consumerId, command.idempotencyKey)
      throw error
    }
  }

  private async process(command: ProcessPaymentCommand): Promise<PaymentView> {
    const amount = Money.fromCents(command.amountInCents)
    const idempotencyKey = IdempotencyKey.create(command.idempotencyKey)
    const method = this.buildMethod(command)
    const customer = command.customer ? Customer.create(command.customer) : undefined

    if (method.type !== 'PIX') {
      throw new UnsupportedPaymentMethodError(method.type)
    }

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
      await this.payments.save(payment)
      this.logger.info('payment.accepted_async', {
        paymentId: payment.id,
        consumerId: payment.consumerId,
      })
      return toPaymentView(payment)
    }

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
