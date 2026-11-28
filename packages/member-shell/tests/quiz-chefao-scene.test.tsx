import { describe, expect, test } from 'bun:test'
import { BOSS_HEALTH } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { PredictionQuiz } from '../src/components/prediction-quiz'
import {
  ChefaoQuizScene,
  chefaoGuardaPlacar,
  chefaoQuizState,
  chefaoSemRetiradaVidas,
} from '../src/components/quiz-chefao-scene'
import type { QuizBlock } from '../src/lib/types'

/**
 * As cenas de previsão do Poder "Chefão com resistência" (Construtor, 28/11/2026): `chefao-um-tiro`
 * e `chefao-sem-guarda` rodam no motor da experiência `boss-health`; `chefao-sem-retirada` (o laser
 * que fica no grupo) e `chefao-guarda` (a patrulha 3D) são desenhos próprios.
 */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const render = (scene: string, result: boolean) =>
  renderToStaticMarkup(<ChefaoQuizScene scene={scene} result={result} />)
const contar = (html: string, marca: string) => html.split(marca).length - 1
const CENAS = ['chefao-um-tiro', 'chefao-sem-retirada', 'chefao-sem-guarda', 'chefao-guarda']

describe('chefaoQuizState', () => {
  test('chefao-um-tiro: antes, vida 5 sem laser; depois de um Disparar, vida 4 e o chefão lá', () => {
    const antes = chefaoQuizState('chefao-um-tiro', false).bossHealth
    expect(antes).toMatchObject({ life: BOSS_HEALTH.life, score: 0, last: null })
    const depois = chefaoQuizState('chefao-um-tiro', true).bossHealth
    expect(depois).toMatchObject({ life: 4, score: 0, last: 'hit' })
  })

  test('chefao-sem-guarda: antes, a vida em 0 e o placar em 10; depois de 3 quadros, 40', () => {
    const antes = chefaoQuizState('chefao-sem-guarda', false).bossHealth
    expect(antes).toMatchObject({ life: 0, score: BOSS_HEALTH.prize, guard: false, last: 'defeat' })
    const depois = chefaoQuizState('chefao-sem-guarda', true)
    expect(depois.bossHealth).toMatchObject({ life: 0, score: 40, guard: false, framesAfter: 3 })
    expect(depois.bossHealth.score).toBeGreaterThan(antes.score)
  })
})

describe('os desenhos próprios', () => {
  test('chefao-sem-retirada: um laser só leva a vida de 5 a 0, um quadro de cada vez', () => {
    expect(chefaoSemRetiradaVidas(false)).toEqual([])
    expect(chefaoSemRetiradaVidas(true)).toEqual([4, 3, 2, 1, 0])
  })

  test('chefao-guarda: o placar em 15; depois, 25 nos três quadros e a guarda verdadeiro', () => {
    expect(chefaoGuardaPlacar(false)).toEqual({
      vida: 1,
      derrotado: false,
      quadros: [],
      placar: 15,
    })
    expect(chefaoGuardaPlacar(true)).toEqual({
      vida: 0,
      derrotado: true,
      quadros: [25, 25, 25],
      placar: 25,
    })
  })
})

describe('ChefaoQuizScene', () => {
  test('as cenas do motor desenham o palco do chefão com a vida e o placar', () => {
    const umAntes = render('chefao-um-tiro', false)
    expect(umAntes).toContain('data-chefao="5"')
    expect(texto(umAntes)).toContain('Vida 5')
    expect(umAntes).not.toContain('data-laser-acertou')
    const um = render('chefao-um-tiro', true)
    expect(um).toContain('data-chefao="4"')
    expect(texto(um)).toContain('Vida 4')
    expect(um).toContain('data-laser-acertou')
    const guardaAntes = render('chefao-sem-guarda', false)
    expect(guardaAntes).toContain('data-chefao="caiu"')
    expect(texto(guardaAntes)).toContain('Placar 10')
    expect(texto(guardaAntes)).toContain('Guarda do prêmio Desligada')
    const guarda = render('chefao-sem-guarda', true)
    expect(texto(guarda)).toContain('Placar 40')
  })

  test('chefao-sem-retirada: antes, o laser encostado no grupo tiros; depois, cinco quadros', () => {
    const antes = render('chefao-sem-retirada', false)
    expect(antes).toContain('data-chefao-sem-retirada')
    expect(antes).toContain('data-chefao="5"')
    expect(antes).toMatch(/data-grupo="tiros" data-no-grupo="1"/)
    expect(contar(antes, 'data-laser=')).toBe(1)
    expect(texto(antes)).toContain('o laser continua no grupo tiros')
    expect(antes).not.toContain('data-quadro-sem-retirada')
    const depois = render('chefao-sem-retirada', true)
    expect(contar(depois, 'data-quadro-sem-retirada=')).toBe(5)
    for (const vida of [4, 3, 2, 1, 0]) expect(depois).toContain(`data-vida="${vida}"`)
    expect(contar(depois, 'data-laser=')).toBe(5)
    expect(contar(depois, 'data-chefao-caiu')).toBe(1)
    expect(texto(depois)).toContain('Vida 0')
    expect(texto(depois)).toContain('o chefão caiu')
  })

  test('chefao-guarda: antes, placar 15 e Chefão: 1; depois, 25 três vezes e o chefão caiu', () => {
    const antes = render('chefao-guarda', false)
    expect(antes).toContain('data-chefao-guarda')
    expect(texto(antes)).toContain('Patrulha (3D)')
    expect(texto(antes)).toContain('Placar: 15')
    expect(texto(antes)).toContain('Chefão: 1')
    expect(antes).toContain('data-valor="falso"')
    expect(texto(antes)).toContain('= falso')
    expect(antes).not.toContain('data-chefao-caiu')
    const depois = render('chefao-guarda', true)
    expect(contar(depois, 'data-quadro-guarda=')).toBe(3)
    expect(contar(texto(depois), 'Placar: 25')).toBe(4)
    expect(depois).toContain('data-chefao-caiu')
    expect(depois).not.toContain('data-texto-chefao')
    expect(depois).toContain('data-valor="verdadeiro"')
    expect(texto(depois)).toContain('= verdadeiro')
  })

  test('cada cena tem a descrição para quem não vê o desenho, antes e depois do teste', () => {
    for (const scene of CENAS)
      for (const result of [false, true]) {
        const html = render(scene, result)
        expect(html).toContain('aria-live="polite"')
        expect(html).toContain('role="img"')
        expect(html).toContain(result ? 'O que aconteceu' : 'Antes do teste')
        expect(texto(html)).not.toMatch(/\bIA\b/)
      }
    expect(texto(render('chefao-um-tiro', true))).toContain('A vida foi de 5 para 4')
    expect(texto(render('chefao-sem-retirada', true))).toContain('Um laser só levou toda a vida')
    expect(texto(render('chefao-sem-guarda', true))).toContain('O placar foi para 20, 30 e 40')
    expect(texto(render('chefao-guarda', true))).toContain('o placar ficou em 25')
  })

  test('o antes do teste não entrega a resposta', () => {
    expect(texto(render('chefao-um-tiro', false))).not.toContain('Vida 4')
    expect(texto(render('chefao-sem-retirada', false))).not.toContain('Vida 0')
    expect(texto(render('chefao-sem-guarda', false))).not.toMatch(/Placar [2-9]0/)
    expect(texto(render('chefao-guarda', false))).not.toContain('25')
  })

  test('o quiz de previsão monta a cena do chefão pelo prefixo', () => {
    const content: QuizBlock = {
      kind: 'quiz',
      passingScore: 100,
      questions: [
        {
          id: 'guarda',
          predictionScene: 'chefao-guarda',
          prompt: 'Como fica o placar?',
          choices: [
            { id: 'a', label: 'Em 25' },
            { id: 'b', label: 'Sobe sem parar' },
          ],
        },
      ],
    }
    const html = renderToStaticMarkup(
      <PredictionQuiz blockId="quiz" content={content} quizState={null} />,
    )
    expect(html).toContain('data-chefao-guarda')
  })
})
