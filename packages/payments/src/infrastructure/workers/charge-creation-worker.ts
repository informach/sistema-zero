import { buildBoletoChargeInput } from '../../application/process-payment/boleto-charge-input'
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
 * Worker do modo assíncrono: cria as cobranças na Efí (Pix ou boleto) para os
 * pagamentos aceitos via `POST /payments` (status PENDING, ainda sem cobrança).
 * O `claim` (SKIP LOCKED) limita o lote por ciclo → **suaviza o burst** contra o
 * rate limit da Efí. Após `maxAttempts` falhas, o pagamento vira FAILED.
 *
 * ⚠️ Invariante de duplicação (boleto): o `POST /charge/one-step` NÃO é idempotente
 * no provedor. O lease (`staleAfterMs`) garante que outra réplica só re-reivindique
 * um pagamento DEPOIS que o detentor original já parou de trabalhar nele — por isso
 * `CHARGE_CLAIM_STALE_MS` é validado no boot como >= 2× `EFI_REQUEST_TIMEOUT_MS`
 * (ver `env.ts`). Resíduo irredutível: se a Efí processar o POST mas a resposta se
 * perder (timeout), o boleto existe e uma re-tentativa cria um 2º — `metadata.custom_id`
 * carimba o `paymentId` em toda cobrança para reconciliação/auditoria manual.
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
      const claimed = await this.payments.claimPendingCharges(
        this.options.batchSize,
        this.options.staleAfterMs ?? 60_000,
      )
      // Processa o lote com concorrência limitada (createCharge não lança).
      const concurrency = Math.max(1, this.options.concurrency ?? 1)
      for (let i = 0; i < claimed.length; i += concurrency) {
        const slice = claimed.slice(i, i + concurrency)
        await Promise.all(
          slice.map(({ payment, attempts }) => this.createCharge(payment, attempts)),
        )
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
    payment: Awaited<ReturnType<PaymentRepository['claimPendingCharges']>>[number]['payment'],
    attempts: number,
  ): Promise<void> {
    try {
      if (payment.method.type === 'PIX') {
        const charge = await this.gateway.createPixCharge({
          paymentId: payment.id,
          amount: payment.amount,
          pixKey: this.options.pixKey,
          description: payment.description ?? undefined,
          expiresInSeconds: this.options.defaultExpiresInSeconds,
          // Devedor opcional da cob — paridade com o caminho síncrono.
          ...(payment.customer
            ? {
                customer: {
                  name: payment.customer.name,
                  document: payment.customer.document.value,
                },
              }
            : {}),
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
      } else if (payment.method.type === 'BOLETO') {
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
      } else {
        throw new Error(`Método sem criação assíncrona suportada: ${payment.method.type}`)
      }
      await this.payments.save(payment)
      this.logger.info('charge.created_async', {
        paymentId: payment.id,
        method: payment.method.type,
        providerPaymentId: payment.providerPaymentId,
      })
    } catch (error) {
      this.logger.error('charge.creation_failed', {
        paymentId: payment.id,
        attempts,
        error: error instanceof Error ? error.message : String(error),
      })
      if (attempts >= this.options.maxAttempts) {
        try {
          payment.markFailed('Falha ao criar cobrança no provedor após várias tentativas')
          await this.payments.save(payment)
          this.logger.warn('charge.giving_up', { paymentId: payment.id, attempts })
        } catch (failError) {
          // `createCharge` NÃO pode lançar: senão o erro escapa do Promise.all e
          // aborta as cobranças irmãs do mesmo lote. Um ConcurrencyConflict aqui
          // significa que outro writer venceu (ex.: webhook marcou PAID) — ok.
          this.logger.error('charge.mark_failed_failed', {
            paymentId: payment.id,
            error: failError instanceof Error ? failError.message : String(failError),
          })
        }
      }
    }
  }
}
