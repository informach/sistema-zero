import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type {
  ListTicketsFilter,
  TicketRepository,
} from '../../../domain/ports/ticket-repository.port'
import type { Ticket } from '../../../domain/ticket/ticket'
import type { Database } from './db'
import { escapeLike } from './pg-errors'
import { tickets } from './schema'

export class DrizzleTicketRepository implements TicketRepository {
  constructor(private readonly db: Database) {}

  async create(ticket: Ticket): Promise<void> {
    await this.db.insert(tickets).values(ticket)
  }

  async byId(id: string): Promise<Ticket | null> {
    const [row] = await this.db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
    return row ?? null
  }

  async byGmailThreadId(threadId: string): Promise<Ticket | null> {
    const [row] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.gmailThreadId, threadId))
      .limit(1)
    return row ?? null
  }

  async update(ticket: Ticket, expectedVersion: number): Promise<boolean> {
    const updated = await this.db
      .update(tickets)
      .set({
        version: expectedVersion + 1,
        subject: ticket.subject,
        status: ticket.status,
        category: ticket.category,
        categoryManual: ticket.categoryManual,
        priority: ticket.priority,
        requesterName: ticket.requesterName,
        assignedTo: ticket.assignedTo,
        assignedToName: ticket.assignedToName,
        firstMessageAt: ticket.firstMessageAt,
        lastMessageAt: ticket.lastMessageAt,
        lastInboundAt: ticket.lastInboundAt,
        messageCount: ticket.messageCount,
        aiSummary: ticket.aiSummary,
        aiSummaryAt: ticket.aiSummaryAt,
        aiDraft: ticket.aiDraft,
        aiDraftAt: ticket.aiDraftAt,
        aiDraftEdited: ticket.aiDraftEdited,
        aiClassification: ticket.aiClassification,
        aiStatus: ticket.aiStatus,
        aiNextAttemptAt: ticket.aiNextAttemptAt,
        aiAttempts: ticket.aiAttempts,
        aiLastError: ticket.aiLastError,
        autoReplyState: ticket.autoReplyState,
        autoRepliedAt: ticket.autoRepliedAt,
        autoReplyReason: ticket.autoReplyReason,
        updatedAt: ticket.updatedAt,
      })
      .where(and(eq(tickets.id, ticket.id), eq(tickets.version, expectedVersion)))
      .returning({ id: tickets.id })
    const ok = updated.length > 0
    if (ok) ticket.version = expectedVersion + 1
    return ok
  }

  async claimForReply(id: string, expectedVersion: number, at: Date): Promise<boolean> {
    const claimed = await this.db
      .update(tickets)
      .set({ version: expectedVersion + 1, updatedAt: at })
      .where(and(eq(tickets.id, id), eq(tickets.version, expectedVersion)))
      .returning({ id: tickets.id })
    return claimed.length > 0
  }

  async list(filter: ListTicketsFilter): Promise<{ items: Ticket[]; total: number }> {
    const conditions = []
    if (filter.status) conditions.push(eq(tickets.status, filter.status))
    if (filter.category) conditions.push(eq(tickets.category, filter.category))
    if (filter.q) {
      const pattern = `%${escapeLike(filter.q)}%`
      conditions.push(
        or(
          ilike(tickets.subject, pattern),
          ilike(tickets.requesterEmail, pattern),
          ilike(sql`coalesce(${tickets.requesterName}, '')`, pattern),
        ),
      )
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(tickets)
        .where(where)
        // `id` como desempate: paginação estável quando `lastMessageAt` colide.
        .orderBy(desc(tickets.lastMessageAt), asc(tickets.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ value: count() }).from(tickets).where(where),
    ])
    return { items, total: totalRow?.value ?? 0 }
  }
}
