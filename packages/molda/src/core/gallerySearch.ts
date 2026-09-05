/**
 * Busca e filtro da galeria. Sem teto de quantidade de criações, são eles que
 * mantêm a galeria navegável.
 *
 * - **Busca** casa por NOME e por TIPO ("modelo", "textura", "céu"), com a mesma
 *   régua de normalização do nome (minúsculas, sem acento, espaços viram hífen).
 *   Vários termos (separados por espaço) têm que casar TODOS.
 * - **Filtro de tipo**: modelo × textura × céu.
 */
import { COPY } from './copy'
import type { MoldaAsset, MoldaAssetKind } from './model'

export type GalleryKindFilter = MoldaAssetKind | 'all'

export interface GalleryFilters {
  query: string
  kind: GalleryKindFilter
}

export const EMPTY_GALLERY_FILTERS: GalleryFilters = { query: '', kind: 'all' }

/** Texto pesquisável: minúsculas, sem acento, `_`/espaços → `-`, sem símbolos. */
export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function searchTerms(query: string): string[] {
  return query
    .split(/\s+/)
    .map((term) => normalizeSearchText(term))
    .filter((term) => term.length > 0)
}

const searchableTextCache = new WeakMap<MoldaAsset, string>()

export function searchableText(asset: MoldaAsset): string {
  const cached = searchableTextCache.get(asset)
  if (cached !== undefined) return cached
  const text = [asset.name, COPY.kinds[asset.kind].title]
    .map((part) => normalizeSearchText(part))
    .join(' ')
  searchableTextCache.set(asset, text)
  return text
}

export function matchesSearchTerms(asset: MoldaAsset, terms: readonly string[]): boolean {
  if (terms.length === 0) return true
  const haystack = searchableText(asset)
  return terms.every((term) => haystack.includes(term))
}

export function matchesKindFilter(asset: MoldaAsset, kind: GalleryKindFilter): boolean {
  return kind === 'all' || asset.kind === kind
}

export function filterGalleryAssets(
  assets: readonly MoldaAsset[],
  filters: GalleryFilters,
): MoldaAsset[] {
  const terms = searchTerms(filters.query)
  return assets.filter(
    (asset) => matchesKindFilter(asset, filters.kind) && matchesSearchTerms(asset, terms),
  )
}

export function hasActiveGalleryFilters(filters: GalleryFilters): boolean {
  return filters.query.trim().length > 0 || filters.kind !== 'all'
}
