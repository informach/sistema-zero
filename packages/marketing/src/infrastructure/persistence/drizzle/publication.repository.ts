import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import type {
  PublicationListItem,
  PublicationRepository,
  PublicationsWindowFilter,
} from '../../../domain/ports/publication-repository.port'
import type { Network } from '../../../domain/publication/publication'
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

  async listRecentPublished(input: { since: Date; limit: number }): Promise<PublicationListItem[]> {
    return this.db
      .select({
        publication: publications,
        contentTitle: contents.title,
        contentType: contents.contentType,
      })
      .from(publications)
      .innerJoin(contents, eq(publications.contentId, contents.id))
      .where(and(eq(publications.status, 'published'), gte(publications.publishedAt, input.since)))
      .orderBy(desc(publications.publishedAt), asc(publications.id))
      .limit(input.limit)
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

  async claimDueAutoPublish(input: {
    now: Date
    limit: number
    leaseMs: number
    maxAttempts: number
    networks: Array<{ network: Network; leadMs: number }>
  }): Promise<Publication[]> {
    if (input.networks.length === 0) return []
    const { now } = input
    // Lead POR REDE: cada rede tem sua janela de antecipação (YouTube horas,
    // Meta minutos) — o OR abaixo casa a publicação com o lead da SUA rede.
    const withinLead = input.networks.map((n) =>
      and(
        eq(publications.network, n.network),
        lte(publications.scheduledAt, new Date(now.getTime() + n.leadMs)),
      ),
    )
    const networkNames = input.networks.map((n) => n.network)
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(publications)
        .where(
          and(
            eq(publications.publishMode, 'auto'),
            inArray(publications.network, networkNames),
            or(
              // Fresca: agendada dentro do LEAD da rede e elegível.
              and(
                eq(publications.status, 'scheduled'),
                isNotNull(publications.scheduledAt),
                or(...withinLead),
                or(isNull(publications.nextAttemptAt), lte(publications.nextAttemptAt, now)),
                lt(publications.attempts, input.maxAttempts),
              ),
              // Reaper: presa em publishing com lease vencido (crash no meio).
              and(eq(publications.status, 'publishing'), lte(publications.nextAttemptAt, now)),
            ),
          ),
        )
        .orderBy(asc(publications.scheduledAt), asc(publications.id))
        .limit(input.limit)
        .for('update', { skipLocked: true })
      if (due.length === 0) return []
      const leaseUntil = new Date(now.getTime() + input.leaseMs)
      // Re-claim de zumbi (já publishing) incrementa attempts — limita retrabalho
      // de um claim morto; claim fresco não gasta tentativa (outcomes decidem).
      const freshIds = due.filter((r) => r.status !== 'publishing').map((r) => r.id)
      const staleIds = due.filter((r) => r.status === 'publishing').map((r) => r.id)
      if (freshIds.length > 0) {
        await tx
          .update(publications)
          .set({
            status: 'publishing',
            nextAttemptAt: leaseUntil,
            version: sql`${publications.version} + 1`,
            updatedAt: now,
          })
          .where(inArray(publications.id, freshIds))
      }
      if (staleIds.length > 0) {
        await tx
          .update(publications)
          .set({
            attempts: sql`${publications.attempts} + 1`,
            nextAttemptAt: leaseUntil,
            version: sql`${publications.version} + 1`,
            updatedAt: now,
          })
          .where(inArray(publications.id, staleIds))
      }
      return due.map((r) => ({
        ...r,
        status: 'publishing' as const,
        attempts: r.status === 'publishing' ? r.attempts + 1 : r.attempts,
        nextAttemptAt: leaseUntil,
        version: r.version + 1,
        updatedAt: now,
      }))
    })
  }

  async listDueForMetrics(input: {
    network: Network
    now: Date
    limit: number
  }): Promise<Publication[]> {
    return this.db
      .select()
      .from(publications)
      .where(
        and(
          eq(publications.network, input.network),
          eq(publications.status, 'published'),
          isNotNull(publications.externalPostId),
          lte(publications.metricsNextCollectAt, input.now),
        ),
      )
      .orderBy(asc(publications.metricsNextCollectAt), asc(publications.id))
      .limit(input.limit)
  }

  async updateMetricsSchedule(
    items: Array<{ id: string; collectedAt: Date; nextCollectAt: Date | null }>,
  ): Promise<void> {
    // Lotes pequenos (≤50/ciclo) — updates individuais são simples e suficientes.
    for (const item of items) {
      await this.db
        .update(publications)
        .set({
          metricsLastCollectedAt: item.collectedAt,
          metricsNextCollectAt: item.nextCollectAt,
        })
        .where(eq(publications.id, item.id))
    }
  }
}
