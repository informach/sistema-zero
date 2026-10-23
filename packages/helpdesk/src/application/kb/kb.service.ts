import { ForbiddenError } from '@sistemazero/core/http'
import type {
  KnowledgeAudience,
  KnowledgeProduct,
  KnowledgeRevisionView,
  KnowledgeSearchInput,
} from '@sistemazero/helpdesk-contracts'
import { ConcurrencyConflictError, KbArticleNotFoundError } from '../../domain/helpdesk-errors'
import {
  KNOWLEDGE_INDEX_VERSION,
  knowledgeHash,
  normalizeKnowledge,
} from '../../domain/kb/chunking'
import type { KbArticle, KbRevision } from '../../domain/kb/kb-article'
import { KnowledgeInvalidError } from '../../domain/kb/knowledge-errors'
import type { KbRepository } from '../../domain/ports/kb-repository.port'
import type { Actor } from '../actor'
import { type KbArticleView, toKbArticleView } from '../views'

export interface CreateKbArticleInput {
  title: string
  content: string
  audience?: KnowledgeAudience
  product?: KnowledgeProduct
  ownerName?: string
  origin?: string
  validUntil?: string | null
}
export type UpdateKbArticleInput = Partial<CreateKbArticleInput> & { version: number }

export function requireKnowledgeAdmin(actor: Actor): void {
  if (actor.status !== 'active' || (actor.role !== 'admin' && actor.role !== 'superadmin'))
    throw new ForbiddenError('Publicação de conhecimento exige administrador')
}

function validUntil(value: string | null | undefined): Date | null {
  if (value == null) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new KnowledgeInvalidError('Data de validade inválida')
  return date
}

export class KbService {
  constructor(
    private readonly kb: KbRepository,
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  async create(actor: Actor, input: CreateKbArticleInput): Promise<KbArticleView> {
    const at = this.now()
    const article: KbArticle = {
      id: this.idGen(),
      version: 0,
      title: input.title.trim(),
      content: normalizeKnowledge(input.content),
      audience: input.audience ?? 'staff_only',
      product: input.product ?? 'all',
      ownerName: input.ownerName?.trim() || actor.displayName,
      origin: input.origin?.trim() || 'manual',
      validUntil: validUntil(input.validUntil),
      archived: false,
      draftRevisionId: null,
      publishedRevisionId: null,
      createdBy: actor.userId,
      createdByName: actor.displayName,
      createdAt: at,
      updatedAt: at,
    }
    this.validate(article)
    const revision = this.revision(article, actor, 1, at)
    article.draftRevisionId = revision.id
    await this.kb.create(article, revision)
    return toKbArticleView(article)
  }

  async list(filter: {
    limit: number
    offset: number
  }): Promise<{ items: KbArticleView[]; total: number }> {
    const { items, total } = await this.kb.list(filter)
    return { items: items.map(toKbArticleView), total }
  }

  async byId(id: string): Promise<KbArticleView> {
    return toKbArticleView(await this.requireArticle(id))
  }

  async update(actor: Actor, id: string, input: UpdateKbArticleInput): Promise<KbArticleView> {
    const article = await this.requireArticle(id)
    if (input.title !== undefined) article.title = input.title.trim()
    if (input.content !== undefined) article.content = normalizeKnowledge(input.content)
    if (input.audience !== undefined) article.audience = input.audience
    if (input.product !== undefined) article.product = input.product
    if (input.ownerName !== undefined) article.ownerName = input.ownerName.trim()
    if (input.origin !== undefined) article.origin = input.origin.trim()
    if (input.validUntil !== undefined) article.validUntil = validUntil(input.validUntil)
    article.updatedAt = this.now()
    this.validate(article)
    const revision = this.revision(article, actor, input.version + 2, article.updatedAt)
    if (!(await this.kb.saveDraft(article, revision, input.version)))
      throw new ConcurrencyConflictError()
    return this.byId(id)
  }

  async publish(
    actor: Actor,
    id: string,
    input: { revisionId: string; version: number },
  ): Promise<KbArticleView> {
    requireKnowledgeAdmin(actor)
    const saved = await this.kb.publish(
      id,
      input.revisionId,
      input.version,
      actor.userId,
      this.now(),
    )
    if (!saved) throw new ConcurrencyConflictError()
    return toKbArticleView(saved)
  }

  async withdraw(
    actor: Actor,
    id: string,
    version: number,
    archived = false,
  ): Promise<KbArticleView> {
    requireKnowledgeAdmin(actor)
    const saved = await this.kb.withdraw(id, version, archived, actor.userId, this.now())
    if (!saved) throw new ConcurrencyConflictError()
    return toKbArticleView(saved)
  }

  async revisions(id: string): Promise<KnowledgeRevisionView[]> {
    await this.requireArticle(id)
    return (await this.kb.revisions(id)).map((r) => ({
      id: r.id,
      articleId: r.articleId,
      number: r.number,
      title: r.title,
      content: r.content,
      contentHash: r.contentHash,
      audience: r.audience,
      product: r.product,
      ownerName: r.ownerName,
      origin: r.origin,
      validUntil: r.validUntil?.toISOString() ?? null,
      indexState: r.indexState,
      indexError: r.indexError,
      createdByName: r.createdByName,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  search(input: KnowledgeSearchInput) {
    return this.kb.search(input, this.now())
  }

  async retryIndex(id: string, revisionId: string): Promise<{ scheduled: true }> {
    await this.requireArticle(id)
    if (!(await this.kb.retryIndex(id, revisionId, this.now())))
      throw new ConcurrencyConflictError('A revisão não está aguardando uma nova tentativa')
    return { scheduled: true }
  }

  private revision(article: KbArticle, actor: Actor, number: number, at: Date): KbRevision {
    return {
      id: this.idGen(),
      articleId: article.id,
      number,
      title: article.title,
      content: article.content,
      audience: article.audience,
      product: article.product,
      ownerName: article.ownerName,
      origin: article.origin,
      validUntil: article.validUntil,
      contentHash: knowledgeHash(article.content),
      indexVersion: KNOWLEDGE_INDEX_VERSION,
      indexState: 'pending',
      indexAttempts: 0,
      indexNextAt: at,
      indexLeaseToken: null,
      indexLeaseExpiresAt: null,
      indexError: null,
      createdBy: actor.userId,
      createdByName: actor.displayName,
      createdAt: at,
    }
  }

  private validate(article: KbArticle): void {
    if (
      !article.title ||
      article.title.length > 300 ||
      !article.content ||
      article.content.length > 50_000 ||
      article.ownerName.length > 200 ||
      article.origin.length > 1000
    )
      throw new KnowledgeInvalidError()
  }

  private async requireArticle(id: string): Promise<KbArticle> {
    const article = await this.kb.byId(id)
    if (!article) throw new KbArticleNotFoundError()
    return article
  }
}
