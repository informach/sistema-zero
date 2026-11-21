import { expect, test } from 'bun:test'
import { sparseMemoryMap } from '../../scripts/homologacao/memoryRegions'
import {
  createBitmap,
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
} from '../core/project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../core/regionDocument'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from './cell'
import { addMapObject, createRegionMapObject } from './mapObjects'
import { editRegionMapCells } from './regionMap'
import { addLayer, addObjectLayer, createMapLayerCellReader } from './tilemapOps'
import { remapTilemapCells, tryRemapTilemapCells } from './tilesetOps'

function flagged() {
  const base = sparseMemoryMap(),
    result = editRegionMapCells(base, base.layers[0]!.id, [
      { col: -100, row: -100, cell: makeCell(0, CELL_FLIP_H) },
      { col: 9899, row: 9899, cell: makeCell(1, CELL_FLIP_D | CELL_FLIP_V) },
    ])
  if (!result.ok) throw Error(result.reason)
  return result.map
}
function reopen(map: RegionTilemapAsset) {
  const wire = encodeRegionMapDocument(map)
  expect(wire).not.toBeNull()
  expect(decodeRegionMapDocument(JSON.parse(JSON.stringify(wire)))).toEqual(map)
}

test('inserting a tile remaps signed sparse cells, preserves flags and shares untouched chunks', () => {
  const map = flagged(),
    id = map.layers[0]!.id,
    before = structuredClone(map)
  const changed = remapTilemapCells(map, { insertedAt: 1 }, map.tilesetId)
  const reader = createMapLayerCellReader(changed, id)!
  expect(reader.at(-100, -100)).toBe(makeCell(0, CELL_FLIP_H))
  expect(reader.at(9899, 9899)).toBe(makeCell(2, CELL_FLIP_D | CELL_FLIP_V))
  const first = map.layers.find(isTileLayer)!,
    next = changed.layers.find(isTileLayer)!
  expect(next.cells.chunks[0]).toBe(first.cells.chunks[0])
  expect(next.cells.chunks[1]).not.toBe(first.cells.chunks[1])
  expect(next.cells.chunks).toHaveLength(2)
  expect(map).toEqual(before)
  reopen(changed)
})

test('removing a tile drops a newly empty chunk without allocating the world', () => {
  const map = flagged(),
    changed = remapTilemapCells(map, { removedAt: 1 }, map.tilesetId)
  const next = changed.layers.find(isTileLayer)!,
    original = map.layers.find(isTileLayer)!
  expect(next.cells.chunks).toHaveLength(1)
  expect(next.cells.chunks[0]).toBe(original.cells.chunks[0])
  expect(createMapLayerCellReader(changed, next.id)!.at(9899, 9899)).toBe(-1)
  reopen(changed)
})

test('remapping one tileset updates its objects together with cells and preserves other sheets and private versions', () => {
  let map = addObjectLayer(addLayer(flagged(), 'Árvores', 'trees'), 'Objetos')
  const ground = map.layers[0]!,
    trees = map.layers[1]!,
    objects = map.layers[2]!
  const painted = editRegionMapCells(map, trees.id, [
    { col: -100, row: -100, cell: makeCell(1, CELL_FLIP_H) },
  ])
  if (!painted.ok) throw Error(painted.reason)
  map = painted.map
  for (const assetId of [map.tilesetId, 'trees', 'private-ground']) {
    const object = createRegionMapObject({
      id: assetId,
      shape: 'art',
      x: -40.5,
      y: 20.25,
      width: 16.5,
      height: 8.75,
      rotation: 12.5,
      flipX: true,
      art: { assetId, tile: 1 },
      properties: { self: { type: 'object', value: assetId } },
    })
    if (!object) throw Error('Objeto inválido')
    map = addMapObject(map, objects.id, object)
  }
  const sheet = createTilesetAsset({ name: 'terra', tileSize: 16 })
  const version = {
    sourceId: map.tilesetId,
    capturedAt: 0,
    asset: {
      ...sheet,
      id: 'private-ground',
      tiles: Array.from({ length: 3 }, () => createBitmap(16, 16)),
      solid: [false, false, false],
      platform: [false, false, false],
    },
  }
  map = { ...map, resources: [version] }
  const changed = remapTilemapCells(map, { removedAt: 0 }, map.tilesetId)
  expect(createMapLayerCellReader(changed, ground.id)!.at(-100, -100)).toBe(-1)
  expect(createMapLayerCellReader(changed, ground.id)!.at(9899, 9899)).toBe(
    makeCell(0, CELL_FLIP_D | CELL_FLIP_V),
  )
  expect(changed.layers.find((l) => l.id === trees.id)).toBe(
    map.layers.find((l) => l.id === trees.id),
  )
  const objectLayer = changed.layers.find((l) => l.kind === 'objects')!
  expect(objectLayer.objects[0]).toMatchObject({
    x: -40.5,
    y: 20.25,
    width: 16.5,
    height: 8.75,
    rotation: 12.5,
    flipX: true,
    art: { assetId: map.tilesetId, tile: 0 },
  })
  expect(objectLayer.objects[1]!.art!.tile).toBe(1)
  expect(objectLayer.objects[2]!.art!.tile).toBe(1)
  expect(changed.resources).toBe(map.resources)
  reopen(changed)
})

test('a remap that exceeds the document tile budget refuses a legacy edit before returning an unreadable map', () => {
  const map = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
  map.layers[0]!.cells![0] = makeCell(255, CELL_FLIP_H)
  const before = structuredClone(map)
  expect(remapTilemapCells(map, { insertedAt: 0 }, 'ground')).toBe(map)
  expect(map).toEqual(before)
})

test('region remap refuses too many chunks before reading their payloads', () => {
  const map = flagged(),
    first = map.layers.find(isTileLayer)!
  const chunk = {
    col: 0,
    row: 0,
    get cells(): Int16Array {
      throw Error('Payload não deve ser lido')
    },
  }
  const over: RegionTilemapAsset = {
    ...map,
    layers: [
      { ...first, cells: { ...first.cells, chunks: Array.from({ length: 2049 }, () => chunk) } },
    ],
  }
  expect(tryRemapTilemapCells(over, { insertedAt: 0 }, map.tilesetId)).toEqual({
    ok: false,
    reason: 'cell-budget',
  })
  const split: RegionTilemapAsset = {
    ...map,
    layers: [
      { ...first, cells: { ...first.cells, chunks: [chunk] } },
      {
        ...first,
        id: 'second',
        cells: { ...first.cells, chunks: Array.from({ length: 2048 }, () => chunk) },
      },
    ],
  }
  expect(tryRemapTilemapCells(split, { insertedAt: 0 }, map.tilesetId)).toEqual({
    ok: false,
    reason: 'cell-budget',
  })
})

test('detailed remap failures preserve the complete input even after earlier targets would change', () => {
  const map = flagged(),
    first = map.layers.find(isTileLayer)!
  const last = editRegionMapCells(map, first.id, [
    { col: 9899, row: 9899, cell: makeCell(255, CELL_FLIP_H) },
  ])
  if (!last.ok) throw Error(last.reason)
  const before = structuredClone(last.map)
  expect(tryRemapTilemapCells(last.map, { insertedAt: 0 }, map.tilesetId)).toEqual({
    ok: false,
    reason: 'tile-budget',
  })
  for (const position of [-1, 1.5, Number.NaN, 256])
    expect(tryRemapTilemapCells(last.map, { removedAt: position })).toEqual({
      ok: false,
      reason: 'invalid-change',
    })
  expect(last.map).toEqual(before)
})
