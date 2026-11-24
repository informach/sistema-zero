import { expect, test } from 'bun:test'
import { scene4BudgetFixture } from '../../tests/fixtures/pinta-region-scene'
import {
  preparePintaRegionImageData,
  readPintaRegionImageWorldMetadata,
} from './pinta-region-image'
import { preparePintaRegionScene, readPintaRegionScene } from './pinta-region-scene'

const scene = (id = 'vila', chunks = 1) => ({
  ...scene4BudgetFixture(1, chunks),
  id,
  name: id,
  physics: 'legacy' as const,
})
const image = (source = scene()) => ({
  format: 'pinta',
  version: 5,
  kind: 'map',
  name: source.name,
  scale: 1,
  scene: source,
})
const linked = (id: string) => ({ id, name: id, png: 'data:image/png;base64,AA==' })
function world(children = ['cabana']) {
  return { ...image(), world: { version: 1, rootId: 'vila', maps: children.map(linked) } }
}
function withDecodeCount<T>(run: (count: () => number) => T): { result: T; decodes: number } {
  const original = globalThis.atob
  let decodes = 0
  globalThis.atob = (text) => {
    decodes++
    return original(text)
  }
  try {
    return { result: run(() => decodes), decodes }
  } finally {
    globalThis.atob = original
  }
}

test('scene admission exposes a frozen one-use plan without decoding or exposing its source', () => {
  const source = scene(),
    text = JSON.stringify(source)
  const proof = withDecodeCount((count) => {
    const plan = preparePintaRegionScene(text)!
    expect(plan).not.toBeNull()
    expect(Object.isFrozen(plan)).toBe(true)
    expect(Object.keys(plan)).toEqual(['id', 'name', 'indexBytes', 'decode'])
    expect(plan.indexBytes).toBe(2048)
    expect(count()).toBe(0)
    source.id = 'changed-after-serialization'
    const decoded = plan.decode()
    expect(decoded?.id).toBe('vila')
    expect(decoded?.layers[0]?.kind).toBe('tiles')
    expect(count()).toBe(1)
    expect(plan.decode()).toBeNull()
    expect(count()).toBe(1)
    return decoded
  })
  expect(proof.decodes).toBe(1)
  expect(proof.result).toEqual(readPintaRegionScene(text))
})

test('metadata references, tree and physics fail before the first chunk is decoded', () => {
  const source = scene()
  const cases = [
    { ...source, layers: source.layers.map((layer) => ({ ...layer, tilesetId: 'missing' })) },
    { ...source, layers: source.layers.map((layer) => ({ ...layer, parentId: 'missing' })) },
    { ...source, layers: [...source.layers, ...source.layers] },
    { ...source, resources: [{ id: 'missing', sourceId: 'original', capturedAt: 1 }] },
    {
      ...source,
      layers: [
        ...source.layers,
        {
          id: 'objects',
          kind: 'objects',
          name: '',
          visible: true,
          objects: [
            {
              id: 'shape',
              name: '',
              type: '',
              x: 0,
              y: 0,
              width: 4,
              height: 4,
              properties: {},
              collision: true,
            },
          ],
        },
      ],
    },
  ]
  const proof = withDecodeCount(() => {
    for (const invalid of cases) {
      expect(preparePintaRegionScene(JSON.stringify(invalid))).toBeNull()
      expect(readPintaRegionScene(JSON.stringify(invalid))).toBeNull()
    }
  })
  expect(proof.decodes).toBe(0)
})

test('a structurally valid bad payload is refused on decode and cannot be retried through the same plan', () => {
  const source = scene(),
    grid = source.layers[0]!.cells
  grid.chunks[0]!.data = '!'.repeat(grid.chunks[0]!.data.length)
  const plan = preparePintaRegionScene(JSON.stringify(source))!
  expect(plan).not.toBeNull()
  expect(plan.decode()).toBeNull()
  expect(plan.decode()).toBeNull()
})

test('PNG admission freezes separate descriptor snapshots without decoding any cells', () => {
  const proof = withDecodeCount((count) => {
    const source = world(),
      plan = preparePintaRegionImageData(JSON.stringify(source))!
    expect(plan).not.toBeNull()
    expect(Object.isFrozen(plan)).toBe(true)
    expect(Object.isFrozen(plan.world)).toBe(true)
    expect(Object.isFrozen(plan.world!.maps)).toBe(true)
    expect(Object.isFrozen(plan.world!.maps[0])).toBe(true)
    expect(Reflect.set(plan.world!.maps[0]!, 'id', 'other')).toBe(false)
    expect(count()).toBe(0)
    const data = plan.decode()!
    expect(data.world?.maps[0]?.id).toBe('cabana')
    // Decoded records belong to the caller, not to the immutable prepared header.
    data.world!.maps[0]!.id = 'owned-output'
    expect(plan.world?.maps[0]?.id).toBe('cabana')
    expect(plan.decode()).toBeNull()
  })
  expect(proof.decodes).toBe(1)
})

test('linked metadata is fully admitted before either map payload is decoded', () => {
  const remaining: number[] = [],
    seen: string[] = []
  const proof = withDecodeCount((count) =>
    readPintaRegionImageWorldMetadata(JSON.stringify(world()), (descriptor, budget) => {
      expect(count()).toBe(0)
      expect(Object.isFrozen(descriptor)).toBe(true)
      seen.push(descriptor.id)
      remaining.push(budget)
      return JSON.stringify(image(scene(descriptor.id)))
    }),
  )
  expect(seen).toEqual(['cabana'])
  expect(remaining[0]).toBe(
    16 * 1024 * 1024 - new TextEncoder().encode(JSON.stringify(world())).byteLength,
  )
  expect(proof.decodes).toBe(2)
  expect([...proof.result!.keys()]).toEqual(['vila', 'cabana'])
  expect(proof.result?.get('vila')?.scene.origin).toEqual({ col: -64, row: -64 })
  expect(proof.result?.get('cabana')?.scene.physics).toBe('legacy')
})

test('a later invalid ID, name, scale, nested world or format prevents decoding all earlier chunks', () => {
  const valid = image(scene('cabana'))
  const cases = [
    { ...valid, scene: { ...valid.scene, id: 'other' } },
    { ...valid, name: 'other', scene: { ...valid.scene, name: 'other' } },
    { ...valid, scale: 2 },
    { ...valid, version: 6 },
    { ...valid, world: { version: 1, rootId: 'cabana', maps: [] } },
    {
      ...valid,
      scene: {
        ...valid.scene,
        layers: valid.scene.layers.map((layer) => ({ ...layer, tilesetId: 'missing' })),
      },
    },
  ]
  const proof = withDecodeCount(() => {
    for (const invalid of cases)
      expect(
        readPintaRegionImageWorldMetadata(JSON.stringify(world()), () => JSON.stringify(invalid)),
      ).toBeNull()
    expect(readPintaRegionImageWorldMetadata(JSON.stringify(world()), () => null)).toBeNull()
    expect(
      readPintaRegionImageWorldMetadata(JSON.stringify(world()), () => {
        throw Error('failed extraction')
      }),
    ).toBeNull()
  })
  expect(proof.decodes).toBe(0)
})

test('duplicate descriptors fail before invoking the PNG metadata resolver', () => {
  let resolves = 0
  const proof = withDecodeCount(() =>
    readPintaRegionImageWorldMetadata(JSON.stringify(world(['cabana', 'cabana'])), () => {
      resolves++
      return null
    }),
  )
  expect(proof.result).toBeNull()
  expect(proof.decodes).toBe(0)
  expect(resolves).toBe(0)
})

test('the 4-MiB index budget is global across linked scenes, not a per-file allowance', () => {
  const root = { ...image(scene('vila', 2048)), world: world().world }
  const proof = withDecodeCount(() =>
    readPintaRegionImageWorldMetadata(JSON.stringify(root), () =>
      JSON.stringify(image(scene('cabana'))),
    ),
  )
  expect(proof.result).toBeNull()
  expect(proof.decodes).toBe(0)
  const exact = { ...image(scene('vila', 1024)), world: world().world }
  const positive = withDecodeCount(() =>
    readPintaRegionImageWorldMetadata(JSON.stringify(exact), () =>
      JSON.stringify(image(scene('cabana', 1024))),
    ),
  )
  expect(positive.result?.size).toBe(2)
  expect(positive.decodes).toBe(2048)
})

test('aggregate decompressed metadata uses the remaining 16-MiB world budget before scene decoding', () => {
  const heavy = (id: string) => {
    const source = scene(id)
    source.tilesets = Array.from({ length: 9 }, (_, index) => ({
      ...source.tilesets[0]!,
      id: index ? `sheet-${index}` : 'ground',
      image: 'x'.repeat(700000),
    }))
    return image(source)
  }
  const root = { ...heavy('vila'), world: world(['cabana', 'bosque']).world },
    remaining: number[] = []
  const proof = withDecodeCount(() =>
    readPintaRegionImageWorldMetadata(JSON.stringify(root), (descriptor, budget) => {
      remaining.push(budget)
      return JSON.stringify(heavy(descriptor.id))
    }),
  )
  expect(proof.result).toBeNull()
  expect(proof.decodes).toBe(0)
  expect(remaining).toHaveLength(2)
  expect(remaining[1]!).toBeLessThan(remaining[0]!)
  expect(remaining[1]!).toBeLessThan(6300000)
})

test('a corrupt final payload returns no partial world after all headers were admitted', () => {
  const child = scene('cabana')
  child.layers[0]!.cells.chunks[0]!.data = '!'.repeat(child.layers[0]!.cells.chunks[0]!.data.length)
  const proof = withDecodeCount(() =>
    readPintaRegionImageWorldMetadata(JSON.stringify(world()), () => JSON.stringify(image(child))),
  )
  expect(proof.result).toBeNull()
  expect(proof.decodes).toBe(1)
})
