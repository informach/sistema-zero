import type { Idea, IdeaStatus } from '../idea/idea'

export interface ListIdeasFilter {
  status?: IdeaStatus
  limit: number
  offset: number
}

export interface IdeaRepository {
  create(idea: Idea): Promise<void>
  byId(id: string): Promise<Idea | null>
  update(idea: Idea): Promise<void>
  /**
   * Claim da promoção: `inbox` → `accepted` + ponteiro do conteúdo, CONDICIONAL
   * ao status ainda ser `inbox` (0 linhas → false). É o que impede a dupla
   * promoção em corrida sem precisar de transação.
   */
  markPromoted(id: string, contentId: string, at: Date): Promise<boolean>
  list(filter: ListIdeasFilter): Promise<{ items: Idea[]; total: number }>
}
