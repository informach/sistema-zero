/** Envelope de listagem paginada (offset-based). Espelha o do catálogo. */
export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}
