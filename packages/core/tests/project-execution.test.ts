import { describe, expect, test } from 'bun:test'
import {
  compareExecutionValue,
  executionProjectChecks,
  executionRuleBudgetMs,
  executionValuesEqual,
  isExecutionObjectiveList,
  isSectionCompletion,
  isSectionExecutionRule,
  judgeExecutionObservation,
  projectObjectiveKind,
  projectObjectiveView,
  type SectionExecutionRule,
} from '../src/learning'

const anda: SectionExecutionRule = {
  type: 'behavior',
  steps: [{ action: 'press', key: 'ArrowRight', holdMs: 300 }],
  expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'greaterThan', value: 50 },
}
const dobro: SectionExecutionRule = {
  type: 'functionReturns',
  name: 'dobro',
  cases: [
    { args: [2], expected: 4 },
    { args: [[1, 2]], expected: { total: 3 } },
  ],
}

describe('a forma das regras que rodam o jogo', () => {
  test('cliques em alvos usam caminhos fechados e só repetem um ponto anterior', () => {
    const rule = (steps: unknown[]) => ({ ...anda, steps })
    const sprite = {
      action: 'clickTarget',
      target: { kind: 'sprite', path: 'esconderijo1', groupPath: 'esconderijos' },
    }
    const empty = { action: 'clickTarget', target: { kind: 'outsideGroup', path: 'esconderijos' } }
    const repeat = { action: 'clickTarget', target: { kind: 'lastPoint' } }
    expect(isSectionExecutionRule(rule([sprite, repeat]))).toBe(true)
    expect(isSectionExecutionRule(rule([empty]))).toBe(true)
    expect(isSectionExecutionRule(rule([repeat]))).toBe(false)
    expect(isSectionExecutionRule(rule([{ action: 'click', x: 2, y: 3 }, repeat]))).toBe(false)
    expect(
      isSectionExecutionRule(rule([sprite, { ...repeat, target: { kind: 'lastPoint', x: 2 } }])),
    ).toBe(false)
    for (const path of [
      'a.__proto__',
      'a.constructor',
      'prototype',
      'a.b.c.d.e',
      'a[0]',
      'a'.repeat(201),
    ]) {
      expect(
        isSectionExecutionRule(rule([{ ...sprite, target: { ...sprite.target, path } }])),
      ).toBe(false)
      expect(
        isSectionExecutionRule(
          rule([{ ...sprite, target: { ...sprite.target, groupPath: path } }]),
        ),
      ).toBe(false)
    }
    expect(
      isSectionExecutionRule(rule([{ ...sprite, target: { ...sprite.target, expected: 1 } }])),
    ).toBe(false)
    expect(isSectionExecutionRule(rule(Array.from({ length: 21 }, () => sprite)))).toBe(false)
  })

  test('aceita o que a autoria monta e recusa o que estoura os limites', () => {
    expect(isSectionExecutionRule(anda)).toBe(true)
    expect(isSectionExecutionRule(dobro)).toBe(true)
    expect(
      isSectionExecutionRule({
        ...anda,
        steps: [
          { action: 'wait', ms: 10_000 },
          { action: 'wait', ms: 6_000 },
        ],
      }),
    ).toBe(false)
    expect(isSectionExecutionRule({ ...anda, steps: [{ action: 'press', key: 'F5' }] })).toBe(false)
    expect(
      isSectionExecutionRule({
        ...anda,
        expect: { ...anda.expect, target: { kind: 'value', path: 'heroi.constructor.x.y.z' } },
      }),
    ).toBe(false)
    expect(
      isSectionExecutionRule({ ...anda, expect: { ...anda.expect, value: 'cinquenta' } }),
    ).toBe(false)
    expect(isSectionExecutionRule({ ...dobro, name: '2dobro' })).toBe(false)
    expect(isSectionExecutionRule({ ...dobro, module: '../segredo.ts' })).toBe(false)
    expect(isSectionExecutionRule({ ...dobro, cases: [] })).toBe(false)
  })

  test('a conclusão da parte aceita execução, com teto de 8 por parte', () => {
    const check = (i: number) => ({ id: `e${i}`, label: 'x', rule: anda })
    expect(
      isSectionCompletion({ version: 1, blockIds: [], projectChecks: [check(1), check(2)] }),
    ).toBe(true)
    expect(
      isSectionCompletion({
        version: 1,
        blockIds: [],
        projectChecks: Array.from({ length: 9 }, (_, i) => check(i)),
      }),
    ).toBe(false)
    expect(
      isSectionCompletion({
        version: 1,
        blockIds: [],
        projectChecks: [{ id: 'a', label: 'x', rule: { ...anda, steps: 'nada' } }],
      }),
    ).toBe(false)
  })

  test('a criança vê o TIPO e nunca a resposta esperada', () => {
    expect(projectObjectiveKind(anda)).toBe('game')
    expect(projectObjectiveKind(dobro)).toBe('function')
    const view = projectObjectiveView({ id: 'a', label: 'Faça andar', rule: dobro })
    expect(view).toEqual({ id: 'a', label: 'Faça andar', kind: 'function' })
    expect(JSON.stringify(view)).not.toContain('total')
  })

  test('o prazo de cada objetivo entra no teto da parte (40 s)', () => {
    expect(executionRuleBudgetMs(anda)).toBe(300)
    expect(executionRuleBudgetMs(dobro)).toBe(4_000)
    expect(executionRuleBudgetMs({ type: 'script', steps: [], code: 'return true' })).toBe(3_000)
    const espera: SectionExecutionRule = {
      ...anda,
      steps: [
        { action: 'wait', ms: 10_000 },
        { action: 'wait', ms: 5_000 },
      ],
    }
    const lista = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `e${i}`, rule: espera }))
    expect(isExecutionObjectiveList(lista(2))).toBe(true)
    expect(isExecutionObjectiveList(lista(3))).toBe(false)
  })

  test('separa os de execução dos de estrutura', () => {
    const checks = [
      { id: 'a', rule: anda },
      { id: 'b', rule: { type: 'usesLoop' as const } },
    ]
    expect(executionProjectChecks(checks).map((c) => c.id)).toEqual(['a'])
    expect(isExecutionObjectiveList([{ id: 'a', rule: anda }])).toBe(true)
    expect(isExecutionObjectiveList([])).toBe(false)
    expect(
      isExecutionObjectiveList([
        { id: 'a', rule: anda },
        { id: 'a', rule: anda },
      ]),
    ).toBe(false)
  })
})

describe('o julgamento do que o executor viu', () => {
  test('o jogo faz algo: compara o fim com o esperado e diz o motivo para a equipe', () => {
    expect(
      judgeExecutionObservation(anda, {
        id: 'a',
        type: 'behavior',
        final: { found: true, value: 224 },
      }),
    ).toEqual({ passed: true })
    expect(
      judgeExecutionObservation(anda, {
        id: 'a',
        type: 'behavior',
        final: { found: true, value: 20 },
      }),
    ).toEqual({
      passed: false,
      detail: 'Esperava heroi.x maior que 50; o jogo mostrou 20.',
    })
    expect(
      judgeExecutionObservation(anda, { id: 'a', type: 'behavior', final: { found: false } }),
    ).toEqual({ passed: false, detail: 'Não achei heroi.x no jogo.' })
    expect(judgeExecutionObservation(anda, undefined).passed).toBe(false)
    expect(
      judgeExecutionObservation(anda, { id: 'a', type: 'behavior', error: 'a página não abriu' }),
    ).toEqual({ passed: false, detail: 'O teste não terminou: a página não abriu' })
  })

  test('"mudou" compara com o começo', () => {
    const mudou: SectionExecutionRule = {
      ...anda,
      expect: { target: { kind: 'value', path: 'pontos' }, compare: 'changed' },
    }
    const obs = (from: unknown, to: unknown) =>
      judgeExecutionObservation(mudou, {
        id: 'a',
        type: 'behavior',
        initial: { found: true, value: from },
        final: { found: true, value: to },
      }).passed
    expect(obs(0, 1)).toBe(true)
    expect(obs(0, 0)).toBe(false)
    expect(obs({ x: 1 }, { x: 1 })).toBe(false)
  })

  test('marcadores do navegador: undefined e NaN não "existem"; leitura cortada nunca aprova', () => {
    expect(compareExecutionValue({ $sz: 'undefined' }, 'truthy', undefined)).toBe(false)
    expect(compareExecutionValue({ $sz: 'NaN' }, 'truthy', undefined)).toBe(false)
    expect(compareExecutionValue({ $sz: 'function' }, 'truthy', undefined)).toBe(true)
    for (const mark of ['large', 'deep', 'error']) {
      expect(compareExecutionValue({ $sz: mark }, 'notEquals', 3)).toBe(false)
      expect(compareExecutionValue({ $sz: mark }, 'notContains', 'x')).toBe(false)
      expect(compareExecutionValue({ $sz: mark }, 'truthy', undefined)).toBe(false)
      expect(compareExecutionValue(1, 'changed', undefined, { $sz: mark })).toBe(false)
    }
    // A metade que tem que passar: um objeto de verdade com a chave $sz e mais coisa não é marcador.
    expect(compareExecutionValue({ $sz: 'large', outro: 1 }, 'truthy', undefined)).toBe(true)
  })

  test('"mudou" sem a leitura do começo não passa', () => {
    const mudou: SectionExecutionRule = {
      ...anda,
      expect: { target: { kind: 'value', path: 'pontos' }, compare: 'changed' },
    }
    const verdict = judgeExecutionObservation(mudou, {
      id: 'a',
      type: 'behavior',
      initial: { found: false },
      final: { found: true, value: 5 },
    })
    expect(verdict.passed).toBe(false)
    expect(verdict.detail).toContain('no começo do teste')
    expect(
      judgeExecutionObservation(mudou, {
        id: 'a',
        type: 'behavior',
        initial: { found: true, value: { $sz: 'undefined' } },
        final: { found: true, value: 5 },
      }).passed,
    ).toBe(true)
  })

  test('a regra em JavaScript: só true passa e o motivo vai para a equipe', () => {
    const regra: SectionExecutionRule = { type: 'script', steps: [], code: 'return true' }
    const obs = (extra: object) =>
      judgeExecutionObservation(regra, { id: 'r', type: 'script', ...extra })
    expect(obs({ verdict: true, returned: 'true' })).toEqual({ passed: true })
    expect(obs({ verdict: false, returned: 'false' }).detail).toBe(
      'A regra em JavaScript devolveu false.',
    )
    expect(obs({ verdict: false, returned: '3' }).detail).toBe(
      'A regra em JavaScript precisa devolver true ou false; devolveu 3.',
    )
    expect(obs({ verdict: false, scriptError: 'x is not defined' }).detail).toBe(
      'A regra em JavaScript deu erro: x is not defined',
    )
    expect(obs({}).passed).toBe(false)
  })

  test('a função precisa acertar TODOS os casos', () => {
    expect(
      judgeExecutionObservation(dobro, {
        id: 'f',
        type: 'functionReturns',
        cases: [
          { ok: true, value: 4 },
          { ok: true, value: { total: 3 } },
        ],
      }),
    ).toEqual({ passed: true })
    expect(
      judgeExecutionObservation(dobro, {
        id: 'f',
        type: 'functionReturns',
        cases: [
          { ok: true, value: 4 },
          { ok: true, value: { total: 4 } },
        ],
      }),
    ).toEqual({
      passed: false,
      detail: 'Com ([1,2]) respondeu {"total":4}; esperava {"total":3}.',
    })
    expect(
      judgeExecutionObservation(dobro, { id: 'f', type: 'functionReturns', missing: true }).detail,
    ).toBe('Não achei a função dobro.')
    expect(
      judgeExecutionObservation(dobro, {
        id: 'f',
        type: 'functionReturns',
        cases: [{ ok: false, error: 'x is not defined' }],
      }).detail,
    ).toBe('Com (2) a função deu erro: x is not defined.')
  })

  test('igualdade tolera arredondamento e "contém" ignora maiúsculas', () => {
    expect(executionValuesEqual(0.1 + 0.2, 0.3)).toBe(true)
    expect(executionValuesEqual([1, { a: 2 }], [1, { a: 2 }])).toBe(true)
    expect(executionValuesEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(compareExecutionValue('Você VENCEU!', 'contains', 'venceu')).toBe(true)
    expect(compareExecutionValue('5', 'equals', 5)).toBe(true)
    expect(compareExecutionValue([], 'truthy', undefined)).toBe(false)
  })
})
