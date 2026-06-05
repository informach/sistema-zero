import { and, count, desc, eq, ne } from 'drizzle-orm'
import type {
  SaveSenderOptions,
  SenderRepository,
} from '../../../domain/ports/sender-repository.port'
import { EmailSender, type EmailSenderProps } from '../../../domain/sender/email-sender.aggregate'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { emailSenders } from './schema'

type SenderRow = typeof emailSenders.$inferSelect

function toRow(s: EmailSender): typeof emailSenders.$inferInsert {
  const p = s.state
  return {
    id: s.id,
    fromEmail: p.fromEmail,
    fromName: p.fromName,
    replyTo: p.replyTo,
    status: p.status,
    enabled: p.enabled,
    isDefault: p.isDefault,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

function toAggregate(row: SenderRow): EmailSender {
  const props: EmailSenderProps = {
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    replyTo: row.replyTo,
    status: row.status,
    enabled: row.enabled,
    isDefault: row.isDefault,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  return EmailSender.fromState(row.id, props)
}

export class DrizzleSenderRepository implements SenderRepository {
  constructor(private readonly db: Database) {}

  async create(sender: EmailSender, opts: SaveSenderOptions = {}): Promise<void> {
    // Promoção de default é ATÔMICA: limpar os demais + inserir na MESMA transação.
    // Falha no meio nunca deixa o sistema sem remetente default.
    await this.db.transaction(async (tx) => {
      if (opts.clearOtherDefaults) {
        await tx
          .update(emailSenders)
          .set({ isDefault: false })
          .where(and(eq(emailSenders.isDefault, true), ne(emailSenders.id, sender.id)))
      }
      await tx.insert(emailSenders).values(toRow(sender))
    })
  }

  async update(sender: EmailSender, opts: SaveSenderOptions = {}): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (opts.clearOtherDefaults) {
        await tx
          .update(emailSenders)
          .set({ isDefault: false })
          .where(and(eq(emailSenders.isDefault, true), ne(emailSenders.id, sender.id)))
      }
      const updated = await tx
        .update(emailSenders)
        .set({ ...toRow(sender), version: sender.version + 1 })
        .where(and(eq(emailSenders.id, sender.id), eq(emailSenders.version, sender.version)))
        .returning({ id: emailSenders.id })
      if (updated.length === 0) throw new ConcurrencyConflictError(sender.id)
    })
  }

  async findById(id: string): Promise<EmailSender | null> {
    const [row] = await this.db.select().from(emailSenders).where(eq(emailSenders.id, id)).limit(1)
    return row ? toAggregate(row) : null
  }

  async findByEmail(fromEmail: string): Promise<EmailSender | null> {
    const [row] = await this.db
      .select()
      .from(emailSenders)
      .where(eq(emailSenders.fromEmail, fromEmail.trim().toLowerCase()))
      .limit(1)
    return row ? toAggregate(row) : null
  }

  async findDefault(): Promise<EmailSender | null> {
    const [row] = await this.db
      .select()
      .from(emailSenders)
      .where(and(eq(emailSenders.isDefault, true), eq(emailSenders.enabled, true)))
      .limit(1)
    return row ? toAggregate(row) : null
  }

  async list(query: { limit: number; offset: number }): Promise<{
    items: EmailSender[]
    total: number
  }> {
    const rows = await this.db
      .select()
      .from(emailSenders)
      .orderBy(desc(emailSenders.createdAt))
      .limit(query.limit)
      .offset(query.offset)
    const totalRows = await this.db.select({ value: count() }).from(emailSenders)
    return { items: rows.map(toAggregate), total: totalRows[0]?.value ?? 0 }
  }
}
