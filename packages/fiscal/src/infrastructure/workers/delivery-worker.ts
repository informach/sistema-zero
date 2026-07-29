import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import type { EmitInvoiceService } from '../../application/emit-invoice/emit-invoice.service'
import type { InvoiceRepository } from '../../domain/ports/invoice-repository.port'

export interface DeliveryWorkerOpts {
  intervalMs: number
  batchSize: number
  staleMs: number
  retryDelayMs: number
  /** Messaging configurado: além do PDF, a fila também entrega e-mail. */
  deliverEmail: boolean
}

/**
 * Reprocessa efeitos pós-emissão que não podem reverter a NFS-e real: download
 * do DANFSe e enfileiramento do e-mail. Nunca chama a Sefin para emitir de novo.
 */
export class DeliveryWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly emit: EmitInvoiceService,
    private readonly logger: Logger,
    private readonly opts: DeliveryWorkerOpts,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), this.opts.intervalMs)
    this.logger.info('fiscal.delivery_worker_started', { intervalMs: this.opts.intervalMs })
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const claimed = await this.invoices.claimEmittedNeedingDelivery({
        batchSize: this.opts.batchSize,
        staleMs: this.opts.staleMs,
        includeEmail: this.opts.deliverEmail,
      })
      for (const invoice of claimed) {
        const claimToken = invoice.claimToken
        try {
          if (!claimToken || !(await this.invoices.touchClaim(invoice.id, claimToken))) {
            this.logger.info('fiscal.delivery_claim_lost', { invoiceId: invoice.id })
            continue
          }
          const result = await this.emit.retryDelivery(invoice.id, claimToken)
          if (!result.complete) {
            await this.invoices.releaseDeliveryRetry(
              invoice.id,
              new Date(Date.now() + this.opts.retryDelayMs),
              result.error ?? 'entrega pós-emissão incompleta',
              claimToken,
            )
            this.logger.warn('fiscal.delivery_retry_scheduled', {
              invoiceId: invoice.id,
              reason: result.error,
            })
          }
        } catch (error) {
          if (!claimToken) continue
          this.logger.error('fiscal.delivery_unhandled', {
            invoiceId: invoice.id,
            error: serializeError(error),
          })
          await this.invoices.releaseDeliveryRetry(
            invoice.id,
            new Date(Date.now() + this.opts.retryDelayMs),
            error instanceof Error ? error.message : String(error),
            claimToken,
          )
        }
      }
    } catch (error) {
      this.logger.error('fiscal.delivery_tick_failed', { error: serializeError(error) })
    } finally {
      this.running = false
    }
  }
}
