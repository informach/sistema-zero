import { and, asc, count, eq, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm'
import type {
  PublicationListItem,
  PublicationRepository,
  PublicationsWindowFilter,
} from '../../../domain/ports/publication-repository.port'
import type { Publication } from '../../../domain/publication/publication-record'
import type { Database } from './db'
import { contents, publications } from './schema'

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

  async listByWindow(
    filter: PublicationsWindowFilter,
  ): Promise<{ items: PublicationListItem[]; total: number }> {
    const conditions = []
    if (filter.from) conditions.push(gte(publications.scheduledAt, filter.from))
    if (filter.to) conditions.push(lt(publications.scheduledAt, filter.to))
    if (filter.statuses && filter.statuses.length > 0) {
      conditions.push(inArray(publications.status, filter.statuses))
    }
    if (filter.network) conditions.push(eq(publications.network, filter.network))
    if (filter.format) conditions.push(eq(publications.format, filter.format))
    if (filter.contentId) conditions.push(eq(publications.contentId, filter.contentId))
    const where = conditions.length > 0 ? and(...conditions) : undefined
    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select({
          publication: publications,
          contentTitle: contents.title,
          contentType: contents.contentType,
        })
        .from(publications)
        .innerJoin(contents, eq(publications.contentId, contents.id))
        .where(where)
        // ASC em Postgres já é NULLS LAST — sem-horário vai pro fim; id = tie-breaker.
        .orderBy(asc(publications.scheduledAt), asc(publications.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db
        .select({ value: count() })
        .from(publications)
        .innerJoin(contents, eq(publications.contentId, contents.id))
        .where(where),
    ])
    return { items: rows, total: totalRow?.value ?? 0 }
  }

  async claimDueManualReminders(
    now: Date,
    limit: number,
    leaseMs: number,
    maxAttempts: number,
  ): Promise<Publication[]> {
    // Ramo MANUAL do publisher-worker: agendadas vencidas (claim novo) + lembretes
    // presos com lease vencido (reaper — crash entre claim e envio não perde o
    // lembrete). `attempts >= maxAttempts` fica de fora (teto: desiste do aviso,
    // a publicação segue awaiting_manual e o Painel é o fallback).
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(publications)
        .where(
          and(
            eq(publications.publishMode, 'manual'),
            or(
              and(eq(publications.status, 'scheduled'), lte(publications.scheduledAt, now)),
              and(
                eq(publications.status, 'awaiting_manual'),
                isNull(publications.reminderSentAt),
                lte(publications.nextAttemptAt, now),
                lt(publications.attempts, maxAttempts),
              ),
            ),
          ),
        )
        .orderBy(asc(publications.scheduledAt), asc(publications.id))
        .limit(limit)
        .for('update', { skipLocked: true })
      if (due.length === 0) return []
      const leaseUntil = new Date(now.getTime() + leaseMs)
      await tx
        .update(publications)
        .set({
          status: 'awaiting_manual',
          attempts: sql`${publications.attempts} + 1`,
          nextAttemptAt: leaseUntil,
          version: sql`${publications.version} + 1`,
          updatedAt: now,
        })
        .where(
          inArray(
            publications.id,
            due.map((r) => r.id),
          ),
        )
      return due.map((r) => ({
        ...r,
        status: 'awaiting_manual' as const,
        attempts: r.attempts + 1,
        nextAttemptAt: leaseUntil,
        version: r.version + 1,
        updatedAt: now,
      }))
    })
  }
}
