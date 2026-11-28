import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PredictionQuiz } from '../src/components/prediction-quiz'
import {
  EscudoQuizScene,
  escudoQuizState,
  escudoSemGuardaLinha,
} from '../src/components/quiz-escudo-scene'
import type { QuizBlock } from '../src/lib/types'

/**
 * As cenas de previsão do Poder "Escudo temporário" (Construtor, 28/11/2026): as três 2D rodam no
 * motor da experiência `timed-shield`; a 3D (`escudo-sem-guarda`) é um desenho próprio, porque o
 * motor nunca deixa o Escudo negativo.
 */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const render = (scene: string, result: boolean) =>
  renderToStaticMarkup(<EscudoQuizScene scene={scene} result={result} />)

describe('escudoQuizState', () => {
  test('escudo-protege: Escudo 3 e 3 vidas com a pedra a um segundo; depois a pedra só sai', () => {
    const antes = escudoQuizState('escudo-protege', false).timedShield
    expect(antes).toMatchObject({ shield: 3, lives: 3, damaged: [], last: 'tick' })
    expect(antes.second + 1).toBe(5) // a pedra do segundo 5 bate no próximo segundo
    const depois = escudoQuizState('escudo-protege', true).timedShield
    expect(depois).toMatchObject({ second: 5, lives: 3, shield: 2, damaged: [] })
  })

  test('escudo-acabou: pegou há 5 segundos, Escudo 0 e 3 vidas; depois 2 vidas e sem bolha', () => {
    const antes = escudoQuizState('escudo-acabou', false).timedShield
    expect(antes).toMatchObject({ second: 7, shield: 0, lives: 3, damaged: [] })
    expect(antes.shieldBefore).not.toBeNull() // o item foi pego nesta partida
    const depois = escudoQuizState('escudo-acabou', true)
    expect(depois.timedShield).toMatchObject({ second: 8, shield: 0, lives: 2, damaged: [8] })
    expect(depois.evidence.discoveries).toContain('shield-ends')
  })

  test('escudo-renova: Escudo 2 antes; pegar o item põe 5 (troca, não soma)', () => {
    expect(escudoQuizState('escudo-renova', false).timedShield).toMatchObject({
      shield: 2,
      lives: 3,
      last: 'tick',
    })
    expect(escudoQuizState('escudo-renova', true).timedShield).toMatchObject({
      shield: 5,
      shieldBefore: 2,
      last: 'pick',
    })
  })
})

describe('EscudoQuizScene', () => {
  test('as cenas 2D desenham o palco do escudo com a bolha só quando o Escudo é maior que 0', () => {
    expect(render('escudo-protege', false)).toContain('data-bolha="3"')
    expect(render('escudo-protege', true)).toContain('data-bolha="2"')
    expect(render('escudo-protege', true)).toContain('data-batida="saiu"')
    expect(render('escudo-acabou', false)).not.toContain('data-bolha')
    expect(render('escudo-acabou', true)).not.toContain('data-bolha')
    expect(render('escudo-acabou', true)).toContain('data-batida="vida"')
    expect(render('escudo-renova', true)).toContain('data-bolha="5"')
  })

  test('cada cena tem a descrição para quem não vê o desenho, antes e depois do teste', () => {
    for (const scene of ['escudo-protege', 'escudo-acabou', 'escudo-renova', 'escudo-sem-guarda'])
      for (const result of [false, true]) {
        const html = render(scene, result)
        expect(html).toContain('aria-live="polite"')
        expect(html).toContain('role="img"')
        expect(html).toContain(result ? 'O que aconteceu' : 'Antes do teste')
      }
    expect(texto(render('escudo-acabou', true))).toContain('ficou com 2')
    expect(texto(render('escudo-renova', true))).toContain('foi para 5')
  })

  test('escudo-sem-guarda: a linha vai até o 0 com "?" e, depois, chega a -3 em destaque', () => {
    expect(escudoSemGuardaLinha(false)).toEqual([5, 4, 3, 2, 1, 0, '?'])
    expect(escudoSemGuardaLinha(true)).toEqual([5, 4, 3, 2, 1, 0, -1, -2, -3])
    const antes = render('escudo-sem-guarda', false)
    expect(antes).toContain('data-escudo-sem-guarda')
    expect(antes).toContain('data-valor="?"')
    expect(antes).not.toContain('data-valor="−1"')
    expect(antes).not.toContain('data-destaque')
    const depois = render('escudo-sem-guarda', true)
    expect(depois).not.toContain('data-valor="?"')
    expect(depois).toMatch(/data-valor="−3" data-destaque=""/)
    expect(depois).toContain('data-escudo-agora="−3"')
    expect(texto(depois)).toContain('o Escudo mostra -3')
  })

  test('o quiz de previsão monta a cena do escudo pelo prefixo', () => {
    const content: QuizBlock = {
      kind: 'quiz',
      passingScore: 100,
      questions: [
        {
          id: 'sem-guarda',
          predictionScene: 'escudo-sem-guarda',
          prompt: 'O que o Escudo mostra?',
          choices: [
            { id: 'a', label: '0' },
            { id: 'b', label: '-3' },
          ],
        },
      ],
    }
    const html = renderToStaticMarkup(
      <PredictionQuiz blockId="quiz" content={content} quizState={null} />,
    )
    expect(html).toContain('data-escudo-sem-guarda')
  })
})
