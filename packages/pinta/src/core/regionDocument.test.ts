import { expect, test } from 'bun:test'
import { expandRegionMap, prepareMapRegions } from '../tiles/regionMap'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  isObjectLayer,
  isTileLayer,
  sanitizePintaAsset,
} from './project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from './regionDocument'

function example() {
  const dense = createTilemapAsset({ name: 'Vila', tilesetId: 'ground', cols: 3, rows: 2 })
  dense.layers[0]!.cells![0] = 7
  dense.layers.push({
    kind: 'objects',
    id: 'doors',
    name: 'Portas',
    visible: true,
    objects: [
      {
        id: 'door',
        name: 'Cabana',
        type: 'door',
        role: 'door',
        shape: 'polyline',
        x: -32.5,
        y: -16.25,
        width: 0,
        height: 12.75,
        rotation: 0,
        points: [
          { x: -20000.5, y: 1.25 },
          { x: 0, y: 0 },
        ],
        properties: { arrival: { type: 'object', value: 'spawn' }, enabled: false },
      },
    ],
  })
  const prepared = prepareMapRegions(dense)
  if (!prepared.ok) throw Error(prepared.reason)
  const grown = expandRegionMap(prepared.map, { col: -64, row: -64, cols: 10000, rows: 10000 })
  if (!grown.ok) throw Error(grown.reason)
  const first = grown.map.layers[0]!
  if (!isTileLayer(first)) throw Error('tile layer')
  first.kind = 'tiles'
  first.front = false
  first.opacity = 1
  first.offsetX = 0
  first.properties = {}
  return grown.map
}

test('region native round trip preserves global signed fractional metadata and explicit defaults', () => {
  const map = example()
  const wire = encodeRegionMapDocument(map)
  expect(wire).not.toBeNull()
  const reopened = decodeRegionMapDocument(JSON.parse(JSON.stringify(wire)))
  expect(reopened).toEqual(map)
  expect(reopened!.layers.find(isObjectLayer)!.objects[0]!.x).toBe(-32.5)
  expect(sanitizePintaAsset(wire)).toBeNull()
  expect(map.layers[0]!.cells).toBeDefined()
})

test('region native reader refuses unknown metadata at every level instead of dropping it', () => {
  const map = example()
  for (const raw of [
    { ...map, future: true },
    { ...map, origin: { ...map.origin, future: true } },
    {
      ...map,
      layers: map.layers.map((l) => (isObjectLayer(l) ? { ...l, cells: 'future data' } : l)),
    },
    { ...map, layers: map.layers.map((l, i) => (i === 0 ? { ...l, future: true } : l)) },
    {
      ...map,
      layers: map.layers.map((l) =>
        isObjectLayer(l) ? { ...l, objects: l.objects.map((o) => ({ ...o, future: true })) } : l,
      ),
    },
  ])
    expect(decodeRegionMapDocument(raw)).toBeNull()
})

test('region native reader refuses invalid metadata atomically without repairing ids or tree', () => {
  const map = example()
  for (const layer of [
    { ...map.layers[0], parentId: 'missing' },
    { ...map.layers[0], opacity: 2 },
    { ...map.layers[0], name: '' },
    { ...map.layers[0], offsetX: 480001 },
    { ...map.layers[0], properties: { count: { type: 'int', value: 1.5 } } },
  ])
    expect(decodeRegionMapDocument({ ...map, layers: [layer, ...map.layers.slice(1)] })).toBeNull()
  expect(decodeRegionMapDocument({ ...map, layers: [...map.layers, map.layers[0]] })).toBeNull()
  expect(decodeRegionMapDocument({ ...map, schema: 9 })).toBeNull()
  expect(decodeRegionMapDocument({ ...map, projection: 'isometric' })).toBeNull()
})

test('region native reader rejects malformed cells and references without touching the source', () => {
  const map = example()
  const before = structuredClone(map)
  const layer = map.layers.find(isTileLayer)!
  expect(
    decodeRegionMapDocument({
      ...map,
      layers: [{ ...layer, cells: { ...layer.cells, version: 2 } }],
    }),
  ).toBeNull()
  expect(encodeRegionMapDocument({ ...map, tilesetId: '' })).toBeNull()
  expect(map).toEqual(before)
})

test('region native document stays sparse at the maximum extent and retains old formats unchanged', () => {
  const map = example()
  const wire = encodeRegionMapDocument(map)
  expect(JSON.stringify(wire).length).toBeLessThan(6000)
  expect(decodeRegionMapDocument(wire)!.cols).toBe(10000)
  const dense = createTilemapAsset({ name: 'bosque', tilesetId: 'ground', cols: 3, rows: 2 })
  expect(decodeRegionMapDocument(dense)).toBeNull()
  expect(sanitizePintaAsset(dense)).toEqual(dense)
})

test('unknown metadata is rejected before decoding any chunk payload', () => {
  const map = example()
  let reads = 0
  const grid = {
    kind: 'regions',
    version: 1,
    side: 32,
    encoding: 'i16le-base64-v1',
    chunks: [
      {
        col: 0,
        row: 0,
        get data() {
          reads++
          throw Error('payload must not be read')
        },
      },
    ],
  }
  const raw = {
    ...map,
    future: true,
    layers: map.layers.map((l) => (isTileLayer(l) ? { ...l, cells: grid } : l)),
  }
  expect(decodeRegionMapDocument(raw)).toBeNull()
  expect(reads).toBe(0)
})

test('native object geometry is bounded and duplicate object ids across layers are refused', () => {
  const map = example()
  const objects = map.layers.find(isObjectLayer)!
  for (const overrides of [
    { x: -480001 },
    { width: -1 },
    { rotation: 360 },
    { points: [{ x: Infinity, y: 0 }] },
  ]) {
    const layer = { ...objects, objects: objects.objects.map((o) => ({ ...o, ...overrides })) }
    expect(decodeRegionMapDocument({ ...map, layers: [map.layers[0], layer] })).toBeNull()
  }
  expect(
    decodeRegionMapDocument({ ...map, layers: [...map.layers, { ...objects, id: 'other-doors' }] }),
  ).toBeNull()
})

test('native region metadata preserves fractional rotations without rounding or normalization', () => {
  const map = example()
  for (const rotation of [0, 1.1, 359.9]) {
    const layers = map.layers.map((l) =>
      isObjectLayer(l) ? { ...l, objects: l.objects.map((o) => ({ ...o, rotation })) } : l,
    )
    const read = decodeRegionMapDocument({ ...map, layers })
    expect(read).not.toBeNull()
    expect(read!.layers.find(isObjectLayer)!.objects[0]!.rotation).toBe(rotation)
  }
})

test('region document retains self-contained resource versions and refuses unknown resource data', () => {
  const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16, now: 100 })
  const map = {
    ...example(),
    resources: [
      { sourceId: 'arvore-original', capturedAt: 200, asset: { ...sprite, id: 'arvore-snapshot' } },
    ],
  }
  const wire = encodeRegionMapDocument(map)
  expect(wire).not.toBeNull()
  expect(decodeRegionMapDocument(wire)).toEqual(map)
  const json = JSON.parse(JSON.stringify(wire))
  expect(decodeRegionMapDocument(json)).toEqual(map)
  expect(
    decodeRegionMapDocument({ ...map, resources: [{ ...map.resources[0], future: true }] }),
  ).toBeNull()
  expect(
    decodeRegionMapDocument({
      ...map,
      resources: [{ ...map.resources[0], asset: { ...sprite, schema: 99 } }],
    }),
  ).toBeNull()
})

test('region documents preserve groups, layer properties and precise collision opt-in', () => {
  const map = example()
  const grouped = {
    ...map,
    physics: 'precise' as const,
    layers: [
      {
        kind: 'group' as const,
        id: 'forest',
        name: 'Floresta',
        visible: false,
        locked: true as const,
        opacity: 0,
        offsetX: -20000.25,
        parallaxY: 0,
        properties: { danger: false },
      },
      ...map.layers.map((l) => ({ ...l, parentId: 'forest' })),
    ],
  }
  expect(decodeRegionMapDocument(encodeRegionMapDocument(grouped))).toEqual(grouped)
})
