import { ConcurrencyConflictError, KbArticleNotFoundError } from '../../domain/helpdesk-errors'
import type { KbArticle } from '../../domain/kb/kb-article'
import type { KbRepository } from '../../domain/ports/kb-repository.port'
import type { Actor } from '../actor'
import { type KbArticleView, toKbArticleView } from '../views'

export interface CreateKbArticleInput {
  title: string
  content: string
  published?: boolean
}

export interface UpdateKbArticleInput {
  title?: string
  content?: string
  published?: boolean
  version: number
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
      content: input.content,
      published: input.published ?? false,
      createdBy: actor.userId,
      createdByName: actor.displayName,
      createdAt: at,
      updatedAt: at,
    }
    await this.kb.create(article)
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

  async update(id: string, input: UpdateKbArticleInput): Promise<KbArticleView> {
    const article = await this.requireArticle(id)
    if (input.title !== undefined) article.title = input.title.trim()
    if (input.content !== undefined) article.content = input.content
    if (input.published !== undefined) article.published = input.published
    article.updatedAt = this.now()
    const ok = await this.kb.update(article, input.version)
    if (!ok) throw new ConcurrencyConflictError()
    return toKbArticleView(article)
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.kb.delete(id)
    if (!deleted) throw new KbArticleNotFoundError()
  }

  private async requireArticle(id: string): Promise<KbArticle> {
    const article = await this.kb.byId(id)
    if (!article) throw new KbArticleNotFoundError()
    return article
  }
}
