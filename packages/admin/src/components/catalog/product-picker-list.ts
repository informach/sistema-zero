/** Helpers compartilhados dos editores de listas de produtos (combo/bônus). */

/** Move o item `index` na direção `dir` (imutável); null se não há p/ onde mover. */
export function moveItem<T>(items: T[], index: number, dir: -1 | 1): T[] | null {
  const target = index + dir
  if (target < 0 || target >= items.length) return null
  const next = [...items]
  const a = next[index] as T
  next[index] = next[target] as T
  next[target] = a
  return next
}
