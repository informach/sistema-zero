import type {
  HelpCollectionDocument,
  HelpCollectionStatus,
  HelpTutorialDocument,
  HelpTutorialStatus,
} from '@sistemazero/core/help'

/**
 * Portas do "Como fazer" (biblioteca de ajuda do Kids). Duas tabelas próprias, sem FK para
 * `lessons`: a coleção (porta da biblioteca) e o tutorial (rascunho + publicado).
 */

export interface HelpCollectionRecord extends HelpCollectionDocument {
  id: string
  position: number
  status: HelpCollectionStatus
  createdAt: Date
  updatedAt: Date
}

export interface CreateHelpCollectionInput extends HelpCollectionDocument {
  id: string
  position: number
  now: Date
}

export type HelpCollectionPatch = Partial<HelpCollectionDocument & { position: number }>

export interface HelpCollectionRepository {
  /** Todas, inclusive arquivadas, por posição (a tela decide o que esconder). */
  list(): Promise<HelpCollectionRecord[]>
  findById(id: string): Promise<HelpCollectionRecord | null>
  findBySlug(slug: string): Promise<HelpCollectionRecord | null>
  /** Lança `HelpDuplicateSlugError` em slug repetido. */
  create(input: CreateHelpCollectionInput): Promise<HelpCollectionRecord>
  update(id: string, patch: HelpCollectionPatch, now: Date): Promise<HelpCollectionRecord | null>
  setStatus(
    id: string,
    status: HelpCollectionStatus,
    now: Date,
  ): Promise<HelpCollectionRecord | null>
  /** Regrava `position` na ordem dada (ids ausentes ficam depois, na ordem atual). */
  reorder(ids: string[], now: Date): Promise<void>
  /** Quantos tutoriais PUBLICADOS cada coleção tem, por id. */
  publishedCounts(): Promise<Map<string, number>>
}

export interface HelpTutorialRecord {
  id: string
  slug: string
  collectionId: string
  status: HelpTutorialStatus
  draft: HelpTutorialDocument
  published: HelpTutorialDocument | null
  publishedSearchText: string | null
  revision: number
  position: number
  createdBy: string | null
  updatedBy: string | null
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
}

export interface CreateHelpTutorialInput {
  id: string
  slug: string
  collectionId: string
  draft: HelpTutorialDocument
  position: number
  actorId: string | null
  now: Date
}

export type HelpTutorialPatch = Partial<{
  slug: string
  collectionId: string
  draft: HelpTutorialDocument
  position: number
}>

export interface HelpTutorialStatusChange {
  status: HelpTutorialStatus
  published: HelpTutorialDocument | null
  publishedSearchText: string | null
  /** `undefined` mantém a data; `null` a apaga. */
  publishedAt?: Date | null
}

export interface HelpTutorialListFilter {
  status?: HelpTutorialStatus
  collectionId?: string
  /** Busca por título e slug, por ILIKE no slug e no título do rascunho (curingas escapados). */
  q?: string
}

/** Um tutorial publicado que casou com a pergunta do Zappy. */
export interface HelpTutorialSearchHit {
  id: string
  slug: string
  collectionId: string
  title: string
  summary: string
  published: HelpTutorialDocument
}

export interface HelpImportItem {
  slug: string
  collectionId: string
  draft: HelpTutorialDocument
  position: number
}

export interface HelpTutorialRepository {
  /** Só `published`, por (posição da coleção, posição, slug). */
  listPublished(): Promise<HelpTutorialRecord[]>
  findPublishedBySlug(slug: string): Promise<HelpTutorialRecord | null>
  /** Busca do Zappy sobre `published_search_text` (tsvector em português + ilike). */
  searchPublished(query: string, limit: number): Promise<HelpTutorialSearchHit[]>
  listAll(filter?: HelpTutorialListFilter): Promise<HelpTutorialRecord[]>
  findById(id: string): Promise<HelpTutorialRecord | null>
  findBySlug(slug: string): Promise<HelpTutorialRecord | null>
  /** Lança `HelpDuplicateSlugError` em slug repetido. */
  create(input: CreateHelpTutorialInput): Promise<HelpTutorialRecord>
  /**
   * `UPDATE … WHERE id = ? AND revision = ?`: `'conflict'` quando a revisão ficou para trás,
   * `null` quando não existe. Incrementa `revision`.
   */
  update(
    id: string,
    expectedRevision: number,
    patch: HelpTutorialPatch,
    actorId: string | null,
    now: Date,
  ): Promise<HelpTutorialRecord | 'conflict' | null>
  setStatus(
    id: string,
    expectedRevision: number,
    change: HelpTutorialStatusChange,
    actorId: string | null,
    now: Date,
  ): Promise<HelpTutorialRecord | 'conflict' | null>
  /**
   * Import por slug, numa transação: cria o que não existe e troca SÓ o `draft` (e coleção e
   * posição) do que existe. NUNCA toca `published`: o import prepara, quem publica é o admin.
   */
  upsertDraftsBySlug(
    items: HelpImportItem[],
    actorId: string | null,
    now: Date,
  ): Promise<{ created: number; updated: number }>
  countPublishedInCollection(collectionId: string): Promise<number>
}
