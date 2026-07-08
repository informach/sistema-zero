import type { Logger } from '@sistemazero/core/logging'
import type { GmailConnection } from '../../domain/connection/gmail-connection'
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

/** Resultado da auto-resposta (F4): sent + motivo quando NÃO enviou. */
export interface AutoReplyResult {
  sent: boolean
  reason?: string
}

/**
 * Responde um ticket enviando o e-mail pela Gmail API (mesma thread, remetente
 * contato@). Guard de fase anti-duplo-envio: CLAIM atômico ANTES do send
 * (`version` no humano, `auto_reply_state` na IA) → um e-mail só. Crash entre o
 * send e a persistência → o poller re-ingere a mensagem enviada (dedupe por
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

  /** Resposta HUMANA (rota): guard por `version`. */
  async reply(
    actor: Actor,
    ticketId: string,
    input: ReplyInput,
  ): Promise<{ ticket: TicketView; message: MessageView }> {
    const ticket = await this.tickets.byId(ticketId)
    if (!ticket) throw new TicketNotFoundError()
    const connection = await this.requireConnection()
    const thread = await this.messages.byTicketId(ticketId)

    // CLAIM (fase 1): reserva o envio ANTES de mandar o e-mail. 0 linhas = corrida.
    const claimed = await this.tickets.claimForReply(ticketId, input.version, this.now())
    if (!claimed) throw new ConcurrencyConflictError()

    const body = await this.withSignature(input.body)
    const { ticket: updated, message } = await this.deliver({
      ticket,
      connection,
      thread,
      body,
      sentVia: input.viaAi ? 'ai' : 'human',
      createdBy: actor.userId,
      createdByName: actor.displayName,
    })
    return { ticket: toTicketView(updated), message: toMessageView(message) }
  }

  /**
   * AUTO-resposta da IA (F4): guard de fase `auto_reply_state` (none→sending),
   * NÃO usa `version`. Falha/crash → `aborted` (nunca re-tenta); o rascunho fica
   * para revisão humana.
   */
  async autoReply(ticketId: string, draftBody: string): Promise<AutoReplyResult> {
    const ticket = await this.tickets.byId(ticketId)
    if (!ticket) return { sent: false, reason: 'Ticket não encontrado' }
    const connection = await this.connections.current()
    if (connection?.status !== 'connected') {
      return { sent: false, reason: 'Caixa do Gmail não conectada' }
    }
    // GUARD DE FASE: reserva atômica antes do side-effect. false = já processada.
    if (!(await this.tickets.claimAutoReply(ticketId, this.now()))) {
      return { sent: false, reason: 'Auto-resposta já processada' }
    }
    const thread = await this.messages.byTicketId(ticketId)
    const body = await this.withSignature(draftBody)
    try {
      await this.deliver({
        ticket,
        connection,
        thread,
        body,
        sentVia: 'ai',
        createdBy: null,
        createdByName: 'IA',
      })
      await this.tickets.finishAutoReply(ticketId, 'sent', null, this.now())
      return { sent: true }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error('auto_reply.send_failed', { ticketId, error: reason })
      // sending→aborted: retry ambíguo vira falha honesta. Não sabemos se o e-mail
      // saiu (o poller re-ingere se saiu); NUNCA reenvia. Rascunho fica p/ humano.
      await this.tickets.finishAutoReply(
        ticketId,
        'aborted',
        'Falha no envio automático',
        this.now(),
      )
      return { sent: false, reason: 'Falha no envio automático' }
    }
  }

  private async requireConnection(): Promise<GmailConnection> {
    const connection = await this.connections.current()
    if (connection?.status !== 'connected') throw new ConnectionNotConnectedError()
    return connection
  }

  private async withSignature(body: string): Promise<string> {
    const signature = (await this.settings.get()).signature.trim()
    const trimmed = body.trim()
    return signature ? `${trimmed}\n\n${signature}` : trimmed
  }

  /** Núcleo do envio: monta RFC 2822, envia e persiste o outbound + `waiting`. */
  private async deliver(input: {
    ticket: Ticket
    connection: GmailConnection
    thread: TicketMessage[]
    body: string
    sentVia: 'human' | 'ai'
    createdBy: string | null
    createdByName: string | null
  }): Promise<{ ticket: Ticket; message: TicketMessage }> {
    const { ticket, connection, thread, body, sentVia } = input
    const lastInbound = [...thread].reverse().find((m) => m.direction === 'inbound')
    const toEmail = lastInbound?.fromEmail ?? ticket.requesterEmail
    const toName = lastInbound?.fromName ?? ticket.requesterName
    const domain = connection.emailAddress.split('@')[1] ?? 'sistemazero.com.br'
    const messageId = `<${this.idGen()}@${domain}>`
    const references = lastInbound?.rfc822MessageId ? [lastInbound.rfc822MessageId] : []
    const raw = buildReplyRaw({
      fromName: this.config.fromName,
      fromEmail: connection.emailAddress,
      toName,
      toEmail,
      subject: withReplyPrefix(ticket.subject),
      bodyText: body,
      inReplyTo: lastInbound?.rfc822MessageId ?? null,
      references,
      messageId,
    })

    // SEND: o token fresco pode marcar needs_reauth (→ ConnectionNotConnected).
    let sent: { id: string; threadId: string }
    try {
      const accessToken = await this.gmailAccount.getFreshAccessToken(connection)
      sent = await this.gmail.sendMessage(accessToken, { raw, threadId: ticket.gmailThreadId })
    } catch (error) {
      if (error instanceof ConnectionNotConnectedError) throw error
      this.logger.error('reply.send_failed', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
      })
      if (error instanceof GmailApiError) throw new GmailSendFailedError()
      throw error
    }

    // COMMIT: persiste o outbound (o poller deduplica pelo id) + `waiting`.
    const at = this.now()
    const message: TicketMessage = {
      id: this.idGen(),
      ticketId: ticket.id,
      kind: 'email',
      gmailMessageId: sent.id,
      rfc822MessageId: messageId,
      direction: 'outbound',
      sentVia,
      fromEmail: connection.emailAddress,
      fromName: this.config.fromName,
      toEmails: [toEmail],
      ccEmails: [],
      subject: withReplyPrefix(ticket.subject),
      bodyText: body,
      bodyHtml: null,
      snippet: null,
      attachments: [],
      isAutoreply: false,
      gmailInternalDate: at,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: at,
    }
    await this.messages.create(message)
    const updated = await this.applyReplyToTicket(ticket.id)
    return { ticket: updated, message }
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
