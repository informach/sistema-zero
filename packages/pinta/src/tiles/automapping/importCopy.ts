import { isTilesetKind } from '../../core/project'
import { planImport } from '../../state/importPlan'
import {
  type AutomapGallery,
  decodeAutomapGallery,
  rebindCopiedAutomapBook,
  validGallery,
} from './native'

/** Import into the existing gallery as new objects. Use the same graph, ID and name mapping as
 * gallery backup restoration, including doors, nested resources and object/animation references.
 * A failed check never publishes a partial collection or guesses which tile a slot refers to. */
export async function importAutomapCopy(text: string, destination: AutomapGallery) {
  const source = await decodeAutomapGallery(text)
  if (!source) return null
  const sheets = source.assets.filter(isTilesetKind)
  const sorted = [...sheets, ...source.assets.filter((asset) => !isTilesetKind(asset))]
  const plan = planImport(
    sorted,
    new Set(sheets.map((sheet) => sheet.id)),
    new Set(destination.assets.map((asset) => asset.name)),
  )
  if (plan.skipped || plan.error || plan.idMap.size !== source.assets.length) return null
  const restored = plan.pairs.map((pair) => pair.restored)
  const assets = [...destination.assets, ...restored]
  const restoredById = new Map(restored.map((asset) => [asset.id, asset]))
  const books = new Map(destination.books)
  for (const map of source.assets) {
    const book = source.books.get(map.id)
    if (!book) continue
    const id = plan.idMap.get(map.id),
      copy = id && restoredById.get(id)
    if (
      map.kind !== 'tilemap' ||
      !copy ||
      copy.kind !== 'tilemap' ||
      copy.layers.length !== map.layers.length
    )
      return null
    const next = await rebindCopiedAutomapBook(map, copy, book, source.assets, assets)
    if (!next) return null
    books.set(copy.id, next)
  }
  const gallery = { assets, books }
  return (await validGallery(gallery)) ? { gallery, idMap: plan.idMap } : null
}
