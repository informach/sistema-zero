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
