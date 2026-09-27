import { expect, test } from 'bun:test'
import type { SceneAnimationClip } from '../scene/animation'
import { readSceneAnimations } from '../scene/readAnimation'
import { sampleSceneAnimationTrack } from '../scene/sampleAnimation'
import { bindBbmodelAnimations } from './bbmodelAnimationBindings'
import { readBbmodelAnimationKeyframes } from './bbmodelAnimationKeyframes'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { prepareBbmodelAnimationTrack } from './bbmodelAnimationTrack'
import type {
  BbmodelAnimationInterpolation,
  BbmodelNumericAnimationTrack,
} from './bbmodelAnimationTrackTypes'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import {
  convertBbmodelPreparedClips as convert,
  readBbmodelNativeClipOptions,
} from './bbmodelNativeClips'
import type { BbmodelNativeClipDraft, BbmodelNativeClipOptions } from './bbmodelNativeClipTypes'
import { readBbmodelNodeMetadata } from './bbmodelNodeMetadata'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelTransforms } from './bbmodelTransforms'
import type { BbmodelVec3 } from './bbmodelValues'

const approved = { adaptation: 'continuous-sampled' } as const
function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
function firstValue(clip: SceneAnimationClip, track = 0) {
  const key = at(clip.tracks, track).keys[0]
  if (!key) throw new Error('Expected a native fixture key')
  return key.value
}
function failure(fn: () => unknown) {
  try {
    fn()
  } catch (error) {
    if (!(error instanceof BbmodelInputError)) throw error
    return { reason: error.reason, path: error.path }
  }
  throw new Error('Expected a diagnostic')
}
function poison(target: object, field: string) {
  Object.defineProperty(target, field, {
    get() {
      throw new Error(`Unexpected read: ${field}`)
    },
  })
}
function fixture(version: BbmodelVersion = '5.0') {
  const uuid = '00000001-0000-0000-0000-000000000000',
    group = { uuid, name: 'Braço', origin: [4, 2, 3] },
    envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          ...(version === '5.0'
            ? { groups: [group], outliner: [{ uuid }] }
            : { outliner: [group] }),
          animations: [
            {
              uuid: 'clip',
              name: 'Acenar',
              length: 99,
              snapping: 200,
              animators: {
                [uuid]: {
                  type: 'bone',
                  keyframes: [
                    { channel: 'position', time: 1, data_points: [{ x: 8, y: 6, z: 2 }] },
                    { channel: 'position', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
                    { channel: 'rotation', time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
                    { channel: 'rotation', time: 1, data_points: [{ x: 0, y: 0, z: 360 }] },
                    { channel: 'scale', time: 0, data_points: [{ x: 1, y: 1, z: 1 }] },
                    { channel: 'scale', time: 1, data_points: [{ x: 3, y: 2, z: 1 }] },
                  ],
                },
              },
            },
          ],
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    metadata = readBbmodelNodeMetadata(envelope, graph),
    selection = planBbmodelSelection(envelope, graph),
    structure = readBbmodelAnimationStructure(envelope),
    keys = readBbmodelAnimationKeyframes(structure),
    bindings = bindBbmodelAnimations({ graph, metadata, selection, keys }),
    transforms = readBbmodelTransforms(graph, selection),
    animator = at(at(keys.clips).animators),
    binding = at(at(bindings.clips).animators),
    source = at(structure.clips)
  if (
    animator.kind !== 'transform' ||
    animator.sourceType !== 'bone' ||
    animator.rotationGlobal ||
    animator.quaternionInterpolation ||
    binding.kind !== 'bound' ||
    !binding.selected
  )
    throw new Error('Fixture must have an approved local Euler group binding')
  const base = transforms.get(binding.node)
  if (!base) throw new Error('Missing fixture rest pose')
  const draft: BbmodelNativeClipDraft = {
    clip: source.index,
    path: source.path,
    name: source.name,
    duration: 1,
    fps: 8,
    loop: false,
    weight: 0.5,
    catmullLoopNeighbours: false,
    tracks: (['position', 'rotation', 'scale'] as const).map((channel) => {
      const track = prepareBbmodelAnimationTrack(animator, channel, version)
      if (track.status !== 'ready') throw new Error('Unresolved fixture track')
      return {
        nodeId: `bbmodel_node_${binding.node}`,
        path: `${animator.declaration.path}.${channel}`,
        base,
        track,
      }
    }),
  }
  return { draft, envelope, structure }
}
function numeric(
  times: number[],
  channel: BbmodelNumericAnimationTrack['channel'] = 'position',
  method: BbmodelAnimationInterpolation = 'linear',
): BbmodelNumericAnimationTrack {
  return {
    channel,
    reordered: false,
    migration: { pointAxes: 0, bezierValueAxes: 0 },
    keys: times.map((time, index) => ({
      index,
      path: `keys[${index}]`,
      time,
      interpolation: method,
      points: [[time, time * 2, 0]],
      bezier: null,
    })),
  }
}
function custom(
  track: BbmodelNumericAnimationTrack,
  changes: Partial<BbmodelNativeClipDraft> = {},
) {
  const { draft } = fixture(),
    entry = at(draft.tracks)
  return { ...draft, weight: 1, tracks: [{ ...entry, path: 'track', track }], ...changes }
}

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s real source stages produce independent native clips and playable local channels', (version) => {
  const { draft, envelope, structure } = fixture(version),
    before = structuredClone({ draft, envelope, structure }),
    result = convert([draft], approved),
    clip = at(result.animations),
    sign = version === '5.0' ? 1 : -1
  expect(readSceneAnimations(result.animations)).toEqual(result.animations)
  expect(clip).toMatchObject({
    id: 'bbmodel_clip_0',
    name: 'Acenar',
    duration: 1,
    fps: 8,
    loop: false,
    space: 'local',
  })
  expect(result.counts).toEqual({ clips: 1, tracks: 3, keys: 13 })
  expect(at(result.reports).tracks.map((info) => info.sampling)).toEqual([
    'authored',
    'grid',
    'authored',
  ])
  for (const time of [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1]) {
    expect(sampleSceneAnimationTrack(at(clip.tracks), time)).toEqual([
      4 + sign * 4 * time,
      2 + 3 * time,
      3 + time,
    ])
    expect(sampleSceneAnimationTrack(at(clip.tracks, 2), time)).toEqual([1 + time, 1 + time / 2, 1])
    const rotation = sampleSceneAnimationTrack(at(clip.tracks, 1), time)
    expect(rotation[0]).toBe(0)
    expect(rotation[1]).toBe(0)
    expect(rotation[2]).toBeCloseTo(Math.sin((Math.PI * time) / 2), 14)
    expect(rotation[3]).toBeCloseTo(Math.cos((Math.PI * time) / 2), 14)
  }
  expect(at(at(result.reports).tracks).reordered).toBe(true)
  expect(at(at(result.reports).tracks).migration.pointAxes).toBe(version === '5.0' ? 0 : 1)
  expect({ draft, envelope, structure }).toEqual(before)
  firstValue(clip)[0] = 77
  at(at(result.reports).tracks).migration.pointAxes = 99
  expect({ draft, envelope, structure }).toEqual(before)
})

test('native clip choices are strict and adaptation must be explicit before draft reads', () => {
  expect(readBbmodelNativeClipOptions({})).toEqual({
    adaptation: 'reject',
    discontinuities: 'reject',
    zeroScale: 'reject',
  })
  const options: BbmodelNativeClipOptions = {}
  Object.defineProperty(options, 'discard', { value: true, enumerable: true })
  const { draft } = fixture()
  poison(draft, 'tracks')
  expect(failure(() => convert([draft], options))).toEqual({
    reason: 'invalid',
    path: 'options.discard',
  })
  expect(failure(() => convert([draft]))).toEqual({
    reason: 'unsupported',
    path: 'options.adaptation',
  })
  expect(convert([]).animations).toEqual([])
  for (const field of ['adaptation', 'discontinuities', 'zeroScale']) {
    const invalid: BbmodelNativeClipOptions = {}
    Object.defineProperty(invalid, field, { value: null, enumerable: true })
    expect(failure(() => convert([draft], invalid)).path).toBe(`options.${field}`)
  }
})

test('authored simple channels retain exact times, mixed outgoing steps and outside neighbours', () => {
  const track = numeric([-1, 0.3, 0.7, 2])
  at(track.keys, 1).interpolation = 'step'
  const draft = custom(track, { fps: 120 }),
    before = structuredClone(draft),
    result = convert([draft], approved),
    native = at(at(result.animations).tracks)
  expect(native.keys.map((key) => key.time)).toEqual([0, 0.3, 0.7, 1])
  expect(native.keys.map((key) => key.interpolation)).toEqual([
    'linear',
    'step',
    'linear',
    'linear',
  ])
  for (const time of [0, 0.2, 0.3, 0.5, 0.7, 0.8, 1]) {
    const value = sampleSceneAnimationTrack(native, time),
      expected = time >= 0.3 && time < 0.7 ? 0.3 : time
    expect(value[0]).toBeCloseTo(4 + expected, 14)
    expect(value[1]).toBeCloseTo(2 + 2 * expected, 14)
  }
  expect(draft).toEqual(before)
  const tiny = custom(numeric([0, Number.MIN_VALUE, 1]))
  expect(at(at(convert([tiny], approved).animations).tracks).keys.map((key) => key.time)).toEqual([
    0,
    Number.MIN_VALUE,
    1,
  ])
})

test('rotation uses grid and native shortest arcs: report never promises lossless Euler reconstruction', () => {
  const track = numeric([0, 1], 'rotation')
  at(track.keys).points = [[0, 0, 0]]
  at(track.keys, 1).points = [[0, 0, 720]]
  const high = convert([custom(track, { fps: 16 })], approved),
    low = convert([custom(track, { fps: 1 })], approved),
    highValue = sampleSceneAnimationTrack(at(at(high.animations).tracks), 0.125),
    lowValue = sampleSceneAnimationTrack(at(at(low.animations).tracks), 0.125)
  expect(Math.abs(highValue[2] ?? 0)).toBeCloseTo(Math.SQRT1_2, 14)
  expect(Math.abs(lowValue[2] ?? 0)).toBeLessThan(1e-14)
  expect(at(at(low.reports).tracks).sampling).toBe('grid')
  expect(low.policy.adaptation).toBe('continuous-sampled')
  for (const key of track.keys) key.interpolation = 'step'
  expect(at(at(convert([custom(track)], approved).reports).tracks).sampling).toBe('authored')
})

test('pre/post needs its own choice and has no silent double key or claim of an exact jump', () => {
  const track = numeric([0, 0.5, 1]),
    pre: BbmodelVec3 = [2, 0, 0],
    post: BbmodelVec3 = [8, 0, 0]
  at(track.keys, 1).points = [pre, post]
  const draft = custom(track, { fps: 4 })
  expect(failure(() => convert([draft], approved))).toEqual({
    reason: 'unsupported',
    path: 'track',
  })
  const result = convert([draft], { ...approved, discontinuities: 'sample-pre' }),
    native = at(at(result.animations).tracks)
  expect(at(at(result.reports).tracks)).toMatchObject({ sampling: 'grid', prePostKeys: 1, keys: 5 })
  expect(sampleSceneAnimationTrack(native, 0.5)[0]).toBe(6)
  expect(sampleSceneAnimationTrack(native, 0.75)[0]).toBe(8.5)
  expect(readSceneAnimations(result.animations)).toEqual(result.animations)
})

test('Bezier and Catmull curves are sampled; reports and values are independently owned', () => {
  for (const method of ['bezier', 'catmullrom'] as const) {
    const draft = custom(numeric([0, 0.4, 1], 'position', method), { fps: 4 }),
      before = structuredClone(draft),
      result = convert([draft, { ...draft, clip: 7, name: null, path: 'animations[7]' }], approved)
    expect(at(at(result.animations).tracks).keys.map((key) => key.time)).toEqual([
      0, 0.25, 0.4, 0.5, 0.75, 1,
    ])
    expect(at(result.animations, 1)).toMatchObject({ id: 'bbmodel_clip_7', name: 'Movimento 8' })
    expect(at(result.reports, 1).nameChange).toBe('name-generated')
    expect(result.counts).toEqual({ clips: 2, tracks: 2, keys: 12 })
    expect(readSceneAnimations(result.animations)).toEqual(result.animations)
    firstValue(at(result.animations))[0] = 999
    expect(firstValue(at(result.animations, 1))[0]).toBe(4)
    expect(draft).toEqual(before)
  }
  const named = custom(numeric([0]), { name: `${'a'.repeat(127)}😀z` })
  expect(at(convert([named], approved).animations).name).toBe('a'.repeat(127))
})

test('all sample costs are checked before any XYZ, handles or base values are read', () => {
  const entry = at(custom(numeric([0, 511], 'rotation')).tracks),
    entries = Array.from({ length: 128 }, (_, index) => ({
      ...entry,
      nodeId: `node_${index}`,
      path: `tracks[${index}]`,
    })),
    draft = custom(entry.track, { duration: 511, fps: 1, tracks: entries })
  at(entry.track.keys).points = [[0, 0, 0]]
  at(entry.track.keys, 1).points = [[0, 0, 360]]
  expect(convert([draft], approved).counts).toEqual({ clips: 1, tracks: 128, keys: 65536 })
  const extra = numeric([0, 0.5, 511], 'rotation')
  entries[127] = { ...entry, nodeId: 'node_127', path: 'extra', track: extra }
  poison(entry.base, 'local')
  for (const key of entry.track.keys) {
    poison(at(key.points), '0')
    poison(key, 'bezier')
  }
  expect(failure(() => convert([draft], approved))).toEqual({ reason: 'budget', path: 'extra' })
})

test('Bezier samples match an independent polynomial while a long linear track needs no FPS grid', () => {
  const track = numeric([0, 1], 'position', 'bezier')
  for (const key of track.keys)
    key.bezier = {
      linked: true,
      leftTime: [-1 / 3, -1 / 3, -1 / 3],
      leftValue: [0, 0, 0],
      rightTime: [1 / 3, 1 / 3, 1 / 3],
      rightValue: [0, 0, 0],
    }
  const result = convert([custom(track, { fps: 4 })], approved),
    native = at(at(result.animations).tracks)
  for (const time of [0, 0.25, 0.5, 0.75, 1]) {
    const value = sampleSceneAnimationTrack(native, time),
      polynomial = 3 * time * time - 2 * time ** 3
    expect(value[0]).toBeCloseTo(4 + polynomial, 14)
    expect(value[1]).toBeCloseTo(2 + 2 * polynomial, 14)
  }
  const long = convert([custom(numeric([0, 0.125, 600]), { duration: 600, fps: 120 })], approved)
  expect(long.counts.keys).toBe(3)
  expect(at(at(long.animations).tracks).keys.map((key) => key.time)).toEqual([0, 0.125, 600])
})

test('empty clips stay explicit, empty tracks and malformed native target identities are rejected', () => {
  const { draft } = fixture()
  expect(convert([{ ...draft, tracks: [] }], approved).counts).toEqual({
    clips: 1,
    tracks: 0,
    keys: 0,
  })
  expect(failure(() => convert([custom(numeric([]))], approved))).toEqual({
    reason: 'invalid',
    path: 'track',
  })
  const entry = at(draft.tracks)
  expect(
    failure(() =>
      convert([{ ...draft, tracks: [{ ...entry, nodeId: 'not a native id' }] }], approved),
    ),
  ).toEqual({ reason: 'invalid', path: `${entry.path}.nodeId` })
  const zero = convert([{ ...draft, weight: 0 }], approved)
  expect(firstValue(at(zero.animations))).toEqual([4, 2, 3])
  expect(firstValue(at(zero.animations), 2)).toEqual([1, 1, 1])
})

test('clip/track budgets and header conflicts fail without generating a prefix', () => {
  const { draft } = fixture(),
    entry = at(draft.tracks)
  expect(
    failure(() =>
      convert(
        Array.from({ length: 65 }, () => draft),
        approved,
      ),
    ),
  ).toEqual({ reason: 'budget', path: 'animations' })
  expect(failure(() => convert([draft, draft], approved))).toEqual({
    reason: 'invalid',
    path: draft.path,
  })
  expect(failure(() => convert([{ ...draft, tracks: [entry, entry] }], approved))).toEqual({
    reason: 'invalid',
    path: entry.path,
  })
  poison(entry, 'track')
  expect(
    failure(() =>
      convert([{ ...draft, tracks: Array.from({ length: 4097 }, () => entry) }], approved),
    ),
  ).toEqual({ reason: 'budget', path: `${draft.path}.tracks` })
  expect(
    failure(() => convert([draft, { ...draft, clip: 1, path: 'second', weight: -1 }], approved)),
  ).toEqual({ reason: 'invalid', path: 'second.weight' })
})

test('local range, scale-zero and native zero canonicalization are explicit and aggregated', () => {
  const scale = numeric([0], 'scale')
  at(scale.keys).points = [[0, -1, 1]]
  const draft = custom(scale),
    options: BbmodelNativeClipOptions = { ...approved, zeroScale: 'preserve-zero' }
  expect(failure(() => convert([draft], approved))).toEqual({
    reason: 'unsupported',
    path: 'track.scale[0]',
  })
  const result = convert([draft], options),
    report = at(at(result.reports).tracks)
  expect(report.zeroScaleComponents).toBe(2)
  expect(firstValue(at(result.animations))).toEqual([0, -1, 1])
  options.zeroScale = 'source-minimum'
  expect(result.policy.zeroScale).toBe('preserve-zero')
  expect(firstValue(at(convert([draft], options).animations))).toEqual([0.00001, -1, 1])
  const translation = numeric([0]),
    tiny = custom(translation)
  at(tiny.tracks).base.local.translation = [0, 0, 0]
  at(translation.keys).points = [[Number.MIN_VALUE, -0, 0]]
  const small = convert([tiny], approved),
    value = firstValue(at(small.animations))
  expect(value[0]).toBe(Number.MIN_VALUE)
  expect(Object.is(value[1], -0)).toBe(false)
  expect(at(at(small.reports).tracks).underflowComponents).toBe(2)
  at(translation.keys).points = [[1e39, 0, 0]]
  expect(failure(() => convert([tiny], approved))).toEqual({
    reason: 'unsupported',
    path: 'track.value[0]',
  })
})
