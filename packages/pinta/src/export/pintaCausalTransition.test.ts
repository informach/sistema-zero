import { expect, test } from 'bun:test'
import type { PintaCausalOperation } from '@sistemazero/core/creations/pinta-causal'
import {
  createTilemapAsset,
  createTilesetAsset,
  createVectorTilesetAsset,
  isObjectLayer,
  isTileLayer,
  type TilemapCells,
} from '../core/project'
import { CELL_FLIP_H, makeCell } from '../tiles/cell'
import { createMapObject } from '../tiles/mapObjects'
import { freezeMapTilesets } from '../tiles/resourceVersions'
import { addLayer, addObjectLayer } from '../tiles/tilemapOps'
import { addTile, duplicateTile, remapTilemapCells, removeTile } from '../tiles/tilesetOps'
import { assetToJson } from './assetJson'
import { inspectPintaCausalDocument } from './pintaCausalManifest'
import {
  pintaCausalChangedSurvivingSlots,
  pintaCausalPinSourceIds,
  provePintaCausalConsumerRemaps,
  provePintaCausalMutation,
} from './pintaCausalTransition'

const removeFirst = {
  type: 'remap',
  oldToNew: [-1, 0, 1],
  count: 2,
} as const satisfies PintaCausalOperation

function sheet() {
  const sheet = addTile(addTile(createTilesetAsset({ name: 'folha', tileSize: 16 }), 0), 1)
  for (const [index, tile] of sheet.tiles.entries()) tile.data.fill(index + 1)
  sheet.platform[1] = true
  sheet.animations = { '1': [{ tile: 2, duration: 120 }] }
  return sheet
}

test('proves using the exact recipe for removal and refuses a same-length wrong edit', () => {
  const before = sheet()
  const after = removeTile(before, 0)
  expect(provePintaCausalMutation(before, after, removeFirst)).toBe(true)
  expect(provePintaCausalMutation(before, removeTile(before, 1), removeFirst)).toBe(false)
  const swapped = { ...before, tiles: [before.tiles[1]!, before.tiles[0]!, before.tiles[2]!] }
  expect(provePintaCausalMutation(before, swapped, { type: 'update' })).toBe(false)
  expect(
    provePintaCausalMutation(before, swapped, { type: 'remap', oldToNew: [1, 0, 2], count: 3 }),
  ).toBe(false)
})

test('a declared paint scope and literal append each preserve existing slots outside their edit', () => {
  const before = sheet()
  const after = structuredClone(before)
  after.tiles[1]!.data.fill(5)
  expect(
    provePintaCausalMutation(before, after, { type: 'paint', slots: `02${'00'.repeat(31)}` }),
  ).toBe(true)
  expect(
    provePintaCausalMutation(before, after, { type: 'paint', slots: `01${'00'.repeat(31)}` }),
  ).toBe(false)
  const appended = addTile(before, 2)
  expect(provePintaCausalMutation(before, appended, { type: 'append', count: 4 })).toBe(true)
  const wrongPrefix = structuredClone(appended)
  wrongPrefix.animations!['1']![0]!.tile = 3
  expect(provePintaCausalMutation(before, wrongPrefix, { type: 'append', count: 4 })).toBe(false)
})

test('the remap proof compares cells and flags even with identical manifest indices', () => {
  const tiles = sheet()
  const map = addLayer(
    createTilemapAsset({
      name: 'vila',
      tilesetId: tiles.id,
      cols: 2,
      rows: 1,
    }),
    'Água',
    'outra-folha',
  )
  isTileLayer(map.layers[0]!) && map.layers[0].cells.set([makeCell(1, CELL_FLIP_H), 2])
  isTileLayer(map.layers[1]!) && map.layers[1].cells.set([-1, 2])
  const expectation = { itemId: map.id, kind: map.kind, formatVersion: 6 }
  const base = inspectPintaCausalDocument(assetToJson(map), expectation)!
  const after = remapTilemapCells(map, { removedAt: 0 }, tiles.id)
  const remaps = [{ sheetId: tiles.id, operation: removeFirst }]
  expect(provePintaCausalConsumerRemaps(base, after, remaps)).toEqual([
    { sheetId: tiles.id, mode: 'mapped' },
  ])

  const corrupted = structuredClone(after)
  const layer = corrupted.layers[0]!
  if (!isTileLayer(layer)) throw new Error('Camada sem peças')
  layer.cells.set([1, makeCell(0, CELL_FLIP_H)])
  const wrong = inspectPintaCausalDocument(assetToJson(corrupted), expectation)!
  const mapped = inspectPintaCausalDocument(assetToJson(after), expectation)!
  expect(wrong.manifest.refs).toEqual(mapped.manifest.refs)
  expect(provePintaCausalConsumerRemaps(base, wrong.asset, remaps)).toBeNull()
})

test('vector duplicate allows only fresh identities for the duplicated artwork', () => {
  const before = addTile(createVectorTilesetAsset({ name: 'vetor', tileSize: 16 }), 0)
  before.tiles[0]!.push({
    id: 'original',
    motionId: 'motion-orig',
    type: 'rect',
    x: 1,
    y: 2,
    width: 3,
    height: 4,
    fill: '#112233',
  })
  const operation = {
    type: 'remap',
    oldToNew: [0, 2],
    count: 3,
  } as const satisfies PintaCausalOperation
  const candidate = duplicateTile(before, 0)
  expect(provePintaCausalMutation(before, candidate, operation)).toBe(true)
  const alias = { ...candidate, tiles: [before.tiles[0]!, before.tiles[0]!, before.tiles[1]!] }
  expect(provePintaCausalMutation(before, alias, operation)).toBe(false)
})

test('proves composed unlinking, duplication and paint of a surviving final slot', () => {
  const before = addTile(addTile(sheet(), 2), 3)
  const after = structuredClone(duplicateTile(removeTile(removeTile(before, 0), 2), 0))
  after.tiles[2]!.data.fill(6)
  const oldToNew = [-1, 0, 2, -1, 3]
  expect(pintaCausalChangedSurvivingSlots(before, after, oldToNew)).toEqual([2])
  const operation = { type: 'remap', oldToNew, count: 4 } as const satisfies PintaCausalOperation
  expect(provePintaCausalMutation(before, after, operation)).toBe(false)
  expect(
    provePintaCausalMutation(before, after, { ...operation, paintedSlots: `04${'00'.repeat(31)}` }),
  ).toBe(true)

  const map = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: before.id, cols: 3, rows: 1 }),
    'Objetos',
  )
  const tiles = map.layers.find(isTileLayer)!
  tiles.cells.set([makeCell(3, CELL_FLIP_H), makeCell(2, CELL_FLIP_H), 1])
  const objects = map.layers.find(isObjectLayer)!
  objects.objects.push(
    createMapObject({ id: 'arte-zero', shape: 'art', art: { assetId: before.id } }),
  )
  const expected = { itemId: map.id, kind: map.kind, formatVersion: 6 }
  const base = inspectPintaCausalDocument(assetToJson(map), expected)!
  const afterRemoveA = remapTilemapCells(map, { removedAt: 0 }, before.id)
  const afterRemoveD = remapTilemapCells(afterRemoveA, { removedAt: 2 }, before.id)
  const composed = remapTilemapCells(afterRemoveD, { insertedAt: 1 }, before.id)
  const candidate = inspectPintaCausalDocument(assetToJson(composed), expected)!
  expect(
    candidate.asset.kind === 'tilemap' &&
      candidate.asset.layers.find(isTileLayer<TilemapCells>)?.cells,
  ).toEqual(Int16Array.from([-1, makeCell(2, CELL_FLIP_H), 0]))
  expect(
    candidate.asset.kind === 'tilemap' &&
      candidate.asset.layers.find(isObjectLayer)?.objects[0]?.shape,
  ).toBe('rect')
  expect(
    provePintaCausalConsumerRemaps(base, candidate.asset, [{ sheetId: before.id, operation }]),
  ).toEqual([{ sheetId: before.id, mode: 'mapped' }])
})

test('the pin alternative needs the same frozen sheet bytes and its canonical slot bindings', () => {
  const before = sheet()
  const map = createTilemapAsset({ name: 'vila', tilesetId: before.id, cols: 2, rows: 1 })
  map.layers[0]!.cells!.set([makeCell(1, CELL_FLIP_H), 2])
  const captured = freezeMapTilesets(map, (id) => (id === before.id ? before : null), 100)
  if (!captured.ok) throw new Error(captured.reason)
  const expectation = { itemId: map.id, kind: map.kind, formatVersion: 6 }
  const base = inspectPintaCausalDocument(assetToJson(map), expectation)!
  const candidate = inspectPintaCausalDocument(assetToJson(captured.map), expectation)!
  const admittedBefore = inspectPintaCausalDocument(assetToJson(before), {
    itemId: before.id,
    kind: before.kind,
    formatVersion: 6,
  })?.asset
  if (admittedBefore?.kind !== 'tileset') throw new Error('Folha inválida')
  const remaps = [{ sheetId: before.id, operation: removeFirst }]
  expect(pintaCausalPinSourceIds(base, candidate.asset, remaps)).toEqual([before.id])
  expect(provePintaCausalConsumerRemaps(base, candidate.asset, remaps)).toBeNull()
  expect(
    provePintaCausalConsumerRemaps(
      base,
      candidate.asset,
      remaps,
      new Map([[before.id, admittedBefore]]),
    ),
  ).toEqual([{ sheetId: before.id, mode: 'pinned' }])

  const corrupted = structuredClone(candidate.asset)
  if (corrupted.kind !== 'tilemap' || corrupted.resources?.[0]?.asset.kind !== 'tileset')
    throw new Error('Versão privada inválida')
  corrupted.resources[0].asset.tiles[1]!.data[0] = 7
  expect(
    provePintaCausalConsumerRemaps(base, corrupted, remaps, new Map([[before.id, admittedBefore]])),
  ).toBeNull()
})

test('a composed move through another slot keeps art at effective zero', () => {
  const tiles = sheet()
  const map = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: tiles.id, cols: 2, rows: 1 }),
    'Objetos',
  )
  map.layers.find(isTileLayer)!.cells.set([1, -1])
  map.layers.find(isObjectLayer)!.objects.push(
    createMapObject({
      id: 'arte',
      shape: 'art',
      art: { assetId: tiles.id },
    }),
  )
  const expectation = { itemId: map.id, kind: map.kind, formatVersion: 6 }
  const base = inspectPintaCausalDocument(assetToJson(map), expectation)!
  const shifted = remapTilemapCells(map, { insertedAt: 0 }, tiles.id)
  const returned = remapTilemapCells(shifted, { removedAt: 0 }, tiles.id)
  const candidate = remapTilemapCells(returned, { insertedAt: 1 }, tiles.id)
  expect(candidate.layers.find(isObjectLayer)?.objects[0]?.art?.tile).toBe(0)
  expect(
    provePintaCausalConsumerRemaps(base, candidate, [
      {
        sheetId: tiles.id,
        operation: { type: 'remap', oldToNew: [0, 2, 3], count: 4 },
      },
    ]),
  ).toEqual([{ sheetId: tiles.id, mode: 'mapped' }])
})
