import type { Ticket, TicketStatus } from '../ticket/ticket'
import type { TicketMessage } from '../ticket/ticket-message'

/** Identidade da conta responsável, resolvida pelo gateway — jamais pelo corpo HTTP. */
export interface CustomerTicketOwner {
  accountId: string
  email: string
}

export interface CustomerTicketsFilter extends CustomerTicketOwner {
  status?: TicketStatus
  limit: number
  /** Último item já visto, na ordem `lastMessageAt DESC, id ASC`. */
  cursor: CustomerTicketCursor | null
}

export interface CustomerTicketCursor {
  lastMessageAt: Date
  id: string
}

/**
 * Persistência transacional da área do cliente. O adapter aplica ownership no
 * próprio SQL para que um id de ticket nunca atravesse a fronteira da conta.
 */
export interface CustomerTicketRepository {
  createWithInitialMessage(input: { ticket: Ticket; message: TicketMessage }): Promise<void>
  listOwned(filter: CustomerTicketsFilter): Promise<{ items: Ticket[]; total: number }>
  byIdOwned(id: string, owner: CustomerTicketOwner): Promise<Ticket | null>
  appendCustomerMessage(input: {
    ticketId: string
    owner: CustomerTicketOwner
    message: TicketMessage
    at: Date
    aiEnabled: boolean
  }): Promise<{ ticket: Ticket; message: TicketMessage } | null>
}
