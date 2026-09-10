import { expect, test } from 'bun:test'
import {
  countRegularAnimationTimes as count,
  mergeAnimationSampleTimes as merge,
} from './animationSampleTimes'
import { gltfCubicSampleTimes } from './gltfClipPlan'
import { GltfInputError } from './gltfInput'

function adjacent(value: number, direction: 1 | -1): number {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value)
  view.setBigUint64(0, view.getBigUint64(0) + BigInt(direction))
  return view.getFloat64(0)
}
/** Independent bounded enumeration/Set oracle, not the production merge/count algorithm. */
function oracle(authored: number[], start: number, end: number, fps: number) {
  const all = new Set([start, end, ...authored.filter((time) => time >= start && time <= end)])
  for (let frame = 0; frame <= Math.ceil(end * fps) + 2; frame++) {
    const time = frame / fps
    if (time >= start && time <= end) all.add(time)
  }
  return [...all].sort((a, b) => a - b)
}

test('animation sample times form an exact union, retaining off-grid and adjacent authorial times', () => {
  const authored = [-5, 0, Number.MIN_VALUE, 0.1, adjacent(0.1, 1), 0.5, 0.8, 1, 99],
    before = [...authored]
  expect([...merge(authored, 0, 1, 2, 'grid')]).toEqual([
    0,
    Number.MIN_VALUE,
    0.1,
    adjacent(0.1, 1),
    0.5,
    0.8,
    1,
  ])
  expect(authored).toEqual(before)
})

test('animation frame counts and merged windows agree with enumeration around F64 grid boundaries', () => {
  for (const fps of [1, 3, 7, 24, 29, 30, 59, 60, 120])
    for (let frame = 1; frame <= 20; frame++) {
      const first = frame / fps,
        last = (frame + 7) / fps
      for (const start of [adjacent(first, -1), first, adjacent(first, 1)])
        for (const end of [adjacent(last, -1), last, adjacent(last, 1)]) {
          const authored = [start - 0.0001, start, (start + end) / 2, end, end + 0.0001]
          expect([...merge(authored, start, end, fps, 'grid')]).toEqual(
            oracle(authored, start, end, fps),
          )
          expect(count(start, end, fps)).toBe(oracle([], start, end, fps).length)
        }
    }
})

test('animation sample windows include endpoints even with no source keys or interior frames', () => {
  for (const [start, end, fps] of [
    [0, 0, 30],
    [0.1, 0.1, 30],
    [0, Number.MIN_VALUE, 120],
    [0.123, 0.124, 30],
    [0, 600, 120],
  ]) {
    if (start === undefined || end === undefined || fps === undefined)
      throw new Error('Incomplete fixture')
    const expected = oracle([], start, end, fps)
    expect([...merge([], start, end, fps, 'grid')]).toEqual(expected)
    expect(count(start, end, fps)).toBe(expected.length)
  }
})

test('animation time merge stops reading a source iterator once it passes the chosen window', () => {
  let closed = false
  function* source() {
    try {
      yield -1
      yield 0.25
      yield 2
      throw new Error('A later key must not be read')
    } finally {
      closed = true
    }
  }
  expect([...merge(source(), 0, 1, 2, 'grid')]).toEqual([0, 0.25, 0.5, 1])
  expect(closed).toBe(true)
})

test('animation time merge releases a source iterator when its consumer stops at its budget', () => {
  let closed = false
  function* source() {
    try {
      yield 0.1
      yield 0.2
      throw new Error('No more source keys are needed')
    } finally {
      closed = true
    }
  }
  const output: number[] = []
  for (const time of merge(source(), 0, 1, 1, 'grid')) {
    output.push(time)
    if (output.length === 3) break
  }
  expect(output).toEqual([0, 0.1, 0.2])
  expect(closed).toBe(true)
})

test('authorial-only schedules do not manufacture frame keys even at high FPS', () => {
  const source = [-1, 0.1, 0.1 + Number.EPSILON, 22, 600, 700]
  expect([...merge(source, 0, 600, 120, 'authored')]).toEqual([
    0,
    0.1,
    0.1 + Number.EPSILON,
    22,
    600,
  ])
  expect([...merge([], 0, 600, 120, 'authored')]).toEqual([0, 600])
})

test('glTF uses the shared exact union while preserving its authored window, ownership and budget error', () => {
  for (const fps of [1, 7, 24, 30, 120]) {
    const source = Float64Array.of(0.001, 0.05, adjacent(0.05, 1), 0.125),
      original = source.slice(),
      expected = oracle([...source], 0.001, 0.125, fps),
      output = gltfCubicSampleTimes(source, fps, expected.length, 'curve')
    expect(output).toEqual(expected)
    output[0] = 99
    expect(source).toEqual(original)
    let error: unknown
    try {
      gltfCubicSampleTimes(source, fps, expected.length - 1, 'curve')
    } catch (cause) {
      error = cause
    }
    expect(error).toBeInstanceOf(GltfInputError)
    if (!(error instanceof GltfInputError)) throw new Error('Expected glTF budget error')
    expect(error.reason).toBe('budget')
    expect(error.path).toBe('curve')
  }
  expect(gltfCubicSampleTimes(new Float64Array(), 30, 0, 'curve')).toEqual([])
  expect(gltfCubicSampleTimes(Float64Array.of(0.1), 30, 1, 'curve')).toEqual([0.1])
})
