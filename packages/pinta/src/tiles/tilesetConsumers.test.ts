import { expect, test } from 'bun:test'
import { sparseMemoryMap } from '../../scripts/homologacao/memoryRegions'
import { createTilemapAsset, isObjectLayer } from '../core/project'
import { decodeRegionSetDocument, encodeRegionSetDocument } from '../core/regionDocument'
import { addMapObject, createMapObject } from './mapObjects'
import { createMapSet } from './sets'
import { addObjectLayer, createMapLayerCellReader } from './tilemapOps'
import { remapTilesetConsumers } from './tilesetConsumers'
import { remapTilemapCells } from './tilesetOps'

test('one remap transaction carries regional maps and reusable set definitions', () => {
  const map = sparseMemoryMap(),
    set = createMapSet(map, { col: -100, row: -100, cols: 2, rows: 2 }, 16, 'bosque')
  const result = remapTilesetConsumers([map, set], [], map.tilesetId, { insertedAt: 0 }, 2)
  if (!result.ok) throw Error(result.reason)
  expect(result.before).toEqual([map, set])
  expect(result.after).toHaveLength(2)
  expect(result.after.every((a) => a.updatedAt === 2)).toBe(true)
  const copiedSet = result.after.find((a) => a.kind === 'map-set')
  if (copiedSet?.kind !== 'map-set') throw Error('Conjunto ausente')
  expect(createMapLayerCellReader(copiedSet.map, copiedSet.map.layers[0]!.id)!.at(0, 0)).toBe(1)
  expect(decodeRegionSetDocument(encodeRegionSetDocument(copiedSet))).toEqual(copiedSet)
})

test('a pending revision that stopped using the tileset wins over the confirmed catalog', () => {
  let confirmed = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'other', cols: 2, rows: 2 }),
    'Objetos',
  )
  const layer = confirmed.layers.at(-1)!
  confirmed = addMapObject(
    confirmed,
    layer.id,
    createMapObject({
      id: 'tree',
      shape: 'art',
      width: 16,
      height: 16,
      art: { assetId: 'ground', tile: 1 },
    }),
  )
  const pending = remapTilemapCells(confirmed, { removedAt: 1 }, 'ground')
  expect(pending.layers.find(isObjectLayer)!.objects[0]!.art).toBeUndefined()
  const result = remapTilesetConsumers([confirmed], [pending], 'ground', { insertedAt: 1 }, 2)
  if (!result.ok) throw Error(result.reason)
  expect(result.before).toEqual([])
  expect(result.after).toEqual([])
})

test('one refused map refuses the complete linked edit instead of returning a partial batch', () => {
  const good = createTilemapAsset({ name: 'boa', tilesetId: 'ground', cols: 2, rows: 2 })
  good.layers[0]!.cells![0] = 0
  const bad = createTilemapAsset({ name: 'limite', tilesetId: 'ground', cols: 2, rows: 2 })
  bad.layers[0]!.cells![0] = 255
  const before = structuredClone([good, bad])
  expect(remapTilesetConsumers([good, bad], [], 'ground', { insertedAt: 0 }, 2)).toEqual({
    ok: false,
    assetId: bad.id,
    assetName: bad.name,
    reason: 'tile-budget',
  })
  expect([good, bad]).toEqual(before)
})
