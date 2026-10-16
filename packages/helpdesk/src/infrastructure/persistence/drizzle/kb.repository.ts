import { randomUUID } from 'node:crypto'
import type { KnowledgeEvidence, KnowledgeSearchInput } from '@sistemazero/helpdesk-contracts'
import { and, asc, count, desc, eq, gt, lte, or, sql } from 'drizzle-orm'
import type { KbArticle, KbChunk, KbRevision } from '../../../domain/kb/kb-article'
import { KnowledgeNotReadyError } from '../../../domain/kb/knowledge-errors'
import type { KbRepository } from '../../../domain/ports/kb-repository.port'
import type { Database } from './db'
import { kbArticles, kbChunks, kbPublicationEvents, kbRevisions } from './schema'

export class DrizzleKbRepository implements KbRepository {
  constructor(private readonly db: Database) {}

  async create(article: KbArticle, revision: KbRevision): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(kbArticles).values({ ...article, draftRevisionId: null })
      await tx.insert(kbRevisions).values(revision)
      await tx
        .update(kbArticles)
        .set({ draftRevisionId: revision.id })
        .where(eq(kbArticles.id, article.id))
    })
  }

  async byId(id: string): Promise<KbArticle | null> {
    const [row] = await this.db.select().from(kbArticles).where(eq(kbArticles.id, id)).limit(1)
    return row ?? null
  }

  async saveDraft(
    article: KbArticle,
    revision: KbRevision,
    expectedVersion: number,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(kbArticles)
        .set({
          version: expectedVersion + 1,
          title: article.title,
          content: article.content,
          audience: article.audience,
          product: article.product,
          ownerName: article.ownerName,
          origin: article.origin,
          validUntil: article.validUntil,
          updatedAt: article.updatedAt,
        })
        .where(
          and(
            eq(kbArticles.id, article.id),
            eq(kbArticles.version, expectedVersion),
            eq(kbArticles.archived, false),
          ),
        )
        .returning({ id: kbArticles.id })
      if (!updated.length) return false
      await tx.insert(kbRevisions).values(revision)
      await tx
        .update(kbArticles)
        .set({ draftRevisionId: revision.id })
        .where(eq(kbArticles.id, article.id))
      return true
    })
  }

  async publish(
    id: string,
    revisionId: string,
    expectedVersion: number,
    actorId: string,
    at: Date,
  ): Promise<KbArticle | null> {
    return this.db.transaction(async (tx) => {
      const [article] = await tx
        .select()
        .from(kbArticles)
        .where(eq(kbArticles.id, id))
        .for('update')
      if (!article || article.version !== expectedVersion || article.archived) return null
      const [revision] = await tx
        .select()
        .from(kbRevisions)
        .where(and(eq(kbRevisions.id, revisionId), eq(kbRevisions.articleId, id)))
        .for('share')
      at = new Date(Math.max(at.getTime(), Date.now()))
      if (
        !revision ||
        article.draftRevisionId !== revisionId ||
        revision.indexState !== 'ready' ||
        !revision.ownerName.trim() ||
        !revision.validUntil ||
        revision.validUntil <= at
      )
        throw new KnowledgeNotReadyError()
      const [saved] = await tx
        .update(kbArticles)
        .set({ publishedRevisionId: revisionId, version: expectedVersion + 1, updatedAt: at })
        .where(eq(kbArticles.id, id))
        .returning()
      await tx.insert(kbPublicationEvents).values({
        id: randomUUID(),
        articleId: id,
        revisionId,
        action: 'publish',
        actorId,
        createdAt: at,
      })
      return saved ?? null
    })
  }

  async withdraw(
    id: string,
    expectedVersion: number,
    archived: boolean,
    actorId: string,
    at: Date,
  ): Promise<KbArticle | null> {
    return this.db.transaction(async (tx) => {
      const [article] = await tx
        .update(kbArticles)
        .set({
          publishedRevisionId: null,
          archived: sql`${kbArticles.archived} or ${archived}`,
          version: expectedVersion + 1,
          updatedAt: at,
        })
        .where(and(eq(kbArticles.id, id), eq(kbArticles.version, expectedVersion)))
        .returning()
      if (!article) return null
      await tx.insert(kbPublicationEvents).values({
        id: randomUUID(),
        articleId: id,
        revisionId: null,
        action: archived ? 'archive' : 'withdraw',
        actorId,
        createdAt: at,
      })
      return article
    })
  }

  async list(filter: {
    limit: number
    offset: number
  }): Promise<{ items: KbArticle[]; total: number }> {
    const [items, totals] = await Promise.all([
      this.db
        .select()
        .from(kbArticles)
        .where(eq(kbArticles.archived, false))
        .orderBy(desc(kbArticles.updatedAt), asc(kbArticles.id))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ value: count() }).from(kbArticles).where(eq(kbArticles.archived, false)),
    ])
    return { items, total: totals[0]?.value ?? 0 }
  }

  async revisions(articleId: string): Promise<KbRevision[]> {
    return this.db
      .select()
      .from(kbRevisions)
      .where(eq(kbRevisions.articleId, articleId))
      .orderBy(desc(kbRevisions.number))
      .limit(100)
  }

  async claimIndex(at: Date, leaseMs: number): Promise<KbRevision | null> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(kbRevisions)
        .set({
          indexState: 'failed',
          indexLeaseToken: null,
          indexLeaseExpiresAt: null,
          indexError: 'INDEX_ATTEMPTS_EXHAUSTED',
        })
        .where(
          sql`${kbRevisions.indexState} = 'processing' and ${kbRevisions.indexLeaseExpiresAt} <= ${at.toISOString()} and ${kbRevisions.indexAttempts} >= 3`,
        )
      const [candidate] = await tx
        .select()
        .from(kbRevisions)
        .where(
          or(
            and(eq(kbRevisions.indexState, 'pending'), lte(kbRevisions.indexNextAt, at)),
            and(eq(kbRevisions.indexState, 'processing'), lte(kbRevisions.indexLeaseExpiresAt, at)),
          ),
        )
        .orderBy(asc(kbRevisions.indexNextAt))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!candidate) return null
      const [row] = await tx
        .update(kbRevisions)
        .set({
          indexState: 'processing',
          indexAttempts: candidate.indexAttempts + 1,
          indexLeaseToken: randomUUID(),
          indexLeaseExpiresAt: new Date(at.getTime() + leaseMs),
        })
        .where(eq(kbRevisions.id, candidate.id))
        .returning()
      return row ?? null
    })
  }

  async finishIndex(
    revisionId: string,
    leaseToken: string,
    chunks: KbChunk[],
    at: Date,
  ): Promise<boolean> {
    if (!chunks.length || chunks.some((chunk) => chunk.revisionId !== revisionId)) return false
    return this.db.transaction(async (tx) => {
      const [revision] = await tx
        .update(kbRevisions)
        .set({
          indexState: 'ready',
          indexError: null,
          indexLeaseToken: null,
          indexLeaseExpiresAt: null,
        })
        .where(
          and(
            eq(kbRevisions.id, revisionId),
            eq(kbRevisions.indexState, 'processing'),
            eq(kbRevisions.indexLeaseToken, leaseToken),
            gt(kbRevisions.indexLeaseExpiresAt, at),
          ),
        )
        .returning({ id: kbRevisions.id })
      if (!revision) return false
      await tx.delete(kbChunks).where(eq(kbChunks.revisionId, revisionId))
      await tx.insert(kbChunks).values(chunks)
      return true
    })
  }

  async failIndex(revisionId: string, leaseToken: string, at: Date): Promise<boolean> {
    const rows = await this.db
      .update(kbRevisions)
      .set({
        indexState: sql`case when ${kbRevisions.indexAttempts} >= 3 then 'failed'::helpdesk.knowledge_index_state else 'pending'::helpdesk.knowledge_index_state end`,
        indexNextAt: new Date(at.getTime() + 5000),
        indexLeaseToken: null,
        indexLeaseExpiresAt: null,
        indexError: 'INDEXING_FAILED',
      })
      .where(
        and(
          eq(kbRevisions.id, revisionId),
          eq(kbRevisions.indexState, 'processing'),
          eq(kbRevisions.indexLeaseToken, leaseToken),
          gt(kbRevisions.indexLeaseExpiresAt, at),
        ),
      )
      .returning({ id: kbRevisions.id })
    return rows.length === 1
  }

  async retryIndex(articleId: string, revisionId: string, at: Date): Promise<boolean> {
    const rows = await this.db
      .update(kbRevisions)
      .set({ indexState: 'pending', indexAttempts: 0, indexNextAt: at, indexError: null })
      .where(
        and(
          eq(kbRevisions.articleId, articleId),
          eq(kbRevisions.id, revisionId),
          eq(kbRevisions.indexState, 'failed'),
        ),
      )
      .returning({ id: kbRevisions.id })
    return rows.length === 1
  }

  async search(input: KnowledgeSearchInput, at: Date): Promise<KnowledgeEvidence[]> {
    if (!input.query.trim()) return []
    // Natural questions include words absent from an otherwise relevant answer.
    // PostgreSQL normalizes/quotes lexemes first; only its generated AND operators
    // become OR. Bound user input never becomes tsquery syntax or SQL.
    const query = sql`replace(plainto_tsquery('portuguese'::regconfig, ${input.query.slice(0, 2000)})::text, ' & ', ' | ')::tsquery`
    const vector = sql`to_tsvector('portuguese'::regconfig, ${kbChunks.section} || ' ' || ${kbChunks.text})`
    const titleVector = sql`to_tsvector('portuguese'::regconfig, ${kbRevisions.title})`
    return this.db
      .select({
        chunkId: kbChunks.id,
        articleId: kbArticles.id,
        revisionId: kbRevisions.id,
        revisionNumber: kbRevisions.number,
        title: kbRevisions.title,
        section: kbChunks.section,
        text: kbChunks.text,
        audience: kbRevisions.audience,
        product: kbRevisions.product,
      })
      .from(kbChunks)
      .innerJoin(kbRevisions, eq(kbChunks.revisionId, kbRevisions.id))
      .innerJoin(
        kbArticles,
        and(
          eq(kbArticles.id, kbRevisions.articleId),
          eq(kbArticles.publishedRevisionId, kbRevisions.id),
        ),
      )
      .where(
        and(
          eq(kbArticles.archived, false),
          eq(kbRevisions.indexState, 'ready'),
          gt(kbRevisions.validUntil, at),
          or(eq(kbRevisions.audience, input.audience), eq(kbRevisions.audience, 'customer_all')),
          or(eq(kbRevisions.product, input.product), eq(kbRevisions.product, 'all')),
          sql`(${vector} @@ ${query} or ${titleVector} @@ ${query})`,
        ),
      )
      .orderBy(
        desc(sql`ts_rank_cd(${vector}, ${query}) + 2 * ts_rank_cd(${titleVector}, ${query})`),
        asc(kbChunks.id),
      )
      .limit(Math.max(1, Math.min(input.limit, 12)))
  }
}
