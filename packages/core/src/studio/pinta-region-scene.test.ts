import { expect, test } from 'bun:test'
import {
  scene4Bounds as bounds,
  scene4Fixture as fixture,
  scene4Grid as grid,
  scene4BudgetFixture,
} from '../../tests/fixtures/pinta-region-scene'
import { encodePintaRegionLayers } from '../creations/pinta-regions'
import { PINTA_REGION_SCENE_MAX_JSON_BYTES, readPintaRegionScene } from './pinta-region-scene'
import { readPintaScene } from './pinta-scene'

test('scene 4 preserves signed sparse cells, all square flags and metadata without allocating the world extent', () => {
  const raw = fixture(),
    scene = readPintaRegionScene(JSON.stringify(raw))
  if (!scene) throw Error('Cena recusada')
  expect(scene.version).toBe(4)
  expect(scene.origin).toEqual({ col: -64, row: -64 })
  expect(scene.cols * scene.rows).toBe(100000000)
  expect(scene.layers).toHaveLength(18)
  const layers = scene.layers.filter((layer) => layer.kind === 'tiles')
  expect(layers).toHaveLength(16)
  expect(layers[0]!.cells).toEqual(grid())
  expect(
    layers.reduce(
      (bytes, layer) =>
        bytes + layer.cells.chunks.reduce((bytes, chunk) => bytes + chunk.cells.byteLength, 0),
      0,
    ),
  ).toBe(32768)
  expect<unknown>(scene.layers.find((layer) => layer.kind === 'objects')).toEqual(raw.layers.at(-1))
  expect(scene.art).toEqual(raw.art)
  expect(scene.resources).toEqual(raw.resources)
  expect(readPintaScene(raw)).toBeNull()
})

test('scene 4 reuses the semantic checks for sheets, animation, object references and layer trees', () => {
  const original = fixture()
  const cases: unknown[] = [
    { ...original, tilesets: [] },
    { ...original, tilesets: [...original.tilesets, ...original.tilesets] },
    { ...original, resources: [{ id: 'missing', sourceId: 'live', capturedAt: 1 }] },
    { ...original, art: [] },
    {
      ...original,
      layers: original.layers.map((layer) =>
        layer.id === 'floor-0' ? { ...layer, parentId: 'missing' } : layer,
      ),
    },
    { ...original, tilesets: original.tilesets.map((sheet) => ({ ...sheet, count: 2 })) },
    { ...original, art: original.art.map((art) => ({ ...art, width: 17 })) },
  ]
  for (const candidate of cases) expect(readPintaRegionScene(JSON.stringify(candidate))).toBeNull()
})

test('every reusable definition is admitted before the first chunk payload is decoded', () => {
  const original = fixture(),
    gridWire = encodePintaRegionLayers([grid()], bounds)![0]!
  const invalid = {
    ...gridWire,
    chunks: Array.from({ length: 2049 }, (_, index) => ({
      col: index % 64,
      row: Math.floor(index / 64),
      data: 'not-read',
    })),
  }
  const source = {
    ...original,
    sets: [
      {
        id: 'garden',
        cols: bounds.cols,
        rows: bounds.rows,
        origin: original.origin,
        layers: [
          {
            id: 'garden-floor',
            kind: 'tiles',
            name: 'Chão',
            visible: true,
            tilesetId: 'ground',
            cells: invalid,
          },
        ],
      },
    ],
  }
  const decode = globalThis.atob
  let decodes = 0
  globalThis.atob = (text) => {
    decodes++
    return decode(text)
  }
  try {
    expect(readPintaRegionScene(JSON.stringify(source))).toBeNull()
  } finally {
    globalThis.atob = decode
  }
  expect(decodes).toBe(0)
})

test('aggregate index budgets across definitions refuse before touching the first payload', () => {
  const original = fixture(),
    wire = encodePintaRegionLayers([grid()], bounds)![0]!
  const cells = {
    ...wire,
    chunks: Array.from({ length: 1536 }, (_, index) => ({
      col: index % 64,
      row: Math.floor(index / 64),
      data: index === 0 ? wire.chunks[0]!.data : 'not-read',
    })),
  }
  const layers = [
    { id: 'floor', kind: 'tiles', name: 'Chão', visible: true, tilesetId: 'ground', cells },
  ]
  const source = {
    ...original,
    layers,
    sets: [0, 1].map((index) => ({
      id: `garden-${index}`,
      cols: bounds.cols,
      rows: bounds.rows,
      origin: original.origin,
      layers,
    })),
  }
  const decode = globalThis.atob
  let decodes = 0
  globalThis.atob = (text) => {
    decodes++
    return decode(text)
  }
  try {
    expect(readPintaRegionScene(JSON.stringify(source))).toBeNull()
  } finally {
    globalThis.atob = decode
  }
  expect(decodes).toBe(0)
})

test('the same per-map budget admits 32 layers and exactly 4 MiB of decoded indices', () => {
  const original = fixture(),
    cells = {
      ...grid(),
      chunks: Array.from({ length: 64 }, (_, index) => ({
        col: index % 8,
        row: Math.floor(index / 8),
        cells: new Int16Array(1024).fill(0),
      })),
    }
  const wire = encodePintaRegionLayers([cells], bounds)![0]!
  const source = {
    ...original,
    layers: Array.from({ length: 32 }, (_, index) => ({
      id: `layer-${index}`,
      kind: 'tiles',
      name: 'Chão',
      visible: true,
      tilesetId: 'ground',
      cells: wire,
    })),
  }
  const text = JSON.stringify(source)
  expect(text.length).toBeLessThan(PINTA_REGION_SCENE_MAX_JSON_BYTES)
  const scene = readPintaRegionScene(text)
  if (!scene) throw Error('Teto válido recusado')
  expect(scene.layers).toHaveLength(32)
  let bytes = 0
  for (const layer of scene.layers)
    if (layer.kind === 'tiles')
      for (const chunk of layer.cells.chunks) bytes += chunk.cells.byteLength
  expect(bytes).toBe(4 * 1024 * 1024)
}, 10000)

test('a near-file-limit scene keeps root and reusable-definition budgets independent without sharing decoded buffers', () => {
  const source = scene4BudgetFixture(1, 1500)
  const text = JSON.stringify({
    ...source,
    sets: [
      {
        id: 'garden',
        cols: source.cols,
        rows: source.rows,
        origin: source.origin,
        layers: source.layers,
      },
    ],
  })
  expect(text.length).toBeGreaterThan(8 * 1000 * 1000)
  expect(text.length).toBeLessThan(PINTA_REGION_SCENE_MAX_JSON_BYTES)
  const scene = readPintaRegionScene(text)
  if (!scene) throw Error('Cena orçada recusada')
  const first = scene.layers[0],
    second = scene.sets?.[0]?.layers[0]
  if (first?.kind !== 'tiles' || second?.kind !== 'tiles') throw Error('Camada ausente')
  expect(first.cells.chunks.length + second.cells.chunks.length).toBe(3000)
  expect(first.cells.chunks[0]!.cells.buffer).not.toBe(second.cells.chunks[0]!.cells.buffer)
  first.cells.chunks[0]!.cells[0] = 3
  expect(second.cells.chunks[0]!.cells[0]).toBe(0)
}, 10000)

test('future and malformed headers, out-of-bounds chunks and unknown metadata refuse atomically', () => {
  const original = fixture(),
    wire = encodePintaRegionLayers([grid()], bounds)![0]!
  const replaceCells = (cells: unknown) => ({
    ...original,
    layers: [
      {
        id: 'floor',
        kind: 'tiles',
        name: 'Chão',
        visible: true,
        tilesetId: 'ground',
        cells,
      },
    ],
  })
  const cases: unknown[] = [
    { ...original, version: 3 },
    { ...original, version: 5 },
    { ...original, future: true },
    { ...original, origin: { col: -10001, row: 0 } },
    replaceCells({ ...wire, version: 2 }),
    replaceCells({ ...wire, chunks: [...wire.chunks, ...wire.chunks] }),
    replaceCells({ ...wire, chunks: wire.chunks.map((chunk) => ({ ...chunk, col: 5000 })) }),
    replaceCells([0]),
    replaceCells({ kind: 'regions', version: 1, side: 32, chunks: [] }),
    { ...original, layers: original.layers.map((layer) => ({ ...layer, future: true })) },
  ]
  for (const candidate of cases) expect(readPintaRegionScene(JSON.stringify(candidate))).toBeNull()
})

test('the JSON boundary counts UTF-8 and refuses oversized text before parsing', () => {
  const original = fixture(),
    oversize = {
      ...original,
      art: Array.from({ length: 7 }, (_, index) => ({
        id: `art-${index}`,
        image: 'á'.repeat(600000),
        width: 16,
        height: 16,
      })),
    }
  const text = JSON.stringify(oversize)
  expect(text.length).toBeLessThan(PINTA_REGION_SCENE_MAX_JSON_BYTES)
  expect(new TextEncoder().encode(text).byteLength).toBeGreaterThan(
    PINTA_REGION_SCENE_MAX_JSON_BYTES,
  )
  expect(readPintaRegionScene(text)).toBeNull()
  expect(readPintaRegionScene(' '.repeat(PINTA_REGION_SCENE_MAX_JSON_BYTES + 1))).toBeNull()
  expect(readPintaRegionScene('{')).toBeNull()
})
