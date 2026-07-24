import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { redactDocuments, redactSensitiveText } from '../../domain/invoice/redact-documents'
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
 * da Sefin vira CANCEL_FAILED (visível no admin, sem martelar a SEFIN); uma nova
 * tentativa requer ação explícita do admin após a análise fiscal.
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
          if (
            !invoice.claimToken ||
            !(await this.invoices.touchClaim(invoice.id, invoice.claimToken))
          ) {
            this.logger.info('fiscal.cancel_claim_lost', { invoiceId: invoice.id })
            continue
          }
          const result = await this.sefin.cancelNfse({
            accessKey: invoice.accessKey,
            cMotivo: invoice.cancelRequestedBy === 'system:refund' ? '2' : '9',
            // xMotivo = TSMotivo do XSD (15–255). Normaliza defensivamente: o motivo
            // do admin já é validado na borda, mas dados legados/curtos seriam
            // REJEITADOS pela Sefin → nota presa em CANCEL_PENDING.
            xMotivo: normalizeMotivo(invoice.cancelReason),
          })
          if (result.kind === 'accepted') {
            const cancelled = await this.invoices.markCancelled(
              invoice.id,
              result.eventXml,
              invoice.claimToken,
            )
            if (!cancelled) {
              this.logger.info('fiscal.cancel_transition_lost', { invoiceId: invoice.id })
              continue
            }
            await this.invoices.appendEvent(invoice.id, 'CANCELLED', 'system', {})
            this.logger.info('fiscal.invoice_cancelled', { invoiceId: invoice.id })
          } else {
            // A Sefin pode ecoar CPF/CNPJ na rejeição. O mesmo dado vai ao banco,
            // timeline, logs e Sentry, portanto a redação precisa acontecer ANTES
            // de qualquer efeito observável.
            const errors = redactDocuments(result.errors)
            const detail = errors.map((e) => `${e.code}: ${e.message}`).join(' | ')
            const failed = await this.invoices.markCancelFailed(
              invoice.id,
              detail,
              invoice.claimToken,
            )
            if (!failed) {
              this.logger.info('fiscal.cancel_transition_lost', { invoiceId: invoice.id })
              continue
            }
            await this.invoices.appendEvent(invoice.id, 'CANCEL_FAILED', 'system', {
              errors,
            })
            this.logger.error('fiscal.cancel_rejected', {
              invoiceId: invoice.id,
              errors,
            })
          }
        } catch (error) {
          // Rede/5xx: permanece CANCEL_PENDING; o lease expira e re-tenta.
          this.logger.warn('fiscal.cancel_retry_later', {
            invoiceId: invoice.id,
            error: redactSensitiveText(error instanceof Error ? error.message : String(error)),
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

/** Garante o xMotivo dentro de TSMotivo (15–255 chars) — fora disso a Sefin rejeita. */
function normalizeMotivo(reason: string | null): string {
  const base = (reason ?? '').trim() || 'Cancelamento de NFS-e solicitado pelo emitente'
  const padded = base.length < 15 ? `${base} - cancelamento de NFS-e pelo emitente` : base
  return padded.slice(0, 255)
}
