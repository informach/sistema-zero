import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import type {
  ListTemplatesQuery,
  TemplateRepository,
} from '../../../domain/ports/template-repository.port'
import type { Channel } from '../../../domain/shared/channel'
import { Template, type TemplateProps } from '../../../domain/template/template.aggregate'
import { TemplateAlreadyExistsError } from '../../../domain/template/template.errors'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { messageTemplates } from './schema'

/**
 * 23505 (unique_violation) pode vir encapsulado em vários níveis (ex.: drizzle)
 * — subimos a causa para identificar a violação real sem depender do tipo do
 * driver.
 */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

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
    try {
      await this.db.insert(messageTemplates).values(toRow(template))
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new TemplateAlreadyExistsError(
          `Já existe template ${template.state.channel}/${template.state.key}`,
        )
      }
      throw error
    }
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
    // Escapa os curingas do LIKE (`%`/`_`) e o próprio escape (`\`) — um `q`
    // com `%` viraria match-tudo (busca literal, não padrão).
    const like = query.q ? `%${query.q.replace(/[\\%_]/g, '\\$&')}%` : null
    const conditions = [
      query.channel ? eq(messageTemplates.channel, query.channel) : undefined,
      like ? or(ilike(messageTemplates.name, like), ilike(messageTemplates.key, like)) : undefined,
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
