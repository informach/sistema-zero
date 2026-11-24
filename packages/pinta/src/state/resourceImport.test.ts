import { expect, it } from 'bun:test'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  type PintaAsset,
} from '../core/project'
import { addMapObject, createMapObject } from '../tiles/mapObjects'
import {
  freezeMapTilesets,
  freezeObjectResource,
  linkObjectResource,
} from '../tiles/resourceVersions'
import { addObjectLayer } from '../tiles/tilemapOps'
import { cloneWithNewIds, planImport } from './importPlan'

function fixture() {
  const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 }),
    tileset = createTilesetAsset({ name: 'terra', tileSize: 16 })
  let map = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: tileset.id, cols: 2, rows: 2 }),
    'Árvores',
  )
  const layer = map.layers.at(-1)!,
    object = createMapObject({
      shape: 'art',
      art: { assetId: sprite.id, animationId: sprite.animations[0]!.id },
      width: 16,
      height: 16,
    })
  map = addMapObject(map, layer.id, object)
  return { sprite, tileset, map, layer, object }
}

it('a cópia religa referências a objetos nas propriedades das peças guardadas', () => {
  const { tileset, map, object } = fixture()
  tileset.tileProperties = { '0': { target: { type: 'object', value: object.id } } }
  const frozen = freezeMapTilesets(map, (id) => (id === tileset.id ? tileset : null))
  if (!frozen.ok) throw new Error(frozen.reason)
  const copy = cloneWithNewIds(frozen.map, 'copia')
  if (copy.kind !== 'tilemap') throw new Error('Map expected')
  const nextObject = copy.layers.find(isObjectLayer)!.objects[0]!
  const snapshot = copy.resources![0]!.asset
  expect(nextObject.id).not.toBe(object.id)
  expect(snapshot.kind === 'tileset' && snapshot.tileProperties?.['0']?.target).toEqual({
    type: 'object',
    value: nextObject.id,
  })
})

it('importação religa a animação à cópia real do sprite, conservando projetos e IDs legados', () => {
  const { sprite, tileset, map } = fixture()
  const plan = planImport([sprite, tileset, map], new Set([tileset.id]), new Set())
  const nextSprite = plan.pairs.find((pair) => pair.restored.kind === 'pixel-sprite')!.restored
  const nextMap = plan.pairs.find((pair) => pair.restored.kind === 'tilemap')!.restored
  if (nextSprite.kind !== 'pixel-sprite' || nextMap.kind !== 'tilemap')
    throw new Error('Tipos incorretos')
  const object = nextMap.layers.find(isObjectLayer)!.objects[0]!
  expect(object.art?.assetId).toBe(nextSprite.id)
  expect(object.art?.animationId).toBe(nextSprite.animations[0]!.id)
  expect(object.art?.animationId).not.toBe(sprite.animations[0]!.id)
})

it('versões copiadas têm IDs próprios e podem voltar a acompanhar o original importado', () => {
  const { sprite, tileset, map, layer, object } = fixture()
  const pinned = freezeObjectResource(map, layer.id, object.id, (id) =>
    id === sprite.id ? sprite : null,
  )
  if (!pinned.ok) throw new Error(pinned.reason)
  const independent = cloneWithNewIds(pinned.map, 'outra-vila')
  if (independent.kind !== 'tilemap') throw new Error('Mapa esperado')
  expect(independent.resources![0]!.asset.id).not.toBe(pinned.map.resources![0]!.asset.id)
  expect(independent.layers.find(isObjectLayer)!.objects[0]!.art?.assetId).toBe(
    independent.resources![0]!.asset.id,
  )
  const plan = planImport([sprite, tileset, pinned.map], new Set([tileset.id]), new Set())
  const all = plan.pairs.map((pair) => pair.restored),
    byId = new Map<string, PintaAsset>(all.map((asset) => [asset.id, asset]))
  const nextMap = all.find((asset) => asset.kind === 'tilemap')!
  if (nextMap.kind !== 'tilemap') throw new Error('Mapa esperado')
  const nextLayer = nextMap.layers.find(isObjectLayer)!,
    nextObject = nextLayer.objects[0]!
  const nextSprite = all.find((asset) => asset.kind === 'pixel-sprite')!
  if (nextSprite.kind !== 'pixel-sprite') throw new Error('Sprite esperado')
  expect(nextMap.resources![0]!.sourceId).toBe(nextSprite.id)
  const linked = linkObjectResource(
    nextMap,
    nextLayer.id,
    nextObject.id,
    (id) => byId.get(id) ?? null,
  )
  if (!linked.ok) throw new Error(linked.reason)
  expect(linked.map.layers.find(isObjectLayer)!.objects[0]!.art).toMatchObject({
    assetId: nextSprite.id,
    animationId: nextSprite.animations[0]!.id,
  })
})
