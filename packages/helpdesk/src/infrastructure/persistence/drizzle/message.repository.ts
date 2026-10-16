import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import type { MessageRepository } from '../../../domain/ports/message-repository.port'
import type { TicketMessage } from '../../../domain/ticket/ticket-message'
import type { Database } from './db'
import {
  kbArticles,
  kbChunks,
  kbRevisions,
  messageEvidence,
  ticketMessages,
  tickets,
} from './schema'

export class DrizzleMessageRepository implements MessageRepository {
  constructor(private readonly db: Database) {}

  async create(message: TicketMessage): Promise<void> {
    await this.db.insert(ticketMessages).values(message)
  }

  async page(ticketId: string, input: Parameters<MessageRepository['page']>[1]) {
    const cursor = input.after ?? input.before
    const tuple = cursor
      ? input.after
        ? sql`${ticketMessages.position}>${cursor.position}`
        : sql`${ticketMessages.position}<${cursor.position}`
      : undefined
    const order = input.after ? asc : desc
    return this.db
      .select()
      .from(ticketMessages)
      .where(
        and(
          eq(ticketMessages.ticketId, ticketId),
          tuple,
          input.publicOnly
            ? and(
                eq(ticketMessages.visibility, 'customer'),
                sql`${ticketMessages.kind} <> 'note'`,
                or(isNull(ticketMessages.deliveryState), eq(ticketMessages.deliveryState, 'sent')),
              )
            : undefined,
        ),
      )
      .orderBy(order(ticketMessages.position))
      .limit(input.limit + 1)
  }

  async evidence(ids: string[]) {
    if (!ids.length) return []
    return this.db
      .select({
        id: messageEvidence.id,
        messageId: messageEvidence.messageId,
        title: messageEvidence.title,
        section: messageEvidence.section,
        revisionNumber: messageEvidence.revisionNumber,
      })
      .from(messageEvidence)
      .where(inArray(messageEvidence.messageId, ids))
      .orderBy(asc(messageEvidence.id))
  }

  async publicSource(ticketId: string, citationId: string, at: Date) {
    const [source] = await this.db
      .select({
        id: messageEvidence.id,
        title: messageEvidence.title,
        section: messageEvidence.section,
        revisionNumber: messageEvidence.revisionNumber,
        text: kbChunks.text,
      })
      .from(messageEvidence)
      .innerJoin(ticketMessages, eq(ticketMessages.id, messageEvidence.messageId))
      .innerJoin(tickets, eq(tickets.id, ticketMessages.ticketId))
      .innerJoin(kbArticles, eq(kbArticles.id, messageEvidence.articleId))
      .innerJoin(kbRevisions, eq(kbRevisions.id, messageEvidence.revisionId))
      .innerJoin(kbChunks, eq(kbChunks.id, messageEvidence.chunkId))
      .where(
        and(
          eq(ticketMessages.ticketId, ticketId),
          eq(messageEvidence.id, citationId),
          eq(ticketMessages.visibility, 'customer'),
          or(isNull(ticketMessages.deliveryState), eq(ticketMessages.deliveryState, 'sent')),
          eq(kbArticles.archived, false),
          eq(kbArticles.publishedRevisionId, kbRevisions.id),
          eq(kbRevisions.indexState, 'ready'),
          sql`${kbRevisions.validUntil} > ${at.toISOString()}::timestamptz`,
          sql`(${kbRevisions.audience} = 'customer_all' or ${kbRevisions.audience}::text = case when ${tickets.portal} = 'kids' then 'customer_parent' else 'customer_adult' end)`,
          sql`${tickets.portal} is not null`,
          sql`(${kbRevisions.product} = 'all' or ${kbRevisions.product}::text = case when ${tickets.category} = 'studio' then 'studio' when ${tickets.portal} = 'kids' then 'kids' else 'community' end)`,
        ),
      )
    return source ?? null
  }

  async byTicketId(ticketId: string): Promise<TicketMessage[]> {
    return this.db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt), asc(ticketMessages.id))
  }
}
