import type { Ticket } from '../ticket/ticket'
import type { TicketMessage } from '../ticket/ticket-message'
import type { PortalNotificationOutboxItem } from './portal-notification-outbox.port'

export interface PendingReplyMessage extends TicketMessage {
  gmailMessageId: null
  rfc822MessageId: string
  deliveryState: 'pending'
}

export interface ReplyDeliveryIntent {
  ticket: Ticket
  message: PendingReplyMessage
}

export type CreateReplyIntentResult =
  | { status: 'created'; intent: ReplyDeliveryIntent }
  | { status: 'conflict' }
  | { status: 'pending' }
  | { status: 'not_found' }

export type AppendPortalReplyResult =
  | { status: 'created'; ticket: Ticket; message: TicketMessage }
  | { status: 'conflict' }
  | { status: 'pending' }
  | { status: 'not_found' }

/**
 * Outbox transacional da resposta humana. A intenção e o bump de versão são
 * persistidos antes do Gmail; assim um timeout nunca se transforma em reenvio
 * cego ou em mensagem perdida.
 */
export interface ReplyDeliveryRepository {
  createIntent(input: {
    ticketId: string
    expectedVersion: number
    message: PendingReplyMessage
    at: Date
  }): Promise<CreateReplyIntentResult>
  markSent(input: {
    messageId: string
    gmailMessageId: string
    gmailThreadId: string
    at: Date
  }): Promise<{ ticket: Ticket; message: TicketMessage } | null>
  markUnknown(messageId: string, error: string): Promise<void>
  /** Falha conhecida antes de confirmação do Gmail; libera uma nova resposta. */
  markFailed(messageId: string, error: string): Promise<TicketMessage | null>
  /**
   * Resposta de ticket do PORTAL: não há transporte, então intenção e
   * confirmação são o mesmo passo — grava a mensagem e move o ticket (CAS em
   * `version`, `waiting`, contadores) numa transação só. Mantém o guarda de
   * "uma saída em voo por ticket" do `createIntent` (`pending`).
   */
  appendPortalReply(input: {
    ticketId: string
    expectedVersion: number
    message: TicketMessage
    notification: PortalNotificationOutboxItem
    at: Date
  }): Promise<AppendPortalReplyResult>
}
