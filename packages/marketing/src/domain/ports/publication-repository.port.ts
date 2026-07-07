import type { Publication } from '../publication/publication-record'

export interface PublicationRepository {
  create(publication: Publication): Promise<void>
  /** Insert único do cross-post — tudo entra ou nada entra. */
  createMany(publications: Publication[]): Promise<void>
  byId(id: string): Promise<Publication | null>
  /** Update com concorrência otimista: 0 linhas (versão defasada) → false. */
  update(publication: Publication, expectedVersion: number): Promise<boolean>
  listByContent(contentId: string): Promise<Publication[]>
  listByContents(contentIds: string[]): Promise<Map<string, Publication[]>>
}
