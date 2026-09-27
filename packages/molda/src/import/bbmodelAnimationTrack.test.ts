import { expect, test } from 'bun:test'
import { readBbmodelAnimationKeyframes } from './bbmodelAnimationKeyframes'
import type { BbmodelAnimationKey, BbmodelKeyAnimator } from './bbmodelAnimationKeyTypes'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { prepareBbmodelAnimationTrack as prepare } from './bbmodelAnimationTrack'
import type { BbmodelAnimationTrackResult } from './bbmodelAnimationTrackTypes'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'

function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
function fixture(keys: Record<string, unknown>[], version: BbmodelVersion = '5.0', type = 'bone') {
  const envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          animations: [{ uuid: 'clip', animators: { group: { type, keyframes: keys } } }],
        }),
      ),
    ),
    structure = readBbmodelAnimationStructure(envelope),
    descriptors = readBbmodelAnimationKeyframes(structure),
    animator = at(at(descriptors.clips).animators)
  if (animator.kind !== 'transform') throw new Error('Expected a transform fixture')
  return animator
}
function ready(result: BbmodelAnimationTrackResult) {
  expect(result.status).toBe('ready')
  if (result.status !== 'ready') throw new Error(`Unresolved fixture: ${result.issue.code}`)
  return result
}
function unresolved(result: BbmodelAnimationTrackResult) {
  expect(result.status).toBe('unresolved')
  expect(Object.hasOwn(result, 'keys')).toBe(false)
  if (result.status !== 'unresolved') throw new Error('Expected an unresolved fixture')
  return result.issue
}
function transformKey(animator: Extract<BbmodelKeyAnimator, { kind: 'transform' }>, index = 0) {
  const key = at(animator.keys, index)
  if (key.kind !== 'transform') throw new Error('Expected transform key')
  return key
}
function key(channel: string, time = 0, overrides: Record<string, unknown> = {}) {
  return { channel, time, data_points: [{ x: 2, y: -3, z: 4 }], ...overrides }
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
] as const)('bbmodel %s prepares independent numeric channels without losing source indices or turns', (version) => {
  const animator = fixture(
      [
        key('rotation', 2, { data_points: [{ x: '360', y: '-720', z: '0.5f' }] }),
        key('position', 2),
        key('rotation', -1),
        key('scale', 2),
        { channel: 'opaque', time: 'not-read', data_points: [{ arbitrary: true }] },
      ],
      version,
    ),
    before = structuredClone(animator),
    rotation = ready(prepare(animator, 'rotation', version)),
    position = ready(prepare(animator, 'position', version)),
    scale = ready(prepare(animator, 'scale', version)),
    sign = version === '5.0' ? 1 : -1
  expect(rotation.keys.map((entry) => [entry.index, entry.time])).toEqual([
    [2, -1],
    [0, 2],
  ])
  expect(rotation.reordered).toBe(true)
  expect(at(rotation.keys).path).toBe(transformKey(animator, 2).path)
  expect(at(rotation.keys, 1).points).toEqual([[sign * 360, sign * -720, 0.5]])
  expect(rotation.migration).toEqual({ pointAxes: version === '5.0' ? 0 : 4, bezierValueAxes: 0 })
  expect(at(position.keys).points).toEqual([[sign * 2, -3, 4]])
  expect(position.reordered).toBe(false)
  expect(at(scale.keys).points).toEqual([[2, -3, 4]])
  expect(scale.migration).toEqual({ pointAxes: 0, bezierValueAxes: 0 })
  expect(animator).toEqual(before)
  at(rotation.keys).points[0][0] = 999
  expect(animator).toEqual(before)
})

test('bbmodel tracks retain negative, extremely close and extreme times without epsilon or subtraction overflow', () => {
  const times = [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, 0, 1e-15],
    animator = fixture(times.map((time) => key('position', time))),
    result = ready(prepare(animator, 'position', '5.0'))
  expect(result.keys.map((entry) => entry.time)).toEqual([
    -Number.MAX_VALUE,
    0,
    Number.MIN_VALUE,
    1e-15,
    Number.MAX_VALUE,
  ])
  expect(animator.keys.map((entry) => (entry.kind === 'transform' ? entry.time : null))).toEqual(
    times,
  )
})

test.each([
  0, 1, -5,
])('bbmodel duplicate time %s rejects the whole channel before any values', (time) => {
  const clean = fixture([key('rotation', 2), key('rotation', time), key('rotation', time)])
  if (time === 0) transformKey(clean, 2).time = -0
  for (const entry of clean.keys)
    if (entry.kind === 'transform') for (const point of entry.points) poison(point, 'values')
  expect(unresolved(prepare(clean, 'rotation', '5.0'))).toEqual({
    code: 'duplicate-time',
    key: 2,
    otherKey: 1,
    time: time === 0 ? -0 : time,
    path: transformKey(clean, 2).path,
  })
})

test('bbmodel track shape preflight precedes constants and never truncates points or repairs curves', () => {
  const crowded = fixture([key('position', 0), key('position', 1, { data_points: [{}, {}, {}] })])
  poison(at(transformKey(crowded).points), 'values')
  expect(unresolved(prepare(crowded, 'position', '5.0'))).toEqual({
    code: 'point-count',
    key: 1,
    path: transformKey(crowded, 1).path,
    count: 3,
  })
  const curve = fixture([key('position', 0), key('position', 1, { interpolation: 'smooth' })])
  poison(at(transformKey(curve).points), 'values')
  expect(unresolved(prepare(curve, 'position', '5.0'))).toEqual({
    code: 'interpolation',
    key: 1,
    path: transformKey(curve, 1).path,
    interpolation: 'smooth',
  })
})

test('bbmodel one unresolved key returns bounded axis diagnostics and no numeric prefix', () => {
  const animator = fixture([
      key('position'),
      key('position', 1, {
        data_points: [
          { x: 99, values: { x: 'query.anim_time', y: '9'.repeat(400) } },
          { z: `0.${'0'.repeat(400)}1` },
        ],
      }),
    ]),
    issue = unresolved(prepare(animator, 'position', '5.0')),
    path = transformKey(animator, 1).path
  expect(issue).toEqual({
    code: 'constant',
    key: 1,
    path,
    issues: [
      { code: 'expression', path: `${path}.data_points[0].values.x`, point: 0, axis: 'x' },
      { code: 'literal-overflow', path: `${path}.data_points[0].values.y`, point: 0, axis: 'y' },
      { code: 'literal-underflow', path: `${path}.data_points[1].z`, point: 1, axis: 'z' },
    ],
  })
})

test.each([
  '4.9',
  '4.10',
] as const)('bbmodel %s distinguishes missing data_points from an empty list before the direct fallback', (version) => {
  for (const channel of ['rotation', 'position', 'scale'] as const) {
    const missing = fixture([{ channel, x: 10 }], version),
      direct = fixture([{ channel, data_points: [], x: 10, y: 20, z: 30 }], version)
    expect(unresolved(prepare(missing, channel, version))).toEqual({
      code: 'legacy-data-points',
      key: 0,
      path: `${transformKey(missing).path}.data_points`,
    })
    expect(at(ready(prepare(direct, channel, version)).keys).points).toEqual([[10, 20, 30]])
  }
  expect(
    at(ready(prepare(fixture([{ channel: 'rotation', x: 10 }]), 'rotation', '5.0')).keys).points,
  ).toEqual([[10, 0, 0]])
})

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s preserves point overlays, pre/post values, defaults and signed zero', (version) => {
  const animator = fixture(
      [
        key('rotation', 0, {
          data_points: [
            { x: 100, y: 2, values: { x: 3 } },
            { y: '-0', z: -4 },
          ],
        }),
      ],
      version,
    ),
    before = structuredClone(animator),
    result = ready(prepare(animator, 'rotation', version)),
    points = at(result.keys).points
  expect(points).toEqual([
    [3, version === '5.0' ? 2 : -2, 0],
    [0, -0, -4],
  ])
  expect(Object.is(at(points, 1)[1], -0)).toBe(true)
  expect(result.migration.pointAxes).toBe(version === '5.0' ? 0 : 1)
  expect(animator).toEqual(before)
})

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s migrates only active, declared Bezier value pairs and owns every handle', (version) => {
  const handles = {
      bezier_left_time: [-0.2, -0.3, -0.4],
      bezier_right_time: [0.2, 0.3, 0.4],
      bezier_left_value: [1, 2, 3],
      bezier_right_value: [4, 5, 6],
      bezier_linked: false,
    },
    animator = fixture(
      [
        key('rotation', 0, { interpolation: 'bezier', ...handles }),
        key('rotation', 1, { interpolation: 'linear', ...handles }),
        key('rotation', 2, { interpolation: 'bezier', bezier_right_value: [7, 8, 9] }),
        key('rotation', 3, { interpolation: 'bezier' }),
        key('scale', 0, { interpolation: 'bezier', ...handles }),
        key('position', 0, { interpolation: 'bezier', ...handles }),
      ],
      version,
    ),
    before = structuredClone(animator),
    result = ready(prepare(animator, 'rotation', version)),
    sign = version === '5.0' ? 1 : -1,
    active = at(result.keys).bezier
  expect(active).toEqual({
    linked: false,
    leftTime: [-0.2, -0.3, -0.4],
    rightTime: [0.2, 0.3, 0.4],
    leftValue: [sign, sign * 2, 3],
    rightValue: [sign * 4, sign * 5, 6],
  })
  expect(at(result.keys, 1).bezier?.leftValue).toEqual([1, 2, 3])
  expect(at(result.keys, 2).bezier?.rightValue).toEqual([7, 8, 9])
  expect(at(result.keys, 3).bezier?.leftValue).toEqual([0, 0, 0])
  expect(result.migration.bezierValueAxes).toBe(version === '5.0' ? 0 : 4)
  expect(at(ready(prepare(animator, 'scale', version)).keys).bezier?.leftValue).toEqual([1, 2, 3])
  expect(at(ready(prepare(animator, 'position', version)).keys).bezier?.rightValue).toEqual([
    sign * 4,
    5,
    6,
  ])
  if (!active) throw new Error('Expected active handles')
  active.leftTime[0] = -50
  active.rightTime[0] = 50
  active.leftValue[0] = 100
  active.rightValue[0] = 200
  expect(animator).toEqual(before)
})

test('bbmodel legacy Bezier left-only values remain unresolved instead of inventing the missing pair', () => {
  for (const version of ['4.9', '4.10'] as const) {
    const animator = fixture(
      [
        key('rotation', 0, {
          interpolation: 'bezier',
          bezier_left_value: [1, 2, 3],
        }),
      ],
      version,
    )
    expect(unresolved(prepare(animator, 'rotation', version))).toEqual({
      code: 'legacy-bezier-pair',
      key: 0,
      path: `${transformKey(animator).path}.bezier_right_value`,
    })
  }
  const current = fixture([
    key('rotation', 0, {
      interpolation: 'bezier',
      bezier_left_value: [1, 2, 3],
    }),
  ])
  expect(at(ready(prepare(current, 'rotation', '5.0')).keys).bezier?.rightValue).toEqual([0, 0, 0])
})

test('bbmodel legacy decimal rewrite cannot silently become unapproved scientific notation', () => {
  for (const literal of ['1000000000000000000000', '-0.0000001', '0.0000001f']) {
    const animator = fixture([key('rotation', 0, { data_points: [{ x: literal }] })], '4.10')
    expect(unresolved(prepare(animator, 'rotation', '4.10'))).toEqual({
      code: 'legacy-literal-rewrite',
      key: 0,
      point: 0,
      axis: 'x',
      path: `${transformKey(animator).path}.data_points[0].x`,
    })
    expect(at(ready(prepare(animator, 'rotation', '5.0')).keys).points[0][0]).toBe(
      Number(literal.replace(/f$/, '')),
    )
  }
  for (const value of [1e21, Number.MIN_VALUE, Number.MAX_VALUE]) {
    const animator = fixture([key('position', 0, { data_points: [{ x: value }] })], '4.9')
    expect(at(ready(prepare(animator, 'position', '4.9')).keys).points[0][0]).toBe(-value)
  }
})

test('bbmodel legacy point overlays cannot hide a value that fails before the overlay is applied', () => {
  for (const shadowed of [true, {}, []]) {
    const animator = fixture(
      [
        key('rotation', 0, {
          data_points: [{ x: shadowed, values: { x: 3 } }],
        }),
      ],
      '4.10',
    )
    expect(unresolved(prepare(animator, 'rotation', '4.10'))).toEqual({
      code: 'legacy-shadowed-value',
      key: 0,
      point: 0,
      axis: 'x',
      path: `${transformKey(animator).path}.data_points[0].x`,
    })
    expect(at(ready(prepare(animator, 'rotation', '5.0')).keys).points).toEqual([[3, 0, 0]])
  }
  for (const shadowed of [false, null, 'query.anim_time', 20]) {
    const animator = fixture(
      [
        key('rotation', 0, {
          data_points: [{ x: shadowed, values: { x: 3 } }],
        }),
      ],
      '4.9',
    )
    expect(at(ready(prepare(animator, 'rotation', '4.9')).keys).points).toEqual([[3, 0, 0]])
  }
})

test('bbmodel empty tracks and known other channels do not approve unknown channels or IK', () => {
  const animator = fixture([
    { channel: 'script', data_points: [{ execute: 'do not read' }] },
    key('position'),
  ])
  const opaque: BbmodelAnimationKey = at(animator.keys)
  poison(opaque, 'source')
  poison(transformKey(animator, 1), 'points')
  expect(ready(prepare(animator, 'rotation', '5.0'))).toEqual({
    status: 'ready',
    channel: 'rotation',
    keys: [],
    reordered: false,
    migration: { pointAxes: 0, bezierValueAxes: 0 },
  })
  const ik = fixture([key('rotation')], '5.0', 'null_object')
  poison(ik, 'keys')
  expect(unresolved(prepare(ik, 'rotation', '5.0'))).toEqual({
    code: 'unsupported-channel',
    path: ik.declaration.path,
  })
})
