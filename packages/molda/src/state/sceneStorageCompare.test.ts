import { expect, test } from 'bun:test'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { sameSceneStoredValue } from './sceneStorageCompare'
import { prepareSceneStorage } from './sceneStorageDocument'

test('exact scene snapshot comparison detects same-revision metadata and pixel changes', async () => {
  const source = makeSceneAtlasDocument()
  const prepared = await prepareSceneStorage(source)
  for (const raw of [source, prepared.manifest, ...prepared.blobs.values()])
    expect(sameSceneStoredValue(raw, structuredClone(raw))).toBe(true)
  const renamed = structuredClone(source)
  renamed.name = 'Changed without changing revision'
  expect(sameSceneStoredValue(source, renamed)).toBe(false)
  const painted = structuredClone(source)
  painted.images[0]!.layers[0]!.pixels[0] = 9
  expect(sameSceneStoredValue(source, painted)).toBe(false)
  expect(sameSceneStoredValue({ revision: 1, value: 0 }, { revision: 1, value: -0 })).toBe(false)
  expect(sameSceneStoredValue({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false)
  expect(sameSceneStoredValue([1, 2], [2, 1])).toBe(false)
  expect(sameSceneStoredValue([undefined], new Array(1))).toBe(false)
  expect(sameSceneStoredValue(undefined, null)).toBe(false)
})

test('comparison preserves aliases, full backing memory and intervals, not just visible pixels', () => {
  const shared = { value: 1 }
  const aliased = [shared, shared]
  expect(sameSceneStoredValue(aliased, structuredClone(aliased))).toBe(true)
  expect(sameSceneStoredValue(aliased, [{ value: 1 }, { value: 1 }])).toBe(false)
  expect(sameSceneStoredValue([{ value: 1 }, { value: 1 }], aliased)).toBe(false)
  const backing = new Uint8Array([9, 1, 2, 8])
  const view = backing.subarray(1, 3)
  expect(sameSceneStoredValue(view, structuredClone(view))).toBe(true)
  expect(sameSceneStoredValue(view, new Uint8Array([1, 2]))).toBe(false)
  expect(sameSceneStoredValue(view, new Uint8Array([7, 1, 2, 8]).subarray(1, 3))).toBe(false)
  expect(sameSceneStoredValue([view, backing], structuredClone([view, backing]))).toBe(true)
  expect(
    sameSceneStoredValue([view, backing], [structuredClone(view), structuredClone(backing)]),
  ).toBe(false)
  expect(
    sameSceneStoredValue(
      new Uint8Array(new SharedArrayBuffer(2)),
      new Uint8Array(new SharedArrayBuffer(2)),
    ),
  ).toBe(false)
  for (const raw of [new Map(), new Set(), new Date(), /opaque/])
    expect(sameSceneStoredValue(raw, structuredClone(raw))).toBe(false)
})
