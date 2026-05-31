import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { Logger } from '../logging/logger'

export interface ChargeCreationWorkerOptions {
  intervalMs: number
  batchSize: number
  maxAttempts: number
  pixKey: string
  /** Quantas cobranças criar em paralelo por ciclo (vazão por instância). Padrão 1. */
  concurrency?: number
  /** Tempo até um claim "preso" (falha/instância morta) voltar à fila. Padrão 60s. */
  staleAfterMs?: number
  defaultExpiresInSeconds?: number
}

/**
 * Worker do modo assíncrono: cria as cobranças Pix na Efí para os pagamentos
 * aceitos via `POST /payments` (status PENDING, ainda sem cobrança). O `claim`
 * (SKIP LOCKED) limita o lote por ciclo → **suaviza o burst** contra o rate
 * limit da Efí. Após `maxAttempts` falhas, o pagamento vira FAILED.
 */
export class ChargeCreationWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly logger: Logger,
    private readonly options: ChargeCreationWorkerOptions,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick().finally(() => {
        this.inFlight = null
      })
    }, this.options.intervalMs)
    this.logger.info('charge.worker.started', {
      intervalMs: this.options.intervalMs,
      batchSize: this.options.batchSize,
    })
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
      const claimed = await this.payments.claimPendingPixCharges(
        this.options.batchSize,
        this.options.staleAfterMs ?? 60_000,
      )
      // Processa o lote com concorrência limitada (createCharge não lança).
      const concurrency = Math.max(1, this.options.concurrency ?? 1)
      for (let i = 0; i < claimed.length; i += concurrency) {
        const slice = claimed.slice(i, i + concurrency)
        await Promise.all(slice.map(({ payment, attempts }) => this.createCharge(payment, attempts)))
      }
    } catch (error) {
      this.logger.error('charge.worker.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  private async createCharge(
    payment: Awaited<ReturnType<PaymentRepository['claimPendingPixCharges']>>[number]['payment'],
    attempts: number,
  ): Promise<void> {
    try {
      const charge = await this.gateway.createPixCharge({
        paymentId: payment.id,
        amount: payment.amount,
        pixKey: this.options.pixKey,
        description: payment.description ?? undefined,
        expiresInSeconds: this.options.defaultExpiresInSeconds,
        idempotencyKey: payment.idempotencyKey,
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
      await this.payments.save(payment)
      this.logger.info('charge.created_async', { paymentId: payment.id, txid: charge.txid })
    } catch (error) {
      this.logger.error('charge.creation_failed', {
        paymentId: payment.id,
        attempts,
        error: error instanceof Error ? error.message : String(error),
      })
      if (attempts >= this.options.maxAttempts) {
        payment.markFailed('Falha ao criar cobrança no provedor após várias tentativas')
        await this.payments.save(payment)
        this.logger.warn('charge.giving_up', { paymentId: payment.id, attempts })
      }
    }
  }
}
