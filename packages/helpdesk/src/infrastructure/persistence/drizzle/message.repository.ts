import { asc, eq } from 'drizzle-orm'
import type { MessageRepository } from '../../../domain/ports/message-repository.port'
import type { TicketMessage } from '../../../domain/ticket/ticket-message'
import type { Database } from './db'
import { ticketMessages } from './schema'

export class DrizzleMessageRepository implements MessageRepository {
  constructor(private readonly db: Database) {}

  async create(message: TicketMessage): Promise<void> {
    await this.db.insert(ticketMessages).values(message)
  }

  async byTicketId(ticketId: string): Promise<TicketMessage[]> {
    return this.db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt), asc(ticketMessages.id))
  }
}
