import { randomBytes } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { SkipReason } from '../../domain/invoice/invoice.status'
import type { PaymentsClient } from '../../domain/ports/clients.port'
import type { Invoice, InvoiceRepository } from '../../domain/ports/invoice-repository.port'
import type { MessagingClient } from '../../domain/ports/messaging-client.port'
import type { DanfseClient, SefinNacionalGateway } from '../../domain/ports/sefin-gateway.port'

export interface EmitInvoiceConfig {
  serie: string
  maxAttempts: number
  /** Constrói o Id determinístico da DPS (perfil do emitente). */
  buildDpsId: (serie: string, numero: bigint) => string
  /** Base deste serviço alcançável pelo messaging (capability-URL do anexo). */
  selfUrl: string
}

/**
 * Emite UMA nota já reivindicada pelo worker. Sequência de segurança:
 *  1. RE-VERIFICA o pagamento no payments NO MOMENTO da emissão (fail-closed:
 *     payments fora do ar = não emite; não-PAID/estornado = SKIPPED).
 *  2. Aloca número/série uma única vez (retry REUSA — re-POST genuíno vira
 *     "duplicate" e é recuperado por consulta, nunca nota dobrada).
 *  3. Competência = data da EMISSÃO em BRT (decisão do usuário, 12/06).
 *  4. Sucesso → EMITTED → DANFSe (best-effort; falha de PDF NÃO falha a nota).
 *  5. Rejeição determinística → FAILED direto (sem retry cego); erro de
 *     rede/5xx → backoff exponencial até esgotar tentativas.
 */
export class EmitInvoiceService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentsClient,
    private readonly sefin: SefinNacionalGateway,
    private readonly danfse: DanfseClient,
    private readonly messaging: MessagingClient,
    private readonly config: EmitInvoiceConfig,
    private readonly logger: Logger,
  ) {}

  async execute(invoice: Invoice): Promise<void> {
    // 1. Re-verificação fail-closed.
    let snapshot: Awaited<ReturnType<PaymentsClient['getPayment']>>
    try {
      snapshot = await this.payments.getPayment(invoice.paymentId)
    } catch (error) {
      await this.backoffOrFail(invoice, `re-verificação no payments falhou: ${msg(error)}`)
      return
    }
    if (!snapshot || snapshot.status !== 'PAID' || snapshot.refundedAt) {
      await this.invoices.skip(
        invoice.id,
        SkipReason.PAYMENT_NOT_PAID_AT_EMISSION,
        `status=${snapshot?.status ?? 'NOT_FOUND'}`,
      )
      await this.invoices.appendEvent(invoice.id, 'SKIPPED', 'system', {
        reason: SkipReason.PAYMENT_NOT_PAID_AT_EMISSION,
        status: snapshot?.status ?? 'NOT_FOUND',
      })
      this.logger.info('fiscal.skipped_at_emission', {
        invoiceId: invoice.id,
        status: snapshot?.status,
      })
      return
    }

    // 2. Numeração (alocada uma vez; reuso no retry).
    const { dpsNumber, dpsId } = await this.invoices.allocateDpsNumber(
      invoice.id,
      this.config.serie,
      (n) => this.config.buildDpsId(this.config.serie, n),
    )

    // 3. Competência = HOJE em BRT (UTC-3 fixo — Brasil sem horário de verão).
    const competenceDate = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)

    await this.invoices.appendEvent(invoice.id, 'EMIT_ATTEMPT', 'system', {
      attempt: invoice.attempts,
      dpsNumber: String(dpsNumber),
    })

    // Substituição: a DPS nova referencia a chave da ORIGINAL no grupo `subst`
    // (o sistema nacional cancela a original por substituição automaticamente).
    let substituicao: { chaveOriginal: string; cMotivo: '99'; xMotivo: string } | undefined
    if (invoice.substitutesId) {
      const original = await this.invoices.findById(invoice.substitutesId)
      if (!original?.accessKey) {
        await this.invoices.markFailed(
          invoice.id,
          `nota original ${invoice.substitutesId} sem chave de acesso (não dá para substituir)`,
        )
        await this.invoices.appendEvent(invoice.id, 'EMIT_FAILED', 'system', {
          reason: 'SUBSTITUTED_ORIGINAL_WITHOUT_KEY',
        })
        return
      }
      substituicao = {
        chaveOriginal: original.accessKey,
        cMotivo: '99',
        xMotivo: 'Substituição para correção de dados da nota',
      }
    }

    let result: Awaited<ReturnType<SefinNacionalGateway['emitDps']>>
    try {
      result = await this.sefin.emitDps({
        dpsId,
        dpsNumber,
        serie: this.config.serie,
        competenceDate,
        tomador: { cpf: invoice.customer.document, nome: invoice.customer.name },
        valor: centsToReais(invoice.amountInCents),
        descricao: invoice.serviceDescription,
        substituicao,
      })
    } catch (error) {
      await this.backoffOrFail(invoice, `Sefin indisponível: ${msg(error)}`)
      return
    }

    if (result.kind === 'rejected') {
      const detail = result.errors.map((e) => `${e.code}: ${e.message}`).join(' | ')
      await this.invoices.markFailed(invoice.id, detail)
      await this.invoices.appendEvent(invoice.id, 'EMIT_FAILED', 'system', {
        errors: result.errors,
      })
      this.logger.error('fiscal.emit_rejected', { invoiceId: invoice.id, errors: result.errors })
      return
    }

    if (result.kind === 'duplicate') {
      // Resposta perdida num envio anterior: recupera pela consulta do Id da DPS.
      const found = await this.sefin.findNfseByDpsId(dpsId).catch(() => null)
      if (!found) {
        await this.backoffOrFail(invoice, 'DPS duplicada mas NFS-e não localizada na consulta')
        return
      }
      await this.finishEmission(invoice, {
        accessKey: found.accessKey,
        nfseXml: '',
        dpsXml: result.dpsXml,
        competenceDate,
        recovered: true,
      })
      return
    }

    await this.finishEmission(invoice, {
      accessKey: result.accessKey,
      nfseXml: result.nfseXml,
      dpsXml: result.dpsXml,
      competenceDate,
      recovered: false,
    })
  }

  private async finishEmission(
    invoice: Invoice,
    data: {
      accessKey: string
      nfseXml: string
      dpsXml: string
      competenceDate: string
      recovered: boolean
    },
  ): Promise<void> {
    const pdfToken = randomBytes(32).toString('hex')
    await this.invoices.markEmitted(invoice.id, {
      dpsXml: data.dpsXml,
      nfseXml: data.nfseXml,
      accessKey: data.accessKey,
      competenceDate: data.competenceDate,
      pdfToken,
    })
    await this.invoices.appendEvent(invoice.id, 'EMITTED', 'system', {
      accessKey: data.accessKey,
      recovered: data.recovered,
    })
    this.logger.info('fiscal.invoice_emitted', { invoiceId: invoice.id, accessKey: data.accessKey })

    // Substituição: a original vira SUBSTITUTED quando a substituta emite.
    if (invoice.substitutesId) {
      await this.invoices.markSubstituted(invoice.substitutesId, invoice.id)
      await this.invoices.appendEvent(invoice.substitutesId, 'SUBSTITUTED', 'system', {
        substituteId: invoice.id,
      })
    }

    // DANFSe: best-effort — persistir o PDF na emissão blinda contra a troca do
    // padrão em jul/2026; falha aqui NUNCA reverte a emissão.
    let pdfStored = false
    try {
      const pdf = await this.danfse.fetchPdf(data.accessKey)
      await this.invoices.storePdf(invoice.id, pdf)
      await this.invoices.appendEvent(invoice.id, 'PDF_STORED', 'system', { bytes: pdf.length })
      pdfStored = true
    } catch (error) {
      this.logger.error('fiscal.danfse_fetch_failed', { invoiceId: invoice.id, error: msg(error) })
    }

    // E-mail ao comprador (best-effort, dedupado no messaging por nfse-<id>):
    // só com o PDF armazenado — o anexo é a capability-URL deste serviço.
    if (pdfStored && invoice.customer.email) {
      try {
        await this.messaging.sendInvoiceEmail({
          idempotencyKey: `nfse-${invoice.id}`,
          recipient: { name: invoice.customer.name || 'Cliente', email: invoice.customer.email },
          variables: {
            nome: invoice.customer.name,
            produto: invoice.serviceDescription,
            valor: formatBrl(invoice.amountInCents),
            chave: data.accessKey,
          },
          attachments: [
            {
              filename: 'nota-fiscal.pdf',
              url: `${this.config.selfUrl}/fiscal/files/${pdfToken}.pdf`,
              contentType: 'application/pdf',
            },
          ],
        })
        await this.invoices.markEmailSent(invoice.id)
        await this.invoices.appendEvent(invoice.id, 'EMAIL_QUEUED', 'system', {})
      } catch (error) {
        this.logger.error('fiscal.invoice_email_failed', {
          invoiceId: invoice.id,
          error: msg(error),
        })
      }
    }
  }

  /** Backoff exponencial (1min × 2^attempts, teto 6h) ou FAILED se esgotou. */
  private async backoffOrFail(invoice: Invoice, reason: string): Promise<void> {
    if (invoice.attempts >= this.config.maxAttempts) {
      await this.invoices.markFailed(invoice.id, `tentativas esgotadas: ${reason}`)
      await this.invoices.appendEvent(invoice.id, 'EMIT_FAILED', 'system', { reason, final: true })
      this.logger.error('fiscal.emit_exhausted', { invoiceId: invoice.id, reason })
      return
    }
    const delayMs = Math.min(60_000 * 2 ** invoice.attempts, 6 * 3600_000)
    await this.invoices.releaseForRetry(invoice.id, new Date(Date.now() + delayMs), reason)
    this.logger.warn('fiscal.emit_retry_scheduled', {
      invoiceId: invoice.id,
      attempt: invoice.attempts,
      delayMs,
      reason,
    })
  }
}

/** "R$ 37,00" p/ o template de e-mail. */
function formatBrl(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents
  const reais = `${abs / 100n}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cents < 0n ? '-' : ''}R$ ${reais},${(abs % 100n).toString().padStart(2, '0')}`
}

function centsToReais(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
