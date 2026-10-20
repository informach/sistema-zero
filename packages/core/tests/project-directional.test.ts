import { expect, test } from 'bun:test'
import {
  compareExecutionValue,
  executionObservationUnavailableReason,
  executionRuleBudgetMs,
  isSectionExecutionRule,
  judgeExecutionObservation,
} from '../src/learning/project-execution'

const rawRule = {
  type: 'behavior',
  observation: { type: 'idleBeforeAction', idleMs: 80 },
  steps: [{ action: 'press', key: 'ArrowUp', holdMs: 80 }],
  expect: { target: { kind: 'spritePosition', path: 'avatar', axis: 'y' }, compare: 'decreased' },
}
function rule() {
  const candidate = structuredClone(rawRule)
  if (!isSectionExecutionRule(candidate)) throw new Error('Directional contract not admitted')
  return candidate
}
const sample = (y: number, frame: number, x = 40) => ({
  x,
  y,
  frame,
  generation: 1,
  errors: 0,
  paused: false,
})
function observed(delta: number, start = 200) {
  return {
    id: 'up',
    type: 'behavior' as const,
    initial: { found: true, value: start },
    final: { found: true, value: start + delta },
    motion: {
      baselineInitial: sample(start, 10),
      baselineFinal: sample(start, 15),
      actionInitial: sample(start, 16),
      actionFinal: sample(start + delta, 21),
    },
  }
}

test('directional contract is closed, budgeted and does not change historical behavior rules', () => {
  expect(isSectionExecutionRule(rawRule)).toBe(true)
  expect(executionRuleBudgetMs(rule())).toBe(160)
  expect(
    isSectionExecutionRule({
      type: 'behavior',
      steps: [],
      expect: {
        target: { kind: 'value', path: 'x' },
        compare: 'equals',
        value: 0,
      },
    }),
  ).toBe(true)
  for (const candidate of [
    { ...rawRule, observation: { type: 'idleBeforeAction', idleMs: 0 } },
    { ...rawRule, observation: { type: 'idleBeforeAction', idleMs: 251 } },
    { ...rawRule, observation: { type: 'idleBeforeAction', idleMs: 80, retry: true } },
    { ...rawRule, steps: [] },
    { ...rawRule, expect: { ...rawRule.expect, value: -3 } },
    {
      ...rawRule,
      expect: {
        ...rawRule.expect,
        target: { kind: 'spritePosition', path: 'a.__proto__', axis: 'y' },
      },
    },
  ])
    expect(isSectionExecutionRule(candidate)).toBe(false)
})

test('relative comparisons are pure; zero/opposite fail and equivalent magnitudes pass', () => {
  for (const delta of [-0.5, -2, -8, -25, -(2 + 3), 0 - 4]) {
    const result = observed(delta, 876)
    expect(executionObservationUnavailableReason(rule(), result)).toBeUndefined()
    expect(judgeExecutionObservation(rule(), result).passed).toBe(true)
  }
  for (const delta of [0, 0.5, 2, 25]) {
    const result = observed(delta)
    expect(executionObservationUnavailableReason(rule(), result)).toBeUndefined()
    expect(judgeExecutionObservation(rule(), result).passed).toBe(false)
  }
  expect(compareExecutionValue(9, 'decreased', undefined, 10)).toBe(true)
  expect(compareExecutionValue(11, 'increased', undefined, 10)).toBe(true)
  expect(compareExecutionValue(10, 'increased', undefined, 10)).toBe(false)
  expect(compareExecutionValue('11', 'increased', undefined, 10)).toBe(false)
})

test('own baseline rejects pre-existing automatic motion and permits unrelated random spawn positions', () => {
  for (const start of [-800, 0, 45, 4000])
    expect(judgeExecutionObservation(rule(), observed(-2, start)).passed).toBe(true)
  for (const axis of ['x', 'y'] as const) {
    const result = observed(-4)
    result.motion.baselineFinal[axis] += 2
    expect(executionObservationUnavailableReason(rule(), result)).toBeUndefined()
    expect(judgeExecutionObservation(rule(), result).passed).toBe(false)
  }
})

test('all four motor directions accept free magnitude and reject zero/opposite motion', () => {
  for (const [key, axis, compare, sign] of [
    ['ArrowUp', 'y', 'decreased', -1],
    ['ArrowDown', 'y', 'increased', 1],
    ['ArrowLeft', 'x', 'decreased', -1],
    ['ArrowRight', 'x', 'increased', 1],
  ] as const) {
    const candidate = {
      ...structuredClone(rawRule),
      steps: [{ action: 'press', key, holdMs: 80 }],
      expect: { target: { kind: 'spritePosition', path: 'avatar', axis }, compare },
    }
    if (!isSectionExecutionRule(candidate)) throw new Error('Directional rule rejected')
    for (const magnitude of [0.25, 3, 2 + 5, 24 / 3]) {
      for (const multiplier of [1, 0, -1]) {
        const result = observed(0)
        result.initial.value = result.motion.actionInitial[axis]
        result.motion.actionFinal[axis] += sign * magnitude * multiplier
        result.final.value = result.motion.actionFinal[axis]
        expect(executionObservationUnavailableReason(candidate, result)).toBeUndefined()
        expect(judgeExecutionObservation(candidate, result).passed).toBe(multiplier === 1)
      }
    }
  }
})

test('missing/invalid observation, preexisting callback errors and stopped clocks are unavailable', () => {
  const a = observed(-2)
  a.motion.baselineInitial.errors = 1
  const b = observed(-2)
  b.motion.baselineFinal.frame = b.motion.baselineInitial.frame
  const c = observed(-2)
  c.motion.actionFinal.generation = 2
  const d = observed(-2)
  d.motion.actionFinal.paused = true
  const e = observed(-2)
  e.final.found = false
  const f = observed(-2)
  f.motion.actionFinal.y = Number.NaN
  const g = observed(-2)
  g.initial.value = 999
  const h = observed(-2)
  h.motion.actionInitial.errors = 1
  const i = observed(-2)
  i.motion.actionFinal.frame = i.motion.actionInitial.frame
  const j = observed(-2)
  j.motion.baselineInitial.frame = -1
  for (const result of [a, b, c, d, e, f, g, h, i, j]) {
    expect(executionObservationUnavailableReason(rule(), result)).toBeDefined()
    expect(judgeExecutionObservation(rule(), result).passed).toBe(false)
  }
})

test('malformed encoded coordinates are unavailable rather than an exception or a false conclusion', () => {
  for (const value of [
    { format: 'sz-observed-v1', value: [0] },
    { format: 'sz-observed-v1', value: [3, 'Infinity'] },
    { $sz: 'error' },
  ]) {
    for (const side of ['initial', 'final'] as const) {
      const result = { ...observed(-2), [side]: { found: true, value } }
      expect(executionObservationUnavailableReason(rule(), result)).toBeDefined()
      expect(judgeExecutionObservation(rule(), result).passed).toBe(false)
    }
    expect(compareExecutionValue(-2, 'decreased', undefined, value)).toBe(false)
  }
})

test('only a directional path is inert draft text; final execution and historical targets remain strict', () => {
  for (const path of ['', 'avatar.', 'a.__proto__', 'two words']) {
    const candidate = {
      ...structuredClone(rawRule),
      expect: { ...rawRule.expect, target: { kind: 'spritePosition', path, axis: 'y' } },
    }
    expect(isSectionExecutionRule(candidate, 'draft')).toBe(true)
    expect(isSectionExecutionRule(candidate)).toBe(false)
    expect(isSectionExecutionRule(candidate, 'final')).toBe(false)
  }
  for (const path of ['avatar', 'actors.avatar']) {
    const candidate = {
      ...structuredClone(rawRule),
      expect: { ...rawRule.expect, target: { kind: 'spritePosition', path, axis: 'y' } },
    }
    expect(isSectionExecutionRule(candidate, 'draft')).toBe(true)
    expect(isSectionExecutionRule(candidate)).toBe(true)
  }
  for (const target of [
    { kind: 'spritePosition', path: 'x'.repeat(201), axis: 'y' },
    { kind: 'spritePosition', path: '', axis: 'z' },
    { kind: 'spritePosition', path: '', axis: 'y', extra: true },
    { kind: 'anything', path: '', axis: 'y' },
  ])
    expect(
      isSectionExecutionRule({ ...rawRule, expect: { ...rawRule.expect, target } }, 'draft'),
    ).toBe(false)
  expect(
    isSectionExecutionRule(
      {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: '' }, compare: 'changed' },
      },
      'draft',
    ),
  ).toBe(false)
  expect(
    isSectionExecutionRule({ ...rawRule, expect: { ...rawRule.expect, extra: true } }, 'draft'),
  ).toBe(false)
})

test('new relative comparators reject known text targets while retaining numeric or unknown values', () => {
  for (const compare of ['increased', 'decreased'] as const) {
    for (const target of [
      { kind: 'text' },
      { kind: 'console' },
      { kind: 'game', field: 'phase' },
    ]) {
      const candidate = { type: 'behavior', steps: [], expect: { target, compare } }
      expect(isSectionExecutionRule(candidate)).toBe(false)
      expect(isSectionExecutionRule(candidate, 'draft')).toBe(false)
    }
    for (const target of [
      { kind: 'value', path: 'pontos' },
      ...['score', 'goal', 'health'].map((field) => ({ kind: 'game', field })),
    ]) {
      expect(
        isSectionExecutionRule({ type: 'behavior', steps: [], expect: { target, compare } }),
      ).toBe(true)
    }
  }
  expect(
    isSectionExecutionRule({
      type: 'behavior',
      steps: [],
      expect: { target: { kind: 'text' }, compare: 'contains', value: 'Oi' },
    }),
  ).toBe(true)
  expect(
    isSectionExecutionRule({
      type: 'behavior',
      steps: [],
      expect: { target: { kind: 'game', field: 'phase' }, compare: 'equals', value: 'won' },
    }),
  ).toBe(true)
})
