import 'server-only'

/**
 * Lê `{ orderedIds: string[] }` do corpo de uma rota de reordenação. Corpo
 * malformado, `orderedIds` ausente ou que não seja um array de strings → `null`
 * (a rota devolve 400 em vez de mandar uma reordenação vazia/ambígua ao upstream;
 * substitui o antigo `json?.orderedIds ?? []` com tipo `any`). Achado do review.
 */
export async function readOrderedIds(req: Request): Promise<string[] | null> {
  const json = (await req.json().catch(() => null)) as { orderedIds?: unknown } | null
  const ids = json?.orderedIds
  if (!Array.isArray(ids) || !ids.every((x): x is string => typeof x === 'string')) return null
  return ids
}
