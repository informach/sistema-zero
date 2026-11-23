/** Closed Native 9 variant. Projection and its cell dialect live only in the body. */
import { pintaValuesEqual } from '../core/assetEquality'
import {
  decodeProjectedTilemapDocument,
  encodeProjectedTilemapDocument,
  isProjectedTileLayer,
  type ProjectedTilemapAsset,
  type ProjectedTilemapDocument,
  type WorkshopProjectedMap,
} from '../core/projectedDocument'
import { type AutomapBook, readAutomapBook } from '../tiles/automapping/book'
import { sameEncodedValue } from '../tiles/automapping/native'
import { cellTile } from '../tiles/cell'
import { decodePintaBackupAsset, encodePintaBackupAsset } from './projectJson'
import { admitsRegionBackupBuffers } from './regionBackup'

export type { WorkshopProjectedMap }
export interface WorkshopProjectionEnvelope {
  kind: 'tilemap'
  id: string
  schema: 9
  capability: 'projection'
  map: ProjectedTilemapDocument
  book?: AutomapBook
}
function bindings(map: ProjectedTilemapAsset, book: AutomapBook): boolean {
  const layers = new Map(map.layers.filter(isProjectedTileLayer).map((layer) => [layer.id, layer]))
  return book.rules.every((rule) =>
    [rule.input, ...rule.outputs].every((group) =>
      group.every((plane) => {
        const layer = layers.get(plane.layer)
        return (
          !!layer &&
          (layer.tilesetId ?? map.tilesetId) === plane.sheet &&
          (map.projection.kind !== 'hexagonal' ||
            plane.cells.every((cell) => cell === null || cell === -1 || cell === cellTile(cell)))
        )
      }),
    ),
  )
}
export function encodeWorkshopProjectedMap(
  asset: WorkshopProjectedMap,
): WorkshopProjectionEnvelope | null {
  const { automapping, ...body } = asset
  const map = encodeProjectedTilemapDocument(body, encodePintaBackupAsset)
  if (!map) return null
  const book = automapping === undefined ? undefined : readAutomapBook(JSON.stringify(automapping))
  if (book === null || (book && !bindings(body, book))) return null
  return {
    kind: 'tilemap',
    schema: 9,
    id: asset.id,
    capability: 'projection',
    map,
    ...(book ? { book } : {}),
  }
}
export function decodeWorkshopProjectedMap(raw: unknown): WorkshopProjectedMap | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('capability' in raw) ||
    raw.capability !== 'projection' ||
    !('schema' in raw) ||
    raw.schema !== 9 ||
    !('kind' in raw) ||
    raw.kind !== 'tilemap' ||
    !('id' in raw) ||
    typeof raw.id !== 'string' ||
    !('map' in raw) ||
    Object.keys(raw).length !== ('book' in raw ? 6 : 5)
  )
    return null
  // The same allocation budget accounts for cell widths and every decoded resource bitmap.
  if (!admitsRegionBackupBuffers([raw.map])) return null
  const map = decodeProjectedTilemapDocument(decodePintaBackupAsset(raw.map, true))
  if (!map || map.id !== raw.id) return null
  const book = 'book' in raw ? readAutomapBook(JSON.stringify(raw.book)) : undefined
  if (book === null || (book && !bindings(map, book))) return null
  const exact: WorkshopProjectedMap = book ? { ...map, automapping: book } : map
  const encoded = encodeWorkshopProjectedMap(exact)
  return encoded && sameEncodedValue(encoded, raw) ? exact : null
}
export function sanitizeWorkshopProjectedMap(raw: unknown): WorkshopProjectedMap | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('projection' in raw) ||
    !('schema' in raw) ||
    raw.schema !== 9
  )
    return null
  const source = 'automapping' in raw ? raw.automapping : undefined
  const body = { ...raw }
  if ('automapping' in body) delete body.automapping
  const map = decodeProjectedTilemapDocument(body)
  if (!map || !pintaValuesEqual(body, map)) return null
  if (source === undefined) return map
  const book = readAutomapBook(JSON.stringify(source))
  return book && bindings(map, book) ? { ...map, automapping: book } : null
}
