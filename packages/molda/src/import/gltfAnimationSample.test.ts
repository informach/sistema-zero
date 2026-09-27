import { expect, test } from 'bun:test'
import { Quaternion } from 'three'
import type { GltfAccessor } from './gltfAccessors'
import { prepareGltfAnimationChannel } from './gltfAnimationSample'
import type { GltfAnimation, GltfAnimationPath, GltfInterpolation } from './gltfAnimationTypes'
import { GltfInputError } from './gltfInput'

function fixture(
  times: number[],
  values: number[],
  path: GltfAnimationPath = 'translation',
  interpolation: GltfInterpolation = 'LINEAR',
) {
  const base: GltfAccessor = {
    type: 'SCALAR',
    componentType: 5126,
    count: times.length,
    normalized: false,
    values: Float64Array.from(times, Math.fround),
    min: [Math.min(...times)],
    max: [Math.max(...times)],
    layout: null,
    sparseViews: null,
  }
  const width = path === 'rotation' ? 4 : path === 'weights' ? 1 : 3
  const accessors: GltfAccessor[] = [
    base,
    {
      ...base,
      type: width === 4 ? 'VEC4' : width === 3 ? 'VEC3' : 'SCALAR',
      count: values.length / width,
      values: Float64Array.from(values, Math.fround),
      min: null,
      max: null,
    },
  ]
  const animation: GltfAnimation = {
    name: null,
    samplers: [{ input: 0, output: 1, interpolation }],
    channels: [{ sampler: 0, target: { kind: 'node', node: 0, path } }],
  }
  return {
    animation,
    accessors,
    prepare: () => prepareGltfAnimationChannel(animation, 0, accessors),
  }
}
function close(actual: ArrayLike<number>, expected: ArrayLike<number>, precision = 10) {
  expect(actual.length).toBe(expected.length)
  for (let i = 0; i < actual.length; i++) expect(actual[i]).toBeCloseTo(expected[i]!, precision)
}

test('exact and clamped keys preserve quantized quaternion values, sign and ownership', () => {
  for (const method of ['LINEAR', 'STEP', 'CUBICSPLINE'] as const) {
    const q0 = [64 / 127, 64 / 127, 64 / 127, 63 / 127],
      q1 = [0, 0, 0, -1],
      values =
        method === 'CUBICSPLINE'
          ? [1, 1, 1, 1, ...q0, 0, 1, 0, 1, 1, 0, 1, 0, ...q1, 0, 0, 0, 0]
          : [...q0, ...q1],
      source = fixture([2, 5], values, 'rotation', method)
    // The numeric reader preserves normalized integer divisions as Double, not Float32.
    source.accessors[1]!.values = Float64Array.from(values)
    source.accessors[1]!.normalized = true
    source.accessors[1]!.componentType = 5120
    const prepared = source.prepare(),
      before = structuredClone(source.accessors)
    expect(prepared.start).toBe(2)
    expect(prepared.end).toBe(5)
    for (const time of [-Number.MAX_VALUE, 0, 2])
      expect(Array.from(prepared.sample(time))).toEqual(q0)
    for (const time of [5, 3600, Number.MAX_VALUE])
      expect(Array.from(prepared.sample(time))).toEqual(q1)
    const a = prepared.sample(2),
      b = prepared.sample(2)
    expect(a).not.toBe(b)
    a[0] = 100
    prepared.target.node = 100
    expect(Array.from(prepared.sample(2))).toEqual(q0)
    expect(source.animation.channels[0]!.target.node).toBe(0)
    expect(source.accessors).toEqual(before)
  }
  const signedZero = fixture([0, 1], [-0, 0, 0, 1, 0, 0, 0, -1], 'rotation').prepare()
  expect(Object.is(signedZero.sample(0)[0], -0)).toBe(true)
})

test('linear and step seek without snapping and clamp single-key tracks', () => {
  for (const method of ['LINEAR', 'STEP'] as const) {
    const source = fixture([0.125, 0.5, 2], [1, -1, 10, 4, -4, 10, 10, -10, 10], 'scale', method),
      prepared = source.prepare()
    for (const time of [0, 0.125, 0.25, 0.5, 0.8, 1.1, 1.9, 2, 3, 0.5]) {
      const x =
        time <= 0.125
          ? 1
          : time >= 2
            ? 10
            : method === 'STEP'
              ? time < 0.5
                ? 1
                : 4
              : time < 0.5
                ? 1 + (time - 0.125) * 8
                : 4 + (time - 0.5) * 4
      close(prepared.sample(time), [x, -x, 10])
    }
    const single = fixture([1], [-3, 2, 0], 'scale', method).prepare()
    for (const time of [-100, 0, 1, 100])
      expect(Array.from(single.sample(time))).toEqual([-3, 2, 0])
  }
})

test('Hermite uses derivatives scaled by the actual duration and retains all morph components', () => {
  const polynomial = (time: number) => time ** 3 - 2 * time ** 2 + 3 * time - 4
  for (const path of ['translation', 'scale', 'weights'] as const) {
    const width = path === 'weights' ? 7 : 3
    const values = [
      Array<number>(width).fill(999),
      Array<number>(width).fill(2),
      Array<number>(width).fill(7),
      Array<number>(width).fill(58),
      Array<number>(width).fill(86),
      Array<number>(width).fill(-777),
    ].flat()
    const source = fixture([2, 5], values, path, 'CUBICSPLINE'),
      prepared = source.prepare(),
      before = new Float64Array(source.accessors[1]!.values)
    for (let i = 0; i <= 100; i++) {
      const time = 2 + (i * 3) / 100
      close(prepared.sample(time), Array<number>(width).fill(polynomial(time)), 10)
    }
    expect(source.accessors[1]!.values).toEqual(before)
  }
})

test('SLERP follows the shortest arc for negative dots, antipodes, tiny angles and quantized endpoints', () => {
  const pairs = [
    [
      [0, 0, 0, 1],
      [0, 0, 0, -1],
    ],
    [
      [0, 0, 0, 1],
      [0, 0, 1, 0],
    ],
    [
      [0, 0, 0, 1],
      [0, 0, Math.sin(0.9 * Math.PI), Math.cos(0.9 * Math.PI)],
    ],
    [
      [0, 0, 0, 1],
      [1e-10, 0, 0, 1],
    ],
    [
      [64 / 127, 64 / 127, 64 / 127, 63 / 127],
      [0, 0, 0, -1],
    ],
  ]
  for (const [left, right] of pairs) {
    const source = fixture([2, 8], [...left!, ...right!], 'rotation'),
      prepared = source.prepare(),
      data = source.accessors[1]!.values,
      a = new Quaternion().fromArray(data).normalize(),
      b = new Quaternion().fromArray(data, 4).normalize()
    for (let i = 1; i < 100; i++) {
      const weight = i / 100,
        actual = prepared.sample(2 + weight * 6)
      close(actual, a.clone().slerp(b, weight).normalize().toArray(), 10)
      expect(Math.hypot(...actual)).toBeCloseTo(1, 12)
    }
  }
})

test('a cubic zero quaternion is an explicit error, not an identity or a modified endpoint', () => {
  const source = fixture(
      [0, 2],
      [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0],
      'rotation',
      'CUBICSPLINE',
    ),
    prepared = source.prepare()
  expect(() => prepared.sample(1)).toThrow(GltfInputError)
  expect(Array.from(prepared.sample(0))).toEqual([0, 0, 0, 1])
  expect(Array.from(prepared.sample(2))).toEqual([0, 0, 0, -1])
  expect(Math.hypot(...prepared.sample(0.9))).toBeCloseTo(1, 12)
  expect(Math.hypot(...prepared.sample(1.1))).toBeCloseTo(1, 12)
})

test('tiny intervals and large Float32 coordinates/tangents remain finite Double values', () => {
  const tiny = 2 ** -149,
    linear = fixture([0, tiny], [0, 0, 0, 8, -4, 2]).prepare()
  close(linear.sample(tiny / 4), [2, -1, 0.5])
  const large = Math.fround(3e38),
    source = fixture(
      [0, large],
      [0, 0, 0, 0, 0, 0, large, -large, large, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      'translation',
      'CUBICSPLINE',
    ),
    actual = source.prepare().sample(large / 2)
  expect(actual.every(Number.isFinite)).toBe(true)
  expect(actual[0]).toBe((large * large) / 8)
  expect(actual[1]).toBe((-large * large) / 8)
  const opposite = fixture([0, 1], [-large, large, 0, large, -large, 0]).prepare()
  expect(Array.from(opposite.sample(0.5))).toEqual([0, 0, 0])
})

test('large random seeks capture two arrays once without reopening source values', () => {
  const count = 65536,
    source = fixture(
      Array.from({ length: count }, (_, i) => i / 8),
      Array.from({ length: count * 3 }, (_, i) => (Math.floor(i / 3) / 8) * (i % 3 === 1 ? -1 : 1)),
    )
  let reads = 0
  for (const entry of source.accessors) {
    const values = entry.values
    Object.defineProperty(entry, 'values', {
      get() {
        reads++
        return values
      },
    })
  }
  const prepared = source.prepare()
  expect(reads).toBe(2)
  for (let i = 0; i < 1000; i++) {
    const time = ((i * 7919) % (count - 1)) / 8 + 1 / 64
    close(prepared.sample(time), [time, -time, time])
  }
  expect(reads).toBe(2)
})

test('unresolved channels and invalid requests fail before touching animation arrays', () => {
  const source = fixture([0, 1], [0, 0, 0, 1, 1, 1]),
    prepared = source.prepare()
  for (const value of [NaN, Infinity, -Infinity])
    expect(() => prepared.sample(value)).toThrow(GltfInputError)
  for (const entry of source.accessors)
    Object.defineProperty(entry, 'values', {
      get() {
        throw new Error('Must not open data')
      },
    })
  for (const index of [-1, 0.5, NaN, 1])
    expect(() => prepareGltfAnimationChannel(source.animation, index, source.accessors)).toThrow(
      GltfInputError,
    )
  source.animation.channels[0]!.target = { kind: 'unresolved', node: null, path: 'pointer' }
  expect(() => source.prepare()).toThrow(GltfInputError)
})
