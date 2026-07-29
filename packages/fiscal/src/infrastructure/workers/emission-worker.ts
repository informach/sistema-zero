import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import type { EmitInvoiceService } from '../../application/emit-invoice/emit-invoice.service'
import type { InvoiceRepository } from '../../domain/ports/invoice-repository.port'

export interface EmissionWorkerOpts {
  intervalMs: number
  batchSize: number
  staleMs: number
  maxAttempts: number
}

/**
 * Poller da fila de emissão: reivindica notas SCHEDULED vencidas (lease +
 * SKIP LOCKED — seguro com N réplicas) e processa SERIALMENTE (a Sefin é uma
 * só; volume de infoproduto não justifica concorrência por réplica).
 */
export class EmissionWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly emit: EmitInvoiceService,
    private readonly logger: Logger,
    private readonly opts: EmissionWorkerOpts,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), this.opts.intervalMs)
    this.logger.info('fiscal.emission_worker_started', { intervalMs: this.opts.intervalMs })
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** Um ciclo (exposto p/ testes). Reentrância protegida — tick longo não acumula. */
  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      // Coleta notas presas em SCHEDULED após crash (attempts > maxAttempts): sem
      // isto ficariam invisíveis no /metrics (contadas como "agendadas") p/ sempre.
      const reaped = await this.invoices.failExhausted({
        maxAttempts: this.opts.maxAttempts,
        staleMs: this.opts.staleMs,
      })
      if (reaped > 0) this.logger.error('fiscal.emit_reaped_stuck', { count: reaped })

      const claimed = await this.invoices.claimDueForEmission({
        batchSize: this.opts.batchSize,
        staleMs: this.opts.staleMs,
        maxAttempts: this.opts.maxAttempts,
      })
      for (const invoice of claimed) {
        try {
          // Renova o lease por-nota: num lote longo, as notas no fim não estouram
          // o claim (que outra réplica re-reivindicaria e reprocessaria).
          if (
            !invoice.claimToken ||
            !(await this.invoices.touchClaim(invoice.id, invoice.claimToken))
          ) {
            this.logger.info('fiscal.emit_claim_lost', { invoiceId: invoice.id })
            continue
          }
          await this.emit.execute(invoice, invoice.claimToken)
        } catch (error) {
          // O serviço já trata os caminhos esperados; isto é o inesperado.
          this.logger.error('fiscal.emit_unhandled', {
            invoiceId: invoice.id,
            error: serializeError(error),
          })
        }
      }
    } catch (error) {
      this.logger.error('fiscal.emission_tick_failed', { error: serializeError(error) })
    } finally {
      this.running = false
    }
  }
}
