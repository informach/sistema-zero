import { and, asc, count, desc, eq } from 'drizzle-orm'
import type { Idea } from '../../../domain/idea/idea'
import type { IdeaRepository, ListIdeasFilter } from '../../../domain/ports/idea-repository.port'
import type { Database } from './db'
import { ideas } from './schema'

export class DrizzleIdeaRepository implements IdeaRepository {
  constructor(private readonly db: Database) {}

  async create(idea: Idea): Promise<void> {
    await this.db.insert(ideas).values(idea)
  }

  async byId(id: string): Promise<Idea | null> {
    const [row] = await this.db.select().from(ideas).where(eq(ideas.id, id)).limit(1)
    return row ?? null
  }

  async update(idea: Idea): Promise<void> {
    await this.db
      .update(ideas)
      .set({
        title: idea.title,
        notes: idea.notes,
        source: idea.source,
        status: idea.status,
        potential: idea.potential,
        complexity: idea.complexity,
        promotedContentId: idea.promotedContentId,
        updatedAt: idea.updatedAt,
      })
      .where(eq(ideas.id, idea.id))
  }

  async markPromoted(id: string, contentId: string, at: Date): Promise<boolean> {
    const updated = await this.db
      .update(ideas)
      .set({ status: 'accepted', promotedContentId: contentId, updatedAt: at })
      .where(and(eq(ideas.id, id), eq(ideas.status, 'inbox')))
      .returning({ id: ideas.id })
    return updated.length > 0
  }

  async list(filter: ListIdeasFilter): Promise<{ items: Idea[]; total: number }> {
    const where = filter.status ? eq(ideas.status, filter.status) : undefined
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(ideas)
        .where(where)
        // `id` como desempate: paginação estável quando `createdAt` colide.
        .orderBy(desc(ideas.createdAt), asc(ideas.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ value: count() }).from(ideas).where(where),
    ])
    return { items, total: totalRow?.value ?? 0 }
  }
}
