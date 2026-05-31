import type { PaymentAggregate } from '../../domain/payment/payment.aggregate'
import type { PaymentGateway, ProviderCharge } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { Logger } from '../logging/logger'

export interface ReconciliationWorkerOptions {
  intervalMs: number
  batchSize: number
  /** Idade mínima sem confirmação para reconsultar. Padrão 120s. */
  staleAfterMs?: number
}

/**
 * Rede de segurança para webhooks perdidos: varre pagamentos PENDING com
 * cobrança criada porém não confirmados há um tempo e **re-consulta a Efí** (a
 * fonte da verdade). `markPaid` é idempotente, então rodar em várias réplicas é
 * seguro.
 */
export class ReconciliationWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly logger: Logger,
    private readonly options: ReconciliationWorkerOptions,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick().finally(() => {
        this.inFlight = null
      })
    }, this.options.intervalMs)
    this.logger.info('reconcile.worker.started', { intervalMs: this.options.intervalMs })
  }

  /** Para o agendamento e drena o ciclo em andamento (shutdown gracioso). */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.inFlight) await this.inFlight
  }

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const stale = await this.payments.findStalePendingCharges(
        this.options.batchSize,
        this.options.staleAfterMs ?? 120_000,
      )
      for (const payment of stale) {
        try {
          const charge = await this.consult(payment)
          if (!charge) continue
          if (charge.status === 'PAID') {
            // Defesa em profundidade: o valor pago tem que bater com o cobrado.
            if (charge.amountInCents !== payment.amount.amountInCents) {
              this.logger.error('reconcile.amount_mismatch', {
                paymentId: payment.id,
                expected: payment.amount.amountInCents.toString(),
                got: charge.amountInCents.toString(),
              })
              continue
            }
            payment.markPaid(charge.paidAt)
            await this.payments.save(payment)
            this.logger.info('reconcile.paid', { paymentId: payment.id })
          } else if (charge.status === 'EXPIRED') {
            payment.markExpired()
            await this.payments.save(payment)
            this.logger.info('reconcile.expired', { paymentId: payment.id })
          }
        } catch (error) {
          this.logger.error('reconcile.item_failed', {
            paymentId: payment.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      this.logger.error('reconcile.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  /** Re-consulta a cobrança na Efí conforme o método (Pix por txid; boleto por charge_id). */
  private consult(payment: PaymentAggregate): Promise<ProviderCharge | null> {
    if (payment.method.type === 'PIX') {
      return payment.txid ? this.gateway.getPixCharge(payment.txid) : Promise.resolve(null)
    }
    if (payment.method.type === 'BOLETO') {
      return payment.providerPaymentId
        ? this.gateway.getBoletoCharge(payment.providerPaymentId)
        : Promise.resolve(null)
    }
    return Promise.resolve(null)
  }
}
