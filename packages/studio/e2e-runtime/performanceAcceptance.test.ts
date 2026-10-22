import { expect, test } from 'bun:test'
import {
  causalLatencies,
  type F1Series,
  performanceWindow,
  qualifyF1,
} from './performanceAcceptance'

const rows = (): F1Series[] =>
  Array.from({ length: 30 }, (_, repetition) => ({
    identity: {
      project: 'chrome',
      browser: '155',
      kind: 'classic',
      distribution: 'a'.repeat(64),
      network: 'null',
      workload: 'f1',
    },
    repetition,
    failed: false,
    coldResetVerified: true,
    samples: ['cold', 'cached', 'edited'].map((phase) => ({ phase, milliseconds: 100 })),
  }))
test('F1 local statistical budget requires 30 homogeneous samples per phase', () => {
  expect(qualifyF1(rows()).passesBudget).toBe(true)
  expect(qualifyF1(rows()).noReferenceAcceptance).toBe(true)
  expect(qualifyF1(rows().slice(1)).passesBudget).toBe(false)
  expect(qualifyF1([]).passesBudget).toBe(false)
})
for (const kind of [
  'p95',
  'duplicate',
  'distribution',
  'browser',
  'network',
  'workload',
  'reset',
  'failure',
  'missing',
  'invalid',
] as const)
  test(`F1 refuses ${kind}`, () => {
    const input = rows()
    if (kind === 'p95') for (const row of input.slice(0, 2)) row.samples[2]!.milliseconds = 1501
    if (kind === 'duplicate') input[1]!.repetition = 0
    if (kind === 'distribution') input[1]!.identity.distribution = 'b'.repeat(64)
    if (kind === 'browser') input[1]!.identity.browser = '156'
    if (kind === 'network') input[1]!.identity.network = '20Mbps'
    if (kind === 'workload') input[1]!.identity.workload = 'small-drawing'
    if (kind === 'reset') input[1]!.coldResetVerified = false
    if (kind === 'failure') input[1]!.failed = true
    if (kind === 'missing') input[1]!.samples.pop()
    if (kind === 'invalid') input[1]!.samples[0]!.milliseconds = Number.NaN
    expect(qualifyF1(input).passesBudget).toBe(false)
  })
test('F1 uses p95, preserving an isolated slower sample instead of demanding every sample pass', () => {
  const input = rows()
  input[0]!.samples[2]!.milliseconds = 9000
  expect(qualifyF1(input).passesBudget).toBe(true)
})
test('only ten-minute or longer windows claim acceptance', () => {
  expect(performanceWindow(undefined)).toEqual({
    milliseconds: 600000,
    qualification: 'acceptance',
  })
  expect(performanceWindow('60000').qualification).toBe('diagnostic')
  for (const raw of ['', '0', '-1', 'NaN', 'Infinity', '1.2', '3600001'])
    expect(() => performanceWindow(raw)).toThrow()
})
test('continuous repaints cannot qualify ignored input; delayed causal pixels remain slow', () => {
  const inputs = [{ id: 1, key: 'Left', at: 0 }]
  // Arbitrarily many unrelated frames provide no effect witness.
  expect(() => causalLatencies(inputs, [])).toThrow('Missing')
  expect(causalLatencies(inputs, [{ id: 1, key: 'Left', observedAt: 500, at: 516 }])).toEqual([516])
  expect(causalLatencies(inputs, [{ id: 1, key: 'Left', observedAt: 20, at: 36 }])).toEqual([36])
})
test('causal matching refuses stale, duplicated, reversed, wrong-key and pre-input witnesses', () => {
  const inputs = [
    { id: 1, key: 'Left', at: 10 },
    { id: 2, key: 'Up', at: 100 },
  ]
  const shown = [
    { id: 1, key: 'Left', observedAt: 20, at: 36 },
    { id: 2, key: 'Up', observedAt: 120, at: 136 },
  ]
  for (const invalid of [
    [shown[1]!, shown[0]!],
    [shown[0]!, shown[0]!],
    [{ ...shown[0]!, id: 0 }, shown[1]!],
    [{ ...shown[0]!, key: 'Right' }, shown[1]!],
    [{ ...shown[0]!, observedAt: 9 }, shown[1]!],
    [{ ...shown[0]!, at: 19 }, shown[1]!],
  ])
    expect(() => causalLatencies(inputs, invalid)).toThrow()
})
