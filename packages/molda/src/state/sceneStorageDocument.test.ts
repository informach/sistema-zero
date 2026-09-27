import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { sceneToJson } from '../scene/documentJson'
import { readSceneDocument } from '../scene/readDocument'
import { bindSceneSkin } from '../scene/skinBinding'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { scenePixelHash } from './sceneBlob'
import {
  hydrateSceneStorage,
  prepareSceneStorage,
  readSceneStorageManifest,
} from './sceneStorageDocument'

test('storage roundtrip preserves native JSON, hidden RGB, layers, flipbook, hierarchy, animation and skin', async () => {
  const painted = makeSceneGlbFixture(2, 2, 3, 4, 2)
  const image = painted.images[0]!
  image.flipbook = { frameWidth: 2, frameHeight: 2, frames: [3, 1, 1, 0], fps: 12, loop: true }
  image.layers[1]!.visible = false
  image.layers[1]!.opacity = 0.25
  image.layers[1]!.pixels.set([200, 100, 77, 0])
  const rig = makeSceneSkinFixture()
  for (const source of [
    makeSceneAtlasDocument(),
    painted,
    { ...rig.document, skins: [bindSceneSkin(rig.document, rig.input)] },
    makeSceneGlbFixture(1, 1, 2, 0),
  ]) {
    const before = structuredClone(source)
    const prepared = await prepareSceneStorage(source)
    const canonical = readSceneDocument(source)
    if (canonical.status !== 'valid') throw new Error('Invalid source fixture')
    // The native reader owns arrays separately; fixture aliases are not a persisted size discount.
    expect(prepared.logicalBytes).toBe(structuredBytes(canonical.document))
    expect(prepared.manifest.id).toBe(source.id)
    expect(prepared.manifest.storageVersion).toBe(2)
    expect(readSceneDocument(prepared.manifest).status).toBe('invalid')
    const first = await hydrateSceneStorage(prepared.manifest, prepared.blobs)
    const second = await hydrateSceneStorage(prepared.manifest, prepared.blobs)
    expect(first).toEqual(source)
    expect(sceneToJson(first)).toEqual(sceneToJson(source))
    first.nodes[0]!.name = 'Só esta leitura'
    first.images[0]?.layers[0]?.pixels.fill(19)
    expect(second).toEqual(before)
    expect(source).toEqual(before)
    expect(await hydrateSceneStorage(prepared.manifest, prepared.blobs)).toEqual(before)
  }
})

test('equal bytes deduplicate across layers/images/encoding, without sharing authorial buffers', async () => {
  const source = makeSceneAtlasDocument()
  source.images = source.images.map((image, index) => ({
    ...image,
    width: index ? 1 : 2,
    height: index ? 1 : 2,
    encoding: index ? 'rgba' : 'indexed',
    layers: [0, 1].map((layer) => ({
      id: `layer-${layer}`,
      name: `Camada ${layer}`,
      visible: layer === 0,
      opacity: layer ? 0.25 : 1,
      pixels: new Uint8Array([1, 2, 3, 0]),
    })),
  }))
  const prepared = await prepareSceneStorage(source)
  expect(prepared.blobs.size).toBe(1)
  const result = await hydrateSceneStorage(prepared.manifest, prepared.blobs)
  expect(result).toEqual(source)
  const buffers = result.images.flatMap((image) => image.layers.map((layer) => layer.pixels.buffer))
  expect(new Set(buffers).size).toBe(4)
  result.images[0]!.layers[0]!.pixels[0] = 7
  expect(result.images[0]!.layers[1]!.pixels[0]).toBe(1)
  expect(result.images[1]!.layers[0]!.pixels[0]).toBe(1)
  expect(source.images[0]!.layers[0]!.pixels[0]).toBe(1)
})

test('prepare captures every layer and field before awaiting the first hash', async () => {
  const source = makeSceneAtlasDocument()
  const before = structuredClone(source)
  const pending = prepareSceneStorage(source)
  source.name = 'Alterado após chamar'
  source.nodes[0]!.name = 'Nó alterado'
  for (const image of source.images) for (const layer of image.layers) layer.pixels.fill(1)
  const prepared = await pending
  expect(await hydrateSceneStorage(prepared.manifest, prepared.blobs)).toEqual(before)
  for (const bytes of prepared.blobs.values()) bytes.fill(0)
  expect(source.images[0]!.layers[0]!.pixels[0]).toBe(1)
})

test('hydrate captures manifesto and all resources before await; ignores unreferenced opaque values', async () => {
  const source = makeSceneAtlasDocument()
  const prepared = await prepareSceneStorage(source)
  const blobs = new Map<string, unknown>(prepared.blobs)
  blobs.set('opaque-unreferenced', new Uint8Array(new SharedArrayBuffer(4)))
  const pending = hydrateSceneStorage(prepared.manifest, blobs)
  prepared.manifest.document.name = 'Depois da chamada'
  prepared.manifest.document.nodes[0]!.name = 'Depois'
  for (const bytes of prepared.blobs.values()) bytes.fill(1)
  blobs.clear()
  expect(await pending).toEqual(source)
})

test('missing/corrupted/shared/wrong-size resources and invalid native bindings never become blank paint', async () => {
  const source = makeSceneAtlasDocument()
  const { manifest, blobs } = await prepareSceneStorage(source)
  const [hash, original] = [...blobs][0]!
  const missing = new Map(blobs)
  missing.delete(hash)
  await expect(hydrateSceneStorage(manifest, missing)).rejects.toMatchObject({ reason: 'missing' })
  for (const bytes of [
    new Uint8Array(original.length - 1),
    new Uint8Array(original.length + 1),
    new Uint8Array(original.length).fill(3),
  ]) {
    const broken = new Map(blobs).set(hash, bytes)
    await expect(hydrateSceneStorage(manifest, broken)).rejects.toMatchObject({
      reason: 'integrity',
    })
  }
  await expect(
    hydrateSceneStorage(
      manifest,
      new Map(blobs).set(hash, new Uint8Array(new SharedArrayBuffer(original.length))),
    ),
  ).rejects.toMatchObject({ reason: 'invalid' })
  const invalid = structuredClone(manifest)
  invalid.document.nodes[0]!.parentId = 'absent-node'
  // Typed metadata is not a proof that the materialized scene has valid references.
  expect(readSceneStorageManifest(invalid).document.nodes[0]!.parentId).toBe('absent-node')
  await expect(hydrateSceneStorage(invalid, blobs)).rejects.toMatchObject({ reason: 'invalid' })
  expect(await hydrateSceneStorage(manifest, blobs)).toEqual(source)
})

test('storage schema rejects future/foreign/unknown fields and cumulative layer budgets before pixel allocation', async () => {
  const source = makeSceneAtlasDocument()
  const { manifest, blobs } = await prepareSceneStorage(source)
  expect(() => readSceneStorageManifest({ formatVersion: 3 })).toThrow(
    expect.objectContaining({ reason: 'unsupported' }),
  )
  for (const extra of [{ formatVersion: 3 }, { storageVersion: 3 }, { storageVersion: 1 }])
    expect(() => readSceneStorageManifest({ ...manifest, ...extra })).toThrow(
      expect.objectContaining({ reason: 'unsupported' }),
    )
  for (const extra of [
    { extra: true },
    { id: 'different' },
    { kind: 'cloud-parts' },
    { formatVersion: NaN },
  ])
    expect(() => readSceneStorageManifest({ ...manifest, ...extra })).toThrow()
  const unknown = structuredClone(manifest)
  Object.assign(unknown.document.images[0]!.layers[0]!.pixels, { extra: 'do not drop' })
  expect(() => readSceneStorageManifest(unknown)).toThrow()
  const oversized = structuredClone(manifest)
  oversized.document.images = [0, 1].map((index) => ({
    ...manifest.document.images[0]!,
    id: `large-${index}`,
    width: 1024,
    height: 1024,
    encoding: 'rgba',
    layers: Array.from({ length: 5 }, (_, layer) => ({
      ...manifest.document.images[0]!.layers[0]!,
      id: `layer-${layer}`,
      pixels: {
        ...manifest.document.images[0]!.layers[0]!.pixels,
        byteLength: 1024 * 1024 * 4,
      },
    })),
  }))
  // No 40 MiB allocation or resource lookup is needed to reject this declaration.
  expect(() => readSceneStorageManifest(oversized)).toThrow()
  await expect(hydrateSceneStorage(oversized, new Map())).rejects.toMatchObject({
    reason: 'invalid',
  })
  expect(blobs.size).toBe(2)
})

test('partial ordinary pixel views capture only their interval; shared backing is refused', async () => {
  const source = makeSceneAtlasDocument()
  const layer = source.images[0]!.layers[0]!
  const before = structuredClone(source)
  const backing = new Uint8Array(layer.pixels.length + 20).fill(255)
  const view = backing.subarray(7, 7 + layer.pixels.length)
  view.set(layer.pixels)
  layer.pixels = view
  const prepared = await prepareSceneStorage(source)
  expect(await hydrateSceneStorage(prepared.manifest, prepared.blobs)).toEqual(before)
  const hash = await scenePixelHash(view)
  expect(prepared.blobs.get(hash)!.buffer.byteLength).toBe(layer.pixels.length)
  const fromView = new Map(prepared.blobs).set(hash, view)
  expect(await hydrateSceneStorage(prepared.manifest, fromView)).toEqual(before)
  layer.pixels = new Uint8Array(new SharedArrayBuffer(view.byteLength))
  await expect(prepareSceneStorage(source)).rejects.toMatchObject({ reason: 'invalid' })
})

test('cancellation rejects before capture and after a hash starts, without returning partial storage', async () => {
  const source = makeSceneAtlasDocument()
  const before = structuredClone(source)
  const pre = new AbortController()
  pre.abort()
  await expect(prepareSceneStorage(source, pre.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  await expect(hydrateSceneStorage(null, new Map(), pre.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  const during = new AbortController()
  const pending = prepareSceneStorage(source, during.signal)
  during.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  const prepared = await prepareSceneStorage(source)
  const reading = new AbortController()
  const read = hydrateSceneStorage(prepared.manifest, prepared.blobs, reading.signal)
  reading.abort()
  await expect(read).rejects.toMatchObject({ name: 'AbortError' })
  expect(source).toEqual(before)
})

test('the exact 32 MiB authorial ceiling roundtrips while repeated bytes are stored once', async () => {
  const source = makeSceneAtlasDocument()
  source.images = source.images.map((image) => ({
    ...image,
    width: 1024,
    height: 1024,
    encoding: 'rgba',
    layers: Array.from({ length: 4 }, (_, index) => ({
      id: `layer-${index}`,
      name: `Camada ${index}`,
      visible: index === 0,
      opacity: 0.5,
      pixels: new Uint8Array(1024 * 1024 * 4).fill(17),
    })),
  }))
  const prepared = await prepareSceneStorage(source)
  expect(prepared.blobs.size).toBe(1)
  expect([...prepared.blobs.values()][0]!.byteLength).toBe(4 * 1024 * 1024)
  const hydrated = await hydrateSceneStorage(prepared.manifest, prepared.blobs)
  expect(Bun.deepEquals(hydrated, source)).toBe(true)
  expect(
    new Set(hydrated.images.flatMap((image) => image.layers.map((layer) => layer.pixels.buffer)))
      .size,
  ).toBe(8)
  // Another layer crosses the AUTHORIAL limit even though it would use the same physical blob.
  source.images[0]!.layers.push({ ...source.images[0]!.layers[0]!, id: 'one-too-many' })
  await expect(prepareSceneStorage(source)).rejects.toMatchObject({ reason: 'invalid' })
})
