/**
 * Busca e filtros da galeria (18/08/2026). Sem teto de quantidade de desenhos, são eles
 * que mantêm a galeria navegável.
 *
 * - **Busca** casa por NOME, por TIPO ("personagem", "cenário", "peças", "mapa") e pelo JOGO
 *   do Pensa (`projectRef.name`), com a mesma régua de normalização do nome do desenho:
 *   minúsculas, sem acento, espaços viram hífen — "Cenário de fundo" e "cenario" caem no mesmo
 *   texto, e digitar "nave 2" acha `nave-2`. Vários termos (separados por espaço) têm que
 *   casar TODOS, em qualquer campo.
 * - **Filtro de estilo**: pixel art × vetor (o mapa não tem estilo: aparece nos dois).
 * - **Filtro de tipo**: personagem × cenário × peças × mapa (`assetRole`).
 * Os três se combinam (E).
 */
import { COPY } from './copy'
import {
  assetRole,
  assetStyle,
  type PintaAsset,
  type PintaAssetRole,
  type PintaAssetStyle,
} from './project'

export type GalleryStyleFilter = PintaAssetStyle | 'all'
export type GalleryRoleFilter = PintaAssetRole | 'all'

export interface GalleryFilters {
  query: string
  style: GalleryStyleFilter
  role: GalleryRoleFilter
}

export const EMPTY_GALLERY_FILTERS: GalleryFilters = { query: '', style: 'all', role: 'all' }

/** Texto pesquisável: minúsculas, sem acento, `_`/espaços → `-`, sem símbolos. */
export function normalizeSearchText(input: string): string {
  return (
    input
      .normalize('NFD')
      // Diacríticos combinantes (U+0300–U+036F) por ESCAPE (literais na classe eram frágeis).
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}

/** Os termos da busca (vazio = sem filtro). */
export function searchTerms(query: string): string[] {
  return query
    .split(/\s+/)
    .map((term) => normalizeSearchText(term))
    .filter((term) => term.length > 0)
}

/** Texto pesquisável memoizado POR ASSET (os assets são imutáveis: um `updatedAt` novo é um objeto novo). */
const searchableTextCache = new WeakMap<PintaAsset, string>()

/** O que a busca enxerga de um desenho: nome, tipo e jogo, já normalizados. */
export function searchableText(asset: PintaAsset): string {
  const cached = searchableTextCache.get(asset)
  if (cached !== undefined) return cached
  const kind = COPY.kinds[asset.kind]
  const parts = [asset.name, kind.title, asset.projectRef?.name ?? '']
  const text = parts.map((part) => normalizeSearchText(part)).join(' ')
  searchableTextCache.set(asset, text)
  return text
}

/** Todos os termos da busca aparecem em algum campo do desenho? Busca vazia casa tudo. */
export function matchesGallerySearch(asset: PintaAsset, query: string): boolean {
  return matchesSearchTerms(asset, searchTerms(query))
}

/** A mesma decisão com os termos JÁ calculados (uma vez por tecla, não por asset). */
export function matchesSearchTerms(asset: PintaAsset, terms: readonly string[]): boolean {
  if (terms.length === 0) return true
  const haystack = searchableText(asset)
  return terms.every((term) => haystack.includes(term))
}

/**
 * Filtra a galeria inteira com os filtros dados — os termos da busca normalizados UMA vez
 * e o texto de cada desenho vindo do cache. Equivale a `assets.filter(a =>
 * matchesGalleryFilters(a, filters))`, só mais barato com centenas de desenhos.
 */
export function filterGalleryAssets(
  assets: readonly PintaAsset[],
  filters: GalleryFilters,
): PintaAsset[] {
  const terms = searchTerms(filters.query)
  return assets.filter(
    (asset) =>
      matchesStyleFilter(asset, filters.style) &&
      matchesRoleFilter(asset, filters.role) &&
      matchesSearchTerms(asset, terms),
  )
}

/** Passa no estilo escolhido? O mapa não tem estilo próprio: aparece em pixel E em vetor. */
export function matchesStyleFilter(asset: PintaAsset, style: GalleryStyleFilter): boolean {
  if (style === 'all') return true
  const own = assetStyle(asset.kind)
  return own === null || own === style
}

export function matchesRoleFilter(asset: PintaAsset, role: GalleryRoleFilter): boolean {
  return role === 'all' || assetRole(asset.kind) === role
}

/** Busca + estilo + tipo, combinados (E). */
export function matchesGalleryFilters(asset: PintaAsset, filters: GalleryFilters): boolean {
  return (
    matchesStyleFilter(asset, filters.style) &&
    matchesRoleFilter(asset, filters.role) &&
    matchesGallerySearch(asset, filters.query)
  )
}

/** Há algum filtro ligado? (decide se a galeria mostra o contador e o "limpar") */
export function hasActiveGalleryFilters(filters: GalleryFilters): boolean {
  return filters.query.trim().length > 0 || filters.style !== 'all' || filters.role !== 'all'
}
