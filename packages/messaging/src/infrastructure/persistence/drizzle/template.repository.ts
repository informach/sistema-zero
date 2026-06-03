import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import type {
  ListTemplatesQuery,
  TemplateRepository,
} from '../../../domain/ports/template-repository.port'
import type { Channel } from '../../../domain/shared/channel'
import { Template, type TemplateProps } from '../../../domain/template/template.aggregate'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { messageTemplates } from './schema'

type TemplateRow = typeof messageTemplates.$inferSelect

function toRow(t: Template): typeof messageTemplates.$inferInsert {
  const s = t.state
  return {
    id: t.id,
    key: s.key,
    channel: s.channel,
    name: s.name,
    subject: s.subject,
    body: s.body,
    variables: s.variables,
    active: s.active,
    version: s.version,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

function toAggregate(row: TemplateRow): Template {
  const props: TemplateProps = {
    key: row.key,
    channel: row.channel,
    name: row.name,
    subject: row.subject,
    body: row.body,
    variables: row.variables,
    active: row.active,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  return Template.fromState(row.id, props)
}

export class DrizzleTemplateRepository implements TemplateRepository {
  constructor(private readonly db: Database) {}

  async create(template: Template): Promise<void> {
    await this.db.insert(messageTemplates).values(toRow(template))
  }

  async update(template: Template): Promise<void> {
    const updated = await this.db
      .update(messageTemplates)
      .set({ ...toRow(template), version: template.version + 1 })
      .where(
        and(eq(messageTemplates.id, template.id), eq(messageTemplates.version, template.version)),
      )
      .returning({ id: messageTemplates.id })
    if (updated.length === 0) throw new ConcurrencyConflictError(template.id)
  }

  async findById(id: string): Promise<Template | null> {
    const [row] = await this.db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, id))
      .limit(1)
    return row ? toAggregate(row) : null
  }

  async findByChannelAndKey(channel: Channel, key: string): Promise<Template | null> {
    const [row] = await this.db
      .select()
      .from(messageTemplates)
      .where(and(eq(messageTemplates.channel, channel), eq(messageTemplates.key, key)))
      .limit(1)
    return row ? toAggregate(row) : null
  }

  async list(query: ListTemplatesQuery): Promise<{ items: Template[]; total: number }> {
    const conditions = [
      query.channel ? eq(messageTemplates.channel, query.channel) : undefined,
      query.q
        ? or(
            ilike(messageTemplates.name, `%${query.q}%`),
            ilike(messageTemplates.key, `%${query.q}%`),
          )
        : undefined,
    ].filter(Boolean)
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await this.db
      .select()
      .from(messageTemplates)
      .where(where)
      .orderBy(desc(messageTemplates.updatedAt))
      .limit(query.limit)
      .offset(query.offset)
    const totalRows = await this.db.select({ value: count() }).from(messageTemplates).where(where)
    return { items: rows.map(toAggregate), total: totalRows[0]?.value ?? 0 }
  }
}
