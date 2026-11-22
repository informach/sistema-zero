import { pintaValuesEqual } from '../src/core/assetEquality'
import { JsonByteSizeCache } from '../src/core/jsonBytes'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  isObjectLayer,
  type RegionTilemapAsset,
} from '../src/core/project'
import { importPintaJson } from '../src/export/projectJson'
import { decodeRegionGalleryBackup, encodeRegionGalleryBackup } from '../src/export/regionBackup'
import { captureMapResourceVersion } from '../src/tiles/resourceVersions'
import { createMapSet } from '../src/tiles/sets'
import { fullMemoryMap, sparseMemoryMap } from './homologacao/memoryRegions'
import { metadataBudgetFixture } from './homologacao/metadataBudget'

export function runRegionBackupProbe() {
  const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
  sprite.animations[0]!.frames[0]![0]!.data[3] = 7
  const captured = captureMapResourceVersion(sparseMemoryMap(), sprite)
  if (!captured.ok) throw Error(captured.reason)
  const map = captured.map,
    encoded = encodeRegionGalleryBackup([map, sprite])
  if (!encoded) throw Error('Backup ausente')
  const restored = decodeRegionGalleryBackup(encoded.text)
  const set = createMapSet(map, { col: -100, row: -100, cols: 2, rows: 2 }, 16, 'casa')
  const setFile = encodeRegionGalleryBackup([set])
  const full = fullMemoryMap(),
    fullFile = encodeRegionGalleryBackup([full])
  if (!setFile || !fullFile) throw Error('Backup incompleto')
  const unknownBitmap = JSON.parse(encoded.text)
  unknownBitmap.assets[0].resources[0].asset.animations[0].frames[0][0].future = true
  const malformed = JSON.parse(encoded.text)
  malformed.assets[0].layers[0].cells.chunks[0].data = 'corrompido'
  const { source } = metadataBudgetFixture()
  const escaped: RegionTilemapAsset = {
    ...source,
    layers: source.layers.map((layer) =>
      !isObjectLayer(layer)
        ? layer
        : {
            ...layer,
            objects: layer.objects.map((object) => ({
              ...object,
              properties: Object.fromEntries(
                Object.entries(object.properties).map(([key, value]) => [
                  key,
                  typeof value === 'string' ? '\0'.repeat(value.length) : value,
                ]),
              ),
            })),
          },
    ),
  }
  const cache = new JsonByteSizeCache(66),
    sizes: number[] = []
  for (let seed = 0; seed < 64; seed++) {
    const text = `${String.fromCharCode(seed, 0x7f + seed, 0xd800 + seed)}🎨界`
    const value = { [text]: [seed, text, {}, { nested: [text, false, null] }] }
    const actual = cache.byteLength(value),
      expected = new TextEncoder().encode(JSON.stringify(value, null, 2)).byteLength
    if (actual !== expected) throw Error('Tamanho JSON divergente')
    sizes.push(actual)
  }
  const background = captureMapResourceVersion(
    sparseMemoryMap(),
    createPixelBackgroundAsset({ name: 'ceu', width: 512, height: 512 }),
  )
  if (!background.ok) throw Error(background.reason)
  const file = encodeRegionGalleryBackup([background.map])
  if (!file) throw Error('Arquivo de controle ausente')
  const expansion = JSON.parse(file.text)
  expansion.assets = Array.from({ length: 129 }, (_, i) => ({
    ...expansion.assets[0],
    id: `world-${i}`,
  }))
  let decodes = 0,
    expansionRefused = false
  const originalAtob = globalThis.atob
  try {
    globalThis.atob = (input) => {
      decodes++
      return originalAtob(input)
    }
    expansionRefused = decodeRegionGalleryBackup(JSON.stringify(expansion)).assets.length === 0
  } finally {
    globalThis.atob = originalAtob
  }
  return {
    sparse: {
      bytes: encoded.bytes,
      exactBytes: new TextEncoder().encode(encoded.text).byteLength,
      roundTrip: pintaValuesEqual(restored.assets, [map, sprite]),
      warnings: restored.warnings,
      logicalCells: map.cols * map.rows,
      bitmapRLE:
        typeof JSON.parse(encoded.text).assets[0].resources[0].asset.animations[0].frames[0][0]
          .rle === 'string',
    },
    set: { roundTrip: pintaValuesEqual(decodeRegionGalleryBackup(setFile.text).assets, [set]) },
    full: {
      bytes: fullFile.bytes,
      roundTrip: pintaValuesEqual(decodeRegionGalleryBackup(fullFile.text).assets, [full]),
    },
    oldReaderRejected: importPintaJson(encoded.text).assets.length === 0,
    futureBitmapRejected:
      decodeRegionGalleryBackup(JSON.stringify(unknownBitmap)).assets.length === 0,
    malformedRejected: decodeRegionGalleryBackup(JSON.stringify(malformed)).assets.length === 0,
    escapedRejected: encodeRegionGalleryBackup([escaped]) === null,
    expansion: { refused: expansionRefused, decodes },
    sizes,
    public8: false,
  }
}
