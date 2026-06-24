import { describe, expect, test } from 'bun:test'
import { DEFAULT_FUNNEL, isQuizComplete } from '../../src/funnels/registry'

const quiz = DEFAULT_FUNNEL.content.quiz

describe('isQuizComplete', () => {
  test('exige todas as respostas, incluindo o valor derivado da calculadora', () => {
    if (!quiz) throw new Error('funil default deve ter quiz')

    expect(isQuizComplete(quiz, { segmento: 'A' })).toBe(false)

    const answers = {
      segmento: 'A',
      tipo_criar: 'B',
      relacao_ia: 'C',
      ja_quebrou: 'D',
      trava_principal: 'A',
      custo_principal: 'B',
      horas_retrabalho: 10,
      valor_hora: 5000,
      mudanca_desejada: 'C',
      proximo_passo: 'D',
      sintese: 'A',
    }
    expect(isQuizComplete(quiz, answers)).toBe(false)

    expect(isQuizComplete(quiz, { ...answers, custo_mensal: 200000 })).toBe(true)
  })
})
