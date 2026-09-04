import { and, asc, count, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm'
import type {
  CustomerTicketOwner,
  CustomerTicketRepository,
  CustomerTicketsFilter,
} from '../../../domain/ports/customer-ticket-repository.port'
import type { Database } from './db'
import { ticketMessages, tickets } from './schema'

/** Queries do portal. Ownership fica no WHERE, não apenas no service. */
export class DrizzleCustomerTicketRepository implements CustomerTicketRepository {
  constructor(private readonly db: Database) {}

  async createWithInitialMessage(input: {
    ticket: Parameters<CustomerTicketRepository['createWithInitialMessage']>[0]['ticket']
    message: Parameters<CustomerTicketRepository['createWithInitialMessage']>[0]['message']
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(tickets).values(input.ticket)
      await tx.insert(ticketMessages).values(input.message)
    })
  }

  async listOwned(filter: CustomerTicketsFilter): Promise<{
    items: (typeof tickets.$inferSelect)[]
    total: number
  }> {
    const owned = this.ownedWhere(filter, filter.status)
    const afterCursor = filter.cursor
      ? or(
          lt(tickets.lastMessageAt, filter.cursor.lastMessageAt),
          and(
            eq(tickets.lastMessageAt, filter.cursor.lastMessageAt),
            gt(tickets.id, filter.cursor.id),
          ),
        )
      : undefined
    const where = afterCursor ? and(owned, afterCursor) : owned
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(tickets)
        .where(where)
        .orderBy(desc(tickets.lastMessageAt), asc(tickets.id))
        // Busca uma linha extra para dizer `hasMore` sem depender de `total`,
        // que pode mudar enquanto o usuário percorre a própria fila.
        .limit(filter.limit + 1),
      this.db.select({ value: count() }).from(tickets).where(owned),
    ])
    return { items, total: Number(totalRow?.value ?? 0) }
  }

  async byIdOwned(
    id: string,
    owner: CustomerTicketOwner,
  ): Promise<typeof tickets.$inferSelect | null> {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), this.ownedWhere(owner)))
      .limit(1)
    return ticket ?? null
  }

  async appendCustomerMessage(input: {
    ticketId: string
    owner: CustomerTicketOwner
    message: Parameters<CustomerTicketRepository['appendCustomerMessage']>[0]['message']
    at: Date
    aiEnabled: boolean
  }): Promise<{
    ticket: typeof tickets.$inferSelect
    message: typeof ticketMessages.$inferSelect
  } | null> {
    return this.db.transaction(async (tx) => {
      // postgres.js sob Bun exige ISO string dentro de SQL cru.
      const atIso = input.at.toISOString()
      const [ticket] = await tx
        .update(tickets)
        .set({
          version: sql`${tickets.version} + 1`,
          status: sql`case
            when ${tickets.status} in ('waiting', 'resolved', 'closed') then 'open'::helpdesk.ticket_status
            else ${tickets.status}
          end`,
          resolvedAt: sql`case
            when ${tickets.status} in ('resolved', 'closed') then null
            else ${tickets.resolvedAt}
          end`,
          messageCount: sql`${tickets.messageCount} + 1`,
          lastMessageAt: sql`greatest(${tickets.lastMessageAt}, ${atIso}::timestamptz)`,
          lastInboundAt: sql`greatest(coalesce(${tickets.lastInboundAt}, ${atIso}::timestamptz), ${atIso}::timestamptz)`,
          ...(input.aiEnabled
            ? {
                aiStatus: 'pending' as const,
                aiNextAttemptAt: input.at,
                aiAttempts: 0,
                aiLastError: null,
              }
            : {}),
          updatedAt: input.at,
        })
        .where(and(eq(tickets.id, input.ticketId), this.ownedWhere(input.owner)))
        .returning()
      if (!ticket) return null

      const [message] = await tx.insert(ticketMessages).values(input.message).returning()
      return message ? { ticket, message } : null
    })
  }

  private ownedWhere(owner: CustomerTicketOwner, status?: CustomerTicketsFilter['status']) {
    const ownership = or(
      eq(tickets.requesterAccountId, owner.accountId),
      and(
        isNull(tickets.requesterAccountId),
        sql`lower(${tickets.requesterEmail}) = lower(${owner.email})`,
      ),
    )
    return status ? and(ownership, eq(tickets.status, status)) : ownership
  }
}
