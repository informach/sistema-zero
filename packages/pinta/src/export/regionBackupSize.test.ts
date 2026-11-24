import { expect, spyOn, test } from 'bun:test'
import {
  editFirstMemoryCell,
  fullMemoryMap,
  sparseMemoryMap,
} from '../../scripts/homologacao/memoryRegions'
import { escapedMetadataFixture } from '../../scripts/homologacao/metadataBudget'
import { createPixelSpriteAsset, isTileLayer, type RegionTilemapAsset } from '../core/project'
import { expandRegionMap } from '../tiles/regionMap'
import { captureMapResourceVersion } from '../tiles/resourceVersions'
import { createMapSet } from '../tiles/sets'
import { encodeRegionGalleryBackup } from './regionBackup'
import { RegionBackupSizeCache } from './regionBackupSize'

test('incremental size equals the actual sparse and dense native backup with Unicode, art and sets', () => {
  const source = sparseMemoryMap(),
    sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
  const captured = captureMapResourceVersion(source, sprite)
  if (!captured.ok) throw Error(captured.reason)
  const map = { ...captured.map, name: 'Vila 🎨 界' }
  const set = createMapSet(map, { col: -100, row: -100, cols: 2, rows: 2 }, 16, 'casa')
  const cache = new RegionBackupSizeCache()
  for (const assets of [[map], [map, sprite, set], [fullMemoryMap()]]) {
    const encoded = encodeRegionGalleryBackup(assets)
    expect(encoded).not.toBeNull()
    expect(cache.byteLength(assets)).toBe(new TextEncoder().encode(encoded!.text).byteLength)
    expect(cache.byteLength(assets)).toBe(encoded!.bytes)
  }
  expect(cache.byteLength([escapedMetadataFixture()])).toBe(Infinity)
})

test('one cell edit reencodes only its new chunk, retaining numerical summaries for the other 2047', () => {
  const captured = captureMapResourceVersion(
    fullMemoryMap(),
    createPixelSpriteAsset({ name: 'arvore', frameSize: 16 }),
  )
  if (!captured.ok) throw Error(captured.reason)
  const source = captured.map,
    cache = new RegionBackupSizeCache()
  expect(cache.byteLength([source])).toBeGreaterThan(0)
  const next = editFirstMemoryCell(source, 1),
    encoder = spyOn(globalThis, 'btoa')
  let measured: number
  try {
    measured = cache.byteLength([next])
    expect(encoder).toHaveBeenCalledTimes(1)
    expect(cache.byteLength([next])).toBe(measured)
    expect(encoder).toHaveBeenCalledTimes(1)
  } finally {
    encoder.mockRestore()
  }
  const actual = encodeRegionGalleryBackup([next])!
  expect(measured).toBe(new TextEncoder().encode(actual.text).byteLength)
  expect(source.layers.filter(isTileLayer)[0]!.cells.chunks[0]!.cells[0]).toBe(0)
})

test('expansion reuses the old grid summary while counting the new origin and extent exactly', () => {
  const source = sparseMemoryMap(),
    cache = new RegionBackupSizeCache()
  cache.byteLength([source])
  const grown = expandRegionMap(source, { col: -101, row: -101, cols: 10000, rows: 10000 })
  // This fixture occupied the old far edge: choose bounds that still include it.
  expect(grown.ok).toBe(false)
  const small: RegionTilemapAsset = {
    ...source,
    cols: 9999,
    rows: 9999,
    layers: source.layers.map((layer) =>
      !isTileLayer(layer)
        ? layer
        : { ...layer, cells: { ...layer.cells, chunks: layer.cells.chunks.slice(0, 1) } },
    ),
  }
  cache.byteLength([small])
  const expanded = expandRegionMap(small, { col: -101, row: -101, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const encoder = spyOn(globalThis, 'btoa')
  let measured: number
  try {
    measured = cache.byteLength([expanded.map])
    expect(encoder).not.toHaveBeenCalled()
  } finally {
    encoder.mockRestore()
  }
  expect(measured).toBe(encodeRegionGalleryBackup([expanded.map])!.bytes)
})

test('all descriptor budgets are checked before any chunk payload, including later maps in a batch', () => {
  const source = sparseMemoryMap()
  let reads = 0
  const chunk = {
    col: 0,
    row: 0,
    get cells(): Int16Array {
      reads++
      throw Error('payload')
    },
  }
  const invalid: RegionTilemapAsset = {
    ...source,
    id: 'too-many',
    layers: source.layers.map((layer) =>
      !isTileLayer(layer)
        ? layer
        : {
            ...layer,
            cells: { ...layer.cells, chunks: Array.from({ length: 2049 }, () => chunk) },
          },
    ),
  }
  const encoder = spyOn(globalThis, 'btoa')
  try {
    expect(new RegionBackupSizeCache().byteLength([source, invalid])).toBe(Infinity)
    expect(encoder).not.toHaveBeenCalled()
  } finally {
    encoder.mockRestore()
  }
  expect(reads).toBe(0)
})

test('unknown chunk fields are refused by Core before a payload getter can execute', () => {
  const source = sparseMemoryMap()
  let reads = 0
  const invalid: RegionTilemapAsset = {
    ...source,
    layers: source.layers.map((layer) =>
      !isTileLayer(layer)
        ? layer
        : {
            ...layer,
            cells: {
              ...layer.cells,
              chunks: [
                {
                  col: 0,
                  row: 0,
                  future: true,
                  get cells(): Int16Array {
                    reads++
                    throw Error('payload')
                  },
                },
              ],
            },
          },
    ),
  }
  expect(new RegionBackupSizeCache().byteLength([invalid])).toBe(Infinity)
  expect(reads).toBe(0)
})

test('fixed buffer lengths and the Pinta tile budget are enforced without custom iteration', () => {
  const source = sparseMemoryMap()
  let iterations = 0
  const short = new Int16Array(10).fill(0)
  Object.defineProperty(short, Symbol.iterator, {
    value: function* () {
      iterations++
      yield 0
    },
  })
  const map = (cells: Int16Array): RegionTilemapAsset => ({
    ...source,
    layers: source.layers.map((layer) =>
      !isTileLayer(layer)
        ? layer
        : { ...layer, cells: { ...layer.cells, chunks: [{ col: 0, row: 0, cells }] } },
    ),
  })
  expect(new RegionBackupSizeCache().byteLength([map(short)])).toBe(Infinity)
  expect(iterations).toBe(0)
  const outOfBudget = new Int16Array(1024).fill(-1)
  outOfBudget[0] = 256
  expect(new RegionBackupSizeCache().byteLength([map(outOfBudget)])).toBe(Infinity)
})
