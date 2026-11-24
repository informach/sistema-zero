import { PINTA_REGION_CHUNK_BASE64_CHARS } from '@sistemazero/core/creations'
import type { PintaAsset } from '../core/project'
import {
  encodeRegionMapDocument,
  encodeRegionSetDocument,
  type RegionMapDocument,
} from '../core/regionDocument'
import {
  encodePintaBackupAsset,
  MAX_BACKUP_FILE_BYTES,
  pintaEncodedBackupByteLength,
} from '../export/projectJson'
import { admitsRegionBackupBuffers, REGION_BACKUP_VERSION } from '../export/regionBackup'
import type { prepareLocalRegionDocument } from './localRegionChunkStorage'

type Directory = NonNullable<ReturnType<typeof prepareLocalRegionDocument>>

function countRegionalPayload(map: RegionMapDocument, directory: Directory): RegionMapDocument {
  let layerIndex = 0
  return {
    ...map,
    layers: map.layers.map((layer) => {
      if (layer.kind === 'objects' || layer.kind === 'group') return layer
      const positions = directory.locations[layerIndex++]!
      return {
        ...layer,
        cells: {
          ...layer.cells,
          chunks: positions.map(({ col, row }) => ({ col, row, data: '' })),
        },
      }
    }),
  }
}

/** Exact native backup size from validated physical directories and complete older assets. */
export function localRegionGalleryBackupBytes(
  directories: readonly Directory[],
  legacy: readonly PintaAsset[],
): number {
  const encoded: unknown[] = legacy.map(encodePintaBackupAsset)
  let payloadBytes = 0
  for (const directory of directories) {
    const source = directory.empty
    if (source.kind === 'tilemap') {
      const map = encodeRegionMapDocument(source, encodePintaBackupAsset)
      if (!map) return Infinity
      encoded.push(countRegionalPayload(map, directory))
    } else {
      const set = encodeRegionSetDocument(source, encodePintaBackupAsset)
      if (!set) return Infinity
      encoded.push({ ...set, map: countRegionalPayload(set.map, directory) })
    }
    // Base64 adds only single-byte characters that JSON writes without escaping.
    payloadBytes += directory.keys.length * PINTA_REGION_CHUNK_BASE64_CHARS
  }
  if (!admitsRegionBackupBuffers(encoded)) return Infinity
  const measured = pintaEncodedBackupByteLength(encoded, REGION_BACKUP_VERSION) + payloadBytes
  return measured <= MAX_BACKUP_FILE_BYTES ? measured : Infinity
}
