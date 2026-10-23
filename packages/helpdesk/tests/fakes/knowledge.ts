import { randomUUID } from 'node:crypto'
import type { KnowledgeEvidence, KnowledgeSearchInput } from '@sistemazero/helpdesk-contracts'
import type { KbArticle, KbChunk, KbRevision } from '../../src/domain/kb/kb-article'
import { KnowledgeNotReadyError } from '../../src/domain/kb/knowledge-errors'
import type { KbRepository } from '../../src/domain/ports/kb-repository.port'

export class InMemoryKbRepository implements KbRepository {
  readonly rows = new Map<string, KbArticle>()
  readonly revisionRows = new Map<string, KbRevision>()
  readonly chunks = new Map<string, KbChunk[]>()
  async create(article: KbArticle, revision: KbRevision): Promise<void> {
    this.rows.set(article.id, structuredClone(article))
    this.revisionRows.set(revision.id, structuredClone(revision))
  }
  async byId(id: string): Promise<KbArticle | null> {
    return structuredClone(this.rows.get(id) ?? null)
  }
  async saveDraft(
    article: KbArticle,
    revision: KbRevision,
    expectedVersion: number,
  ): Promise<boolean> {
    const current = this.rows.get(article.id)
    if (!current || current.version !== expectedVersion || current.archived) return false
    this.rows.set(
      article.id,
      structuredClone({ ...article, version: expectedVersion + 1, draftRevisionId: revision.id }),
    )
    this.revisionRows.set(revision.id, structuredClone(revision))
    return true
  }
  async publish(
    id: string,
    revisionId: string,
    version: number,
    _actorId: string,
    at: Date,
  ): Promise<KbArticle | null> {
    const article = this.rows.get(id)
    if (!article || article.version !== version || article.archived) return null
    const revision = this.revisionRows.get(revisionId)
    if (
      !revision ||
      revision.articleId !== id ||
      article.draftRevisionId !== revisionId ||
      revision.indexState !== 'ready' ||
      !revision.ownerName.trim() ||
      !revision.validUntil ||
      revision.validUntil <= at
    )
      throw new KnowledgeNotReadyError()
    article.publishedRevisionId = revisionId
    article.version++
    article.updatedAt = at
    return structuredClone(article)
  }
  async withdraw(
    id: string,
    version: number,
    archived: boolean,
    _actorId: string,
    at: Date,
  ): Promise<KbArticle | null> {
    const article = this.rows.get(id)
    if (!article || article.version !== version) return null
    article.publishedRevisionId = null
    article.archived ||= archived
    article.version++
    article.updatedAt = at
    return structuredClone(article)
  }
  async list(filter: {
    limit: number
    offset: number
  }): Promise<{ items: KbArticle[]; total: number }> {
    const all = [...this.rows.values()]
      .filter((a) => !a.archived)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    return {
      items: structuredClone(all.slice(filter.offset, filter.offset + filter.limit)),
      total: all.length,
    }
  }
  async revisions(articleId: string): Promise<KbRevision[]> {
    return structuredClone(
      [...this.revisionRows.values()]
        .filter((r) => r.articleId === articleId)
        .sort((a, b) => b.number - a.number),
    )
  }
  async claimIndex(at: Date, leaseMs: number): Promise<KbRevision | null> {
    const revision = [...this.revisionRows.values()].find(
      (r) =>
        (r.indexState === 'pending' && r.indexNextAt <= at) ||
        (r.indexState === 'processing' && r.indexLeaseExpiresAt && r.indexLeaseExpiresAt <= at),
    )
    if (!revision) return null
    revision.indexState = 'processing'
    revision.indexAttempts++
    revision.indexLeaseToken = randomUUID()
    revision.indexLeaseExpiresAt = new Date(at.getTime() + leaseMs)
    return structuredClone(revision)
  }
  async finishIndex(id: string, token: string, chunks: KbChunk[], at: Date): Promise<boolean> {
    const revision = this.revisionRows.get(id)
    if (
      revision?.indexState !== 'processing' ||
      revision.indexLeaseToken !== token ||
      !revision.indexLeaseExpiresAt ||
      revision.indexLeaseExpiresAt <= at ||
      !chunks.length ||
      chunks.some((c) => c.revisionId !== id)
    )
      return false
    this.chunks.set(id, structuredClone(chunks))
    revision.indexState = 'ready'
    revision.indexLeaseToken = null
    revision.indexLeaseExpiresAt = null
    revision.indexError = null
    return true
  }
  async failIndex(id: string, token: string, at: Date): Promise<boolean> {
    const revision = this.revisionRows.get(id)
    if (
      revision?.indexState !== 'processing' ||
      revision.indexLeaseToken !== token ||
      !revision.indexLeaseExpiresAt ||
      revision.indexLeaseExpiresAt <= at
    )
      return false
    revision.indexState = revision.indexAttempts >= 3 ? 'failed' : 'pending'
    revision.indexNextAt = new Date(at.getTime() + 5000)
    revision.indexLeaseToken = null
    revision.indexLeaseExpiresAt = null
    revision.indexError = 'INDEXING_FAILED'
    return true
  }
  async retryIndex(articleId: string, revisionId: string, at: Date): Promise<boolean> {
    const revision = this.revisionRows.get(revisionId)
    if (!revision || revision.articleId !== articleId || revision.indexState !== 'failed')
      return false
    Object.assign(revision, {
      indexState: 'pending',
      indexAttempts: 0,
      indexNextAt: at,
      indexError: null,
    })
    return true
  }
  async search(input: KnowledgeSearchInput, at: Date): Promise<KnowledgeEvidence[]> {
    const results: KnowledgeEvidence[] = []
    for (const article of this.rows.values()) {
      const revision = article.publishedRevisionId
        ? this.revisionRows.get(article.publishedRevisionId)
        : null
      if (
        !revision ||
        article.archived ||
        revision.indexState !== 'ready' ||
        !revision.validUntil ||
        revision.validUntil <= at
      )
        continue
      if (revision.audience !== input.audience && revision.audience !== 'customer_all') continue
      if (revision.product !== input.product && revision.product !== 'all') continue
      for (const chunk of this.chunks.get(revision.id) ?? []) {
        if (
          !input.query
            .toLowerCase()
            .split(/\s+/)
            .some((word) => `${revision.title} ${chunk.text}`.toLowerCase().includes(word))
        )
          continue
        results.push({
          chunkId: chunk.id,
          articleId: article.id,
          revisionId: revision.id,
          revisionNumber: revision.number,
          title: revision.title,
          section: chunk.section,
          text: chunk.text,
          audience: revision.audience,
          product: revision.product,
        })
      }
    }
    return results.slice(0, input.limit)
  }
}
