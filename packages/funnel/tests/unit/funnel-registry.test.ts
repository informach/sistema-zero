import { describe, expect, test } from 'bun:test'
import { DEFAULT_FUNNEL, type FunnelQuiz, isQuizComplete } from '../../src/funnels/registry'

const quiz: FunnelQuiz = {
  steps: DEFAULT_FUNNEL.content.quiz!.steps.slice(0, 2),
  total: 2,
  valueSchema: {},
}

describe('isQuizComplete', () => {
  test('a regra compartilhada exige respostas para todas as perguntas declaradas', () => {
    expect(isQuizComplete(quiz, {})).toBe(false)
    expect(isQuizComplete(quiz, { tempo_jogo: 'menos_3' })).toBe(false)
    expect(isQuizComplete(quiz, { tempo_jogo: 'menos_3', computador: 'meu' })).toBe(true)
  })
})
