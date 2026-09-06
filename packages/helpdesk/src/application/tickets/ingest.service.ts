import type { TriageKind } from '@sistemazero/helpdesk-contracts'
import {
  DEFAULT_TRIAGE_RULES,
  type TriageRules,
  type TriageVerdict,
  triageEmail,
} from '../../domain/mail/triage'
import type { ParsedEmail } from '../../domain/ports/gmail-client.port'
import type {
  IngestedGmailMessage,
  TicketIngestionRepository,
} from '../../domain/ports/ticket-ingestion-repository.port'
import type { Ticket } from '../../domain/ticket/ticket'

export type IngestStatus = 'created' | 'appended' | 'duplicate'
export interface IngestResult {
  status: IngestStatus
  ticketId?: string
  direction?: 'inbound' | 'outbound'
  /** Veredito da mensagem (ausente em `duplicate`). */
  triage?: TriageKind
  triageRule?: string
}

export interface IngestConfig {
  /** Grupo OpenRouter configurado → inbound novo entra em `ai_status='pending'`. */
  aiEnabled: boolean
}

const normalizeEmail = (email: string | null): string | null =>
  email ? email.trim().toLowerCase() : null

/** Remove os prefixos de resposta/encaminhamento p/ o assunto do ticket. */
function cleanSubject(subject: string): string {
  return subject.replace(/^(\s*(re|fwd?|enc|res)\s*:\s*)+/i, '').trim()
}

/**
 * Transforma um e-mail parseado em ticket/mensagem. Idempotente por
 * `gmail_message_id` (dedupe forte). Agrupa por `gmail_thread_id`. E-mail vindo
 * da PRÓPRIA caixa = outbound (`sent_via='gmail'`, resposta dada no Gmail).
 *
 * Triagem (`domain/mail/triage.ts`) na chegada: e-mail que não é atendimento
 * (auto-reply, devolução, newsletter, sistema, interno) abre o ticket JÁ
 * `closed` e triado, fora da fila/SLA/IA; em thread existente só contabiliza.
 * O repositório decide o ramo pela combinação direção × veredito.
 */
export class IngestService {
  constructor(
    private readonly ingestion: TicketIngestionRepository,
    private readonly config: IngestConfig,
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  async ingest(
    parsed: ParsedEmail,
    connectionEmail: string,
    rules: TriageRules = DEFAULT_TRIAGE_RULES,
  ): Promise<IngestResult> {
    const fromUs = normalizeEmail(parsed.fromEmail)
    const isFromUs = fromUs !== null && fromUs === normalizeEmail(connectionEmail)
    const at = parsed.internalDate ?? this.now()
    const direction = isFromUs ? 'outbound' : 'inbound'
    const verdict = triageEmail(
      {
        direction,
        fromEmail: parsed.fromEmail,
        toEmails: parsed.toEmails,
        ccEmails: parsed.ccEmails,
        headers: parsed.headers,
        labelIds: parsed.labelIds,
      },
      rules,
    )

    const ticket = this.buildTicket(parsed, isFromUs, at, verdict)
    const result = await this.ingestion.ingest({
      ticket,
      message: this.buildMessage(ticket.id, parsed, isFromUs, at, verdict),
      direction,
      aiEnabled: this.config.aiEnabled,
      at,
    })
    if (result.status === 'duplicate') return result
    return { ...result, direction, triage: verdict.kind, triageRule: verdict.rule }
  }

  private buildTicket(
    parsed: ParsedEmail,
    isFromUs: boolean,
    at: Date,
    verdict: TriageVerdict,
  ): Ticket {
    const requesterEmail = isFromUs
      ? (parsed.toEmails[0] ?? parsed.fromEmail ?? 'desconhecido')
      : (parsed.fromEmail ?? 'desconhecido')
    const triaged = verdict.kind !== 'human'
    const aiStatus =
      !this.config.aiEnabled || triaged
        ? 'skipped'
        : isFromUs
          ? 'idle' // criado a partir de outbound: nada a classificar ainda
          : 'pending'
    return {
      id: this.idGen(),
      version: 0,
      gmailThreadId: parsed.gmailThreadId,
      source: 'email',
      portal: null,
      subject: cleanSubject(parsed.subject) || '(sem assunto)',
      // Triado nasce encerrado: fora da fila, SLA inerte por construção.
      status: triaged ? 'closed' : isFromUs ? 'waiting' : 'new',
      resolvedAt: triaged ? at : null,
      category: null,
      categoryManual: false,
      priority: null,
      requesterName: isFromUs ? null : parsed.fromName,
      requesterEmail,
      requesterAccountId: null,
      assignedTo: null,
      assignedToName: null,
      firstMessageAt: at,
      lastMessageAt: at,
      // Só inbound HUMANO arma o relógio do SLA.
      lastInboundAt: isFromUs || triaged ? null : at,
      messageCount: 1,
      aiSummary: null,
      aiSummaryAt: null,
      aiDraft: null,
      aiDraftAt: null,
      aiDraftEdited: false,
      aiClassification: null,
      aiGeneration: aiStatus === 'pending' ? 1 : 0,
      aiStatus,
      aiNextAttemptAt: aiStatus === 'pending' ? at : null,
      aiAttempts: 0,
      aiLastError: null,
      triage: verdict.kind,
      triageRule: triaged ? verdict.rule : null,
      triagedAt: triaged ? at : null,
      createdAt: at,
      updatedAt: at,
    }
  }

  private buildMessage(
    ticketId: string,
    parsed: ParsedEmail,
    isFromUs: boolean,
    at: Date,
    verdict: TriageVerdict,
  ): IngestedGmailMessage {
    return {
      id: this.idGen(),
      ticketId,
      kind: 'email',
      visibility: 'customer',
      gmailMessageId: parsed.gmailMessageId,
      rfc822MessageId: parsed.rfc822MessageId,
      deliveryState: 'sent',
      deliveryLastError: null,
      direction: isFromUs ? 'outbound' : 'inbound',
      // Detectado pelo poller: inbound do cliente, ou outbound dado no Gmail.
      sentVia: isFromUs ? 'gmail' : 'customer',
      fromEmail: parsed.fromEmail,
      fromName: parsed.fromName,
      toEmails: parsed.toEmails,
      ccEmails: parsed.ccEmails,
      subject: parsed.subject || null,
      bodyText: parsed.bodyText,
      bodyHtml: parsed.bodyHtml,
      snippet: parsed.snippet,
      attachments: parsed.attachments,
      // Legado espelhando a triagem (leitores antigos); a decisão mora em `triage`.
      isAutoreply: verdict.kind !== 'human',
      triage: verdict.kind,
      triageRule: verdict.kind === 'human' ? null : verdict.rule,
      gmailInternalDate: parsed.internalDate,
      createdBy: null,
      createdByName: null,
      createdAt: at,
    }
  }
}
