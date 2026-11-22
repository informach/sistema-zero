import { expect, spyOn, test } from 'bun:test'
import { fullMemoryMap, sparseMemoryMap } from '../../scripts/homologacao/memoryRegions'
import { metadataBudgetFixture } from '../../scripts/homologacao/metadataBudget'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  isObjectLayer,
  type PintaAsset,
  type RegionTilemapAsset,
} from '../core/project'
import { encodeRegionMapDocument } from '../core/regionDocument'
import { prepareMapRegions } from '../tiles/regionMap'
import { captureMapResourceVersion } from '../tiles/resourceVersions'
import { createMapSet } from '../tiles/sets'
import {
  galleryToPintaJson,
  importPintaJson,
  MAX_BACKUP_FILE_BYTES,
  pintaBackupFromEncoded,
  pintaEncodedBackupByteLength,
} from './projectJson'
import { decodeRegionGalleryBackup, encodeRegionGalleryBackup } from './regionBackup'

function withArt() {
  const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
  sprite.animations[0]!.frames[0]![0]!.data[3] = 7
  const captured = captureMapResourceVersion(sparseMemoryMap(), sprite)
  if (!captured.ok) throw Error(captured.reason)
  return { map: captured.map, sprite }
}

test('internal native-8 backup round trip preserves sparse world, bitmap versions and legacy assets', () => {
  const { map, sprite } = withArt()
  const encoded = encodeRegionGalleryBackup([map, sprite])
  expect(encoded).not.toBeNull()
  expect(encoded!.bytes).toBe(new TextEncoder().encode(encoded!.text).byteLength)
  expect(encoded!.bytes).toBeLessThan(12_000)
  const wire = JSON.parse(encoded!.text)
  expect(wire.version).toBe(8)
  expect(wire.assets[0].resources[0].asset.animations[0].frames[0][0].rle).toBeString()
  expect(wire.assets[0].resources[0].asset.animations[0].frames[0][0].data).toBeUndefined()
  const restored = decodeRegionGalleryBackup(encoded!.text)
  expect(restored.warnings).toEqual([])
  expect(restored.assets).toEqual([map, sprite])
  const art = restored.assets[0]
  if (art?.kind !== 'tilemap' || !art.resources || art.resources[0]!.asset.kind !== 'pixel-sprite')
    throw Error('Versão ausente')
  expect(art.resources[0]!.asset.animations[0]!.frames[0]![0]!.data).toBeInstanceOf(Uint8Array)
  expect(art.resources[0]!.asset.animations[0]!.frames[0]![0]!.data[3]).toBe(7)
})

test('native-8 set shares the existing map serializer and round trips its independent definition', () => {
  const { map } = withArt()
  const set = createMapSet(map, { col: -100, row: -100, cols: 2, rows: 2 }, 16, 'casa')
  const encoded = encodeRegionGalleryBackup([set])
  expect(encoded).not.toBeNull()
  expect(decodeRegionGalleryBackup(encoded!.text)).toEqual({ assets: [set], warnings: [] })
})

test('full 4 MiB index document remains a bounded native backup without dense world allocation', () => {
  const map = fullMemoryMap()
  const encoded = encodeRegionGalleryBackup([map])
  expect(encoded).not.toBeNull()
  expect(encoded!.bytes).toBeLessThan(6 * 1024 * 1024)
  const restored = decodeRegionGalleryBackup(encoded!.text)
  expect(restored.warnings).toEqual([])
  expect(restored.assets).toEqual([map])
})

test('old public reader refuses envelope 8 before decoding any bitmap or cell', () => {
  const encoded = encodeRegionGalleryBackup([withArt().map])!
  const decoder = spyOn(globalThis, 'atob')
  let result: ReturnType<typeof importPintaJson>
  try {
    result = importPintaJson(encoded.text)
    expect(decoder).not.toHaveBeenCalled()
  } finally {
    decoder.mockRestore()
  }
  expect(result.assets).toEqual([])
  expect(result.warnings).toEqual([
    'A versão deste backup não é compatível com esta versão do Pinta.',
  ])
})

test('new backup reader refuses future bitmap metadata before the legacy decoder can discard it', () => {
  const encoded = encodeRegionGalleryBackup([withArt().map])!
  const doc = JSON.parse(encoded.text)
  doc.assets[0].resources[0].asset.animations[0].frames[0][0].future = { important: 'preservar' }
  const restored = decodeRegionGalleryBackup(JSON.stringify(doc))
  expect(restored.assets.length).toBe(0)
  expect(restored.warnings).toHaveLength(1)
})

test('native restore is atomic for malformed chunks, future metadata and a future envelope', () => {
  const encoded = encodeRegionGalleryBackup([withArt().map])!
  for (const change of [
    (doc: Record<string, unknown>) => ({ ...doc, version: 9 }),
    (doc: Record<string, unknown>) => ({ ...doc, future: true }),
    (doc: Record<string, unknown>) => ({
      ...doc,
      assets: [...(doc.assets as unknown[]), { kind: 'future', id: 'x' }],
    }),
  ]) {
    const restored = decodeRegionGalleryBackup(JSON.stringify(change(JSON.parse(encoded.text))))
    expect(restored.assets).toEqual([])
    expect(restored.warnings).toHaveLength(1)
  }
  const doc = JSON.parse(encoded.text)
  doc.assets[0].layers[0].cells.chunks[0].data = 'corrompido'
  expect(decodeRegionGalleryBackup(JSON.stringify(doc)).assets).toEqual([])
})

test('escaped strings can fit metadata but exceed the file budget: refuse before assembling JSON text', () => {
  const { source } = metadataBudgetFixture()
  const map: RegionTilemapAsset = {
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
  expect(encodeRegionMapDocument(map)).not.toBeNull()
  const stringify = spyOn(JSON, 'stringify')
  let encoded: ReturnType<typeof encodeRegionGalleryBackup>, prettyCalls: number
  try {
    encoded = encodeRegionGalleryBackup([map])
    prettyCalls = stringify.mock.calls.filter((call) => call[2] === 2).length
  } finally {
    stringify.mockRestore()
  }
  expect(encoded).toBeNull()
  expect(prettyCalls).toBe(0)
})

test('file-size admission precedes parsing and measures UTF-8 bytes rather than JS characters', () => {
  for (const text of [
    ' '.repeat(MAX_BACKUP_FILE_BYTES + 1),
    '界'.repeat(Math.ceil(MAX_BACKUP_FILE_BYTES / 3)),
  ]) {
    const parse = spyOn(JSON, 'parse')
    try {
      expect(decodeRegionGalleryBackup(text).assets).toEqual([])
      expect(parse).not.toHaveBeenCalled()
    } finally {
      parse.mockRestore()
    }
  }
})

test('compact RLE cannot expand the new backup beyond its global decoded-buffer budget', () => {
  const captured = captureMapResourceVersion(
    sparseMemoryMap(),
    createPixelBackgroundAsset({ name: 'ceu', width: 512, height: 512 }),
  )
  if (!captured.ok) throw Error(captured.reason)
  const encoded = encodeRegionGalleryBackup([captured.map])!
  expect(decodeRegionGalleryBackup(encoded.text).warnings).toEqual([])
  const doc = JSON.parse(encoded.text),
    map = doc.assets[0]
  doc.assets = Array.from({ length: 129 }, (_, i) => ({ ...map, id: `world-${i}` }))
  const text = JSON.stringify(doc)
  expect(text.length).toBeLessThan(MAX_BACKUP_FILE_BYTES)
  const decoder = spyOn(globalThis, 'atob')
  let restored: ReturnType<typeof decodeRegionGalleryBackup>
  try {
    restored = decodeRegionGalleryBackup(text)
    expect(restored.assets.length).toBe(0)
    expect(decoder).not.toHaveBeenCalled()
  } finally {
    decoder.mockRestore()
  }
  expect(restored.warnings).toHaveLength(1)
})

test('the writer admits exactly 32 MiB decoded and refuses the next shared bitmap occurrence', () => {
  const prepared = prepareMapRegions(
    createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 }),
  )
  if (!prepared.ok) throw Error(prepared.reason)
  const background = createPixelBackgroundAsset({ name: 'ceu', width: 512, height: 512 })
  const backgrounds = Array.from({ length: 128 }, (_, i) => ({ ...background, id: `sky-${i}` }))
  const admitted = encodeRegionGalleryBackup([prepared.map, ...backgrounds])
  expect(admitted).not.toBeNull()
  expect(admitted!.bytes).toBeLessThan(MAX_BACKUP_FILE_BYTES)
  expect(
    encodeRegionGalleryBackup([prepared.map, ...backgrounds, { ...background, id: 'one-more' }]),
  ).toBeNull()
})

test('shared container and byte meter preserve the legacy gallery layout byte for byte', () => {
  const sprite = createPixelSpriteAsset({ name: 'legado \0 🎨', frameSize: 16 })
  const legacy: PintaAsset[] = [sprite]
  const text = galleryToPintaJson(legacy),
    parsed = JSON.parse(text)
  expect(pintaBackupFromEncoded(parsed.assets, parsed.version)).toBe(text)
  expect(pintaEncodedBackupByteLength(parsed.assets, parsed.version)).toBe(
    new TextEncoder().encode(text).byteLength,
  )
  expect(encodeRegionGalleryBackup(legacy)).toBeNull()
})
