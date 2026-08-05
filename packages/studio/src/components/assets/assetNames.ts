import { normalizeAssetName } from '#core'

/**
 * Nome único para um asset entrando no projeto: normaliza (kebab) e, em
 * colisão, sufixa `-2`, `-3`… Compartilhado entre o AssetsPanel (uploads,
 * biblioteca, "Meus desenhos") e a modal "Trazer do Pinta".
 */
export function uniqueAssetName(base: string, taken: ReadonlySet<string>): string {
  const root = normalizeAssetName(base) ?? 'imagem'
  if (!taken.has(root)) return root
  let i = 2
  while (taken.has(`${root}-${i}`)) i += 1
  return `${root}-${i}`
}
