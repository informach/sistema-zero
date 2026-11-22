import { expect, test } from 'bun:test'
import { parsePintaRegionLayerLocations } from '@sistemazero/core/creations'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  isTileLayer,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
} from '../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from '../tiles/cell'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import { setCell } from '../tiles/tilemapOps'
import { LOCAL_ASSET_PREFIX } from './localAssetAuthority'
import { localDenseStorageCodec, planLocalStorageWrites } from './localChunkStorage'
import { localRegionStorageCodec as codec } from './localRegionChunkStorage'

function sample(): RegionTilemapAsset {
  const dense = createTilemapAsset({ name: 'vila', cols: 3, rows: 2, tilesetId: 'ground' })
  dense.layers[0]!.cells![0] = 3
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -64, row: -64, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  return setCell(expanded.map, expanded.map.layers[0]!.id, -64, -64, 4)
}
function fixture(asset: RegionTilemapAsset | RegionMapSetAsset = sample()) {
  const key = LOCAL_ASSET_PREFIX + asset.id
  const logical = {
    version: 1,
    capability: 8,
    revision: 'r1',
    asset,
    isolation: { version: 1, readerSchema: 7, inventoryRevision: 'i1' },
  }
  const encoded = codec.encode(key, logical, new Map())
  const records = new Map<string, unknown>(encoded.chunks)
  records.set(key, encoded.document)
  return { key, logical, encoded, records }
}

test('physical 3 preserves a signed 100-million-cell world, IDs and isolation with only two buffers', () => {
  const f = fixture()
  expect(f.encoded.document).toMatchObject({
    version: 3,
    capability: 8,
    storage: 'pinta-regions-32-v1',
  })
  expect(f.encoded.chunks.size).toBe(2)
  expect([...f.encoded.chunks.values()].reduce((n, cells) => n + cells.byteLength, 0)).toBe(4096)
  expect(codec.keys(f.key, f.encoded.document)).toEqual([...f.encoded.chunks.keys()])
  const reopened = codec.decode(f.key, f.encoded.document, f.records)
  expect(reopened).toEqual(f.logical)
  if (!reopened || typeof reopened !== 'object' || !('asset' in reopened))
    throw Error('Mapa ausente')
  expect(reopened.asset).toMatchObject({
    id: f.logical.asset.id,
    origin: { col: -64, row: -64 },
    cols: 10000,
    rows: 10000,
  })
  expect(localDenseStorageCodec.keys(f.key, f.encoded.document)).toEqual([])
  expect(localDenseStorageCodec.decode(f.key, f.encoded.document, f.records)).toBe(
    f.encoded.document,
  )
})

test('the same physical codec preserves nested sets and embedded metadata', () => {
  const map = sample()
  map.resources = [
    {
      sourceId: 'original-tree',
      capturedAt: 1,
      asset: createPixelSpriteAsset({ name: 'tree', frameSize: 16 }),
    },
  ]
  map.layers.push({
    kind: 'objects',
    id: 'doors',
    name: 'Portas',
    visible: true,
    objects: [
      {
        id: 'door',
        name: 'Cabana',
        type: 'door',
        role: 'door',
        shape: 'point',
        x: -32.5,
        y: -1.25,
        width: 0,
        height: 0,
        properties: { score: { type: 'int', value: 7 } },
      },
    ],
  })
  const set: RegionMapSetAsset = {
    id: 'set/garden',
    name: 'jardim',
    createdAt: 1,
    updatedAt: 1,
    kind: 'map-set',
    schema: 8,
    map,
  }
  const f = fixture(set)
  expect(codec.decode(f.key, f.encoded.document, f.records)).toEqual(f.logical)
  expect([...f.encoded.chunks.keys()].every((key) => key.includes('set%2Fgarden'))).toBe(true)
})

test('one edit writes its header and one chunk, reuses the other buffer and deletion collects only its chunks', () => {
  const f = fixture(),
    base = f.logical.asset
  if (base.kind !== 'tilemap') throw Error('Mapa ausente')
  const changed = setCell(base, base.layers[0]!.id, -64, -64, 8)
  const writes = planLocalStorageWrites(
    new Map([[f.key, f.logical]]),
    new Map([[f.key, { ...f.logical, revision: 'r2', asset: changed }]]),
    f.records,
    codec,
  )
  expect(writes.puts.size).toBe(2)
  expect(writes.deletes.size).toBe(0)
  const next = new Map(f.records)
  for (const [key, value] of writes.puts) next.set(key, value)
  expect(codec.decode(f.key, next.get(f.key), next)).toEqual({
    ...f.logical,
    revision: 'r2',
    asset: changed,
  })
  const removed = planLocalStorageWrites(new Map([[f.key, f.logical]]), new Map(), f.records, codec)
  expect(removed.deletes).toEqual(new Set([f.key, ...f.encoded.chunks.keys()]))
})

test('no missing, empty, invalid or mis-sized chunk can fall back to a mirror', () => {
  const f = fixture(),
    key = [...f.encoded.chunks.keys()][0]!
  for (const value of [
    undefined,
    new Int16Array(1),
    new Int16Array(1024).fill(-1),
    new Int16Array(1024).fill(-2),
    new Int16Array(1024).fill(256),
  ]) {
    const records = new Map(f.records)
    records.set(key, value)
    expect(() => codec.decode(f.key, f.encoded.document, records)).toThrow(
      'Seus dados foram mantidos',
    )
  }
})

test('metadata, future fields, duplicate/outside locations and ownership fail before reading a payload', () => {
  const f = fixture()
  // Unknown input is intentionally constructed outside the domain types.
  const raw = JSON.parse(JSON.stringify(f.encoded.document))
  const layer = raw.asset.layers[0]
  const cases = [
    { ...raw, future: true },
    { ...raw, asset: { ...raw.asset, future: true } },
    {
      ...raw,
      asset: {
        ...raw.asset,
        layers: [
          {
            ...layer,
            cells: { ...layer.cells, chunks: [...layer.cells.chunks, layer.cells.chunks[0]] },
          },
        ],
      },
    },
    {
      ...raw,
      asset: {
        ...raw.asset,
        layers: [
          {
            ...layer,
            cells: {
              ...layer.cells,
              chunks: [{ ...layer.cells.chunks[0], key: 'pinta:local:chunk:other:layer:0:0' }],
            },
          },
        ],
      },
    },
    {
      ...raw,
      asset: {
        ...raw.asset,
        layers: [
          {
            ...layer,
            cells: { ...layer.cells, chunks: [{ ...layer.cells.chunks[0], col: -1000 }] },
          },
        ],
      },
    },
  ]
  for (const value of cases)
    expect(() => codec.keys(f.key, value)).toThrow('Seus dados foram mantidos')
  let reads = 0
  const records = new (class extends Map<string, unknown> {
    override get(): never {
      reads++
      throw Error('Leitura indevida')
    }
  })()
  expect(() => codec.decode(f.key, cases[2], records)).toThrow('Seus dados foram mantidos')
  expect(reads).toBe(0)
})

test('global header admission never inspects cell payloads and refuses all excessive layers together', () => {
  let reads = 0
  const chunk = {
    col: 0,
    row: 0,
    get cells() {
      reads++
      throw Error('Payload')
    },
  }
  const grid = { kind: 'regions', version: 1, side: 32, chunks: [chunk] }
  expect(parsePintaRegionLayerLocations([grid], { col: 0, row: 0, cols: 32, rows: 32 })).toEqual([
    [{ col: 0, row: 0 }],
  ])
  expect(
    parsePintaRegionLayerLocations(Array(33).fill(grid), { col: 0, row: 0, cols: 32, rows: 32 }),
  ).toBeNull()
  expect(reads).toBe(0)
})

test('future protocols stay opaque; unrepresentable legacy IDs remain inline without shortening', () => {
  const f = fixture(),
    future = { version: 4, storage: 'future', capability: 9, asset: {} }
  expect(codec.keys(f.key, future)).toEqual([])
  expect(codec.decode(f.key, future, f.records)).toBe(future)
  const map = { ...sample(), id: 'a'.repeat(513) }
  const logical = { version: 1, capability: 8, revision: 'r', asset: map }
  expect(codec.encode(LOCAL_ASSET_PREFIX + map.id, logical, new Map())).toEqual({
    document: logical,
    chunks: new Map(),
  })
})

test('all 2048 chunks share one 4-MiB budget and one edit reuses 2047 buffers', () => {
  const dense = createTilemapAsset({ name: 'full', tilesetId: 'ground', cols: 256, rows: 256 })
  const layer = dense.layers[0]!
  if (!isTileLayer(layer)) throw Error('Camada de peças ausente')
  dense.layers = Array.from({ length: 32 }, (_, index) => ({
    ...layer,
    id: `layer-${index}`,
    cells: new Int16Array(65536).fill(0),
  }))
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const f = fixture(prepared.map)
  expect(f.encoded.chunks.size).toBe(2048)
  expect([...f.encoded.chunks.values()].reduce((n, cells) => n + cells.byteLength, 0)).toBe(
    4 * 1024 * 1024,
  )
  const next = setCell(prepared.map, 'layer-0', 0, 0, 1)
  const encoded = codec.encode(f.key, { ...f.logical, asset: next }, f.records)
  expect([...encoded.chunks].filter(([key, cells]) => cells === f.records.get(key))).toHaveLength(
    2047,
  )
})

test('the aggregate location budget is rejected before inspecting keys in any layer', () => {
  const f = fixture(),
    raw = JSON.parse(JSON.stringify(f.encoded.document))
  let keys = 0
  const location = {
    col: 0,
    row: 0,
    get key() {
      keys++
      throw Error('Chave antecipada')
    },
  }
  const layer = raw.asset.layers[0]
  raw.asset.layers = [
    { ...layer, id: 'one', cells: { ...layer.cells, chunks: Array(1025).fill(location) } },
    { ...layer, id: 'two', cells: { ...layer.cells, chunks: Array(1024).fill(location) } },
  ]
  expect(() => codec.keys(f.key, raw)).toThrow('Seus dados foram mantidos')
  expect(keys).toBe(0)
})

test('a physical edge chunk cannot hide cells beyond the authored bounds', () => {
  const dense = createTilemapAsset({ name: 'edge', tilesetId: 'ground', cols: 2, rows: 2 })
  dense.layers[0]!.cells![0] = 1
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const f = fixture(prepared.map),
    key = [...f.encoded.chunks.keys()][0]!
  const cells = f.encoded.chunks.get(key)!.slice()
  cells[3] = 1
  const records = new Map(f.records)
  records.set(key, cells)
  expect(() => codec.decode(f.key, f.encoded.document, records)).toThrow(
    'Seus dados foram mantidos',
  )
})

test('physical round trips preserve every square tile transformation with its original index', () => {
  const map = sample()
  for (const flags of [
    0,
    CELL_FLIP_H,
    CELL_FLIP_V,
    CELL_FLIP_D,
    CELL_FLIP_H | CELL_FLIP_V,
    CELL_FLIP_H | CELL_FLIP_D,
    CELL_FLIP_V | CELL_FLIP_D,
    CELL_FLIP_H | CELL_FLIP_V | CELL_FLIP_D,
  ]) {
    const f = fixture(setCell(map, map.layers[0]!.id, 0, 0, makeCell(255, flags)))
    expect(codec.decode(f.key, f.encoded.document, f.records)).toEqual(f.logical)
  }
})
