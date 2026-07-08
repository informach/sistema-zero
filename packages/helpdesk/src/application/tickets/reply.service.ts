import type { Logger } from '@sistemazero/core/logging'
import {
  ConcurrencyConflictError,
  ConnectionNotConnectedError,
  GmailSendFailedError,
  TicketNotFoundError,
} from '../../domain/helpdesk-errors'
import type { ConnectionRepository } from '../../domain/ports/connection-repository.port'
import { GmailApiError, type GmailClient } from '../../domain/ports/gmail-client.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { SettingsRepository } from '../../domain/ports/settings-repository.port'
import type { TicketRepository } from '../../domain/ports/ticket-repository.port'
import type { Ticket } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'
import { buildReplyRaw } from '../../infrastructure/gateways/google/rfc2822'
import type { Actor } from '../actor'
import type { GmailAccountService } from '../connection/gmail-account.service'
import { type MessageView, type TicketView, toMessageView, toTicketView } from '../views'

export interface ReplyServiceConfig {
  /** Nome de exibição no From (`From: <nome> <contato@…>`). */
  fromName: string
}

export interface ReplyInput {
  body: string
  version: number
  /** Enviada pela IA (auto-resposta, F4) → sentVia='ai'. Default humano. */
  viaAi?: boolean
}

/**
 * Responde um ticket enviando o e-mail pela Gmail API (mesma thread, remetente
 * contato@). Guard de fase anti-duplo-envio: CLAIM atômico (bump de version)
 * ANTES do send → duplo-clique/stale = 409, um e-mail só. Crash entre o send e a
 * persistência → o poller re-ingere a mensagem enviada (dedupe por
 * gmail_message_id), nunca perde nem duplica.
 */
export class ReplyService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly messages: MessageRepository,
    private readonly connections: ConnectionRepository,
    private readonly settings: SettingsRepository,
    private readonly gmailAccount: GmailAccountService,
    private readonly gmail: GmailClient,
    private readonly config: ReplyServiceConfig,
    private readonly now: () => Date,
    private readonly idGen: () => string,
    private readonly logger: Logger,
  ) {}

  async reply(
    actor: Actor,
    ticketId: string,
    input: ReplyInput,
  ): Promise<{ ticket: TicketView; message: MessageView }> {
    const ticket = await this.tickets.byId(ticketId)
    if (!ticket) throw new TicketNotFoundError()
    const connection = await this.connections.current()
    if (connection?.status !== 'connected') {
      throw new ConnectionNotConnectedError()
    }

    const thread = await this.messages.byTicketId(ticketId)
    const lastInbound = [...thread].reverse().find((m) => m.direction === 'inbound')
    const toEmail = lastInbound?.fromEmail ?? ticket.requesterEmail
    const toName = lastInbound?.fromName ?? ticket.requesterName

    // CLAIM (fase 1): reserva o envio ANTES de mandar o e-mail. 0 linhas = corrida.
    const claimed = await this.tickets.claimForReply(ticketId, input.version, this.now())
    if (!claimed) throw new ConcurrencyConflictError()

    const settings = await this.settings.get()
    const signature = settings.signature.trim()
    const fullBody = signature ? `${input.body.trim()}\n\n${signature}` : input.body.trim()
    const domain = connection.emailAddress.split('@')[1] ?? 'sistemazero.com.br'
    const messageId = `<${this.idGen()}@${domain}>`
    const references = lastInbound?.rfc822MessageId ? [lastInbound.rfc822MessageId] : []
    const raw = buildReplyRaw({
      fromName: this.config.fromName,
      fromEmail: connection.emailAddress,
      toName,
      toEmail,
      subject: withReplyPrefix(ticket.subject),
      bodyText: fullBody,
      inReplyTo: lastInbound?.rfc822MessageId ?? null,
      references,
      messageId,
    })

    // SEND (fase 2): o token fresco pode marcar needs_reauth (→ ConnectionNotConnected).
    let sent: { id: string; threadId: string }
    try {
      const accessToken = await this.gmailAccount.getFreshAccessToken(connection)
      sent = await this.gmail.sendMessage(accessToken, { raw, threadId: ticket.gmailThreadId })
    } catch (error) {
      if (error instanceof ConnectionNotConnectedError) throw error
      this.logger.error('reply.send_failed', {
        ticketId,
        error: error instanceof Error ? error.message : String(error),
      })
      if (error instanceof GmailApiError) throw new GmailSendFailedError()
      throw error
    }

    // COMMIT (fase 3): persiste o outbound (o poller deduplica pelo id) + waiting.
    const at = this.now()
    const message: TicketMessage = {
      id: this.idGen(),
      ticketId,
      kind: 'email',
      gmailMessageId: sent.id,
      rfc822MessageId: messageId,
      direction: 'outbound',
      sentVia: input.viaAi ? 'ai' : 'human',
      fromEmail: connection.emailAddress,
      fromName: this.config.fromName,
      toEmails: [toEmail],
      ccEmails: [],
      subject: withReplyPrefix(ticket.subject),
      bodyText: fullBody,
      bodyHtml: null,
      snippet: null,
      attachments: [],
      gmailInternalDate: at,
      createdBy: actor.userId,
      createdByName: actor.displayName,
      createdAt: at,
    }
    await this.messages.create(message)
    const updated = await this.applyReplyToTicket(ticketId)

    return { ticket: toTicketView(updated), message: toMessageView(message) }
  }

  /** Marca `waiting` + contadores; retry contra corrida com o poller. */
  private async applyReplyToTicket(ticketId: string): Promise<Ticket> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const ticket = await this.tickets.byId(ticketId)
      if (!ticket) throw new TicketNotFoundError()
      const expected = ticket.version
      ticket.status = 'waiting'
      ticket.messageCount += 1
      ticket.lastMessageAt = this.now()
      ticket.updatedAt = this.now()
      if (await this.tickets.update(ticket, expected)) return ticket
    }
    // Não deu p/ fechar o bookkeeping (corrida persistente): devolve o estado atual.
    this.logger.warn('reply.ticket_update_conflict', { ticketId })
    const ticket = await this.tickets.byId(ticketId)
    if (!ticket) throw new TicketNotFoundError()
    return ticket
  }
}

/** Garante o prefixo `Re: ` sem duplicar. */
function withReplyPrefix(subject: string): string {
  const clean = subject.trim() || '(sem assunto)'
  return /^re:\s/i.test(clean) ? clean : `Re: ${clean}`
}
