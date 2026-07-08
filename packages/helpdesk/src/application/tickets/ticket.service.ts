import { ConcurrencyConflictError, TicketNotFoundError } from '../../domain/helpdesk-errors'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { ListTicketsFilter, TicketRepository } from '../../domain/ports/ticket-repository.port'
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../domain/ticket/ticket'
import type { Actor } from '../actor'
import { type MessageView, type TicketView, toMessageView, toTicketView } from '../views'

export interface PatchTicketInput {
  status?: TicketStatus
  category?: TicketCategory | null
  priority?: TicketPriority | null
  /** null = desatribuir; string = atribuir ao próprio ator (assignToMe). */
  assignToMe?: boolean
  version: number
}

export class TicketService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly messages: MessageRepository,
    private readonly now: () => Date,
  ) {}

  async list(filter: ListTicketsFilter): Promise<{ items: TicketView[]; total: number }> {
    const { items, total } = await this.tickets.list(filter)
    return { items: items.map(toTicketView), total }
  }

  async byId(id: string): Promise<{ ticket: TicketView; messages: MessageView[] }> {
    const ticket = await this.requireTicket(id)
    const messages = await this.messages.byTicketId(id)
    return { ticket: toTicketView(ticket), messages: messages.map(toMessageView) }
  }

  async patch(actor: Actor, id: string, input: PatchTicketInput): Promise<TicketView> {
    const ticket = await this.requireTicket(id)
    if (input.status !== undefined) ticket.status = input.status
    if (input.category !== undefined) {
      ticket.category = input.category
      // Escolha humana de categoria trava a reclassificação automática.
      ticket.categoryManual = input.category !== null
    }
    if (input.priority !== undefined) ticket.priority = input.priority
    if (input.assignToMe !== undefined) {
      ticket.assignedTo = input.assignToMe ? actor.userId : null
      ticket.assignedToName = input.assignToMe ? actor.displayName : null
    }
    ticket.updatedAt = this.now()
    const ok = await this.tickets.update(ticket, input.version)
    if (!ok) throw new ConcurrencyConflictError()
    return toTicketView(ticket)
  }

  private async requireTicket(id: string): Promise<Ticket> {
    const ticket = await this.tickets.byId(id)
    if (!ticket) throw new TicketNotFoundError()
    return ticket
  }
}
