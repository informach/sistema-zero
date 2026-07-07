import type {
  ChecklistItem,
  Content,
  ContentComment,
  StageEvent,
} from '../../domain/content/content'
import {
  ALL_STAGES,
  type ContentStage,
  canCancel,
  isValidManualMove,
} from '../../domain/content/stage'
import {
  ChecklistIncompleteError,
  ChecklistItemNotFoundError,
  ConcurrencyConflictError,
  ContentNotFoundError,
  InvalidStageTransitionError,
} from '../../domain/marketing-errors'
import { CHECKLIST_TEMPLATES } from '../../domain/pipeline/checklist-templates'
import type {
  ChecklistRepository,
  CommentRepository,
  ContentRepository,
  ListContentsFilter,
} from '../../domain/ports/content-repository.port'
import type { PublicationRepository } from '../../domain/ports/publication-repository.port'
import type { ContentType } from '../../domain/publication/publication'
import { canCancelPublication, isActivePublication } from '../../domain/publication/publication'
import type { Actor } from '../actor'
import {
  type ChecklistItemView,
  type CommentView,
  type ContentDetailView,
  type ContentSummaryView,
  toChecklistItemView,
  toCommentView,
  toContentDetailView,
  toContentSummaryView,
} from '../mappers/views'

export interface CreateContentInput {
  title: string
  contentType: ContentType
  brief?: string | null
  ownerUserId?: string | null
  ownerName?: string | null
  dueDate?: Date | null
  ideaId?: string | null
}

export interface UpdateContentInput {
  title?: string
  brief?: string | null
  script?: string | null
  ownerUserId?: string | null
  ownerName?: string | null
  dueDate?: Date | null
  version: number
}

export class ContentService {
  constructor(
    private readonly contents: ContentRepository,
    private readonly checklist: ChecklistRepository,
    private readonly comments: CommentRepository,
    private readonly publications: PublicationRepository,
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  async create(actor: Actor, input: CreateContentInput): Promise<ContentDetailView> {
    const at = this.now()
    const content: Content = {
      id: this.idGen(),
      version: 0,
      title: input.title.trim(),
      contentType: input.contentType,
      stage: 'idea',
      brief: input.brief ?? null,
      script: null,
      ownerUserId: input.ownerUserId ?? null,
      ownerName: input.ownerName ?? null,
      dueDate: input.dueDate ?? null,
      ideaId: input.ideaId ?? null,
      createdBy: actor.userId,
      createdAt: at,
      updatedAt: at,
    }
    await this.contents.create(content)
    // Checklist copiado do template EM CÓDIGO (snapshot — editar o template não
    // altera conteúdos já criados).
    const template = CHECKLIST_TEMPLATES[input.contentType] ?? []
    const items: ChecklistItem[] = template.map((label, position) => ({
      id: this.idGen(),
      contentId: content.id,
      label,
      done: false,
      doneBy: null,
      doneByName: null,
      doneAt: null,
      position,
      origin: 'template',
      createdAt: at,
    }))
    if (items.length > 0) await this.checklist.createMany(items)
    return toContentDetailView({
      content,
      checklist: items,
      comments: [],
      publications: [],
      stageEvents: [],
    })
  }

  async get(id: string): Promise<ContentDetailView> {
    const content = await this.contents.byId(id)
    if (!content) throw new ContentNotFoundError()
    const [checklist, comments, publications, stageEvents] = await Promise.all([
      this.checklist.listByContent(id),
      this.comments.listByContent(id),
      this.publications.listByContent(id),
      this.contents.listStageEvents(id),
    ])
    return toContentDetailView({ content, checklist, comments, publications, stageEvents })
  }

  async list(filter: ListContentsFilter): Promise<{ items: ContentSummaryView[]; total: number }> {
    const { items, total } = await this.contents.list(filter)
    const ids = items.map((c) => c.id)
    const [checklistCounts, commentCounts, pubsByContent] = await Promise.all([
      this.checklist.countsByContent(ids),
      this.comments.countsByContent(ids),
      this.publications.listByContents(ids),
    ])
    return {
      items: items.map((content) => {
        const counts = checklistCounts.get(content.id) ?? { done: 0, total: 0 }
        const pubs = pubsByContent.get(content.id) ?? []
        return toContentSummaryView(content, {
          checklistDone: counts.done,
          checklistTotal: counts.total,
          commentCount: commentCounts.get(content.id) ?? 0,
          publicationFormats: pubs
            .filter((p) => isActivePublication(p.status))
            .map((p) => p.format),
        })
      }),
      total,
    }
  }

  async update(id: string, input: UpdateContentInput): Promise<ContentDetailView> {
    const content = await this.contents.byId(id)
    if (!content) throw new ContentNotFoundError()
    const expectedVersion = input.version
    if (input.title !== undefined) content.title = input.title.trim()
    if (input.brief !== undefined) content.brief = input.brief
    if (input.script !== undefined) content.script = input.script
    if (input.ownerUserId !== undefined) content.ownerUserId = input.ownerUserId
    if (input.ownerName !== undefined) content.ownerName = input.ownerName
    if (input.dueDate !== undefined) content.dueDate = input.dueDate
    content.version = expectedVersion + 1
    content.updatedAt = this.now()
    const ok = await this.contents.update(content, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    return this.get(id)
  }

  /**
   * Movimento MANUAL de etapa (kanban/stepper): válido só entre as etapas de
   * produção (idea..approved). Entrar em `approved` exige checklist completo.
   */
  async changeStage(actor: Actor, id: string, to: ContentStage): Promise<ContentDetailView> {
    const content = await this.contents.byId(id)
    if (!content) throw new ContentNotFoundError()
    if (!isValidManualMove(content.stage, to)) {
      throw new InvalidStageTransitionError(
        `Não é possível mover de "${content.stage}" para "${to}"`,
      )
    }
    if (to === 'approved') {
      const items = await this.checklist.listByContent(id)
      if (items.some((i) => !i.done)) throw new ChecklistIncompleteError()
    }
    await this.applyStageChange(actor, content, to)
    return this.get(id)
  }

  /** Cancela o conteúdo (terminal; published é imutável). */
  async cancel(actor: Actor, id: string): Promise<ContentDetailView> {
    const content = await this.contents.byId(id)
    if (!content) throw new ContentNotFoundError()
    if (!canCancel(content.stage)) {
      throw new InvalidStageTransitionError('Conteúdo publicado não pode ser cancelado')
    }
    // Cancela junto as publicações ainda canceláveis — senão o agendamento fica
    // vivo e o lembrete/publisher (F1+) dispararia para conteúdo cancelado.
    // Publicadas ficam como registro (o post já saiu no mundo).
    const at = this.now()
    const pubs = await this.publications.listByContent(id)
    for (const pub of pubs) {
      if (!canCancelPublication(pub.status)) continue
      const expectedVersion = pub.version
      pub.status = 'canceled'
      pub.version = expectedVersion + 1
      pub.updatedAt = at
      const ok = await this.publications.update(pub, expectedVersion)
      if (!ok) throw new ConcurrencyConflictError()
    }
    await this.applyStageChange(actor, content, 'canceled')
    return this.get(id)
  }

  /** Contagem de conteúdos por etapa (painel) — agregada no banco. */
  async stageCounts(): Promise<Record<ContentStage, number>> {
    const counts = await this.contents.countByStage()
    const result = {} as Record<ContentStage, number>
    for (const stage of ALL_STAGES) result[stage] = counts.get(stage) ?? 0
    return result
  }

  /**
   * Mudança de etapa DERIVADA (sincronização a partir das publicações) — usada
   * pelo PublicationService. Não valida movimento manual.
   */
  async applyStageChange(actor: Actor, content: Content, to: ContentStage): Promise<void> {
    const from = content.stage
    if (from === to) return
    const at = this.now()
    const expectedVersion = content.version
    content.stage = to
    content.version = expectedVersion + 1
    content.updatedAt = at
    const ok = await this.contents.update(content, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    const event: StageEvent = {
      id: this.idGen(),
      contentId: content.id,
      fromStage: from,
      toStage: to,
      actorUserId: actor.userId,
      actorName: actor.displayName,
      createdAt: at,
    }
    await this.contents.insertStageEvent(event)
  }

  // ── Checklist ──────────────────────────────────────────────────────────────

  async addChecklistItem(id: string, label: string): Promise<ChecklistItemView> {
    const content = await this.contents.byId(id)
    if (!content) throw new ContentNotFoundError()
    const existing = await this.checklist.listByContent(id)
    const item: ChecklistItem = {
      id: this.idGen(),
      contentId: id,
      label: label.trim(),
      done: false,
      doneBy: null,
      doneByName: null,
      doneAt: null,
      position: existing.length,
      origin: 'manual',
      createdAt: this.now(),
    }
    await this.checklist.createMany([item])
    return toChecklistItemView(item)
  }

  async setChecklistItem(
    actor: Actor,
    itemId: string,
    input: { done?: boolean; label?: string },
  ): Promise<ChecklistItemView> {
    const item = await this.checklist.byId(itemId)
    if (!item) throw new ChecklistItemNotFoundError()
    if (input.label !== undefined) item.label = input.label.trim()
    if (input.done !== undefined && input.done !== item.done) {
      item.done = input.done
      item.doneBy = input.done ? actor.userId : null
      item.doneByName = input.done ? actor.displayName : null
      item.doneAt = input.done ? this.now() : null
    }
    await this.checklist.update(item)
    return toChecklistItemView(item)
  }

  async deleteChecklistItem(itemId: string): Promise<void> {
    const item = await this.checklist.byId(itemId)
    if (!item) throw new ChecklistItemNotFoundError()
    await this.checklist.delete(itemId)
  }

  // ── Comentários ────────────────────────────────────────────────────────────

  async addComment(actor: Actor, id: string, body: string): Promise<CommentView> {
    const content = await this.contents.byId(id)
    if (!content) throw new ContentNotFoundError()
    const comment: ContentComment = {
      id: this.idGen(),
      contentId: id,
      authorUserId: actor.userId,
      authorName: actor.displayName,
      body: body.trim(),
      createdAt: this.now(),
    }
    await this.comments.create(comment)
    return toCommentView(comment)
  }

  async byId(id: string): Promise<Content> {
    const content = await this.contents.byId(id)
    if (!content) throw new ContentNotFoundError()
    return content
  }
}
