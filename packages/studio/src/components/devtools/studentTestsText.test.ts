import { describe, expect, it } from 'bun:test'
import { createExecutionObservationCodec } from '@sistemazero/core/learning'
import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'
import { createDictionaryTranslator } from '../../core/i18n/translator'
import type { StudentTestOutcome } from '../../studentTests/runner'
import { STUDENT_TESTS_COPY } from './studentTestsCopy'
import {
  describeOutcome,
  describeTest,
  formFromTest,
  parseValueInput,
  type TestForm,
  testFromForm,
} from './studentTestsText'

/** Os textos das pranchas aprovadas de "Meus testes", escritos a partir dos testes de verdade. */
const t = createDictionaryTranslator(STUDENT_TESTS_COPY, 'pt-BR')
const seen = (value: unknown) => ({
  found: true,
  value: createExecutionObservationCodec().encode(value, 20_000),
})

const comecar: StudioStudentTest = {
  id: 'a',
  name: 'Começar o jogo',
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'Enter' }],
    expect: { target: { kind: 'value', path: 'estado' }, compare: 'equals', value: 'jogando' },
  },
}
const moeda: StudioStudentTest = {
  id: 'b',
  name: 'Encostar na moeda dá ponto',
  rule: {
    type: 'behavior',
    steps: [
      { action: 'press', key: 'Enter' },
      { action: 'press', key: 'ArrowLeft', holdMs: 1500 },
      { action: 'press', key: 'ArrowUp', holdMs: 1000 },
    ],
    expect: { target: { kind: 'value', path: 'pontos' }, compare: 'increased' },
  },
}
const heroi: StudioStudentTest = {
  id: 'c',
  name: 'O herói não sai da tela',
  rule: {
    type: 'behavior',
    steps: [
      { action: 'press', key: 'Enter' },
      { action: 'press', key: 'ArrowRight', holdMs: 4000 },
    ],
    expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'atMost', value: 296 },
  },
}

const outcome = (
  status: 'passed' | 'failed',
  initial: unknown,
  final: unknown,
  extra: Record<string, unknown> = {},
): StudentTestOutcome =>
  (status === 'passed'
    ? {
        status,
        observation: {
          id: 'x',
          type: 'behavior',
          initial: seen(initial),
          final: seen(final),
          errors: [],
        },
      }
    : {
        status,
        detail: 'x',
        ending: null,
        observation: {
          id: 'x',
          type: 'behavior',
          initial: seen(initial),
          final: seen(final),
          errors: [],
          ...extra,
        },
      }) as StudentTestOutcome

describe('os textos de "Meus testes"', () => {
  it('escreve cada teste como a prancha', () => {
    expect(describeTest(t, comecar)).toBe(
      'Quando eu apertar Enter. No fim, estado é igual a "jogando".',
    )
    expect(describeTest(t, moeda)).toBe(
      'Quando eu apertar Enter, segurar ← por 1,5 segundo e segurar ↑ por 1 segundo. No fim, pontos aumentou.',
    )
    expect(describeTest(t, heroi)).toBe(
      'Quando eu apertar Enter e segurar → por 4 segundos. No fim, a posição x do heroi é no máximo 296.',
    )
  })

  it('escreve o resultado como a prancha', () => {
    expect(describeOutcome(t, comecar, outcome('passed', 'titulo', 'jogando'))).toEqual({
      tone: 'passed',
      text: 'Passou: estado ficou "jogando".',
    })
    expect(describeOutcome(t, moeda, outcome('passed', 0, 1))?.text).toBe(
      'Passou: pontos foi de 0 para 1.',
    )
    expect(describeOutcome(t, heroi, outcome('failed', 100, 412))).toEqual({
      tone: 'failed',
      text: 'Não passou: a posição x do heroi terminou em 412.',
    })
  })

  it('o que não passou por outro motivo diz o motivo', () => {
    expect(describeOutcome(t, moeda, outcome('failed', 0, 0))?.text).toBe(
      'Não passou: pontos ficou em 0.',
    )
    expect(
      describeOutcome(t, comecar, outcome('failed', 'a', 'a', { errors: ['x is not defined'] }))
        ?.text,
    ).toBe('Não passou: o jogo deu erro durante o teste.')
    expect(
      describeOutcome(t, heroi, outcome('failed', 0, 0, { final: { found: false } }))?.text,
    ).toBe('Não passou: não achei heroi no jogo.')
    expect(describeOutcome(t, heroi, { status: 'timeout' })?.text).toBe(
      'Não passou: o jogo não respondeu a tempo.',
    )
    expect(describeOutcome(t, heroi, { status: 'cancelled' })).toBeNull()
  })

  it('o formulário vira o mesmo teste, e o teste vira o mesmo formulário', () => {
    for (const test of [comecar, moeda, heroi]) {
      const form = formFromTest(t, test)
      expect(testFromForm(t, form, test.id)).toEqual({ test })
    }
    expect(formFromTest(t, moeda).steps[1]).toEqual({
      kind: 'hold',
      key: 'ArrowLeft',
      seconds: '1,5',
    })
  })

  it('não salva o que não cabe: sem nome, sem o que conferir, sem valor ou além dos 15 segundos', () => {
    const base: TestForm = formFromTest(t, heroi)
    expect(testFromForm(t, { ...base, name: '  ' }, 'c')).toEqual({
      problem: 'tests.form.needName',
    })
    expect(testFromForm(t, { ...base, subject: '' }, 'c')).toEqual({
      problem: 'tests.form.needSubject',
    })
    expect(testFromForm(t, { ...base, value: '' }, 'c')).toEqual({
      problem: 'tests.form.needValue',
    })
    const longo: TestForm = {
      ...base,
      steps: [
        { kind: 'wait', seconds: '10' },
        { kind: 'hold', key: 'ArrowRight', seconds: '5' },
        { kind: 'press', key: 'Enter' },
      ],
    }
    expect(testFromForm(t, longo, 'c')).toEqual({ problem: 'tests.form.tooLong' })
    expect(
      testFromForm(t, { ...base, steps: [{ kind: 'hold', key: 'ArrowRight', seconds: '6' }] }, 'c'),
    ).toEqual({ problem: 'tests.form.limits' })
  })

  it('o valor digitado vira número, verdadeiro ou falso, ou texto', () => {
    expect(parseValueInput(t, '1,5')).toBe(1.5)
    expect(parseValueInput(t, '-3')).toBe(-3)
    expect(parseValueInput(t, 'Verdadeiro')).toBe(true)
    expect(parseValueInput(t, 'jogando')).toBe('jogando')
  })
})
