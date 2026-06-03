import { and, asc, count, desc, eq, inArray, lte, sql } from 'drizzle-orm'
import { Message, type MessageProps } from '../../../domain/message/message.aggregate'
import type {
  ListMessagesQuery,
  MessageRepository,
} from '../../../domain/ports/message-repository.port'
import { PG_CHANNELS } from './channels'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { messages, outbox } from './schema'

type MessageRow = typeof messages.$inferSelect

function toRow(message: Message): typeof messages.$inferInsert {
  const s = message.state
  return {
    id: message.id,
    channel: s.channel,
    templateKey: s.templateKey,
    templateId: s.templateId,
    recipientName: s.recipient.name,
    recipientEmail: s.recipient.email,
    recipientPhone: s.recipient.phone,
    variables: s.variables,
    renderedSubject: s.renderedSubject,
    renderedBody: s.renderedBody,
    senderId: s.senderId,
    laneId: s.laneId,
    priority: s.priority,
    status: s.status,
    providerMessageId: s.providerMessageId,
    failureReason: s.failureReason,
    failureCode: s.failureCode,
    scheduledAt: s.scheduledAt,
    nextAttemptAt: s.nextAttemptAt,
    attempts: s.attempts,
    maxAttempts: s.maxAttempts,
    consumerId: s.consumerId,
    idempotencyKey: s.idempotencyKey,
    version: s.version,
    createdAt: s.createdAt,
    sentAt: s.sentAt,
    deliveredAt: s.deliveredAt,
    readAt: s.readAt,
    terminalAt: s.terminalAt,
  }
}

function toAggregate(row: MessageRow): Message {
  const props: MessageProps = {
    channel: row.channel,
    templateKey: row.templateKey,
    templateId: row.templateId,
    recipient: { name: row.recipientName, email: row.recipientEmail, phone: row.recipientPhone },
    variables: row.variables,
    renderedSubject: row.renderedSubject,
    renderedBody: row.renderedBody,
    senderId: row.senderId,
    laneId: row.laneId,
    priority: row.priority,
    status: row.status,
    providerMessageId: row.providerMessageId,
    failureReason: row.failureReason,
    failureCode: row.failureCode,
    scheduledAt: row.scheduledAt,
    nextAttemptAt: row.nextAttemptAt,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    consumerId: row.consumerId,
    idempotencyKey: row.idempotencyKey,
    version: row.version,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
    deliveredAt: row.deliveredAt,
    readAt: row.readAt,
    terminalAt: row.terminalAt,
  }
  return Message.fromState(row.id, props)
}

export class DrizzleMessageRepository implements MessageRepository {
  constructor(private readonly db: Database) {}

  async create(message: Message): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(messages).values(toRow(message))
      const hadEvents = await this.writeEvents(tx, message)
      // Acorda o worker de envio na hora (poll é a rede de segurança).
      await tx.execute(sql`select pg_notify(${PG_CHANNELS.sends}, '')`)
      if (hadEvents) await tx.execute(sql`select pg_notify(${PG_CHANNELS.outbox}, '')`)
    })
  }

  async update(message: Message): Promise<void> {
    await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(messages)
        .set({ ...toRow(message), version: message.version + 1 })
        .where(and(eq(messages.id, message.id), eq(messages.version, message.version)))
        .returning({ id: messages.id })
      if (updated.length === 0) throw new ConcurrencyConflictError(message.id)
      const hadEvents = await this.writeEvents(tx, message)
      if (hadEvents) await tx.execute(sql`select pg_notify(${PG_CHANNELS.outbox}, '')`)
      // Pode ter voltado a QUEUED (retry) → reavalia no worker.
      await tx.execute(sql`select pg_notify(${PG_CHANNELS.sends}, '')`)
    })
  }

  private async writeEvents(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    message: Message,
  ): Promise<boolean> {
    const events = message.pullEvents()
    if (events.length === 0) return false
    await tx.insert(outbox).values(
      events.map((e) => ({
        aggregateId: e.aggregateId,
        eventName: e.eventName,
        payload: e.toPayload(),
      })),
    )
    return true
  }

  async findById(id: string): Promise<Message | null> {
    const [row] = await this.db.select().from(messages).where(eq(messages.id, id)).limit(1)
    return row ? toAggregate(row) : null
  }

  async findByProviderMessageId(providerMessageId: string): Promise<Message | null> {
    const [row] = await this.db
      .select()
      .from(messages)
      .where(eq(messages.providerMessageId, providerMessageId))
      .limit(1)
    return row ? toAggregate(row) : null
  }

  async findByIdempotency(consumerId: string, idempotencyKey: string): Promise<Message | null> {
    const [row] = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.consumerId, consumerId), eq(messages.idempotencyKey, idempotencyKey)))
      .limit(1)
    return row ? toAggregate(row) : null
  }

  async listForAdmin(query: ListMessagesQuery): Promise<{ items: Message[]; total: number }> {
    const conditions = [
      query.channel ? eq(messages.channel, query.channel) : undefined,
      query.status ? eq(messages.status, query.status) : undefined,
    ].filter(Boolean)
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await this.db
      .select()
      .from(messages)
      .where(where)
      .orderBy(desc(messages.createdAt))
      .limit(query.limit)
      .offset(query.offset)
    const totalRows = await this.db.select({ value: count() }).from(messages).where(where)
    return { items: rows.map(toAggregate), total: totalRows[0]?.value ?? 0 }
  }

  async claimDueEmail(limit: number, now: Date): Promise<Message[]> {
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.channel, 'email'),
            inArray(messages.status, ['QUEUED', 'SCHEDULED']),
            lte(messages.scheduledAt, now),
            lte(messages.nextAttemptAt, now),
          ),
        )
        .orderBy(desc(messages.priority), asc(messages.scheduledAt))
        .limit(limit)
        .for('update', { skipLocked: true })
      if (due.length === 0) return []
      const ids = due.map((r) => r.id)
      await tx.update(messages).set({ status: 'SENDING' }).where(inArray(messages.id, ids))
      return due.map((r) => toAggregate({ ...r, status: 'SENDING' }))
    })
  }

  async claimNextWhatsApp(now: Date): Promise<Message | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.channel, 'whatsapp'),
            inArray(messages.status, ['QUEUED', 'SCHEDULED']),
            lte(messages.scheduledAt, now),
            lte(messages.nextAttemptAt, now),
          ),
        )
        .orderBy(desc(messages.priority), asc(messages.scheduledAt))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!row) return null
      await tx.update(messages).set({ status: 'SENDING' }).where(eq(messages.id, row.id))
      return toAggregate({ ...row, status: 'SENDING' })
    })
  }
}
