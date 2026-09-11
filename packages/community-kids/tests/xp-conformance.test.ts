import { describe, expect, test } from 'bun:test'
import { XP_VALUES } from '../../members/src/domain/gamification/gamification'
import { XP_SOURCE_VALUES, xpSources } from '../src/lib/xp-sources'

/**
 * Os cartões "quanto vale cada coisa" do Ranking mostram números do SERVIDOR. O kids não
 * depende do members (package.json), mas `gamification.ts` é um módulo puro (o único
 * import dele é de TIPO), então o alcançamos pelo caminho, no molde do
 * `badge-conformance`. Mudou o valor lá e não aqui, a tela mente para a criança.
 */
describe('placar (kids): quanto vale cada coisa, conforme o members', () => {
  test('cada número da tela é o que o servidor credita', () => {
    expect(XP_SOURCE_VALUES).toEqual({
      aula: XP_VALUES.LESSON_COMPLETE,
      quiz: XP_VALUES.QUIZ_PASSED_BASE,
      quizBonusMax: XP_VALUES.QUIZ_SCORE_BONUS_MAX,
      bau: XP_VALUES.UNIT_COMPLETE,
      publicar: XP_VALUES.STUDIO_PUBLISH_DAY,
    })
  })

  test('o jogo publicado só vira caminho para quem abre o Estúdio livre', () => {
    // O Estúdio é vendido à parte: sem ele, o cartão levaria a uma porta trancada.
    expect(xpSources({ canPublish: false }).map((s) => s.id)).toEqual(['aula', 'quiz', 'bau'])
    expect(xpSources({ canPublish: true }).map((s) => s.id)).toEqual([
      'aula',
      'publicar',
      'quiz',
      'bau',
    ])
  })

  test('o texto do cartão acompanha o número (nada escrito à mão fora da tabela)', () => {
    const quiz = xpSources({ canPublish: false }).find((s) => s.id === 'quiz')
    expect(quiz?.detail).toContain(`+${XP_VALUES.QUIZ_SCORE_BONUS_MAX}`)
  })
})
