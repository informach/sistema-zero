import { expect, test } from 'bun:test'
import type { PintaCausalOperation } from '@sistemazero/core/creations/pinta-causal'
import {
  createTilemapAsset,
  createTilesetAsset,
  createVectorTilesetAsset,
  isTileLayer,
} from '../core/project'
import { CELL_FLIP_H, makeCell } from '../tiles/cell'
import { addLayer } from '../tiles/tilemapOps'
import { addTile, duplicateTile, remapTilemapCells, removeTile } from '../tiles/tilesetOps'
import { assetToJson } from './assetJson'
import { inspectPintaCausalDocument } from './pintaCausalManifest'
import { provePintaCausalConsumerRemaps, provePintaCausalMutation } from './pintaCausalTransition'

const removeFirst = {
  type: 'remap',
  oldToNew: [-1, 0, 1],
  count: 2,
} as const satisfies PintaCausalOperation

function sheet() {
  const sheet = addTile(addTile(createTilesetAsset({ name: 'folha', tileSize: 16 }), 0), 1)
  for (const [index, tile] of sheet.tiles.entries()) tile.data.fill(index + 1)
  sheet.platform[1] = true
  sheet.animations = { '1': [{ tile: 2, durationMs: 120 }] }
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
