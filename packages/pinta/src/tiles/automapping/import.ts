import { isTileLayer, type TilemapCells, tileLayerTilesetId } from '../../core/project'
import type { AuthorMap } from '../mapCellEdits'
import type { AutomapBook, SheetIndex } from './book'
import { checkAutomapBindings } from './engine'

/** Source layer IDs are local to their document. An imported book must either bind exactly
 * or ask the author to choose a distinct destination with the same ordered tile identity. */
export function automapImportLayers(book: AutomapBook, map: AuthorMap, sheets: SheetIndex) {
  const source = new Map<string, { sha256: string; sheet: string; rule: string }>()
  for (const rule of book.rules)
    for (const group of [rule.input, ...rule.outputs])
      for (const plane of group) {
        const previous = source.get(plane.layer)
        if (previous && (previous.sha256 !== plane.sha256 || previous.sheet !== plane.sheet))
          return null
        if (!previous)
          source.set(plane.layer, { sha256: plane.sha256, sheet: plane.sheet, rule: rule.name })
      }
  return [...source].map(([id, binding]) => ({
    id,
    rule: binding.rule,
    choices: map.layers
      .filter(isTileLayer<TilemapCells>)
      .filter((layer) => sheets.get(tileLayerTilesetId(map, layer))?.sha256 === binding.sha256)
      .map((layer) => ({ id: layer.id, name: layer.name, sheet: tileLayerTilesetId(map, layer) })),
  }))
}
export function bindAutomapImport(
  book: AutomapBook,
  map: AuthorMap,
  sheets: SheetIndex,
  selected: ReadonlyMap<string, string>,
): AutomapBook | null {
  const layers = automapImportLayers(book, map, sheets)
  if (
    !layers ||
    selected.size !== layers.length ||
    new Set(selected.values()).size !== layers.length
  )
    return null
  const matches = new Map<string, { id: string; sheet: string }>()
  for (const layer of layers) {
    const pick = layer.choices.find((choice) => choice.id === selected.get(layer.id))
    if (!pick) return null
    matches.set(layer.id, pick)
  }
  const next = structuredClone(book)
  for (const rule of next.rules)
    for (const group of [rule.input, ...rule.outputs])
      for (const plane of group) {
        const choice = matches.get(plane.layer)!
        plane.layer = choice.id
        plane.sheet = choice.sheet
      }
  return checkAutomapBindings(map, next, sheets) ? null : next
}
