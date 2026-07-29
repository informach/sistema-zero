export interface OffsetPage<T> {
  items: T[]
  total: number
}

/** Carrega todas as páginas de uma listagem administrativa com limite por página. */
export async function loadAllPages<T>(
  loadPage: (offset: number, limit: number) => Promise<OffsetPage<T>>,
  limit = 100,
): Promise<T[]> {
  const items: T[] = []
  let offset = 0
  while (true) {
    const page = await loadPage(offset, limit)
    items.push(...page.items)
    if (page.items.length === 0 || items.length >= page.total) return items
    offset += page.items.length
  }
}
