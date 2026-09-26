import type {
  HelpCollectionView,
  HelpTutorialDocument,
  HelpTutorialEntry,
  HelpTutorialStatus,
  HelpTutorialView,
} from '@sistemazero/core/help'
import type {
  HelpCollectionRecord,
  HelpTutorialRecord,
} from '../../domain/ports/help-repository.port'

/** A coleção como o kids e o admin a leem (com a contagem de publicados). */
export function toHelpCollectionView(
  record: HelpCollectionRecord,
  publishedCount: number,
): HelpCollectionView {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    description: record.description,
    icon: record.icon,
    tone: record.tone,
    position: record.position,
    status: record.status,
    publishedCount,
  }
}

/** Uma linha da lista publicada (o kids pesquisa sobre ela no navegador). */
export function toHelpTutorialEntry(
  record: HelpTutorialRecord,
  collection: HelpCollectionRecord,
): HelpTutorialEntry | null {
  const doc = record.published
  if (!doc) return null
  return {
    id: record.id,
    slug: record.slug,
    collectionId: record.collectionId,
    collectionSlug: collection.slug,
    title: doc.title,
    summary: doc.summary,
    keywords: doc.keywords ?? [],
    toolRef: doc.toolRef ?? null,
    searchText: record.publishedSearchText ?? '',
    position: record.position,
    // A data que a criança vê é a do PUBLICADO: salvar rascunho não pode dizer "atualizado".
    updatedAt: (record.publishedAt ?? record.updatedAt).toISOString(),
  }
}

/** O tutorial PUBLICADO como a criança o lê. */
export function toHelpTutorialView(
  record: HelpTutorialRecord,
  collection: HelpCollectionRecord,
): HelpTutorialView | null {
  const doc = record.published
  if (!doc || !record.publishedAt) return null
  return {
    ...doc,
    id: record.id,
    slug: record.slug,
    collectionId: record.collectionId,
    collectionSlug: collection.slug,
    collectionTitle: collection.title,
    collectionTone: collection.tone,
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt.toISOString(),
  }
}

/** O que o admin vê na LISTA (sem os dois jsonb, que pesam). */
export interface HelpTutorialAdminSummaryView {
  id: string
  slug: string
  collectionId: string
  status: HelpTutorialStatus
  title: string
  summary: string
  toolRef: string | null
  revision: number
  position: number
  /** O rascunho mudou depois da última publicação. */
  hasUnpublishedChanges: boolean
  updatedAt: string
  publishedAt: string | null
}

/** O que o admin edita: rascunho + o publicado (para comparar), revisão e datas. */
export interface HelpTutorialAdminView extends HelpTutorialAdminSummaryView {
  draft: HelpTutorialDocument
  published: HelpTutorialDocument | null
  createdAt: string
}

function sameDocument(a: HelpTutorialDocument | null, b: HelpTutorialDocument | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function toHelpTutorialAdminSummaryView(
  record: HelpTutorialRecord,
): HelpTutorialAdminSummaryView {
  return {
    id: record.id,
    slug: record.slug,
    collectionId: record.collectionId,
    status: record.status,
    title: record.draft.title,
    summary: record.draft.summary,
    toolRef: record.draft.toolRef ?? null,
    revision: record.revision,
    position: record.position,
    hasUnpublishedChanges:
      record.status === 'published' && !sameDocument(record.draft, record.published),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null,
  }
}

export function toHelpTutorialAdminView(record: HelpTutorialRecord): HelpTutorialAdminView {
  return {
    ...toHelpTutorialAdminSummaryView(record),
    draft: record.draft,
    published: record.published,
    createdAt: record.createdAt.toISOString(),
  }
}
