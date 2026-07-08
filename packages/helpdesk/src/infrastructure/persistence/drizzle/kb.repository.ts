import { and, asc, count, desc, eq } from 'drizzle-orm'
import type { KbArticle } from '../../../domain/kb/kb-article'
import type { KbRepository } from '../../../domain/ports/kb-repository.port'
import type { Database } from './db'
import { kbArticles } from './schema'

export class DrizzleKbRepository implements KbRepository {
  constructor(private readonly db: Database) {}

  async create(article: KbArticle): Promise<void> {
    await this.db.insert(kbArticles).values(article)
  }

  async byId(id: string): Promise<KbArticle | null> {
    const [row] = await this.db.select().from(kbArticles).where(eq(kbArticles.id, id)).limit(1)
    return row ?? null
  }

  async update(article: KbArticle, expectedVersion: number): Promise<boolean> {
    const updated = await this.db
      .update(kbArticles)
      .set({
        version: expectedVersion + 1,
        title: article.title,
        content: article.content,
        published: article.published,
        updatedAt: article.updatedAt,
      })
      .where(and(eq(kbArticles.id, article.id), eq(kbArticles.version, expectedVersion)))
      .returning({ id: kbArticles.id })
    const ok = updated.length > 0
    if (ok) article.version = expectedVersion + 1
    return ok
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(kbArticles)
      .where(eq(kbArticles.id, id))
      .returning({ id: kbArticles.id })
    return deleted.length > 0
  }

  async list(filter: {
    limit: number
    offset: number
  }): Promise<{ items: KbArticle[]; total: number }> {
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(kbArticles)
        .orderBy(desc(kbArticles.updatedAt), asc(kbArticles.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ value: count() }).from(kbArticles),
    ])
    return { items, total: totalRow?.value ?? 0 }
  }

  async listPublished(): Promise<KbArticle[]> {
    return this.db
      .select()
      .from(kbArticles)
      .where(eq(kbArticles.published, true))
      .orderBy(asc(kbArticles.createdAt))
  }
}
