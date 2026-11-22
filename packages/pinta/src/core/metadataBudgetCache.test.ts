import { expect, test } from 'bun:test'
import {
  RegionMetadataBudgetCache,
  regionDocumentMetadata,
  sameMapDocumentMetadata,
} from './mapDocumentBoundary'

test('cached metadata measurement obeys the existing comparator budgets exactly', () => {
  const value = {
    title: 'vila',
    optional: undefined,
    objects: [{ x: -1.5, front: false }, null],
    art: new Uint8Array([1, 2, 3]),
  }
  const cache = new RegionMetadataBudgetCache()
  for (const key of ['maxNodes', 'maxDepth', 'maxBinaryBytes', 'maxStringUnits'] as const)
    for (let limit = 1; limit < 60; limit++) {
      const budget = { [key]: limit }
      expect(cache.accepts(value, budget)).toBe(sameMapDocumentMetadata(value, value, budget))
    }
  for (const limit of [0, -1, Infinity, NaN, 0.5, 9_000_000])
    expect(cache.accepts(value, { maxNodes: limit })).toBe(false)
})

test('summary reuse counts repeated references and contextual depth without revisiting immutable objects', () => {
  let visits = 0
  const leaf = new Proxy(Object.freeze({ text: 'abc' }), {
    ownKeys(target) {
      visits++
      return Reflect.ownKeys(target)
    },
  })
  const cache = new RegionMetadataBudgetCache()
  expect(cache.accepts(leaf)).toBe(true)
  expect(visits).toBe(1)
  const repeated = [leaf, leaf]
  expect(cache.accepts(repeated, { maxStringUnits: 13 })).toBe(false)
  expect(cache.accepts(repeated, { maxStringUnits: 14 })).toBe(true)
  expect(cache.accepts(repeated, { maxNodes: 4 })).toBe(false)
  expect(cache.accepts(repeated, { maxNodes: 5 })).toBe(true)
  expect(cache.accepts({ nested: repeated }, { maxDepth: 2 })).toBe(false)
  expect(cache.accepts({ nested: repeated }, { maxDepth: 3 })).toBe(true)
  expect(visits).toBe(1)
})

test('metadata admission bounds deep trees and cycles and never invokes accessors', () => {
  const cache = new RegionMetadataBudgetCache()
  let reads = 0
  const getter = Object.defineProperty({}, 'name', {
    enumerable: true,
    get() {
      reads++
      return 'x'
    },
  })
  const array = Object.defineProperty([0], '0', {
    get() {
      reads++
      return 0
    },
  })
  const cyclic: Record<string, unknown> = {}
  cyclic.self = cyclic
  let deep: unknown = 0
  for (let i = 0; i < 10_000; i++) deep = { child: deep }
  for (const value of [
    getter,
    array,
    cyclic,
    deep,
    new Date(),
    new Float32Array([NaN]),
    new Array(2),
    Infinity,
  ])
    expect(cache.accepts(value)).toBe(false)
  expect(reads).toBe(0)
  expect(cache.accepts({ fine: 1 })).toBe(true)
})

test('metadata projection excludes cell payloads while preserving authorial subtree identities', () => {
  const objects = [{ id: 'door', properties: { destination: 'cabana' } }]
  let reads = 0
  const tiles = Object.defineProperty({ id: 'tiles', kind: 'tiles' }, 'cells', {
    enumerable: true,
    get() {
      reads++
      throw Error('payload')
    },
  })
  const objectLayer = { id: 'objects', kind: 'objects', objects }
  const map = { kind: 'tilemap', layers: [tiles, objectLayer] }
  const metadata = regionDocumentMetadata(map)
  expect(new RegionMetadataBudgetCache().accepts(metadata)).toBe(true)
  expect(metadata).toEqual({
    kind: 'tilemap',
    layers: [{ id: 'tiles', kind: 'tiles' }, objectLayer],
  })
  expect(Reflect.get(metadata!, 'layers')[1]).toBe(objectLayer)
  expect(regionDocumentMetadata({ kind: 'map-set', name: 'casa', map })).toEqual({
    kind: 'map-set',
    name: 'casa',
    map: metadata,
  })
  expect(reads).toBe(0)
  expect(
    regionDocumentMetadata({
      kind: 'tilemap',
      layers: [
        Object.defineProperty({}, 'name', {
          enumerable: true,
          get() {
            reads++
            return 'x'
          },
        }),
      ],
    }),
  ).toBeNull()
  expect(reads).toBe(0)
})
