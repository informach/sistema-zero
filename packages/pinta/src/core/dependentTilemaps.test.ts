import { expect, it } from 'bun:test'
import { addMapObject, createMapObject } from '../tiles/mapObjects'
import { freezeObjectResource } from '../tiles/resourceVersions'
import { addObjectLayer } from '../tiles/tilemapOps'
import { dependentTilemaps } from './dependentTilemaps'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  type PintaAsset,
} from './project'

it('finds direct and transitive map consumers, including typed properties and cycles', () => {
  const sprite = createPixelSpriteAsset({ name: 'tree', frameSize: 16 })
  const tileset = createTilesetAsset({ name: 'ground', tileSize: 16 })
  tileset.tileProperties = { 0: { prize: { type: 'asset', value: sprite.id } } }
  const map = createTilemapAsset({ name: 'world', tilesetId: tileset.id, cols: 2, rows: 2 })
  const other = {
    ...map,
    id: 'other',
    layers: map.layers.map((l) => ({
      ...l,
      properties: { peer: { type: 'asset' as const, value: map.id } },
    })),
  }
  map.layers[0]!.properties = { peer: { type: 'asset', value: other.id } }
  const unrelated = createTilemapAsset({
    name: 'unrelated',
    tilesetId: 'another-tileset',
    cols: 2,
    rows: 2,
  })
  const assets: PintaAsset[] = [sprite, tileset, map, other, unrelated]
  expect(dependentTilemaps(sprite.id, assets).map((a) => a.id)).toEqual([map.id, other.id])
  expect(dependentTilemaps(map.id, assets).map((a) => a.id)).toEqual([other.id])
  expect(dependentTilemaps('absent', assets)).toEqual([])
})

it('tracks linked set definitions but never treats a frozen origin as a dependency', () => {
  const sprite = createPixelSpriteAsset({ name: 'tree', frameSize: 16 })
  const tileset = createTilesetAsset({ name: 'ground', tileSize: 16 })
  let map = addObjectLayer(
    createTilemapAsset({ name: 'garden', tilesetId: tileset.id, cols: 2, rows: 2 }),
    'Objects',
  )
  const layer = map.layers.at(-1)!
  const object = createMapObject({
    shape: 'art',
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    art: { assetId: sprite.id },
  })
  map = addMapObject(map, layer.id, object)
  const frozen = freezeObjectResource(
    map,
    layer.id,
    object.id,
    (id) => (id === sprite.id ? sprite : null),
    100,
  )
  if (!frozen.ok) throw new Error(frozen.reason)
  const pinned = { ...frozen.map, id: 'pinned' }
  const set = {
    id: 'garden-set',
    kind: 'map-set' as const,
    name: 'garden-set',
    createdAt: 1,
    updatedAt: 1,
    schema: 4 as const,
    map,
  }
  let world = addObjectLayer(
    createTilemapAsset({ name: 'world', tilesetId: tileset.id, cols: 2, rows: 2 }),
    'Objects',
  )
  world = addMapObject(
    world,
    world.layers.at(-1)!.id,
    createMapObject({ shape: 'set', setId: set.id, x: 0, y: 0, width: 32, height: 32 }),
  )
  expect(
    dependentTilemaps(sprite.id, [sprite, tileset, map, pinned, set, world]).map((a) => a.id),
  ).toEqual([map.id, world.id])
  expect(pinned.resources?.[0]?.sourceId).toBe(sprite.id)
})
