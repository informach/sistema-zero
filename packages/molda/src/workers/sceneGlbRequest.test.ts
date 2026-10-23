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
  const request = { document, documentId: document.id, revision: 3, animatedPaint: false },
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
    const request = { document: source, documentId: document.id, revision: 0, animatedPaint: false }
    expect(readSceneGlbWireRequest(packSceneGlbRequest(request))).toEqual(request)
  }
})

test.each([
  undefined,
  'step',
  'linear',
  'smooth',
] as const)('packed rotation keys preserve pivot compensation with curve %s without aliasing', (curve) => {
  const document = animatedScene(),
    rotation = sceneRotationTrack()
  rotation.keys[1]!.incomingPivot = [1.123456789123, Number.MIN_VALUE, -3.5]
  if (curve !== undefined) rotation.keys[1]!.incomingPivotInterpolation = curve
  document.animations[0]!.tracks.push(rotation)
  const request = { document, documentId: document.id, revision: 1, animatedPaint: true },
    before = structuredClone(request),
    wire = packSceneGlbRequest(request),
    read = readSceneGlbWireRequest(wire)
  expect(read).toEqual(before)
  expect(read.document.animations![0]!.tracks[1]!.keys[1]!.incomingPivot).not.toBe(
    rotation.keys[1]!.incomingPivot,
  )
  expect(encodeSceneGlb(read.document, { allowLosses: true, animatedPaint: true })).toEqual(
    encodeSceneGlb(document, { allowLosses: true, animatedPaint: true }),
  )
  expect(request).toEqual(before)
})

test('pivot transport rejects unknown fields, invalid centers, curves, channels and key indices', () => {
  const document = animatedScene(),
    rotation = sceneRotationTrack()
  rotation.keys[1]!.incomingPivot = [0, 0, 0]
  document.animations[0]!.tracks.push(rotation)
  const request = { document, documentId: document.id, revision: 0, animatedPaint: false },
    wire = packSceneGlbRequest(request),
    packet = wire.animations!,
    clip = packet.clips[0]!,
    track = clip.tracks[1]!,
    pivot = track.pivots![0]!
  for (const pivots of [
    null,
    [{ ...pivot, extra: true }],
    [{ ...pivot, keyIndex: -1 }],
    [{ ...pivot, keyIndex: 0.5 }],
    [{ ...pivot, keyIndex: 2 }],
    [pivot, pivot],
    [pivot, { ...pivot, keyIndex: 0 }],
    [{ keyIndex: 1, incomingPivotInterpolation: 'linear' }],
    [{ ...pivot, incomingPivot: [0, NaN, 0] }],
    [{ ...pivot, incomingPivot: [0, 0] }],
    [{ ...pivot, incomingPivotInterpolation: 'cubic' }],
  ]) {
    expect(() =>
      readSceneGlbWireRequest({
        ...wire,
        animations: {
          ...packet,
          clips: [{ ...clip, tracks: [clip.tracks[0], { ...track, pivots }] }],
        },
      }),
    ).toThrow()
  }
  for (const patch of [
    { incomingPivot: [0, Infinity, 0] },
    { incomingPivot: [0, 0] },
    { incomingPivotInterpolation: 'cubic' },
    { incomingPivot: undefined, incomingPivotInterpolation: 'linear' },
  ]) {
    const copy = structuredClone(document)
    Object.assign(copy.animations[0]!.tracks[1]!.keys[1]!, patch)
    expect(() => packSceneGlbRequest({ ...request, document: copy })).toThrow()
  }
  const copy = structuredClone(document)
  copy.animations[0]!.tracks[0]!.keys[0]!.incomingPivot = [0, 0, 0]
  expect(() => packSceneGlbRequest({ ...request, document: copy })).toThrow('rotação')
  expect(() =>
    readSceneGlbWireRequest({
      ...wire,
      animations: {
        ...packet,
        clips: [{ ...clip, tracks: [{ ...clip.tracks[0], pivots: [pivot] }, track] }],
      },
    }),
  ).toThrow('rotação')
})
test('compact transport rejects malformed buffers, counts, unknown fields and invalid reconstructed animation data', () => {
  const document = animatedScene(),
    request = { document, documentId: document.id, revision: 0, animatedPaint: false }
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
    request = { document, documentId: document.id, revision: 0, animatedPaint: false }
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
  const wire = packSceneGlbRequest({
    document,
    documentId: document.id,
    revision: 1,
    animatedPaint: true,
  })
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
    request = { document, documentId: document.id, revision: 0, animatedPaint: false }
  Object.assign(document.animations[0]!.tracks[0]!, { keyCount: 3 })
  expect(() => packSceneGlbRequest(request)).toThrow()
  const clean = animatedScene()
  expect(() => packSceneGlbRequest({ ...request, document: clean, ...{ version: 0 } })).toThrow()
})
