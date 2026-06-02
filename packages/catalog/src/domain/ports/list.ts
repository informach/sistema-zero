/**
 * Tipos compartilhados de listagem paginada (consumo admin). O `status`/`q` são
 * filtros opcionais validados na borda (DTO) contra o enum do recurso.
 */
export interface ListQuery {
  /** Busca textual case-insensitive (nome/slug/sku/código). */
  readonly q?: string
  /** Filtro por status (string crua; cada repo casa com o enum do seu recurso). */
  readonly status?: string
  readonly limit: number
  readonly offset: number
}

/** Página de resultados + total (para paginação). */
export interface Page<T> {
  readonly items: T[]
  readonly total: number
}
