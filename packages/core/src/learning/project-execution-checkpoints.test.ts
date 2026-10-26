import { expect, test } from 'bun:test'
import {
  isSectionExecutionRule,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from './project-execution'

const rule: SectionExecutionRule = {
  type: 'behavior',
  steps: [{ action: 'click', x: 10, y: 20 }],
  expect: { target: { kind: 'value', path: 'achados' }, compare: 'equals', value: 2 },
  checkpoints: [
    {
      afterStep: 1,
      expect: { target: { kind: 'value', path: 'outro.opacity' }, compare: 'notEquals', value: 0 },
    },
  ],
}
test('pontos intermediários são obrigatórios e julgados, inclusive quando o resultado final acerta', () => {
  expect(isSectionExecutionRule(rule)).toBe(true)
  const seen = { id: 'teste', type: 'behavior' as const, final: { found: true, value: 2 } }
  expect(judgeExecutionObservation(rule, seen).passed).toBe(false)
  expect(
    judgeExecutionObservation(rule, {
      ...seen,
      checkpoints: [{ final: { found: true, value: 0 } }],
    }).passed,
  ).toBe(false)
  expect(
    judgeExecutionObservation(rule, { ...seen, checkpoints: [{ final: { found: false } }] }).passed,
  ).toBe(false)
  expect(
    judgeExecutionObservation(rule, {
      ...seen,
      checkpoints: [{ final: { found: true, value: 1 } }],
    }).passed,
  ).toBe(true)
})
test('recusa etapas fora da sequência, dados desconhecidos e seletores inválidos', () => {
  expect(
    isSectionExecutionRule({ ...rule, checkpoints: [{ afterStep: 2, expect: rule.expect }] }),
  ).toBe(false)
  expect(
    isSectionExecutionRule({
      ...rule,
      checkpoints: [{ afterStep: 0, expect: rule.expect, extra: true }],
    }),
  ).toBe(false)
  expect(
    isSectionExecutionRule({
      ...rule,
      expect: { target: { kind: 'text', selector: '' }, compare: 'equals', value: '' },
    }),
  ).toBe(false)
  expect(
    isSectionExecutionRule({
      ...rule,
      expect: {
        target: { kind: 'text', selector: '[data-sz-hud-kind="label"]' },
        compare: 'equals',
        value: '',
      },
    }),
  ).toBe(true)
})

test('sprite navigation validates paths, time budgets, obstacles and unknown data', () => {
  const step = {
    action: 'approachSprite',
    actorPath: 'personagem',
    targetPath: 'chave',
    timeoutMs: 4500,
    avoidPaths: ['farol'],
  }
  const valid = { ...rule, steps: [step] }
  expect(isSectionExecutionRule(valid)).toBe(true)
  for (const patch of [
    { actorPath: 'chave' },
    { targetPath: 'x.__proto__' },
    { timeoutMs: 7501 },
    { timeoutMs: 99 },
    { avoidPaths: ['farol', 'farol'] },
    { avoidPaths: ['chave'] },
    { avoidPaths: ['personagem'] },
    { extra: true },
  ])
    expect(
      isSectionExecutionRule({ ...valid, steps: [{ ...step, ...patch }] }),
      JSON.stringify(patch),
    ).toBe(false)
})

test('3D navigation requires a bounded floor and preserves the global time budget', () => {
  const step = {
    action: 'approachObject3d',
    actorPath: 'personagem',
    targetPath: 'chave',
    timeoutMs: 7000,
    walkable: [{ minX: -10, maxX: 10, minZ: -5, maxZ: 5 }],
  }
  expect(isSectionExecutionRule({ ...rule, steps: [step] })).toBe(true)
  for (const walkable of [
    undefined,
    [],
    [{ minX: 0, maxX: 0, minZ: 0, maxZ: 1 }],
    [{ minX: -1000, maxX: 1, minZ: 0, maxZ: 1 }],
    [{ minX: 0, maxX: 1, minZ: 0, maxZ: NaN }],
  ])
    expect(isSectionExecutionRule({ ...rule, steps: [{ ...step, walkable }] })).toBe(false)
  expect(isSectionExecutionRule({ ...rule, steps: [step, step, step] })).toBe(false)
  expect(isSectionExecutionRule({ ...rule, steps: [{ ...step, action: 'approachSprite' }] })).toBe(
    false,
  )
})
