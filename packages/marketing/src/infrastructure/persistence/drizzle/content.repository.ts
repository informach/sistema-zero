import { and, asc, count, desc, eq, ilike } from 'drizzle-orm'
import type { Content, StageEvent } from '../../../domain/content/content'
import type { ContentStage } from '../../../domain/content/stage'
import type {
  ContentRepository,
  ListContentsFilter,
} from '../../../domain/ports/content-repository.port'
import type { Database } from './db'
import { escapeLike } from './pg-errors'
import { contentStageEvents, contents } from './schema'

export class DrizzleContentRepository implements ContentRepository {
  constructor(private readonly db: Database) {}

  async create(content: Content): Promise<void> {
    await this.db.insert(contents).values(content)
  }

  async byId(id: string): Promise<Content | null> {
    const [row] = await this.db.select().from(contents).where(eq(contents.id, id)).limit(1)
    return row ?? null
  }

  async update(content: Content, expectedVersion: number): Promise<boolean> {
    const updated = await this.db
      .update(contents)
      .set({
        version: content.version,
        title: content.title,
        stage: content.stage,
        brief: content.brief,
        script: content.script,
        ownerUserId: content.ownerUserId,
        ownerName: content.ownerName,
        dueDate: content.dueDate,
        updatedAt: content.updatedAt,
      })
      .where(and(eq(contents.id, content.id), eq(contents.version, expectedVersion)))
      .returning({ id: contents.id })
    return updated.length > 0
  }

  async list(filter: ListContentsFilter): Promise<{ items: Content[]; total: number }> {
    const conditions = []
    if (filter.stage) conditions.push(eq(contents.stage, filter.stage))
    if (filter.ownerUserId) conditions.push(eq(contents.ownerUserId, filter.ownerUserId))
    if (filter.q) conditions.push(ilike(contents.title, `%${escapeLike(filter.q)}%`))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(contents)
        .where(where)
        // `id` como desempate: `updatedAt` muda em lote (sync de etapa) e a
        // paginação sem tie-breaker pula/duplica itens entre páginas.
        .orderBy(desc(contents.updatedAt), asc(contents.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ value: count() }).from(contents).where(where),
    ])
    return { items, total: totalRow?.value ?? 0 }
  }

  async countByStage(): Promise<Map<ContentStage, number>> {
    const rows = await this.db
      .select({ stage: contents.stage, value: count() })
      .from(contents)
      .groupBy(contents.stage)
    return new Map(rows.map((row) => [row.stage, row.value]))
  }

  async insertStageEvent(event: StageEvent): Promise<void> {
    await this.db.insert(contentStageEvents).values(event)
  }

  async listStageEvents(contentId: string): Promise<StageEvent[]> {
    return this.db
      .select()
      .from(contentStageEvents)
      .where(eq(contentStageEvents.contentId, contentId))
      .orderBy(asc(contentStageEvents.createdAt))
  }
}
