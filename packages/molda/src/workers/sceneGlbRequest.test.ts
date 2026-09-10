import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import { SCENE_LIMITS } from '../scene/limits'
import { reflectFixtureGlbV } from '../testing/glbReflectUv'
import { animatedScene, sceneRotationTrack } from '../testing/sceneAnimation'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { packSceneGlbRequest, readSceneGlbWireRequest } from './sceneGlbRequest'

test('packed GLB keys roundtrip all channels, curves, empty clips and raw Double values without aliasing', () => {
  const document = animatedScene(),
    rotation = sceneRotationTrack()
  rotation.keys[0]!.value[3] = 1.0000001
  document.animations[0]!.tracks.push(rotation, {
    nodeId: 'body',
    channel: 'scale',
    keys: [{ time: 0, value: [1, 1, 1], interpolation: 'step' }],
  })
  document.animations.push({ ...document.animations[0]!, id: 'empty', tracks: [] })
  const request = { document, documentId: document.id, revision: 3 },
    before = structuredClone(request)
  const wire = packSceneGlbRequest(request),
    read = readSceneGlbWireRequest(wire)
  expect(read).toEqual(request)
  expect(request).toEqual(before)
  expect(Object.hasOwn(wire.document, 'animations')).toBe(false)
  expect(wire.document.images).toBe(document.images)
  expect(read.document.images[0]!.layers[0]!.pixels).not.toBe(document.images[0]!.layers[0]!.pixels)
  expect(read.document.animations![0]!.tracks[0]!.keys[1]!.value[1]).toBe(Number.MIN_VALUE)
  expect(read.document.animations![0]!.tracks[1]!.keys[0]!.value[3]).toBe(1.0000001)
  expect(encodeSceneGlb(read.document, { allowLosses: true })).toEqual(
    encodeSceneGlb(document, { allowLosses: true }),
  )
  wire.animations!.values.fill(0)
  expect(read).toEqual(before)
})
test('absent animations and explicitly empty animations retain their original shape', () => {
  const document = animatedScene()
  for (const animations of [undefined, []]) {
    const { animations: _old, ...base } = document
    const source = { ...base, ...(animations === undefined ? {} : { animations }) }
    const request = { document: source, documentId: document.id, revision: 0 }
    expect(readSceneGlbWireRequest(packSceneGlbRequest(request))).toEqual(request)
  }
})
test('compact transport rejects malformed buffers, counts, unknown fields and invalid reconstructed animation data', () => {
  const document = animatedScene(),
    request = { document, documentId: document.id, revision: 0 }
  const wire = packSceneGlbRequest(request),
    packet = wire.animations!
  for (const patch of [
    { version: 2 },
    { extra: true },
    { document: { ...wire.document, animations: [] } },
    { animations: { ...packet, values: new Float32Array(packet.values) } },
    { animations: { ...packet, values: packet.values.subarray(1) } },
    { animations: { ...packet, curves: new Uint8Array(SCENE_LIMITS.animationKeys + 1) } },
    { animations: { ...packet, clips: [] } },
    { animations: { ...packet, extra: true } },
  ])
    expect(() => readSceneGlbWireRequest({ ...wire, ...patch })).toThrow()
  for (const mutate of [
    (p: typeof packet) => {
      p.curves[0] = 3
    },
    (p: typeof packet) => {
      p.values[0] = NaN
    },
    (p: typeof packet) => {
      p.values[1] = Infinity
    },
    (p: typeof packet) => {
      p.values[4] = 1
    },
    (p: typeof packet) => {
      p.values[5] = p.values[0]!
    },
    (p: typeof packet) => {
      p.clips[0]!.duration = -1
    },
    (p: typeof packet) => {
      p.clips[0]!.tracks[0]!.keyCount = 0
    },
    (p: typeof packet) => {
      p.clips[0]!.tracks[0]!.keyCount = SCENE_LIMITS.animationKeys + 1
    },
    (p: typeof packet) => {
      p.clips[0]!.tracks[0]!.nodeId = 'missing'
    },
  ]) {
    const copy = structuredClone(wire)
    mutate(copy.animations!)
    expect(() => readSceneGlbWireRequest(copy)).toThrow()
  }
})
test('packing cannot coerce or hide invalid key fields and checks aggregate budgets before buffer allocation', () => {
  const document = animatedScene(),
    request = { document, documentId: document.id, revision: 0 }
  const key = document.animations[0]!.tracks[0]!.keys[0]!
  for (const patch of [
    { extra: true },
    { time: '0' },
    { value: ['0', 0, 0] },
    { value: [0, 0, 0, 1] },
    { interpolation: 'cubic' },
  ]) {
    const copy = structuredClone(document)
    Object.assign(copy.animations[0]!.tracks[0]!.keys[0]!, patch)
    expect(() => packSceneGlbRequest({ ...request, document: copy })).toThrow()
  }
  const copy = structuredClone(document)
  copy.animations[0]!.tracks[0]!.keys = Array(SCENE_LIMITS.animationKeys + 1).fill(key)
  expect(() => packSceneGlbRequest({ ...request, document: copy })).toThrow()
})
test('all 65536 authorial keys preserve the GLB golden through transport and the legacy hash apart from V reflection', () => {
  const document = makeSceneGlbFixture(128, 1, 512, 512)
  const wire = packSceneGlbRequest({ document, documentId: document.id, revision: 1 })
  expect(wire.animations!.values.byteLength).toBe(65_536 * 5 * 8)
  const read = readSceneGlbWireRequest(wire)
  expect(read.document).toEqual(document)
  const bytes = encodeSceneGlb(read.document).bytes
  // This fixture has identical image rows. Only UV bytes may differ from the pre-L187 golden.
  expect(new Bun.CryptoHasher('sha256').update(reflectFixtureGlbV(bytes)).digest('hex')).toBe(
    'c507fed5d7b40547712d2904e1699c4a1011b9e287c212529a0395ad4465bc25',
  )
  expect(new Bun.CryptoHasher('sha256').update(bytes).digest('hex')).toBe(
    '56e87ccb2b23a8b8881581a43a5372283016074cd6f2461bc1dd1cb630fd8147',
  )
})
test('reserved transport fields cannot hide unknown source request or track fields', () => {
  const document = animatedScene(),
    request = { document, documentId: document.id, revision: 0 }
  Object.assign(document.animations[0]!.tracks[0]!, { keyCount: 3 })
  expect(() => packSceneGlbRequest(request)).toThrow()
  const clean = animatedScene()
  expect(() => packSceneGlbRequest({ ...request, document: clean, ...{ version: 0 } })).toThrow()
})
