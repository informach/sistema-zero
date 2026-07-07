import { and, asc, eq, inArray } from 'drizzle-orm'
import type { PublicationRepository } from '../../../domain/ports/publication-repository.port'
import type { Publication } from '../../../domain/publication/publication-record'
import type { Database } from './db'
import { publications } from './schema'

export class DrizzlePublicationRepository implements PublicationRepository {
  constructor(private readonly db: Database) {}

  async create(publication: Publication): Promise<void> {
    await this.db.insert(publications).values(publication)
  }

  async createMany(rows: Publication[]): Promise<void> {
    if (rows.length === 0) return
    await this.db.insert(publications).values(rows)
  }

  async byId(id: string): Promise<Publication | null> {
    const [row] = await this.db.select().from(publications).where(eq(publications.id, id)).limit(1)
    return row ?? null
  }

  async update(publication: Publication, expectedVersion: number): Promise<boolean> {
    const updated = await this.db
      .update(publications)
      .set({
        version: publication.version,
        socialAccountId: publication.socialAccountId,
        caption: publication.caption,
        title: publication.title,
        tags: publication.tags,
        coverAssetId: publication.coverAssetId,
        scheduledAt: publication.scheduledAt,
        publishMode: publication.publishMode,
        status: publication.status,
        attempts: publication.attempts,
        nextAttemptAt: publication.nextAttemptAt,
        lastError: publication.lastError,
        providerSession: publication.providerSession,
        externalPostId: publication.externalPostId,
        externalUrl: publication.externalUrl,
        publishedAt: publication.publishedAt,
        reminderSentAt: publication.reminderSentAt,
        metricsLastCollectedAt: publication.metricsLastCollectedAt,
        updatedAt: publication.updatedAt,
      })
      .where(and(eq(publications.id, publication.id), eq(publications.version, expectedVersion)))
      .returning({ id: publications.id })
    return updated.length > 0
  }

  async listByContent(contentId: string): Promise<Publication[]> {
    return this.db
      .select()
      .from(publications)
      .where(eq(publications.contentId, contentId))
      .orderBy(asc(publications.createdAt), asc(publications.id))
  }

  async listByContents(contentIds: string[]): Promise<Map<string, Publication[]>> {
    const map = new Map<string, Publication[]>()
    if (contentIds.length === 0) return map
    const rows = await this.db
      .select()
      .from(publications)
      .where(inArray(publications.contentId, contentIds))
      .orderBy(asc(publications.createdAt), asc(publications.id))
    for (const row of rows) {
      const list = map.get(row.contentId) ?? []
      list.push(row)
      map.set(row.contentId, list)
    }
    return map
  }
}
