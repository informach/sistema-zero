import { describe, expect, test } from 'bun:test'
import { spreadShotArrived, spreadShotHits } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { PredictionQuiz } from '../src/components/prediction-quiz'
import { TriploQuizScene, triploQuizState } from '../src/components/quiz-triplo-scene'
import type { QuizBlock } from '../src/lib/types'

/**
 * As cenas de previsão do Poder "Tiro triplo" (Construtor, 28/11/2026): todas rodam no motor da
 * experiência `spread-shot`; a 3D (`triplo-grupos`) é a rajada de desvio 0 desenhada com a caixa do
 * grupo `tiros` em volta das três cópias.
 */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const render = (scene: string, result: boolean) =>
  renderToStaticMarkup(<TriploQuizScene scene={scene} result={result} />)
const contar = (html: string, marca: string) => html.split(marca).length - 1

describe('triploQuizState', () => {
  test('triplo-juntos: três lasers com vx 0 na nave; depois só a pedra do meio', () => {
    const antes = triploQuizState('triplo-juntos', false).spreadShot
    expect(antes).toMatchObject({ triple: true, deviation: 0, rocks: [true, true, true] })
    expect(antes.lasers.map((l) => l.vx)).toEqual([0, 0, 0])
    expect(new Set(antes.lasers.map((l) => `${l.x},${l.y}`)).size).toBe(1)
    expect(spreadShotArrived(antes)).toBe(false)
    const depois = triploQuizState('triplo-juntos', true).spreadShot
    expect(spreadShotArrived(depois)).toBe(true)
    expect(spreadShotHits(depois)).toEqual([1])
    expect(depois.rocks).toEqual([true, false, true])
  })

  test('triplo-leque: vx −2, 0 e 2; depois as três pedras acertadas', () => {
    const antes = triploQuizState('triplo-leque', false).spreadShot
    expect(antes).toMatchObject({ triple: true, deviation: 2 })
    expect(antes.lasers.map((l) => l.vx)).toEqual([-2, 0, 2])
    const depois = triploQuizState('triplo-leque', true)
    expect([...spreadShotHits(depois.spreadShot)].sort()).toEqual([0, 1, 2])
    expect(depois.spreadShot.rocks).toEqual([false, false, false])
    expect(depois.evidence.discoveries).toContain('triple-spread')
  })

  test('triplo-um: antes, nenhum laser; depois, um só, que acerta a pedra do meio', () => {
    const antes = triploQuizState('triplo-um', false).spreadShot
    expect(antes.triple).toBe(false)
    expect(antes.lasers).toHaveLength(0)
    const depois = triploQuizState('triplo-um', true).spreadShot
    expect(depois.volley?.vx).toEqual([0])
    expect(spreadShotHits(depois)).toEqual([1])
  })

  test('triplo-grupos: a mesma conta da rajada de desvio 0', () => {
    expect(triploQuizState('triplo-grupos', true).spreadShot).toEqual(
      triploQuizState('triplo-juntos', true).spreadShot,
    )
  })
})

describe('TriploQuizScene', () => {
  test('as cenas 2D desenham o palco do tiro triplo com os lasers da rajada', () => {
    expect(contar(render('triplo-juntos', false), 'data-laser-no-ar="0"')).toBe(3)
    const juntos = render('triplo-juntos', true)
    expect(juntos).not.toContain('data-laser-no-ar')
    expect(juntos).toContain('data-pedra-acertada="1"')
    expect(juntos).not.toContain('data-pedra-acertada="0"')
    expect(juntos).not.toContain('data-pedra-acertada="2"')
    expect(render('triplo-leque', false)).toContain('data-laser-no-ar="-2"')
    const leque = render('triplo-leque', true)
    for (const pedra of [0, 1, 2]) expect(leque).toContain(`data-pedra-acertada="${pedra}"`)
    expect(contar(render('triplo-um', false), 'data-laser-no-ar')).toBe(0)
    const um = render('triplo-um', true)
    expect(contar(um, 'data-caminho=')).toBe(1)
    expect(um).toContain('data-caminho="pedra-1"')
    expect(texto(um)).toContain('Tiro simples')
  })

  test('cada cena tem a descrição para quem não vê o desenho, antes e depois do teste', () => {
    for (const scene of ['triplo-juntos', 'triplo-leque', 'triplo-um', 'triplo-grupos'])
      for (const result of [false, true]) {
        const html = render(scene, result)
        expect(html).toContain('aria-live="polite"')
        expect(html).toContain('role="img"')
        expect(html).toContain(result ? 'O que aconteceu' : 'Antes do teste')
      }
    expect(texto(render('triplo-juntos', true))).toContain('Só a pedra do meio foi acertada')
    expect(texto(render('triplo-leque', true))).toContain('As três pedras foram acertadas')
    expect(texto(render('triplo-um', true))).toContain('saiu um laser só')
  })

  test('triplo-grupos: as três cópias no grupo tiros, na nave e depois na pedra do meio', () => {
    const antes = render('triplo-grupos', false)
    expect(antes).toContain('data-triplo-grupos')
    expect(antes).toMatch(/data-grupo="tiros" data-copias="3"/)
    expect(antes).not.toContain('data-chegou')
    expect(contar(antes, 'data-copia=')).toBe(3)
    expect(contar(antes, 'data-vx="0"')).toBe(3)
    expect(antes).not.toContain('data-pedra-acertada')
    expect(texto(antes)).toContain('tiros')
    const depois = render('triplo-grupos', true)
    expect(depois).toContain('data-chegou=""')
    expect(depois).toContain('data-caminho-do-grupo="pedra-1"')
    expect(depois).toContain('data-pedra-acertada="1"')
    expect(depois).not.toContain('data-pedra-acertada="0"')
    expect(texto(depois)).toContain('chegaram juntas à pedra do meio')
  })

  test('o quiz de previsão monta a cena do tiro triplo pelo prefixo', () => {
    const content: QuizBlock = {
      kind: 'quiz',
      passingScore: 100,
      questions: [
        {
          id: 'grupos',
          predictionScene: 'triplo-grupos',
          prompt: 'Como os lasers vão sair?',
          choices: [
            { id: 'a', label: 'Em leque' },
            { id: 'b', label: 'Juntos e retos' },
          ],
        },
      ],
    }
    const html = renderToStaticMarkup(
      <PredictionQuiz blockId="quiz" content={content} quizState={null} />,
    )
    expect(html).toContain('data-triplo-grupos')
  })
})
