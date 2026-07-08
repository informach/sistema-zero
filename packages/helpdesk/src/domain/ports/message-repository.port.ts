import type { TicketMessage } from '../ticket/ticket-message'

export interface MessageRepository {
  create(message: TicketMessage): Promise<void>
  byTicketId(ticketId: string): Promise<TicketMessage[]>
  /** Dedupe da ingestão: a mensagem do Gmail já foi persistida? */
  existsByGmailMessageId(gmailMessageId: string): Promise<boolean>
}
