import { expect, test } from 'bun:test'
import vm from 'node:vm'
import { createExecutionObservationCodec } from './execution-observation'
import { compareExecutionValue, judgeExecutionObservation } from './project-execution'

const codec = createExecutionObservationCodec()

test('201 array elements and object keys are preserved completely', () => {
  const list = Array.from({ length: 201 }, (_, index) => index)
  const object = Object.fromEntries(list.map((index) => [`key${index}`, index]))
  expect(codec.decode(codec.encode(list))).toEqual(list)
  expect(codec.decode(codec.encode(object))).toEqual(object)
})

test('control-looking keys are ordinary learner data, including __proto__', () => {
  const value = JSON.parse(
    '{"$sz":"undefined","nested":{"$sz":"error"},"__proto__":{"x":1},"format":"sz-observed-v1"}',
  )
  const result = codec.decode(codec.encode(value))
  expect(result).toEqual(value)
  expect(Object.hasOwn(result as object, '__proto__')).toBe(true)
  expect(({} as Record<string, unknown>).x).toBeUndefined()
})

test('special Python-independent JavaScript values round trip without data markers', () => {
  const result = codec.decode(
    codec.encode([undefined, Number.NaN, Number.POSITIVE_INFINITY]),
  ) as unknown[]
  expect(result[0]).toBeUndefined()
  expect(Number.isNaN(result[1])).toBe(true)
  expect(result[2]).toBe(Number.POSITIVE_INFINITY)
})

test.each([
  ['too large', () => 'x'.repeat(20_001)],
  ['too deep', () => ({ a: { a: { a: { a: { a: { a: { a: { a: 1 } } } } } } } })],
  [
    'cycle',
    () => {
      const value: unknown[] = []
      value.push(value)
      return value
    },
  ],
  [
    'throwing getter',
    () => ({
      get x() {
        throw new Error('getter')
      },
    }),
  ],
] as const)('%s is inconclusive, never a partial JSON value', (_label, value) => {
  expect(() => codec.encode(value())).toThrow()
})

test('the browser factory is self-contained when serialized into another realm', () => {
  const other = vm.runInNewContext(`(${createExecutionObservationCodec.toString()})()`)
  expect(other.decode(other.encode({ a: [1, 2, 3] }))).toEqual({ a: [1, 2, 3] })
})

test('function objectives compare every returned item, including item 201', () => {
  const actual = Array.from({ length: 201 }, (_, index) => index)
  const observation = {
    id: 'list',
    type: 'functionReturns' as const,
    cases: [{ ok: true, value: codec.encode(actual) }],
  }
  expect(
    judgeExecutionObservation(
      { type: 'functionReturns', name: 'list', cases: [{ args: [], expected: actual }] },
      observation,
    ).passed,
  ).toBe(true)
  expect(
    judgeExecutionObservation(
      {
        type: 'functionReturns',
        name: 'list',
        cases: [{ args: [], expected: actual.slice(0, 200) }],
      },
      observation,
    ).passed,
  ).toBe(false)
})

test('literal control-looking data does not change comparison semantics', () => {
  const value = codec.encode({ $sz: 'undefined' })
  expect(compareExecutionValue(value, 'truthy', undefined)).toBe(true)
  expect(compareExecutionValue(value, 'notEquals', undefined)).toBe(true)
  expect(compareExecutionValue(value, 'contains', 'undefined')).toBe(true)
  expect(
    judgeExecutionObservation(
      { type: 'functionReturns', name: 'obj', cases: [{ args: [], expected: { $sz: 'error' } }] },
      {
        id: 'obj',
        type: 'functionReturns',
        cases: [{ ok: true, value: codec.encode({ $sz: 'error' }) }],
      },
    ).passed,
  ).toBe(true)
})

test('legacy nested truncation markers cannot satisfy negative comparisons', () => {
  expect(compareExecutionValue({ nested: { $sz: 'large' } }, 'notContains', 'secret')).toBe(false)
  expect(compareExecutionValue([{ $sz: 'deep' }], 'notEquals', 0)).toBe(false)
})

test.each([
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
])('%s cannot equal a finite expected answer through numeric tolerance', (value) => {
  const observed = codec.encode(value)
  expect(compareExecutionValue(observed, 'equals', 42)).toBe(false)
  expect(
    judgeExecutionObservation(
      { type: 'functionReturns', name: 'answer', cases: [{ args: [], expected: 42 }] },
      { id: 'answer', type: 'functionReturns', cases: [{ ok: true, value: observed }] },
    ).passed,
  ).toBe(false)
})

test('finite rounding tolerance and unchanged nonfinite values keep their meaning', () => {
  expect(compareExecutionValue(codec.encode(0.1 + 0.2), 'equals', 0.3)).toBe(true)
  expect(
    compareExecutionValue(
      codec.encode(Number.POSITIVE_INFINITY),
      'changed',
      undefined,
      codec.encode(Number.POSITIVE_INFINITY),
    ),
  ).toBe(false)
  expect(compareExecutionValue(codec.encode(Number.NaN), 'equals', 42)).toBe(false)
})
