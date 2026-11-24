import { expect, it } from 'bun:test'
import { type PintaScene, PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import { sceneObjects } from '@sistemazero/core/studio/pinta-scene-runtime'
import { TiledSceneCompatibilityError, tiledMap, tiledMapXml } from './export'
import { importTiledScene, tiledXmlToJson } from './import'
import { sceneToNative } from './native'

export function transformedScene(): PintaScene {
  const object = (id: string, extra = {}) => ({
    id,
    name: id,
    type: '',
    x: 0,
    y: 0,
    width: 4,
    height: 4,
    properties: {},
    ...extra,
  })
  return PintaSceneSchema.parse({
    version: 1,
    id: 'map',
    name: 'map',
    tileSize: 16,
    cols: 8,
    rows: 8,
    tilesets: [
      {
        id: 'ts',
        name: 'ts',
        image: 'data:image/png;base64,AAAA',
        columns: 1,
        count: 1,
        solid: [],
        platform: [],
        tileProperties: { 0: { target: { type: 'object', value: 'outside' } } },
      },
    ],
    layers: [
      {
        id: 'ground',
        name: 'Ground',
        visible: true,
        kind: 'tiles',
        tilesetId: 'ts',
        cells: Array(64).fill(-1),
        properties: { target: { type: 'object', value: 'outside' } },
      },
      {
        id: 'objects',
        name: 'Objects',
        visible: true,
        kind: 'objects',
        objects: [
          object('outside'),
          object('copy', { shape: 'set', setId: 'set', width: 16, height: 16, flipX: true }),
        ],
      },
    ],
    sets: [
      {
        id: 'set',
        cols: 1,
        rows: 1,
        layers: [
          {
            id: 'children',
            name: 'Children',
            visible: true,
            kind: 'objects',
            objects: [
              object('a', {
                x: 2,
                properties: {
                  local: { type: 'object', value: 'b' },
                  external: { type: 'object', value: 'outside' },
                },
              }),
              object('b', { x: 8, y: 8 }),
            ],
          },
        ],
      },
    ],
  })
}
const resolver = { image: async () => 'data:image/png;base64,AAAA', text: async () => '' }
const layers = (value: any): any[] =>
  value.layers.flatMap((l: any) => [l, ...(l.layers ? layers(l) : [])])

it('Tiled ARGB colors canonicalize opaque alpha and retain nonopaque RGBA through roundtrip', async () => {
  for (const [external, canonical] of [
    ['#ff20a0ff', '#20a0ff'],
    ['#FF20a0ff', '#20a0ff'],
    ['#8020a0ff', '#20a0ff80'],
    ['#0020a0ff', '#20a0ff00'],
    ['#20a0ff', '#20a0ff'],
  ] as const) {
    const map: any = await tiledMap(transformedScene())
    map.layers[0].properties.push({ name: 'color', type: 'color', value: external })
    for (const document of [map, tiledXmlToJson(tiledMapXml(map))]) {
      const first = await importTiledScene(document, resolver)
      expect(first.scene.layers[0]!.properties?.color).toEqual({ type: 'color', value: canonical })
      const second = await importTiledScene(await tiledMap(first.scene), resolver)
      expect(second.scene).toEqual(first.scene)
    }
  }
})

it('Tiled references in every property container use numeric IDs and import back to stable IDs', async () => {
  const map: any = await tiledMap(transformedScene()),
    all = layers(map),
    objects = all.flatMap((l) => l.objects ?? []),
    outside = objects.find((o) => o.name === 'outside')
  expect(
    all.find((l) => l.name === 'Ground').properties.find((p: any) => p.name === 'target').value,
  ).toBe(outside.id)
  expect(map.tilesets[0].tiles[0].properties[0].value).toBe(outside.id)
  const child = objects.find((o) => o.name === 'a'),
    target = objects.find((o) => o.name === 'b')
  expect(child.properties.find((p: any) => p.name === 'local').value).toBe(target.id)
  expect(child.properties.find((p: any) => p.name === 'external').value).toBe(outside.id)
  for (const document of [map, tiledXmlToJson(tiledMapXml(map))]) {
    const imported = await importTiledScene(document, resolver)
    expect(imported.scene.layers[0]!.properties?.target).toEqual({
      type: 'object',
      value: 'outside',
    })
    expect(imported.scene.tilesets[0]!.tileProperties?.[0]?.target).toEqual({
      type: 'object',
      value: 'outside',
    })
  }
})

it('native import refuses negative positions instead of moving objects without a report', async () => {
  const scene = transformedScene(),
    layer = scene.layers[1]!
  if (layer.kind !== 'objects') throw new Error('fixture')
  delete scene.sets
  layer.objects = [layer.objects[0]!]
  layer.objects[0]!.x = -12
  await expect(
    sceneToNative(scene, async () => ({
      width: 16,
      height: 16,
      data: new Uint8ClampedArray(1024),
    })),
  ).rejects.toThrow(/negativ/i)
})

it('expanded sets preserve reflected rectangles, local references and external references', () => {
  const objects = sceneObjects(transformedScene()),
    child = objects.find((o) => o.id === 'copy/a')!
  const a = ((child.rotation ?? 0) * Math.PI) / 180
  const corners = [
    [0, 0],
    [child.width, 0],
    [0, child.height],
    [child.width, child.height],
  ].map(([x, y]) => child.x + x! * Math.cos(a) - y! * Math.sin(a))
  expect(Math.min(...corners)).toBeCloseTo(10)
  expect(Math.max(...corners)).toBeCloseTo(14)
  expect(child.properties.local).toEqual({ type: 'object', value: 'copy/b' })
  expect(child.properties.external).toEqual({ type: 'object', value: 'outside' })
})

it('references to hidden children still belong to their set instance', () => {
  const scene = transformedScene(),
    layer = scene.sets![0]!.layers[0]!
  if (layer.kind !== 'objects') throw new Error('fixture')
  const target = layer.objects.pop()!
  scene.sets![0]!.layers.push({ ...layer, id: 'hidden', visible: false, objects: [target] })
  expect(sceneObjects(scene).find((o) => o.id === 'copy/a')!.properties.local).toEqual({
    type: 'object',
    value: 'copy/b',
  })
})

it('expanded layer properties resolve locally and references to expanded children import with stable identity', async () => {
  const scene = transformedScene()
  scene.sets![0]!.layers[0]!.properties = { target: { type: 'object', value: 'b' } }
  scene.layers[0]!.properties!.child = { type: 'object', value: 'copy/b' }
  const map: any = await tiledMap(scene),
    all = layers(map),
    childLayer = all.find((l) => l.name === 'copy: Children'),
    target = childLayer.objects.find((o: any) => o.name === 'b')
  expect(childLayer.properties.find((p: any) => p.name === 'target').value).toBe(target.id)
  for (const document of [map, tiledXmlToJson(tiledMapXml(map))]) {
    const imported = await importTiledScene(document, resolver)
    expect(imported.scene.layers[0]!.properties?.child).toEqual({ type: 'object', value: 'copy/b' })
  }
})

it('nonuniformly scaled rotated geometry uses an exact affine footprint; Tiled refuses sheared art', async () => {
  const scene = transformedScene(),
    main = scene.layers[1]!,
    child = scene.sets![0]!.layers[0]!
  if (main.kind !== 'objects' || child.kind !== 'objects') throw new Error('fixture')
  main.objects[1]!.width = 32
  child.objects[0]!.rotation = 45
  const transformed = sceneObjects(scene).find((o) => o.id === 'copy/a')!
  expect(transformed.shape).toBe('polygon')
  expect(transformed.points?.[1]?.x).toBeCloseTo(-4 * Math.SQRT2)
  expect(transformed.points?.[1]?.y).toBeCloseTo(2 * Math.SQRT2)
  expect(await tiledMap(scene)).toBeDefined()
  child.objects[0]!.shape = 'art'
  child.objects[0]!.art = { assetId: 'ts', tile: 0 }
  await expect(tiledMap(scene)).rejects.toThrow(TiledSceneCompatibilityError)
})
