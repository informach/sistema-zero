import type { KbArticle } from '../kb/kb-article'

export interface KbRepository {
  create(article: KbArticle): Promise<void>
  byId(id: string): Promise<KbArticle | null>
  /** Update com concorrência otimista (0 linhas → false). */
  update(article: KbArticle, expectedVersion: number): Promise<boolean>
  delete(id: string): Promise<boolean>
  list(filter: { limit: number; offset: number }): Promise<{ items: KbArticle[]; total: number }>
  /** Candidatos publicados e limitados para o contexto do rascunho da IA. */
  listPublished(limit: number): Promise<KbArticle[]>
}
