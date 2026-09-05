import type { TicketMessage } from '../ticket/ticket-message'

export interface MessageRepository {
  create(message: TicketMessage): Promise<void>
  byTicketId(ticketId: string): Promise<TicketMessage[]>
}
