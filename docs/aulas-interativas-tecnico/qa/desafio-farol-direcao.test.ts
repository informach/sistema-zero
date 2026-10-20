import { expect, test } from 'bun:test'
import {
  executionRuleBudgetMs,
  isExecutionObjectiveList,
} from '../../../packages/core/src/learning/project-execution'
import { movimento, movimentoSemBorda } from './desafio-farol-criterios'
import { farolDirecaoObservada } from './desafio-farol-direcao'

test('only the prepared movement part combines taught structure with the four runtime directions', () => {
  expect(movimentoSemBorda).toHaveLength(6)
  expect(movimentoSemBorda.slice(0, 2).map(({ id }) => id)).toEqual(['direcional', 'andar'])
  expect(movimentoSemBorda.slice(2)).toEqual(farolDirecaoObservada('personagem'))
  expect(movimento.some(({ rule }) => rule.type === 'behavior')).toBe(false)
})

test('Farol direction candidate uses the canonical engine axes and a private idle per real key', () => {
  const checks = farolDirecaoObservada('elenco.aventureira')
  expect(isExecutionObjectiveList(checks.map(({ id, rule }) => ({ id, rule })))).toBe(true)
  expect(checks.map(({ id }) => id)).toEqual([
    'andar-cima',
    'andar-baixo',
    'andar-esquerda',
    'andar-direita',
  ])
  expect(checks.map(({ rule }) => rule)).toEqual(
    [
      ['ArrowUp', 'y', 'decreased'],
      ['ArrowDown', 'y', 'increased'],
      ['ArrowLeft', 'x', 'decreased'],
      ['ArrowRight', 'x', 'increased'],
    ].map(([key, axis, compare]) => ({
      type: 'behavior',
      observation: { type: 'idleBeforeAction', idleMs: 80 },
      steps: [{ action: 'press', key, holdMs: 80 }],
      expect: { target: { kind: 'spritePosition', path: 'elenco.aventureira', axis }, compare },
    })),
  )
  expect(checks.reduce((total, { rule }) => total + executionRuleBudgetMs(rule), 0)).toBe(640)
})

test('the explicit bound path can vary without selecting a name, color or movement magnitude', () => {
  for (const path of ['personagem', 'pirata', 'jogo.elenco.astronauta']) {
    const checks = farolDirecaoObservada(path)
    expect(checks).toHaveLength(4)
    expect(isExecutionObjectiveList(checks.map(({ id, rule }) => ({ id, rule })))).toBe(true)
    for (const check of checks) {
      if (check.rule.type !== 'behavior') throw new Error('Expected canonical behavior')
      expect(check.rule.expect.target).toHaveProperty('path', path)
      expect(check.rule.expect).not.toHaveProperty('value')
    }
  }
})

test('missing or unsafe binding is an authoring failure, never a guessed learner target', () => {
  for (const path of ['', 'heroi.__proto__', 'heroi.constructor', 'a.b.c.d.e'])
    expect(() => farolDirecaoObservada(path)).toThrow('Vincule o personagem')
})
