import { normalizeAssetName } from './projectAssets'

/** Stable names for uploads and creations entering the same project. */
export function uniqueAssetName(base: string, taken: ReadonlySet<string>): string {
  const root = normalizeAssetName(base) ?? 'imagem'
  if (!taken.has(root)) return root
  let i = 2
  while (taken.has(`${root}-${i}`)) i += 1
  return `${root}-${i}`
}
