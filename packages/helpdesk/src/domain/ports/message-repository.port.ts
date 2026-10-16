import type { PublicCitation } from '@sistemazero/helpdesk-contracts'
import type { TicketMessage } from '../ticket/ticket-message'

export interface MessageCursor {
  position: number
}
export type PagedMessage = TicketMessage & MessageCursor
export interface MessagePageInput {
  limit: number
  before?: MessageCursor
  after?: MessageCursor
  publicOnly?: boolean
}
export interface MessageSource extends PublicCitation {
  text: string
}

export interface MessageRepository {
  create(message: TicketMessage): Promise<void>
  byTicketId(ticketId: string): Promise<TicketMessage[]>
  page(ticketId: string, input: MessagePageInput): Promise<PagedMessage[]>
  evidence(ids: string[]): Promise<Array<PublicCitation & { messageId: string }>>
  publicSource(ticketId: string, citationId: string, at: Date): Promise<MessageSource | null>
}
