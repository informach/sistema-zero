import type { Logger } from '@sistemazero/core/logging'
import type { ParsedEmail } from '../../domain/ports/gmail-client.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { TicketRepository } from '../../domain/ports/ticket-repository.port'
import { statusOnInbound, type Ticket } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'

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
    private readonly tickets: TicketRepository,
    private readonly messages: MessageRepository,
    private readonly config: IngestConfig,
    private readonly now: () => Date,
    private readonly idGen: () => string,
    private readonly logger: Logger,
  ) {}

  async ingest(parsed: ParsedEmail, connectionEmail: string): Promise<IngestResult> {
    // Dedupe forte: mensagem já persistida (tick anterior / re-backfill) → skip.
    if (await this.messages.existsByGmailMessageId(parsed.gmailMessageId)) {
      return { status: 'duplicate' }
    }
    const fromUs = normalizeEmail(parsed.fromEmail)
    const isFromUs = fromUs !== null && fromUs === normalizeEmail(connectionEmail)
    const at = parsed.internalDate ?? this.now()
    const direction = isFromUs ? 'outbound' : 'inbound'

    const existing = await this.tickets.byGmailThreadId(parsed.gmailThreadId)
    if (!existing) {
      const ticket = this.buildTicket(parsed, isFromUs, at)
      await this.tickets.create(ticket)
      await this.messages.create(this.buildMessage(ticket.id, parsed, isFromUs, at))
      return { status: 'created', ticketId: ticket.id, direction }
    }

    await this.messages.create(this.buildMessage(existing.id, parsed, isFromUs, at))
    await this.applyToTicket(existing.id, (ticket) => {
      if (at.getTime() > ticket.lastMessageAt.getTime()) ticket.lastMessageAt = at
      ticket.messageCount += 1
      if (!isFromUs) {
        if (!ticket.lastInboundAt || at.getTime() > ticket.lastInboundAt.getTime()) {
          ticket.lastInboundAt = at
        }
        // Reabre resolvido/fechado; demais estados preservados.
        ticket.status = statusOnInbound(ticket.status)
        // Novo inbound re-dispara a IA (resumo/rascunho); o auto-envio segue
        // gated por auto_reply_state (máx. 1 auto-resposta por ticket).
        if (this.config.aiEnabled) {
          ticket.aiStatus = 'pending'
          ticket.aiNextAttemptAt = at
          ticket.aiAttempts = 0
          ticket.aiLastError = null
        }
      }
    })
    return { status: 'appended', ticketId: existing.id, direction }
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
      subject: cleanSubject(parsed.subject) || '(sem assunto)',
      status: isFromUs ? 'waiting' : 'new',
      category: null,
      categoryManual: false,
      priority: null,
      requesterName: isFromUs ? null : parsed.fromName,
      requesterEmail,
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
      autoReplyState: 'none',
      autoRepliedAt: null,
      autoReplyReason: null,
      createdAt: at,
      updatedAt: at,
    }
  }

  private buildMessage(
    ticketId: string,
    parsed: ParsedEmail,
    isFromUs: boolean,
    at: Date,
  ): TicketMessage {
    return {
      id: this.idGen(),
      ticketId,
      kind: 'email',
      gmailMessageId: parsed.gmailMessageId,
      rfc822MessageId: parsed.rfc822MessageId,
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
      gmailInternalDate: parsed.internalDate,
      createdBy: null,
      createdByName: null,
      createdAt: at,
    }
  }

  /**
   * Atualiza os contadores/estado do ticket com concorrência otimista + retry
   * (um PATCH humano pode correr com a ingestão). A mensagem já foi inserida.
   */
  private async applyToTicket(ticketId: string, mutate: (ticket: Ticket) => void): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const ticket = await this.tickets.byId(ticketId)
      if (!ticket) return
      const expected = ticket.version
      mutate(ticket)
      ticket.updatedAt = this.now()
      if (await this.tickets.update(ticket, expected)) return
    }
    this.logger.warn('ingest.ticket_update_conflict', { ticketId })
  }
}
