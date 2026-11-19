import { expect, it } from 'bun:test'
import {
  createTilemapAsset,
  effectiveLayer,
  isObjectLayer,
  PINTA_LIMITS,
  sanitizePintaAsset,
  withPintaSchemaStamp,
} from '../core/project'
import { rectCells } from './cellGeometry'
import { addMapObject, addMapObjects, createMapObject } from './mapObjects'
import { objectBounds } from './objectGeometry'
import { DEFAULT_OBJECT_SCATTER, scatterMapObjects } from './objectScatter'
import { addObjectLayer } from './tilemapOps'

function scene() {
  return addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 16, rows: 16 }),
    'Objetos',
  )
}
const tree = createMapObject({
  name: 'arvore',
  shape: 'art',
  art: { assetId: 'folhas', animationId: 'vento' },
  x: 0,
  y: 0,
  width: 16,
  height: 16,
  properties: { vida: 10 },
})
const region = rectCells({ col: 0, row: 0, cols: 16, rows: 16 })
const objects = (map: ReturnType<typeof scene>) => map.layers.filter(isObjectLayer)[0]!.objects
const settings = { ...DEFAULT_OBJECT_SCATTER, density: 1, spacing: 2, seed: 37 }

it('região, semente e modelo geram a mesma composição com amostras repetidas ou invertidas', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  const first = scatterMapObjects(map, layerId, tree, 16, region, settings, 'stroke')
  const repeat = scatterMapObjects(
    map,
    layerId,
    tree,
    16,
    [...region].reverse().concat(region),
    settings,
    'stroke',
  )
  expect(first.map.layers).toEqual(repeat.map.layers)
  expect(first.addedIds).toEqual(repeat.addedIds)
  expect(first.addedIds.length).toBeGreaterThan(10)
  expect(first.overflow).toBe(false)
  expect(objects(map)).toHaveLength(0)
  expect(sanitizePintaAsset(withPintaSchemaStamp(first.map))).toEqual(
    withPintaSchemaStamp(first.map),
  )
})

it('afastamento vale entre centros novos e também em relação às artes existentes', () => {
  const base = scene(),
    layerId = base.layers.at(-1)!.id
  const map = addMapObject(base, layerId, { ...tree, x: 80, y: 80 })
  const result = scatterMapObjects(map, layerId, tree, 16, region, settings, 'stroke')
  const centers = objects(result.map).map((object) => {
    const b = objectBounds(object)
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  for (let i = 0; i < centers.length; i++)
    for (let j = i + 1; j < centers.length; j++)
      expect(
        Math.hypot(centers[i]!.x - centers[j]!.x, centers[i]!.y - centers[j]!.y),
      ).toBeGreaterThanOrEqual(32 - 1e-7)
})

it('densidade zero, posições inválidas, camada ausente e trava herdada não geram edição', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  expect(
    scatterMapObjects(map, layerId, tree, 16, region, { ...settings, density: 0 }, 'stroke').map,
  ).toBe(map)
  expect(
    scatterMapObjects(
      map,
      layerId,
      tree,
      16,
      [
        { col: -1, row: 0 },
        { col: 1000, row: 0 },
        { col: NaN, row: 0 },
      ],
      settings,
      'stroke',
    ).map,
  ).toBe(map)
  expect(scatterMapObjects(map, 'ausente', tree, 16, region, settings, 'stroke').map).toBe(map)
  const locked = {
    ...map,
    layers: [
      ...map.layers.slice(0, -1),
      { id: 'group', kind: 'group' as const, name: 'grupo', visible: true, locked: true as const },
      { ...map.layers.at(-1)!, parentId: 'group' },
    ],
  }
  expect(scatterMapObjects(locked, layerId, tree, 16, region, settings, 'stroke').map).toBe(locked)
})

it('variação é determinística e conserva arte, animação, propriedades e referências internas', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  const template = {
    ...tree,
    properties: { ...tree.properties, self: { type: 'object' as const, value: tree.id } },
  }
  const options = { ...settings, density: 0.7, rotate: true, mirror: true }
  const a = scatterMapObjects(map, layerId, template, 16, region, options, 'stroke')
  const b = scatterMapObjects(map, layerId, template, 16, region, options, 'stroke')
  const other = scatterMapObjects(
    map,
    layerId,
    template,
    16,
    region,
    { ...options, seed: 38 },
    'stroke',
  )
  expect(a.map.layers).toEqual(b.map.layers)
  expect(a.map.layers).not.toEqual(other.map.layers)
  expect(new Set(objects(a.map).map((o) => o.rotation ?? 0)).size).toBeGreaterThan(1)
  expect(objects(a.map).some((o) => o.flipX || o.flipY)).toBe(true)
  for (const object of objects(a.map)) {
    expect(object.art).toEqual(tree.art)
    expect(object.properties.vida).toBe(10)
    expect(object.properties.self).toEqual({ type: 'object', value: object.id })
  }
})

it('conjuntos continuam vinculados e recebem IDs distintos entre gestos', () => {
  const map = scene(),
    layerId = map.layers.at(-1)!.id
  const set = createMapObject({
    name: 'casa',
    shape: 'set',
    setId: 'casa-com-jardim',
    x: 0,
    y: 0,
    width: 32,
    height: 16,
    properties: { preco: 5 },
  })
  const a = scatterMapObjects(map, layerId, set, 16, region, settings, 'first')
  const b = scatterMapObjects(map, layerId, set, 16, region, settings, 'second')
  expect(a.addedIds.some((id) => b.addedIds.includes(id))).toBe(false)
  expect(objects(a.map).map(({ id, properties, ...o }) => o)).toEqual(
    objects(b.map).map(({ id, properties, ...o }) => o),
  )
  for (const object of objects(a.map)) {
    expect(object.setId).toBe(set.setId)
    expect(object.properties).toEqual(set.properties)
  }
})

it('a caixa transformada fica no mapa e offsets herdados são descontados uma vez', () => {
  const base = scene(),
    layerId = base.layers.at(-1)!.id
  const map = {
    ...base,
    layers: [
      ...base.layers.slice(0, -1),
      {
        id: 'group',
        kind: 'group' as const,
        name: 'grupo',
        visible: true,
        offsetX: 16,
        offsetY: 8,
      },
      { ...base.layers.at(-1)!, parentId: 'group', offsetX: 16, offsetY: 8 },
    ],
  }
  const result = scatterMapObjects(
    map,
    layerId,
    { ...tree, width: 32, height: 16, rotation: 45 },
    16,
    region,
    { ...settings, rotate: true },
    'stroke',
  )
  const layer = result.map.layers.find((l) => l.id === layerId)!,
    offset = effectiveLayer(result.map, layer)
  expect(result.addedIds.length).toBeGreaterThan(0)
  for (const object of objects(result.map)) {
    const b = objectBounds(object)
    expect(b.x + offset.offsetX).toBeGreaterThanOrEqual(-1e-7)
    expect(b.y + offset.offsetY).toBeGreaterThanOrEqual(-1e-7)
    expect(b.x + b.width + offset.offsetX).toBeLessThanOrEqual(map.cols * 16 + 1e-7)
    expect(b.y + b.height + offset.offsetY).toBeLessThanOrEqual(map.rows * 16 + 1e-7)
  }
})

it('um lote que ultrapassa os lugares restantes é recusado inteiro', () => {
  const base = scene(),
    layerId = base.layers.at(-1)!.id
  const map = addMapObjects(
    base,
    layerId,
    Array.from({ length: PINTA_LIMITS.maxTilemapObjects - 1 }, (_, i) => ({
      ...tree,
      id: `old-${i}`,
    })),
  )
  const result = scatterMapObjects(map, layerId, tree, 16, region, settings, 'stroke')
  expect(result.overflow).toBe(true)
  expect(result.map).toBe(map)
  expect(result.addedIds).toEqual([])
})
