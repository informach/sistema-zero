import { isObjectLayer, type RegionTilemapAsset } from '../../src/core/project'
import { MAX_BACKUP_FILE_BYTES } from '../../src/export/projectJson'
import { encodeRegionGalleryBackup } from '../../src/export/regionBackup'
import { metadataBudgetFixture } from './metadataBudget'

let boundary: RegionTilemapAsset | undefined
/** Build the boundary using actual encoded text/UTF-8 as oracle, never the incremental cache. */
export function exactJsonBudgetFixture(): RegionTilemapAsset {
  if (boundary) return boundary
  const source = { ...metadataBudgetFixture().source, updatedAt: 0 }
  const initial = encodeRegionGalleryBackup([source])
  if (!initial) throw Error('Base não exportável')
  let remaining = MAX_BACKUP_FILE_BYTES - new TextEncoder().encode(initial.text).byteLength
  const result: RegionTilemapAsset = {
    ...source,
    layers: source.layers.map((layer) =>
      !isObjectLayer(layer)
        ? layer
        : {
            ...layer,
            objects: layer.objects.map((object) => ({
              ...object,
              properties: Object.fromEntries(
                Object.entries(object.properties).map(([key, value]) => {
                  if (typeof value !== 'string') return [key, value]
                  const zeros = Math.min(value.length, Math.floor(remaining / 5))
                  remaining -= zeros * 5
                  const escaped = Math.min(value.length - zeros, remaining)
                  remaining -= escaped
                  return [
                    key,
                    '\0'.repeat(zeros) + '\b'.repeat(escaped) + value.slice(zeros + escaped),
                  ]
                }),
              ),
            })),
          },
    ),
  }
  const encoded = encodeRegionGalleryBackup([result])
  if (
    remaining ||
    !encoded ||
    new TextEncoder().encode(encoded.text).byteLength !== MAX_BACKUP_FILE_BYTES
  )
    throw Error('Fronteira JSON inexata')
  boundary = result
  return result
}
