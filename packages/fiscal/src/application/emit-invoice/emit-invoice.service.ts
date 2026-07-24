import { randomBytes } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { dCompetBRT } from '../../domain/dps/dps-builder'
import { SkipReason } from '../../domain/invoice/invoice.status'
import { redactDocuments, redactSensitiveText } from '../../domain/invoice/redact-documents'
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

export interface InvoiceDeliveryResult {
  complete: boolean
  error?: string
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

  async execute(invoice: Invoice, claimToken: string): Promise<void> {
    // 1. Re-verificação fail-closed.
    let snapshot: Awaited<ReturnType<PaymentsClient['getPayment']>>
    try {
      snapshot = await this.payments.getPayment(invoice.paymentId)
    } catch (error) {
      await this.backoffOrFail(
        invoice,
        claimToken,
        `re-verificação no payments falhou: ${msg(error)}`,
      )
      return
    }
    if (snapshot?.status !== 'PAID' || snapshot.refundedAt) {
      const skipped = await this.invoices.skip(
        invoice.id,
        SkipReason.PAYMENT_NOT_PAID_AT_EMISSION,
        `status=${snapshot?.status ?? 'NOT_FOUND'}`,
        claimToken,
      )
      if (!skipped) return
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
    const allocation = await this.invoices.allocateDpsNumber(
      invoice.id,
      this.config.serie,
      (n) => this.config.buildDpsId(this.config.serie, n),
      claimToken,
    )
    if (!allocation) return
    const { dpsNumber, dpsId } = allocation

    // 3. Competência = HOJE em BRT, na MESMA base/margem do dhEmi (dps-builder):
    // sem isso, na virada da meia-noite dCompet podia ficar 1 dia à frente do
    // dhEmi (que subtrai 60s de folga de clock skew) → rejeição da Sefin.
    const competenceDate = dCompetBRT()

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
        const failed = await this.invoices.markFailed(
          invoice.id,
          `nota original ${invoice.substitutesId} sem chave de acesso (não dá para substituir)`,
          claimToken,
        )
        if (failed) {
          await this.invoices.appendEvent(invoice.id, 'EMIT_FAILED', 'system', {
            reason: 'SUBSTITUTED_ORIGINAL_WITHOUT_KEY',
          })
        }
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
      await this.backoffOrFail(invoice, claimToken, `Sefin indisponível: ${msg(error)}`)
      return
    }

    if (result.kind === 'rejected') {
      // A Sefin pode ecoar o CPF do tomador na descrição (ex. E0207) — redige
      // sequências longas de dígitos antes de persistir/logar (vai p/ o Sentry).
      const errors = redactDocuments(result.errors)
      const detail = errors.map((e) => `${e.code}: ${e.message}`).join(' | ')
      const failed = await this.invoices.markFailed(invoice.id, detail, claimToken)
      if (failed) {
        await this.invoices.appendEvent(invoice.id, 'EMIT_FAILED', 'system', { errors })
        this.logger.error('fiscal.emit_rejected', { invoiceId: invoice.id, errors })
      }
      return
    }

    if (result.kind === 'duplicate') {
      // Resposta perdida num envio anterior: o gateway JÁ resolveu a chave na
      // consulta do Id da DPS (sem 2ª consulta aqui).
      await this.finishEmission(invoice, claimToken, {
        accessKey: result.accessKey,
        nfseXml: '',
        dpsXml: result.dpsXml,
        competenceDate,
        recovered: true,
      })
      return
    }

    await this.finishEmission(invoice, claimToken, {
      accessKey: result.accessKey,
      nfseXml: result.nfseXml,
      dpsXml: result.dpsXml,
      competenceDate,
      recovered: false,
    })
  }

  async retryDelivery(invoiceId: string, claimToken: string): Promise<InvoiceDeliveryResult> {
    const invoice = await this.invoices.findById(invoiceId)
    if (!invoice) return { complete: true }
    if (invoice.status !== 'EMITTED' || invoice.claimToken !== claimToken) return { complete: true }
    if (!invoice.accessKey || !invoice.pdfToken) {
      return { complete: false, error: 'nota emitida sem chave de acesso ou pdfToken' }
    }

    const result = await this.deliverInvoiceArtifacts(
      invoice,
      invoice.accessKey,
      invoice.pdfToken,
      claimToken,
    )
    if (result.complete) await this.invoices.markDeliveryComplete(invoice.id, claimToken)
    return result
  }

  private async finishEmission(
    invoice: Invoice,
    claimToken: string,
    data: {
      accessKey: string
      nfseXml: string
      dpsXml: string
      competenceDate: string
      recovered: boolean
    },
  ): Promise<void> {
    const pdfToken = randomBytes(32).toString('hex')
    const emitData = {
      dpsXml: data.dpsXml,
      nfseXml: data.nfseXml,
      accessKey: data.accessKey,
      competenceDate: data.competenceDate,
      pdfToken,
    }
    // Substituição: gravar a emissão da substituta E marcar a original SUBSTITUTED
    // numa ÚNICA transação (atomicidade — um crash entre as duas escritas deixava
    // a original presa EMITTED p/ sempre).
    let recorded: boolean
    let originalSubstituted = false
    let substituteCancelPending = false
    if (invoice.substitutesId) {
      const res = await this.invoices.markEmittedAsSubstitute(
        invoice.id,
        emitData,
        invoice.substitutesId,
        claimToken,
      )
      recorded = res.recorded
      originalSubstituted = res.originalSubstituted
      substituteCancelPending = res.substituteCancelPending
    } else {
      recorded = await this.invoices.markEmitted(invoice.id, emitData, claimToken)
    }
    if (!recorded) {
      // A NFS-e foi autorizada na Sefin, mas o status mudou no meio (corrida):
      // jamais perder a chave de uma nota REAL.
      await this.reconcileRacedEmission(invoice, data, pdfToken)
      return
    }
    await this.invoices.appendEvent(invoice.id, 'EMITTED', 'system', {
      accessKey: data.accessKey,
      recovered: data.recovered,
    })
    this.logger.info('fiscal.invoice_emitted', { invoiceId: invoice.id, accessKey: data.accessKey })

    // Substituição: a original vira SUBSTITUTED na MESMA transação acima.
    if (invoice.substitutesId) {
      if (originalSubstituted) {
        await this.invoices.appendEvent(invoice.substitutesId, 'SUBSTITUTED', 'system', {
          substituteId: invoice.id,
        })
      } else if (substituteCancelPending) {
        // O estorno venceu a corrida com a substituição. A transação do
        // repositório gravou a NFS-e real e já moveu a substituta para
        // CANCEL_PENDING; não entrega PDF/e-mail de uma venda reembolsada.
        await this.invoices.appendEvent(invoice.id, 'EMITTED_THEN_CANCEL_PENDING', 'system', {
          accessKey: data.accessKey,
          racedFrom: 'SUBSTITUTE_REFUND',
        })
        this.logger.error('fiscal.substitute_emitted_after_refund', {
          invoiceId: invoice.id,
          originalId: invoice.substitutesId,
          accessKey: data.accessKey,
        })
        return
      } else {
        // A original já tinha saído de EMITTED (ex.: um estorno a moveu p/
        // CANCEL_PENDING entre o agendamento da substituta e esta gravação). NÃO
        // sobrescrevemos o cancelamento — a substituta virou nota REAL e, se a
        // venda foi estornada, precisa de cancelamento próprio (ação manual /
        // o handler de estorno trata as ATIVAS do pagamento). Sinal alertável:
        this.logger.error('fiscal.substitute_original_not_emitted', {
          invoiceId: invoice.id,
          originalId: invoice.substitutesId,
          accessKey: data.accessKey,
        })
        await this.invoices.appendEvent(invoice.id, 'SUBSTITUTE_ORIGINAL_NOT_EMITTED', 'system', {
          originalId: invoice.substitutesId,
        })
      }
    }

    const delivery = await this.deliverInvoiceArtifacts(
      invoice,
      data.accessKey,
      pdfToken,
      claimToken,
    )
    if (!delivery.complete && delivery.error) {
      await this.invoices.releaseDeliveryRetry(
        invoice.id,
        new Date(Date.now() + 15 * 60_000),
        delivery.error,
        claimToken,
      )
    } else if (delivery.complete) {
      await this.invoices.markDeliveryComplete(invoice.id, claimToken)
    }
  }

  /**
   * Pós-emissão recuperável: DANFSe e e-mail são best-effort no caminho síncrono,
   * mas precisam ser reexecutáveis sem reemitir a DPS. O worker chama este método
   * para notas EMITTED com pdf/email pendentes.
   */
  private async deliverInvoiceArtifacts(
    invoice: Invoice,
    accessKey: string,
    pdfToken: string,
    claimToken: string,
  ): Promise<InvoiceDeliveryResult> {
    // DANFSe: persistir o PDF blinda contra a troca do padrão em jul/2026; falha
    // aqui NUNCA reverte a emissão.
    let pdfStored = invoice.pdfStoredAt !== null
    try {
      if (!pdfStored) {
        const pdf = await this.danfse.fetchPdf(accessKey)
        const stored = await this.invoices.storePdf(invoice.id, pdf, claimToken)
        if (!stored) return { complete: false, error: 'claim de entrega perdido' }
        await this.invoices.appendEvent(invoice.id, 'PDF_STORED', 'system', { bytes: pdf.length })
        pdfStored = true
      }
    } catch (error) {
      this.logger.error('fiscal.danfse_fetch_failed', { invoiceId: invoice.id, error: msg(error) })
      return { complete: false, error: `DANFSe indisponível: ${msg(error)}` }
    }

    // E-mail ao comprador (best-effort, dedupado no messaging por nfse-<id>):
    // só com o PDF armazenado — o anexo é a capability-URL deste serviço.
    if (pdfStored && invoice.customer.email && !invoice.emailSentAt) {
      try {
        const dispatched = await this.messaging.sendInvoiceEmail({
          idempotencyKey: `nfse-${invoice.id}`,
          recipient: { name: invoice.customer.name || 'Cliente', email: invoice.customer.email },
          variables: {
            nome: invoice.customer.name,
            produto: invoice.serviceDescription,
            valor: formatBrl(invoice.amountInCents),
            chave: accessKey,
          },
          attachments: [
            {
              filename: 'nota-fiscal.pdf',
              url: `${this.config.selfUrl}/fiscal/files/${pdfToken}.pdf`,
              contentType: 'application/pdf',
            },
          ],
        })
        // Só marca "enviado" se o e-mail foi REALMENTE despachado — o cliente no-op
        // (sem gateway) retorna false e NÃO deixa emailSentAt fantasma no admin.
        if (dispatched) {
          const marked = await this.invoices.markEmailSent(invoice.id, claimToken)
          if (!marked) return { complete: false, error: 'claim de entrega perdido' }
          await this.invoices.appendEvent(invoice.id, 'EMAIL_QUEUED', 'system', {})
        }
      } catch (error) {
        this.logger.error('fiscal.invoice_email_failed', {
          invoiceId: invoice.id,
          error: msg(error),
        })
        return { complete: false, error: `e-mail da nota falhou: ${msg(error)}` }
      }
    }

    return { complete: true }
  }

  /**
   * `markEmitted` não casou (0 linhas): entre a emissão CONFIRMADA na Sefin e a
   * gravação, uma corrida mudou o status. A NFS-e REAL existe — nunca perder a
   * chave nem deixar nota de venda estornada sem cancelar:
   *  - já EMITTED (outra réplica gravou) → idempotente, nada a fazer;
   *  - SKIPPED (estorno correu junto) → grava a emissão e encaminha p/ cancelamento;
   *  - qualquer outro estado → ERROR alertável com a chave (ação manual).
   */
  private async reconcileRacedEmission(
    invoice: Invoice,
    data: { dpsXml: string; nfseXml: string; accessKey: string; competenceDate: string },
    pdfToken: string,
  ): Promise<void> {
    const current = await this.invoices.findById(invoice.id)
    if (current?.status === 'EMITTED') {
      this.logger.info('fiscal.emit_already_recorded', {
        invoiceId: invoice.id,
        accessKey: data.accessKey,
      })
      return
    }
    if (current?.status === 'SKIPPED') {
      await this.invoices.forceCancelAfterRacedEmission(
        invoice.id,
        { ...data, pdfToken },
        'Pagamento reembolsado durante a emissão',
      )
      await this.invoices.appendEvent(invoice.id, 'EMITTED_THEN_CANCEL_PENDING', 'system', {
        accessKey: data.accessKey,
        racedFrom: 'SKIPPED',
      })
      this.logger.error('fiscal.emitted_after_skip', {
        invoiceId: invoice.id,
        accessKey: data.accessKey,
      })
      return
    }
    this.logger.error('fiscal.emit_recording_lost_race', {
      invoiceId: invoice.id,
      accessKey: data.accessKey,
      status: current?.status ?? 'NOT_FOUND',
    })
  }

  /** Backoff exponencial (1min × 2^attempts, teto 6h) ou FAILED se esgotou. */
  private async backoffOrFail(invoice: Invoice, claimToken: string, reason: string): Promise<void> {
    if (invoice.attempts >= this.config.maxAttempts) {
      const failed = await this.invoices.markFailed(
        invoice.id,
        `tentativas esgotadas: ${reason}`,
        claimToken,
      )
      if (failed) {
        await this.invoices.appendEvent(invoice.id, 'EMIT_FAILED', 'system', {
          reason,
          final: true,
        })
        this.logger.error('fiscal.emit_exhausted', { invoiceId: invoice.id, reason })
      }
      return
    }
    const delayMs = Math.min(60_000 * 2 ** invoice.attempts, 6 * 3600_000)
    const released = await this.invoices.releaseForRetry(
      invoice.id,
      new Date(Date.now() + delayMs),
      reason,
      claimToken,
    )
    if (released) {
      this.logger.warn('fiscal.emit_retry_scheduled', {
        invoiceId: invoice.id,
        attempt: invoice.attempts,
        delayMs,
        reason,
      })
    }
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
  return redactSensitiveText(error instanceof Error ? error.message : String(error))
}
