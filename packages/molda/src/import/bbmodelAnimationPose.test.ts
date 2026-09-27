import { expect, test } from 'bun:test'
import { Object3D } from 'three'
import { affineMultiply, composeTransform } from '../scene/matrix'
import { readSceneAnimationClip } from '../scene/readAnimation'
import { readBbmodelAnimationKeyframes } from './bbmodelAnimationKeyframes'
import {
  type BbmodelAnimationPoseOptions,
  prepareBbmodelLocalAnimationValues as prepare,
  readBbmodelAnimationPoseOptions,
} from './bbmodelAnimationPose'
import { sampleBbmodelContinuousTrack } from './bbmodelAnimationSample'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { prepareBbmodelAnimationTrack } from './bbmodelAnimationTrack'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { readBbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { planBbmodelSelection } from './bbmodelSelection'
import { readBbmodelTransforms } from './bbmodelTransforms'
import type { BbmodelVec3 } from './bbmodelValues'

function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
function fixture(
  version: BbmodelVersion = '5.0',
  inner: Record<string, unknown> = {},
  outer: Record<string, unknown> = {},
) {
  const a = { uuid: 'outer', ...outer },
    b = { uuid: 'inner', ...inner },
    envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          ...(version === '5.0' ? { groups: [a, b] } : {}),
          outliner: [
            {
              ...(version === '5.0' ? { uuid: a.uuid } : a),
              children: [version === '5.0' ? { uuid: b.uuid } : b],
            },
          ],
          animations: [
            {
              uuid: 'clip',
              animators: {
                inner: {
                  keyframes: [
                    { channel: 'position', data_points: [{ x: 8, y: -4, z: 2 }] },
                    { channel: 'rotation', data_points: [{ x: 25, y: 70, z: -10 }] },
                    { channel: 'scale', data_points: [{ x: 1.5, y: 0.8, z: 2 }] },
                  ],
                },
              },
            },
          ],
        }),
      ),
    ),
    graph = readBbmodelGraph(envelope),
    selection = planBbmodelSelection(envelope, graph),
    transforms = readBbmodelTransforms(graph, selection),
    base = transforms.get(1),
    parent = transforms.get(0),
    animator = at(
      at(readBbmodelAnimationKeyframes(readBbmodelAnimationStructure(envelope)).clips).animators,
    )
  if (!base || !parent || animator.kind !== 'transform') throw new Error('Incomplete pose fixture')
  const transformAnimator = animator
  function point(channel: 'position' | 'rotation' | 'scale'): BbmodelVec3 {
    const track = prepareBbmodelAnimationTrack(transformAnimator, channel, version)
    if (track.status !== 'ready') throw new Error('Unresolved pose fixture')
    const value = sampleBbmodelContinuousTrack(track, 0, false)
    if (!value) throw new Error('Empty pose fixture')
    return value
  }
  return { base, parent, point }
}
function near(actual: readonly number[], expected: readonly number[], digits = 10) {
  expect(actual.length).toBe(expected.length)
  for (let i = 0; i < actual.length; i++) expect(at(actual, i)).toBeCloseTo(at(expected, i), digits)
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

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s absolute local channels match an independent parented Euler pose, not base × delta', (version) => {
  const source = fixture(
      version,
      { origin: [9, 8, 4], rotation: [20, 35, -15] },
      { origin: [5, 7, 2], rotation: [40, -25, 10] },
    ),
    before = structuredClone({ base: source.base, parent: source.parent }),
    convert = prepare(source.base),
    positionPoint = source.point('position'),
    rotationPoint = source.point('rotation'),
    scalePoint = source.point('scale'),
    sign = version === '5.0' ? 1 : -1
  for (const weight of [0, 0.25, 1, 1.5]) {
    const position = convert('position', positionPoint, weight, 'sample'),
      rotation = convert('rotation', rotationPoint, weight, 'sample'),
      scale = convert('scale', scalePoint, weight, 'sample')
    if (
      position.channel !== 'translation' ||
      rotation.channel !== 'rotation' ||
      scale.channel !== 'scale'
    )
      throw new Error('Wrong native channels')
    const native = {
        kind: 'trs' as const,
        translation: position.value,
        rotation: rotation.value,
        scale: scale.value,
      },
      object = new Object3D(),
      parent = new Object3D(),
      radians = Math.PI / 180
    parent.position.set(5, 7, 2)
    parent.rotation.set(40 * radians, -25 * radians, 10 * radians, 'ZYX')
    parent.add(object)
    object.position.set(4 + sign * 8 * weight, 1 - 4 * weight, 2 + 2 * weight)
    object.rotation.set(
      20 * radians + sign * 25 * radians * weight,
      35 * radians + sign * 70 * radians * weight,
      -15 * radians - 10 * radians * weight,
      'ZYX',
    )
    object.scale.set(1 + 0.5 * weight, 1 - 0.2 * weight, 1 + weight)
    parent.updateMatrixWorld(true)
    near(composeTransform(native), object.matrix.elements)
    near(affineMultiply(source.parent.world, composeTransform(native)), object.matrixWorld.elements)
    expect(Math.hypot(...rotation.value)).toBeCloseTo(1, 14)
    expect(position.underflowComponents).toEqual([])
    expect(scale.zeroScaleComponents).toEqual([])
    const clip = readSceneAnimationClip({
      id: 'converted',
      name: 'Movimento',
      duration: 1,
      fps: 30,
      loop: false,
      space: 'local',
      tracks: [position, rotation, scale].map((entry) => ({
        nodeId: 'inner',
        channel: entry.channel,
        keys: [{ time: 0, value: entry.value, interpolation: 'linear' }],
      })),
    })
    expect(clip.space).toBe('local')
  }
  const offset = prepare(fixture().base),
    p = offset('position', positionPoint, 1, 'delta'),
    r = offset('rotation', rotationPoint, 1, 'delta'),
    s = offset('scale', scalePoint, 1, 'delta')
  if (p.channel !== 'translation' || r.channel !== 'rotation' || s.channel !== 'scale')
    throw new Error('Wrong delta fixture')
  const wrong = affineMultiply(
      composeTransform(source.base.local),
      composeTransform({ kind: 'trs', translation: p.value, rotation: r.value, scale: s.value }),
    ),
    actualPosition = convert('position', positionPoint, 1, 'sample')
  expect(Math.abs(wrong[12] - actualPosition.value[0])).toBeGreaterThan(0.1)
  expect({ base: source.base, parent: source.parent }).toEqual(before)
  expect(rotationPoint).toEqual([sign * 25, sign * 70, -10])
})

test('bbmodel local mapper captures its base/options once and returns owned values and diagnostics', () => {
  const { base } = fixture('5.0', { origin: [1, 2, 3], rotation: [10, 20, 30] }),
    options: BbmodelAnimationPoseOptions = { zeroScale: 'preserve-zero' },
    convert = prepare(base, options),
    point: BbmodelVec3 = [4, 5, 6]
  const first = convert('position', point, 1, 'sample')
  expect(first.value).toEqual([5, 7, 9])
  first.value[0] = 100
  first.underflowComponents.push(1)
  base.local.translation[0] = 1000
  base.angles[0] = 1000
  options.zeroScale = 'source-minimum'
  expect(convert('position', point, 1, 'sample').value).toEqual([5, 7, 9])
  const zero = convert('scale', [0, 1, 1], 1, 'sample')
  expect(zero.value).toEqual([0, 1, 1])
  expect(zero.zeroScaleComponents).toEqual([0])
  zero.zeroScaleComponents.push(2)
  expect(convert('scale', [0, 1, 1], 1, 'sample').zeroScaleComponents).toEqual([0])
  const unchanged = prepare(fixture('5.0', { origin: [1, 2, 3], rotation: [10, 20, 30] }).base)
  expect(convert('rotation', [4, 5, 6], 1, 'sample').value).toEqual(
    unchanged('rotation', [4, 5, 6], 1, 'sample').value,
  )
  expect(point).toEqual([4, 5, 6])
})

test('bbmodel local pose options are strict and precede base reads', () => {
  expect(readBbmodelAnimationPoseOptions({})).toEqual({ zeroScale: 'reject' })
  const { base } = fixture()
  poison(base, 'order')
  for (const json of [
    'null',
    '[]',
    'false',
    '{"extra":true}',
    '{"zeroScale":"guess"}',
    '{"zeroScale":null}',
  ])
    expect(failure(() => prepare(base, JSON.parse(json))).reason).toBe('invalid')
})

test('bbmodel mapper rejects nonstandard rest poses without silently treating them as groups', () => {
  for (const kind of ['order', 'rescaled', 'scale']) {
    const { base } = fixture()
    if (kind === 'order') base.order = 'XYZ'
    if (kind === 'rescaled') base.rescaled = true
    if (kind === 'scale') base.local.scale[0] = 2
    expect(failure(() => prepare(base, {}, 'group'))).toEqual({
      reason: 'unsupported',
      path: 'group',
    })
  }
})

test('bbmodel explicit zero-scale policies cover weighted cancellation, not just literal zero', () => {
  const { base } = fixture(),
    reject = prepare(base),
    preserve = prepare(base, { zeroScale: 'preserve-zero' }),
    minimum = prepare(base, { zeroScale: 'source-minimum' }),
    point: BbmodelVec3 = [0, Number.MIN_VALUE, -1]
  expect(failure(() => reject('scale', point, 1, 'sample'))).toEqual({
    reason: 'unsupported',
    path: 'sample.scale[0]',
  })
  expect(preserve('scale', point, 1, 'sample')).toEqual({
    channel: 'scale',
    value: [0, 0, -1],
    underflowComponents: [],
    zeroScaleComponents: [0, 1],
  })
  expect(minimum('scale', point, 1, 'sample')).toEqual({
    channel: 'scale',
    value: [0.00001, 0.00001, -1],
    underflowComponents: [],
    zeroScaleComponents: [0, 1],
  })
  expect(preserve('scale', [-1, 1, 1], 0.5, 'sample').zeroScaleComponents).toEqual([0])
  expect(preserve('scale', point, 0, 'sample').value).toEqual([1, 1, 1])
  expect(point).toEqual([0, Number.MIN_VALUE, -1])
})

test('bbmodel local values retain F64 and disclose local Float32 underflow without quantizing', () => {
  const convert = prepare(fixture().base),
    position = convert('position', [1e-50, -1e-50, Number.MIN_VALUE], 1, 'sample'),
    rotation = convert('rotation', [1e-50, 0, 0], 1, 'sample')
  expect(position.value).toEqual([1e-50, -1e-50, Number.MIN_VALUE])
  expect(position.underflowComponents).toEqual([0, 1, 2])
  expect(rotation.underflowComponents).toEqual([0])
  expect(rotation.value[0]).not.toBe(0)
})

test('bbmodel weights precede periodic quaternion representation and preserve authored turns', () => {
  const point: BbmodelVec3 = [720, -360, 1080],
    before: BbmodelVec3 = [...point],
    convert = prepare(fixture().base),
    object = new Object3D()
  for (const weight of [0.25, 0.5, 1.5]) {
    object.rotation.set(
      ((720 * Math.PI) / 180) * weight,
      ((-360 * Math.PI) / 180) * weight,
      ((1080 * Math.PI) / 180) * weight,
      'ZYX',
    )
    near(convert('rotation', point, weight, 'sample').value, object.quaternion.toArray(), 13)
  }
  expect(point).toEqual(before)
})

test('bbmodel weights and channels are checked before points, and weight zero is not a default of one', () => {
  const convert = prepare(fixture().base),
    point: BbmodelVec3 = [1, 2, 3]
  poison(point, '0')
  for (const weight of [-1, NaN, Infinity])
    expect(failure(() => convert('position', point, weight, 'sample'))).toEqual({
      reason: 'invalid',
      path: 'sample.weight',
    })
  expect(failure(() => convert(JSON.parse('"custom"'), point, 1, 'sample'))).toEqual({
    reason: 'invalid',
    path: 'sample.channel',
  })
  expect(convert('position', [Number.MAX_VALUE, 0, 0], 0, 'sample').value).toEqual([0, 0, 0])
  expect(convert('rotation', [720, -360, 1080], 0, 'sample').value).toEqual([0, 0, 0, 1])
})

test('bbmodel rejects overflow before a native value can be returned and does not read world/geometry state', () => {
  const { base } = fixture()
  poison(base, 'world')
  poison(base, 'origin')
  poison(base.local, 'rotation')
  const convert = prepare(base)
  expect(convert('position', [1, 2, 3], 1, 'sample').value).toEqual([1, 2, 3])
  expect(failure(() => convert('position', [Number.MAX_VALUE, 0, 0], 1, 'sample'))).toEqual({
    reason: 'unsupported',
    path: 'sample.value[0]',
  })
  expect(failure(() => convert('position', [Number.MAX_VALUE, 0, 0], 2, 'sample'))).toEqual({
    reason: 'unsupported',
    path: 'sample.value[0]',
  })
  expect(
    failure(() => convert('rotation', [Number.MAX_VALUE, 0, 0], Number.MAX_VALUE, 'sample')),
  ).toEqual({ reason: 'unsupported', path: 'sample.rotation[0]' })
  expect(failure(() => convert('scale', [Number.MAX_VALUE, 1, 1], 2, 'sample'))).toEqual({
    reason: 'unsupported',
    path: 'sample.value[0]',
  })
})
