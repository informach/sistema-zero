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
 */
export class IngestService {
  constructor(
    private readonly ingestion: TicketIngestionRepository,
    private readonly config: IngestConfig,
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  async ingest(parsed: ParsedEmail, connectionEmail: string): Promise<IngestResult> {
    const fromUs = normalizeEmail(parsed.fromEmail)
    const isFromUs = fromUs !== null && fromUs === normalizeEmail(connectionEmail)
    const at = parsed.internalDate ?? this.now()
    const direction = isFromUs ? 'outbound' : 'inbound'

    const ticket = this.buildTicket(parsed, isFromUs, at)
    const result = await this.ingestion.ingest({
      ticket,
      message: this.buildMessage(ticket.id, parsed, isFromUs, at),
      direction,
      aiEnabled: this.config.aiEnabled,
      at,
    })
    return { ...result, direction: result.status === 'duplicate' ? undefined : direction }
  }

  private buildTicket(parsed: ParsedEmail, isFromUs: boolean, at: Date): Ticket {
    const requesterEmail = isFromUs
      ? (parsed.toEmails[0] ?? parsed.fromEmail ?? 'desconhecido')
      : (parsed.fromEmail ?? 'desconhecido')
    const aiStatus = !this.config.aiEnabled
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
      status: isFromUs ? 'waiting' : 'new',
      resolvedAt: null,
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
      lastInboundAt: isFromUs ? null : at,
      messageCount: 1,
      aiSummary: null,
      aiSummaryAt: null,
      aiDraft: null,
      aiDraftAt: null,
      aiDraftEdited: false,
      aiClassification: null,
      aiStatus,
      aiNextAttemptAt: aiStatus === 'pending' ? at : null,
      aiAttempts: 0,
      aiLastError: null,
      createdAt: at,
      updatedAt: at,
    }
  }

  private buildMessage(
    ticketId: string,
    parsed: ParsedEmail,
    isFromUs: boolean,
    at: Date,
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
      // Autoresponder/newsletter? (Auto-Submitted≠no / X-Autoreply / List-Unsubscribe)
      // — metadado exibido à equipe; não existe auto-resposta neste produto.
      isAutoreply:
        parsed.isAutoreply ||
        (parsed.autoSubmitted !== null && parsed.autoSubmitted.toLowerCase() !== 'no') ||
        parsed.listUnsubscribe !== null,
      gmailInternalDate: parsed.internalDate,
      createdBy: null,
      createdByName: null,
      createdAt: at,
    }
  }
}
