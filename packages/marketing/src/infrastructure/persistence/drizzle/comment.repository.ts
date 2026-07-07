import { asc, count, eq, inArray } from 'drizzle-orm'
import type { ContentComment } from '../../../domain/content/content'
import type { CommentRepository } from '../../../domain/ports/content-repository.port'
import type { Database } from './db'
import { comments } from './schema'

export class DrizzleCommentRepository implements CommentRepository {
  constructor(private readonly db: Database) {}

  async create(comment: ContentComment): Promise<void> {
    await this.db.insert(comments).values(comment)
  }

  async listByContent(contentId: string): Promise<ContentComment[]> {
    return this.db
      .select()
      .from(comments)
      .where(eq(comments.contentId, contentId))
      .orderBy(asc(comments.createdAt))
  }

  async countsByContent(contentIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (contentIds.length === 0) return map
    const rows = await this.db
      .select({ contentId: comments.contentId, value: count() })
      .from(comments)
      .where(inArray(comments.contentId, contentIds))
      .groupBy(comments.contentId)
    for (const row of rows) map.set(row.contentId, row.value)
    return map
  }
}
