/**
 * Busca e filtro da lista de projetos (18/08/2026, junto da busca do Pinta): a lista não
 * tem teto de quantidade, então a busca é o que a mantém navegável.
 *
 * - Busca por NOME com a mesma régua do Pinta: minúsculas, sem acento, espaços viram hífen
 *   ("Nave Espacial" casa com "nave espacial", "NAVE" e "espaçial"); vários termos têm que
 *   casar TODOS.
 * - Filtro de MODO: Blocos (blocos e ponte) × Código (modo profissional).
 */
import type { IDEMode } from '../core/modes'

export type ProjectModeFilter = 'all' | 'blocks' | 'code'

/** Texto pesquisável: minúsculas, sem acento, `_`/espaços → `-`, sem símbolos. */
export function normalizeProjectSearchText(input: string): string {
  return (
    input
      .normalize('NFD')
      // Diacríticos combinantes (U+0300–U+036F) por ESCAPE: os caracteres literais dentro da
      // classe eram frágeis a formatador/editor.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}

export function projectSearchTerms(query: string): string[] {
  return query
    .split(/\s+/)
    .map((term) => normalizeProjectSearchText(term))
    .filter((term) => term.length > 0)
}

/** Todos os termos aparecem no nome? Busca vazia casa tudo. */
export function matchesProjectSearch(name: string, query: string): boolean {
  return matchesNormalizedName(normalizeProjectSearchText(name), projectSearchTerms(query))
}

/**
 * A mesma decisão com o nome JÁ normalizado e os termos JÁ calculados: a lista guarda
 * `normalizeProjectSearchText(nome)` por projeto e calcula os termos uma vez por tecla
 * (em vez de N normalizações do nome + N do texto digitado a cada tecla).
 */
export function matchesNormalizedName(normalizedName: string, terms: readonly string[]): boolean {
  if (terms.length === 0) return true
  return terms.every((term) => normalizedName.includes(term))
}

/** Blocos = `blocks` e `bridge` (os dois são o editor de blocos); Código = `code`. */
export function matchesProjectMode(mode: IDEMode, filter: ProjectModeFilter): boolean {
  if (filter === 'all') return true
  return filter === 'code' ? mode === 'code' : mode !== 'code'
}
