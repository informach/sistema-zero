import { expect, test } from 'bun:test'
import { CubicBezierCurve, SplineCurve, Vector2 } from 'three'
import { readBbmodelAnimationKeyframes } from './bbmodelAnimationKeyframes'
import { sampleBbmodelContinuousTrack as sample } from './bbmodelAnimationSample'
import { readBbmodelAnimationStructure } from './bbmodelAnimationStructure'
import { prepareBbmodelAnimationTrack } from './bbmodelAnimationTrack'
import type { BbmodelNumericAnimationTrack } from './bbmodelAnimationTrackTypes'
import { type BbmodelVersion, readBbmodelEnvelope } from './bbmodelEnvelope'
import { BbmodelInputError } from './bbmodelInput'
import type { BbmodelVec3 } from './bbmodelValues'

function at<T>(items: readonly T[], index = 0): T {
  const item = items[index]
  if (item === undefined) throw new Error(`Expected fixture item ${index}`)
  return item
}
function fixture(keys: Record<string, unknown>[], version: BbmodelVersion = '5.0') {
  const envelope = readBbmodelEnvelope(
      new TextEncoder().encode(
        JSON.stringify({
          meta: { format_version: version, model_format: 'free' },
          animations: [{ uuid: 'clip', animators: { group: { keyframes: keys } } }],
        }),
      ),
    ),
    structure = readBbmodelAnimationStructure(envelope),
    animator = at(at(readBbmodelAnimationKeyframes(structure).clips).animators)
  if (animator.kind !== 'transform') throw new Error('Expected transform fixture')
  const result = prepareBbmodelAnimationTrack(animator, 'position', version)
  if (result.status !== 'ready') throw new Error(`Unresolved fixture: ${result.issue.code}`)
  return result
}
function key(time: number, x: number, overrides: Record<string, unknown> = {}) {
  return { channel: 'position', time, data_points: [{ x, y: x * 2, z: -x }], ...overrides }
}
function value(track: BbmodelNumericAnimationTrack, time: number, loop = false): BbmodelVec3 {
  const result = sample(track, time, loop)
  if (result === null) throw new Error('Expected nonempty sample')
  return result
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

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('bbmodel %s samples migrated numeric points through the real reader pipeline', (version) => {
  const track = fixture([key(2, 10), key(0, 0)], version),
    before = structuredClone(track),
    sign = version === '5.0' ? 1 : -1
  expect(value(track, 1)).toEqual([sign * 5, 10, -5])
  expect(value(track, -1)).toEqual([0, 0, 0])
  expect(value(track, 3)).toEqual([sign * 10, 20, -10])
  value(track, 1)[0] = 99
  value(track, 0)[0] = 99
  value(track, 3)[0] = 99
  expect(track).toEqual(before)
})

test('bbmodel mathematical sampling keeps exact key times, pre/post and arbitrarily near times distinct', () => {
  const track = fixture([
    key(0, 0, { data_points: [{ x: '-0' }, { x: 10 }] }),
    key(1, 20, { data_points: [{ x: 20 }, { x: 40 }] }),
  ])
  expect(Object.is(value(track, 0)[0], -0)).toBe(true)
  expect(value(track, Number.MIN_VALUE)[0]).toBe(10)
  expect(value(track, 0.5)).toEqual([15, 0, 0])
  expect(value(track, 1 - 1e-5)[0]).toBeCloseTo(20 - 1e-4, 12)
  expect(value(track, 1)).toEqual([20, 0, 0])
  expect(value(track, 1 + 1e-5)).toEqual([40, 0, 0])
  const close = fixture([key(0, 1), key(0.0001, 2)])
  expect(value(close, 0.0001)[0]).toBe(2) // No previous-key epsilon priority.
  expect(value(close, 0.00005)[0]).toBe(1.5)
})

test.each([
  'linear',
  'step',
  'catmullrom',
  'bezier',
])('bbmodel outgoing step wins over the following %s curve, except at its exact pre value', (interpolation) => {
  const track = fixture([
    key(0, 0, { interpolation: 'step', data_points: [{ x: 1 }, { x: 3 }] }),
    key(1, 9, { interpolation }),
  ])
  expect(value(track, 0)[0]).toBe(1)
  expect(value(track, 0.999999)[0]).toBe(3)
  expect(value(track, 1)[0]).toBe(9)
})

test('bbmodel empty and one-key tracks stay distinct from identity motion', () => {
  expect(sample(fixture([]), 42, false)).toBeNull()
  const track = fixture([key(2, 0, { data_points: [{ x: 7 }, { x: 8 }] })])
  expect(value(track, -100, true)).toEqual([7, 0, 0])
  expect(value(track, 2, true)).toEqual([7, 0, 0])
  expect(value(track, 100, true)).toEqual([8, 0, 0])
})

test('bbmodel linear mixing keeps finite opposite extremes without b-a overflow', () => {
  const track = fixture([
    key(0, 0, { data_points: [{ x: -Number.MAX_VALUE }] }),
    key(1, 0, { data_points: [{ x: Number.MAX_VALUE }] }),
  ])
  expect(value(track, 0.5)).toEqual([0, 0, 0])
  // Weighted endpoints and the algebraically reduced value can differ by one F64 ULP.
  expect(value(track, 0.25)[0] / (-Number.MAX_VALUE / 2)).toBeCloseTo(1, 15)
})

test('bbmodel Catmull-Rom matches an independent Three spline across nonuniform time intervals', () => {
  const times = [-3, 2, 3, 12],
    values = [1, -6, 20, 2],
    track = fixture(
      times.map((time, i) => key(time, at(values, i), { interpolation: 'catmullrom' })),
    )
  for (const axis of [0, 1, 2] as const) {
    const curve = new SplineCurve(
      track.keys.map((entry) => new Vector2(entry.time, entry.points[0][axis])),
    )
    for (let segment = 0; segment < 3; segment++)
      for (let tick = 1; tick < 100; tick++) {
        const alpha = tick / 100,
          time = at(times, segment) + (at(times, segment + 1) - at(times, segment)) * alpha,
          expected = curve.getPoint((segment + alpha) / 3).y
        expect(value(track, time)[axis]).toBeCloseTo(expected, 10)
      }
  }
})

test.each([
  ['catmullrom', 'bezier'],
  ['bezier', 'catmullrom'],
  ['linear', 'catmullrom'],
  ['catmullrom', 'step'],
])('bbmodel Catmull-Rom takes precedence for %s / %s endpoints', (before, after) => {
  const track = fixture([
      key(0, 0, { interpolation: before }),
      key(1, 10, { interpolation: after }),
    ]),
    curve = new SplineCurve([new Vector2(0, 0), new Vector2(1, 10)])
  expect(value(track, 0.25)[0]).toBeCloseTo(curve.getPoint(0.25).y, 12)
})

test('bbmodel Catmull pre/post breaks a tangent without shifting into the next segment', () => {
  const track = fixture([
      key(-1, 99),
      key(0, 0, { interpolation: 'catmullrom', data_points: [{ x: 50 }, { x: 1 }] }),
      key(1, 10, { data_points: [{ x: 10 }, { x: -40 }] }),
      key(2, -99),
    ]),
    curve = new SplineCurve([new Vector2(0, 1), new Vector2(1, 10)])
  for (let tick = 1; tick < 100; tick++) {
    const t = tick / 100
    expect(value(track, t)[0]).toBeCloseTo(curve.getPoint(t).y, 12)
    expect(value(track, t, true)[0]).toBeCloseTo(curve.getPoint(t).y, 12)
  }
  expect(value(track, 0)[0]).toBe(50)
  expect(value(track, 1)[0]).toBe(10)
})

test('bbmodel Catmull loop neighbours affect tangents without wrapping sample time', () => {
  const track = fixture([0, 10, 20, 30].map((x, i) => key(i, x, { interpolation: 'catmullrom' }))),
    first = new SplineCurve([
      new Vector2(-1, 20),
      new Vector2(0, 0),
      new Vector2(1, 10),
      new Vector2(2, 20),
    ]),
    last = new SplineCurve([
      new Vector2(1, 10),
      new Vector2(2, 20),
      new Vector2(3, 30),
      new Vector2(4, 10),
    ])
  expect(value(track, 0.5, true)[0]).toBeCloseTo(first.getPoint(0.5).y, 12)
  expect(value(track, 2.5, true)[0]).toBeCloseTo(last.getPoint(0.5).y, 12)
  expect(value(track, 0.5, false)[0]).not.toBe(value(track, 0.5, true)[0])
  expect(value(track, -1, true)[0]).toBe(0)
  expect(value(track, 4, true)[0]).toBe(30)
  const pair = fixture([key(0, 0, { interpolation: 'catmullrom' }), key(1, 10)])
  expect(value(pair, 0.25, true)).toEqual(value(pair, 0.25, false))
})

test.each([
  [0.1, -0.1],
  [1, -1],
  [0, 0],
  [0, -1],
  [100, -100],
  [-5, 5],
  [1 / 3, -1 / 3],
])('bbmodel continuous Bezier inverts time handles %s / %s against independent forward curves', (right, left) => {
  const track = fixture([
      key(0, 2, {
        interpolation: 'bezier',
        bezier_right_time: [right, right / 2, right * 2],
        bezier_right_value: [5, -3, 12],
        bezier_linked: true,
      }),
      key(1, 10, {
        bezier_left_time: [left, left / 2, left * 2],
        bezier_left_value: [-7, 6, -1],
      }),
    ]),
    before = structuredClone(track),
    a = at(track.keys),
    b = at(track.keys, 1)
  for (const axis of [0, 1, 2] as const) {
    const from = a.points[0][axis],
      to = b.points[0][axis],
      curve = new CubicBezierCurve(
        new Vector2(0, from),
        new Vector2(
          Math.max(0, Math.min(1, a.bezier?.rightTime[axis] ?? 0.1)),
          from + (a.bezier?.rightValue[axis] ?? 0),
        ),
        new Vector2(
          1 + Math.min(0, Math.max(-1, b.bezier?.leftTime[axis] ?? -0.1)),
          to + (b.bezier?.leftValue[axis] ?? 0),
        ),
        new Vector2(1, to),
      )
    for (let tick = 1; tick < 128; tick++) {
      const expected = curve.getPoint(tick / 128)
      expect(value(track, expected.x)[axis]).toBeCloseTo(expected.y, 8)
    }
  }
  value(track, 0.3)[0] = 999
  expect(track).toEqual(before)
})

test('bbmodel mixed Bezier uses source-default handles on an endpoint without descriptors', () => {
  const track = fixture([key(0, 0), key(1, 10, { interpolation: 'bezier' })]),
    curve = new CubicBezierCurve(
      new Vector2(0, 0),
      new Vector2(0.1, 0),
      new Vector2(0.9, 10),
      new Vector2(1, 10),
    )
  expect(at(track.keys).bezier).toBeNull()
  for (let tick = 1; tick < 100; tick++) {
    const point = curve.getPoint(tick / 100)
    expect(value(track, point.x)[0]).toBeCloseTo(point.y, 10)
  }
})

test('bbmodel Bezier retains very small time scales instead of a fixed absolute solver epsilon', () => {
  const track = fixture([
    key(0, 0, {
      interpolation: 'bezier',
      bezier_right_time: [0, 0, 0],
      bezier_right_value: [1 / 3, 0, 0],
      data_points: [{ x: 0 }],
    }),
    key(1, 0, {
      interpolation: 'bezier',
      bezier_left_time: [-1, -1, -1],
      bezier_left_value: [-1 / 3, 0, 0],
      data_points: [{ x: 1 }],
    }),
  ])
  const expected = Math.cbrt(1e-300),
    result = value(track, 1e-300)[0]
  expect(Math.abs(result - expected) / expected).toBeLessThan(1e-14)
  const tiny = fixture([
    key(0, 0, { interpolation: 'bezier', bezier_right_time: [100, 100, 100] }),
    key(1e-300, 10, { interpolation: 'bezier', bezier_left_time: [-100, -100, -100] }),
  ])
  expect(value(tiny, 5e-301)[0]).toBeCloseTo(5, 12)
})

test('bbmodel nonfinite time is rejected before reading even an empty track', () => {
  const track = fixture([])
  Object.defineProperty(track, 'keys', {
    get() {
      throw new Error('Unexpected key read')
    },
  })
  for (const time of [NaN, Infinity, -Infinity])
    expect(failure(() => sample(track, time, false))).toEqual({
      reason: 'invalid',
      path: 'animation.sample.time',
    })
})

test('bbmodel unsupported numeric ranges never become zero or partial XYZ samples', () => {
  const gap = fixture([key(-Number.MAX_VALUE, 0), key(Number.MAX_VALUE, 1)]),
    ratio = fixture([key(0, 0), key(Number.MAX_VALUE, 1)]),
    controls = fixture([
      key(0, 0, {
        interpolation: 'bezier',
        data_points: [{ x: Number.MAX_VALUE }],
        bezier_right_value: [Number.MAX_VALUE, 0, 0],
      }),
      key(1, 0),
    ]),
    overshoot = fixture(
      [-Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE].map((x, i) =>
        key(i, 0, { interpolation: 'catmullrom', data_points: [{ x }] }),
      ),
    )
  expect(failure(() => sample(gap, 0, false))).toEqual({
    reason: 'unsupported',
    path: `${at(gap.keys, 1).path}.time`,
  })
  expect(failure(() => sample(ratio, Number.MIN_VALUE, false))).toEqual({
    reason: 'unsupported',
    path: `${at(ratio.keys).path}.time`,
  })
  expect(failure(() => sample(controls, 0.5, false))).toEqual({
    reason: 'unsupported',
    path: `${at(controls.keys).path}.bezier_right_value[0]`,
  })
  expect(failure(() => sample(overshoot, 1.5, false))).toEqual({
    reason: 'unsupported',
    path: at(overshoot.keys, 1).path,
  })
})

test('bbmodel sampling locates a key interval logarithmically without reading unrelated point arrays', () => {
  const track = fixture(Array.from({ length: 8192 }, (_, i) => key(i, i))),
    target = 4096.5
  let reads = 0
  for (const entry of track.keys) {
    const time = entry.time
    Object.defineProperty(entry, 'time', {
      get() {
        reads++
        return time
      },
    })
    if (time !== 4096 && time !== 4097)
      Object.defineProperty(entry, 'points', {
        get() {
          throw new Error('Unrelated points read')
        },
      })
  }
  expect(value(track, target)).toEqual([target, target * 2, -target])
  expect(reads).toBeLessThanOrEqual(Math.ceil(Math.log2(track.keys.length)) + 6)
})
