import type { CatalogCourseView } from './types'

/**
 * Ordenação do catálogo "Todos os cursos" (compartilhada pelos dois apps via
 * `useCatalogFilters`). Padrão do produto = `antigos` (jornada de criação: do
 * curso mais antigo ao mais novo — decisão da usuária 13/07). `padrao` legado em
 * URL antiga é normalizado p/ `antigos` no parse do hook.
 */
export type CatalogSort = 'antigos' | 'recentes' | 'az' | 'za'

/**
 * Aplica a ordenação SEM mutar a lista. Datas ISO comparam lexicograficamente;
 * curso sem `createdAt` (members antigo) fica onde o servidor o mandou (sort
 * estável + chave vazia agrupa no início do `antigos`/fim do `recentes`).
 */
export function applyCatalogSort(
  list: CatalogCourseView[],
  ordem: CatalogSort,
): CatalogCourseView[] {
  const created = (c: CatalogCourseView) => c.createdAt ?? ''
  switch (ordem) {
    case 'antigos':
      return [...list].sort((a, b) => created(a).localeCompare(created(b)))
    case 'recentes':
      return [...list].sort((a, b) => created(b).localeCompare(created(a)))
    case 'az':
      return [...list].sort((a, b) => a.title.localeCompare(b.title))
    case 'za':
      return [...list].sort((a, b) => b.title.localeCompare(a.title))
  }
}
