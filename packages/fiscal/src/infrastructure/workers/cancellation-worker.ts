import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import type { InvoiceRepository } from '../../domain/ports/invoice-repository.port'
import type { SefinNacionalGateway } from '../../domain/ports/sefin-gateway.port'

export interface CancellationWorkerOpts {
  intervalMs: number
  batchSize: number
  staleMs: number
}

/**
 * Processa CANCEL_PENDING → evento e101101 na Sefin → CANCELLED. Motivo do
 * evento: estorno automático usa 2 (Serviço não Prestado — o dinheiro voltou);
 * cancelamento manual do admin usa 9 (Outros) com o motivo digitado. Rejeição
 * da Sefin NÃO transiciona (fica CANCEL_PENDING visível no admin + ERROR no
 * Sentry — pode exigir análise fiscal após o prazo).
 */
export class CancellationWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly sefin: SefinNacionalGateway,
    private readonly logger: Logger,
    private readonly opts: CancellationWorkerOpts,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), this.opts.intervalMs)
    this.logger.info('fiscal.cancellation_worker_started', { intervalMs: this.opts.intervalMs })
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const claimed = await this.invoices.claimCancelPending({
        batchSize: this.opts.batchSize,
        staleMs: this.opts.staleMs,
      })
      for (const invoice of claimed) {
        if (!invoice.accessKey) {
          this.logger.error('fiscal.cancel_without_access_key', { invoiceId: invoice.id })
          continue
        }
        try {
          // Renova o lease por-nota (lote longo não estoura o claim — ver emissão).
          await this.invoices.touchClaim(invoice.id)
          const result = await this.sefin.cancelNfse({
            accessKey: invoice.accessKey,
            cMotivo: invoice.cancelRequestedBy === 'system:refund' ? '2' : '9',
            xMotivo: invoice.cancelReason ?? 'Cancelamento solicitado',
          })
          if (result.kind === 'accepted') {
            await this.invoices.markCancelled(invoice.id, result.eventXml)
            await this.invoices.appendEvent(invoice.id, 'CANCELLED', 'system', {})
            this.logger.info('fiscal.invoice_cancelled', { invoiceId: invoice.id })
          } else {
            await this.invoices.appendEvent(invoice.id, 'CANCEL_FAILED', 'system', {
              errors: result.errors,
            })
            this.logger.error('fiscal.cancel_rejected', {
              invoiceId: invoice.id,
              errors: result.errors,
            })
          }
        } catch (error) {
          // Rede/5xx: permanece CANCEL_PENDING; o lease expira e re-tenta.
          this.logger.warn('fiscal.cancel_retry_later', {
            invoiceId: invoice.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      this.logger.error('fiscal.cancellation_tick_failed', { error: serializeError(error) })
    } finally {
      this.running = false
    }
  }
}
