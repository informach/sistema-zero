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
import { OAuthProviderError } from '../../domain/ports/oauth-provider.port'
import type {
  PendingReplyMessage,
  ReplyDeliveryRepository,
} from '../../domain/ports/reply-delivery-repository.port'
import type { SettingsRepository } from '../../domain/ports/settings-repository.port'
import type { TicketRepository } from '../../domain/ports/ticket-repository.port'
import type { Ticket } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'
import { buildReplyRaw } from '../../infrastructure/gateways/google/rfc2822'
import type { Actor } from '../actor'
import type { GmailAccountService } from '../connection/gmail-account.service'
import { type MessageView, type TicketView, toMessageView, toTicketView } from '../views'
import { buildPortalReplyNotification, type PortalUrls } from './portal-reply-notification'

/** Após esse prazo, uma intenção `pending` não é mais considerada envio em curso. */
const PENDING_DELIVERY_RECOVERY_AFTER_MS = 2 * 60_000

export interface ReplyServiceConfig {
  /** Nome de exibição no From (`From: <nome> <contato@…>`). */
  fromName: string
}

export interface ReplyInput {
  body: string
  version: number
}

/**
 * Responde um ticket. Dois canais, decididos pelo ticket:
 * - **e-mail** (ou portal que já vive numa thread do Gmail): envia pela Gmail API na
 *   mesma thread, remetente contato@. A intenção é gravada antes do side-effect e
 *   um timeout é reconciliado pelo Message-ID RFC 822, evitando reenvio cego.
 * - **portal** (`source: 'portal'` sem `gmailThreadId`): a resposta vira mensagem da
 *   conversa (visível no /ajuda na hora) e o aviso por e-mail entra na outbox na
 *   mesma transação. Não depende da caixa
 *   Gmail estar conectada nem da disponibilidade imediata do messaging.
 */
export class ReplyService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly messages: MessageRepository,
    private readonly deliveries: ReplyDeliveryRepository,
    private readonly connections: ConnectionRepository,
    private readonly settings: SettingsRepository,
    private readonly gmailAccount: GmailAccountService,
    private readonly gmail: GmailClient,
    private readonly config: ReplyServiceConfig,
    private readonly portalUrls: PortalUrls,
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
    // Ticket do portal que nunca passou pelo Gmail responde NO portal. Se a
    // conversa já vive numa thread do Gmail (legado respondido por e-mail, e o
    // cliente pode ter continuado por lá), segue pelo Gmail — a resposta também
    // aparece no portal, porque já é `visibility: 'customer'`.
    if (ticket.source === 'portal' && ticket.gmailThreadId === null) {
      return this.deliverToPortal(actor, ticket, input)
    }
    const connection = await this.requireConnection()
    const thread = await this.messages.byTicketId(ticketId)

    const body = await this.withSignature(input.body)
    return this.deliver({
      ticket,
      connection,
      thread,
      body,
      expectedVersion: input.version,
      sentVia: 'human',
      createdBy: actor.userId,
      createdByName: actor.displayName,
    })
  }

  /**
   * Resposta de ticket do PORTAL: sem transporte. Intenção e confirmação são o
   * mesmo passo (`appendPortalReply`, transacional, CAS em `version`), e o
   * aviso por e-mail entram na mesma transação; um worker entrega a outbox.
   */
  private async deliverToPortal(
    actor: Actor,
    ticket: Ticket,
    input: ReplyInput,
  ): Promise<{ ticket: TicketView; message: MessageView }> {
    const body = await this.withSignature(input.body)
    const createdAt = this.now()
    const message: TicketMessage = {
      id: this.idGen(),
      ticketId: ticket.id,
      kind: 'portal',
      visibility: 'customer',
      gmailMessageId: null,
      rfc822MessageId: null,
      // Portal não tem máquina de entrega (igual à mensagem inbound do portal);
      // `null` também mantém o DeliveryRecovery do app quieto.
      deliveryState: null,
      deliveryLastError: null,
      direction: 'outbound',
      sentVia: 'human',
      fromEmail: null,
      fromName: this.config.fromName,
      toEmails: [ticket.requesterEmail],
      ccEmails: [],
      subject: ticket.subject,
      bodyText: body,
      bodyHtml: null,
      snippet: body.slice(0, 500),
      attachments: [],
      isAutoreply: false,
      gmailInternalDate: null,
      createdBy: actor.userId,
      createdByName: actor.displayName,
      createdAt,
    }
    const result = await this.deliveries.appendPortalReply({
      ticketId: ticket.id,
      expectedVersion: input.version,
      message,
      notification: {
        id: this.idGen(),
        ticketId: ticket.id,
        messageId: message.id,
        payload: buildPortalReplyNotification({ ticket, message, urls: this.portalUrls }),
        status: 'pending',
        attempts: 0,
        nextAttemptAt: createdAt,
        leaseExpiresAt: null,
        lastError: null,
        sentAt: null,
        createdAt,
        updatedAt: createdAt,
      },
      at: createdAt,
    })
    if (result.status === 'not_found') throw new TicketNotFoundError()
    if (result.status === 'conflict' || result.status === 'pending') {
      throw new ConcurrencyConflictError()
    }
    return { ticket: toTicketView(result.ticket), message: toMessageView(result.message) }
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
    expectedVersion: number
    sentVia: 'human'
    createdBy: string | null
    createdByName: string | null
  }): Promise<{ ticket: TicketView; message: MessageView }> {
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

    const createdAt = this.now()
    const message: PendingReplyMessage = {
      id: this.idGen(),
      ticketId: ticket.id,
      kind: 'email',
      visibility: 'customer',
      gmailMessageId: null,
      rfc822MessageId: messageId,
      deliveryState: 'pending',
      deliveryLastError: null,
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
      gmailInternalDate: null,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt,
    }
    const intent = await this.deliveries.createIntent({
      ticketId: ticket.id,
      expectedVersion: input.expectedVersion,
      message,
      at: createdAt,
    })
    if (intent.status === 'not_found') throw new TicketNotFoundError()
    if (intent.status === 'conflict' || intent.status === 'pending') {
      throw new ConcurrencyConflictError()
    }

    // O intent já está persistido. Só um erro de transporte sem status é
    // ambíguo; falhas conhecidas são encerradas para liberar nova resposta.
    let accessToken: string | null = null
    try {
      accessToken = await this.gmailAccount.getFreshAccessToken(connection)
      const sent = await this.gmail.sendMessage(accessToken, {
        raw,
        threadId: ticket.gmailThreadId ?? undefined,
      })
      return this.confirmDelivery(message.id, sent.id, sent.threadId, this.now())
    } catch (error) {
      const mayHaveBeenAccepted = error instanceof GmailApiError && error.status === 0
      if (accessToken && mayHaveBeenAccepted) {
        const recovered = await this.reconcileAcceptedDelivery(accessToken, message, this.now())
        if (recovered) return recovered
        await this.deliveries.markUnknown(message.id, 'Envio sem confirmação do Gmail')
      } else {
        await this.deliveries.markFailed(
          message.id,
          error instanceof GmailApiError
            ? 'Envio recusado pelo Gmail'
            : 'Não foi possível obter acesso ao Gmail',
        )
      }
      if (error instanceof ConnectionNotConnectedError) throw error
      this.logger.error('reply.send_failed', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
      })
      if (error instanceof GmailApiError || error instanceof OAuthProviderError) {
        throw new GmailSendFailedError()
      }
      throw error
    }
  }

  /**
   * Reconsulta o Gmail por Message-ID após um timeout. Não reenvia nada: se o
   * Gmail não confirmar, a entrega continua `unknown` para decisão humana.
   */
  async reconcileDelivery(
    ticketId: string,
    messageId: string,
  ): Promise<{ reconciled: boolean; ticket?: TicketView; message: MessageView }> {
    const ticket = await this.tickets.byId(ticketId)
    if (!ticket) throw new TicketNotFoundError()
    const message = (await this.messages.byTicketId(ticketId)).find((item) => item.id === messageId)
    if (!message) throw new ConcurrencyConflictError('A entrega não está aguardando reconciliação')
    if (!this.canRecoverDelivery(message, this.now()) || !message.rfc822MessageId) {
      throw new ConcurrencyConflictError('A entrega não está aguardando reconciliação')
    }
    const delivery = {
      id: message.id,
      ticketId: message.ticketId,
      rfc822MessageId: message.rfc822MessageId,
    }
    const connection = await this.requireConnection()
    const accessToken = await this.gmailAccount.getFreshAccessToken(connection)
    const recovered = await this.reconcileAcceptedDelivery(accessToken, delivery, this.now())
    if (recovered) return { reconciled: true, ...recovered }
    return { reconciled: false, message: toMessageView(message) }
  }

  /**
   * O atendente confirmou que aceita o risco de não haver confirmação e vai
   * preparar outra resposta. O servidor só libera estado `unknown`.
   */
  async markDeliveryFailed(ticketId: string, messageId: string): Promise<{ message: MessageView }> {
    const ticket = await this.tickets.byId(ticketId)
    if (!ticket) throw new TicketNotFoundError()
    const message = (await this.messages.byTicketId(ticketId)).find((item) => item.id === messageId)
    if (!message || !this.canRecoverDelivery(message, this.now())) {
      throw new ConcurrencyConflictError('A entrega não está aguardando decisão')
    }
    const failed = await this.deliveries.markFailed(
      messageId,
      'Envio não confirmado descartado pela equipe',
    )
    if (!failed) throw new ConcurrencyConflictError('A entrega mudou antes da decisão')
    return { message: toMessageView(failed) }
  }

  private async confirmDelivery(
    messageId: string,
    gmailMessageId: string,
    gmailThreadId: string,
    at: Date,
  ): Promise<{ ticket: TicketView; message: MessageView }> {
    const delivered = await this.deliveries.markSent({
      messageId,
      gmailMessageId,
      gmailThreadId,
      at,
    })
    if (!delivered) throw new TicketNotFoundError()
    return { ticket: toTicketView(delivered.ticket), message: toMessageView(delivered.message) }
  }

  private canRecoverDelivery(message: TicketMessage, at: Date): boolean {
    if (message.deliveryState === 'unknown') return true
    return (
      message.deliveryState === 'pending' &&
      at.getTime() - message.createdAt.getTime() >= PENDING_DELIVERY_RECOVERY_AFTER_MS
    )
  }

  private async reconcileAcceptedDelivery(
    accessToken: string,
    message: Pick<PendingReplyMessage, 'id' | 'ticketId' | 'rfc822MessageId'>,
    at: Date,
  ): Promise<{ ticket: TicketView; message: MessageView } | null> {
    try {
      const sent = await this.gmail.findMessageByRfc822MessageId(
        accessToken,
        message.rfc822MessageId,
      )
      return sent ? await this.confirmDelivery(message.id, sent.id, sent.threadId, at) : null
    } catch (error) {
      this.logger.warn('reply.reconciliation_failed', {
        ticketId: message.ticketId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }
}

/** Garante o prefixo `Re: ` sem duplicar. */
function withReplyPrefix(subject: string): string {
  const clean = subject.trim() || '(sem assunto)'
  return /^re:\s/i.test(clean) ? clean : `Re: ${clean}`
}
