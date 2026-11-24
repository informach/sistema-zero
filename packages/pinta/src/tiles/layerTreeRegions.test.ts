import { expect, test } from 'bun:test'
import { explicitLayerMap as explicitMap } from '../../scripts/homologacao/layerRegions'
import { sparseMemoryMap } from '../../scripts/homologacao/memoryRegions'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type RegionTilemapAsset,
  type TilemapCells,
} from '../core/project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../core/regionDocument'
import {
  addMapGroup,
  moveMapLayer,
  setMapLayerParent,
  toggleMapLayerCollision,
  updateMapLayer,
} from './layerTree'
import {
  addLayer,
  addObjectLayer,
  removeLayer,
  setLayerTileset,
  toggleLayerFront,
  toggleLayerVisible,
} from './tilemapOps'

function reopen(map: RegionTilemapAsset) {
  const wire = encodeRegionMapDocument(map)
  expect(wire).not.toBeNull()
  expect(decodeRegionMapDocument(JSON.parse(JSON.stringify(wire)))).toEqual(map)
}

test('region layer edits preserve explicit defaults and signed fractional metadata', () => {
  const map = explicitMap(),
    layer = map.layers[0]!
  expect(updateMapLayer(map, layer.id, { name: layer.name })).toBe(map)
  const renamed = updateMapLayer(map, layer.id, { name: 'Árvores' })
  expect(renamed.layers[0]).toEqual({ ...layer, name: 'Árvores' })
  expect(renamed.layers[0]!.cells).toBe(layer.cells)
  reopen(renamed)
})

test('invalid region header patches refuse the whole change without clipping other fields', () => {
  const map = explicitMap(),
    id = map.layers[0]!.id
  for (const patch of [
    { opacity: -1, name: 'Outro' },
    { offsetX: 480000.5 },
    { parallaxX: 4.5 },
    { name: '' },
    { properties: { amount: { type: 'int' as const, value: 1.5 } } },
    { properties: Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`p${i}`, i])) },
  ])
    expect(updateMapLayer(map, id, patch)).toBe(map)
  expect(updateMapLayer(map, id, { offsetX: -400000.5 }).layers[0]!.offsetX).toBe(-400000.5)
})

test('unlocking or removing an optional region header field preserves all the other defaults', () => {
  const map = explicitMap(),
    id = map.layers[0]!.id
  const locked = updateMapLayer(map, id, { locked: true })
  const unlocked = updateMapLayer(locked, id, {
    locked: undefined,
    offsetX: undefined,
    properties: undefined,
  })
  expect(Object.hasOwn(unlocked.layers[0]!, 'locked')).toBe(false)
  expect(Object.hasOwn(unlocked.layers[0]!, 'offsetX')).toBe(false)
  expect(Object.hasOwn(unlocked.layers[0]!, 'properties')).toBe(false)
  expect(unlocked.layers[0]).toMatchObject({ offsetY: 0, opacity: 1, parallaxX: 1 })
  reopen(unlocked)
})

test('editing a header never serializes its cell payload in either document generation', () => {
  const regions = explicitMap(),
    dense = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 2, rows: 2 })
  for (const map of [regions, dense]) {
    const layer = map.layers[0]
    if (!layer || !isTileLayer<TilemapCells>(layer)) throw Error('Camada ausente')
    let calls = 0
    const buffers =
      layer.cells instanceof Int16Array ? [layer.cells] : layer.cells.chunks.map((c) => c.cells)
    for (const buffer of buffers)
      Object.defineProperty(buffer, 'toJSON', {
        value: () => {
          calls++
          return []
        },
      })
    const changed = updateMapLayer(map, layer.id, { name: 'Outro' })
    expect(changed.layers[0]!.name).toBe('Outro')
    expect(calls).toBe(0)
    expect(changed.layers[0]!.cells).toBe(layer.cells)
  }
})

test('large region worlds add empty layers without allocating the world or consuming chunks', () => {
  let map = sparseMemoryMap()
  const initial = map.layers[0]!
  map = addLayer(map, 'Primeiro plano', map.tilesetId)
  expect(map.layers).toHaveLength(2)
  expect(map.layers[0]).toBe(initial)
  const added = map.layers[1]
  if (!added || !isTileLayer(added)) throw Error('Camada ausente')
  expect(added.cells.chunks).toEqual([])
  expect(added.tilesetId).toBe(map.tilesetId)
  map = addObjectLayer(map, 'Portas')
  map = addMapGroup(map, 'Vila')
  for (let count = map.layers.length; count < 32; count++) map = addLayer(map, 'Camada')
  expect(map.layers).toHaveLength(32)
  expect(addLayer(map, 'Excesso')).toBe(map)
  expect(addObjectLayer(map, 'Excesso')).toBe(map)
  expect(addMapGroup(map, 'Excesso')).toBe(map)
  reopen(map)
})

test('region hierarchy moves whole subtrees, refuses cycles and retains chunk identities', () => {
  let map = addObjectLayer(addMapGroup(sparseMemoryMap(), 'Vila'), 'Portas')
  const tiles = map.layers[0]!,
    group = map.layers[1]!,
    objects = map.layers[2]!
  map = setMapLayerParent(map, tiles.id, group.id)
  map = setMapLayerParent(map, objects.id, group.id)
  expect(setMapLayerParent(map, group.id, tiles.id)).toBe(map)
  map = addLayer(map, 'Frente')
  map = moveMapLayer(map, group.id, 1)
  expect(map.layers.slice(1).every((l) => l.id === group.id || l.parentId === group.id)).toBe(true)
  expect(map.layers.find((l) => l.id === tiles.id)!.cells).toBe(tiles.cells)
  reopen(map)
})

test('region visibility, foreground, collision and layer deletion survive re opening', () => {
  let map = addLayer(sparseMemoryMap(), 'Frente')
  const id = map.layers[0]!.id
  map = toggleLayerVisible(map, id)
  map = toggleLayerFront(map, id)
  map = toggleMapLayerCollision(map, id)
  expect(map.layers[0]).toMatchObject({ visible: false, front: true, collision: true })
  reopen(map)
  map = removeLayer(map, id)
  expect(map.layers).toHaveLength(1)
  expect(removeLayer(map, map.layers[0]!.id)).toBe(map)
  reopen(map)
})

test('switching region tilesets preserves explicit primary bindings, compatibility and inherited locks', () => {
  const map = sparseMemoryMap(),
    id = map.layers[0]!.id
  const ground = { ...createTilesetAsset({ name: 'terra', tileSize: 16 }), id: map.tilesetId },
    water = createTilesetAsset({ name: 'agua', tileSize: 16 })
  const changed = setLayerTileset(map, id, water, ground)
  const restored = setLayerTileset(changed, id, ground, ground)
  expect(restored.layers[0]!.tilesetId).toBe(map.tilesetId)
  expect(restored.layers[0]!.cells).toBe(map.layers[0]!.cells)
  const incompatible = createTilesetAsset({ name: 'pedra', tileSize: 32 })
  expect(setLayerTileset(map, id, incompatible, ground)).toBe(map)
  const locked = updateMapLayer(changed, id, { locked: true })
  expect(setLayerTileset(locked, id, ground, ground)).toBe(locked)
  const grouped = addMapGroup(changed, 'Vila'),
    groupId = grouped.layers.at(-1)!.id
  const inherited = updateMapLayer(setMapLayerParent(grouped, id, groupId), groupId, {
    locked: true,
  })
  expect(setLayerTileset(inherited, id, ground, ground)).toBe(inherited)
  reopen(restored)
})
