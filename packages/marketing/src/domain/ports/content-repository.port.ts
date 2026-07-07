import type { ChecklistItem, Content, ContentComment, StageEvent } from '../content/content'
import type { ContentStage } from '../content/stage'

export interface ListContentsFilter {
  stage?: ContentStage
  ownerUserId?: string
  q?: string
  limit: number
  offset: number
}

export interface ContentRepository {
  create(content: Content): Promise<void>
  byId(id: string): Promise<Content | null>
  /** Update com concorrência otimista: 0 linhas (versão defasada) → false. */
  update(content: Content, expectedVersion: number): Promise<boolean>
  list(filter: ListContentsFilter): Promise<{ items: Content[]; total: number }>
  /** Contagem por etapa (painel) — agregada no banco, sem paginar. */
  countByStage(): Promise<Map<ContentStage, number>>
  insertStageEvent(event: StageEvent): Promise<void>
  listStageEvents(contentId: string): Promise<StageEvent[]>
}

export interface ChecklistRepository {
  createMany(items: ChecklistItem[]): Promise<void>
  byId(id: string): Promise<ChecklistItem | null>
  update(item: ChecklistItem): Promise<void>
  delete(id: string): Promise<void>
  listByContent(contentId: string): Promise<ChecklistItem[]>
  /** Contagem feito/total por conteúdo (badge do kanban) — em lote. */
  countsByContent(contentIds: string[]): Promise<Map<string, { done: number; total: number }>>
}

export interface CommentRepository {
  create(comment: ContentComment): Promise<void>
  listByContent(contentId: string): Promise<ContentComment[]>
  countsByContent(contentIds: string[]): Promise<Map<string, number>>
}
