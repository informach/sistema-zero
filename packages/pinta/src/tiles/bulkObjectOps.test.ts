import { expect, it } from 'bun:test'
import { createTilemapAsset, isObjectLayer, PINTA_LIMITS } from '../core/project'
import { addMapObject, addMapObjects, createMapObject } from './mapObjects'
import { cloneObjects } from './objectSelection'
import { addObjectLayer } from './tilemapOps'

const scene = () =>
  addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 16, rows: 16 }),
    'Objetos',
  )
const tree = createMapObject({
  name: 'arvore',
  shape: 'art',
  art: { assetId: 'arte' },
  x: 16,
  y: 16,
  width: 16,
  height: 16,
})

it('a clonagem aceita identidades estáveis e remapeia relações internas sem mudar a origem', () => {
  const source = {
    ...tree,
    properties: {
      self: { type: 'object' as const, value: tree.id },
      door: { type: 'object' as const, value: 'porta-existente' },
    },
  }
  const a = cloneObjects([source], 16, 0, (_id, index) => `stroke-1:${index}`)
  const b = cloneObjects([source], 16, 0, (_id, index) => `stroke-1:${index}`)
  expect(a).toEqual(b)
  expect(a[0]!.id).toBe('stroke-1:0')
  expect(a[0]!.properties.self).toEqual({ type: 'object', value: 'stroke-1:0' })
  expect(a[0]!.properties.door).toEqual(source.properties.door)
  expect(source.properties.self.value).toBe(tree.id)
  expect(cloneObjects([source])[0]!.id).not.toBe(tree.id)
})

it('inserção em lote conserva a normalização da inserção única e não altera a origem', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  const object = { ...tree, x: -5, rotation: 450 }
  const batch = addMapObjects(map, layerId, [object])
  const single = addMapObject(map, layerId, object)
  expect(batch.layers).toEqual(single.layers)
  expect(batch.layers.filter(isObjectLayer)[0]!.objects[0]).toMatchObject({ x: 0, rotation: 90 })
  expect(map.layers.filter(isObjectLayer)[0]!.objects).toHaveLength(0)
  expect(addMapObjects(map, layerId, [])).toBe(map)
})

it('lote com identidade repetida, camada ausente ou bloqueio herdado é recusado inteiro', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  const withTree = addMapObject(map, layerId, tree)
  expect(addMapObjects(withTree, layerId, [{ ...tree, id: 'new' }, tree])).toBe(withTree)
  expect(addMapObjects(map, layerId, [tree, tree])).toBe(map)
  expect(addMapObjects(map, 'ausente', [tree])).toBe(map)
  const group = {
    id: 'grupo',
    kind: 'group' as const,
    name: 'grupo',
    visible: true,
    locked: true as const,
  }
  const locked = {
    ...map,
    layers: [...map.layers.slice(0, -1), group, { ...map.layers.at(-1)!, parentId: group.id }],
  }
  expect(addMapObjects(locked, layerId, [tree])).toBe(locked)
})

it('o teto de 512 recusa o lote completo, sem consumir parcialmente os lugares restantes', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  const filled = addMapObjects(
    map,
    layerId,
    Array.from({ length: PINTA_LIMITS.maxTilemapObjects - 1 }, (_, i) => ({
      ...tree,
      id: `tree-${i}`,
    })),
  )
  expect(filled.layers.filter(isObjectLayer)[0]!.objects).toHaveLength(511)
  expect(
    addMapObjects(filled, layerId, [
      { ...tree, id: 'first' },
      { ...tree, id: 'second' },
    ]),
  ).toBe(filled)
  expect(
    addMapObjects(filled, layerId, [{ ...tree, id: 'last' }]).layers.filter(isObjectLayer)[0]!
      .objects,
  ).toHaveLength(512)
})
