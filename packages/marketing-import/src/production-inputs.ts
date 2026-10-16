import type { InventoryEntry, ProductionFolder } from '@sistemazero/marketing-contracts'
import { isProductionCanonicalPath } from './production-folders'
import { productionFolders, reviewProduction } from './production-review'
import { parseStructuredCopy, type SourcePiece } from './structured-copy'

/** Same bounded input set on desktop and server; no path guesses or code execution. */
export function productionInputs(entries: InventoryEntry[], folderPath: string) {
  const folder = productionFolders(entries).find((value) => value.path === folderPath)
  if (!folder) throw new Error('Pasta de produção ausente deste inventário')
  const selected: Array<{
    ordinal: number
    source: InventoryEntry
    kind: 'canonical' | 'metadata' | 'media'
  }> = []
  let textBytes = 0,
    mediaBytes = 0,
    mediaCount = 0
  for (const [ordinal, source] of entries.entries()) {
    if (
      !['eligible', 'review'].includes(source.disposition) ||
      source.kind !== 'file' ||
      source.validity === 'historical'
    )
      continue
    const relative = source.path.startsWith(`${folder.path}/`)
      ? source.path.slice(folder.path.length + 1)
      : null
    const canonical = isProductionCanonicalPath(folder, source.path)
    const metadata =
      relative !== null &&
      ((!folder.key.startsWith('P') && relative === 'publicacao.txt') ||
        /^(?:legenda\.txt|texto-alternativo\.txt|apoio\/(?:v\d+\/)?(?:copy\.json|copy-fonte\.md))$/.test(
          relative,
        ))
    if (canonical || metadata) {
      textBytes += source.bytes ?? 0
      if (textBytes > 4 * 1024 ** 2 || (source.bytes ?? 0) > 196608)
        throw new Error('Metadados excedem 4 MiB por peça ou 192 KiB por arquivo')
      selected.push({ ordinal, source, kind: canonical ? 'canonical' : 'metadata' })
    } else if (relative !== null && /^\d{2}-[^/]+\.(png|jpe?g|mp4)$/i.test(relative)) {
      mediaBytes += source.bytes ?? 0
      if (mediaBytes > 1024 ** 3 || ++mediaCount > 100)
        throw new Error('Mídias da peça excedem 1 GiB ou 100 arquivos; confira individualmente')
      selected.push({ ordinal, source, kind: 'media' })
    }
  }
  if (selected.length > 200)
    throw new Error('A conferência excede 200 fontes; confira uma seleção menor')
  return { folder, selected }
}

export function productionReviewFromTexts(
  folder: ProductionFolder,
  entries: InventoryEntry[],
  texts: ReadonlyMap<string, string>,
) {
  const inputs = productionInputs(entries, folder.path)
  const copies: Array<{ sourcePath: string; piece: SourcePiece }> = []
  for (const { source, kind } of inputs.selected) {
    if (kind === 'media') continue
    const text = texts.get(source.path)
    if (text === undefined) throw new Error(`Metadado não carregado: ${source.path}`)
    if (kind === 'canonical') {
      const parsed = parseStructuredCopy(text)
      if (parsed.issues.some((issue) => issue.key === folder.key))
        throw new Error(`Ficha ${folder.key} incompleta em ${source.path}`)
      for (const piece of parsed.pieces.filter((piece) => piece.key === folder.key))
        copies.push({ sourcePath: source.path, piece })
    }
  }
  return reviewProduction({
    folder,
    entries,
    texts,
    copy: copies.length === 1 ? (copies[0] ?? null) : null,
  })
}
