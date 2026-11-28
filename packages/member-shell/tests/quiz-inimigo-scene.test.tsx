import { describe, expect, test } from 'bun:test'
import { ENEMY_FIRE, enemyFireX } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { PredictionQuiz } from '../src/components/prediction-quiz'
import {
  InimigoQuizScene,
  inimigoLimpezaGrupo,
  inimigoQuizState,
} from '../src/components/quiz-inimigo-scene'
import type { QuizBlock } from '../src/lib/types'

/**
 * As cenas de previsão do Poder "Inimigo que atira" (Construtor, 28/11/2026): as três 2D rodam no
 * motor da experiência `enemy-fire`; a 3D (`inimigo-limpeza`) é o desenho do grupo `tirosInimigos`
 * sem o bloco que tira os tiros que passaram da nave.
 */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const render = (scene: string, result: boolean) =>
  renderToStaticMarkup(<InimigoQuizScene scene={scene} result={result} />)
const contar = (html: string, marca: string) => html.split(marca).length - 1

describe('inimigoQuizState', () => {
  test('inimigo-meio: antes, a partida nova sem tiro; depois, o tiro nasce no meio, longe da inimiga', () => {
    const antes = inimigoQuizState('inimigo-meio', false).enemyFire
    expect(antes).toMatchObject({ tick: 0, origin: 'middle', lives: 3, shots: [] })
    expect(enemyFireX(antes.tick)).toBeLessThan(ENEMY_FIRE.middle)
    const depois = inimigoQuizState('inimigo-meio', true).enemyFire
    expect(enemyFireX(depois.tick)).toBe(200)
    expect(depois.last).toBe('fire')
    expect(depois.lives).toBe(3)
    const novo = depois.shots[depois.shots.length - 1]
    expect(novo).toEqual({
      x: ENEMY_FIRE.middle,
      y: ENEMY_FIRE.enemyY,
      origin: 'middle',
      from: 200,
    })
    expect(depois.shots.every((shot) => shot.x === ENEMY_FIRE.middle)).toBe(true)
  })

  test('inimigo-segue: antes, a inimiga à direita sem tiro; depois, o tiro nasce embaixo dela, em 600', () => {
    const antes = inimigoQuizState('inimigo-segue', false).enemyFire
    expect(antes).toMatchObject({ origin: 'enemy', shots: [] })
    expect(enemyFireX(antes.tick)).toBeGreaterThan(ENEMY_FIRE.middle)
    const depois = inimigoQuizState('inimigo-segue', true).enemyFire
    expect(enemyFireX(depois.tick)).toBe(600)
    expect(depois.shots).toEqual([{ x: 600, y: ENEMY_FIRE.enemyY, origin: 'enemy', from: 600 }])
  })

  test('inimigo-acerta: o tiro logo acima da nave com 3 vidas; depois, ele sai e ficam 2', () => {
    const antes = inimigoQuizState('inimigo-acerta', false).enemyFire
    expect(antes.lives).toBe(3)
    expect(antes.shipX).toBe(600)
    const acima = antes.shots.find((shot) => shot.x === antes.shipX)
    expect(acima?.y).toBe(ENEMY_FIRE.shipY - ENEMY_FIRE.fall)
    const depois = inimigoQuizState('inimigo-acerta', true)
    expect(depois.enemyFire.lives).toBe(2)
    expect(depois.enemyFire.last).toBe('hit')
    expect(depois.enemyFire.shots.some((shot) => shot.x === depois.enemyFire.shipX)).toBe(false)
    expect(depois.evidence.discoveries).toContain('shot-hurts')
  })
})

describe('inimigoLimpezaGrupo', () => {
  test('3 segundos: dois tiros vindo; 9 segundos: seis no grupo, quatro já passaram da nave', () => {
    const antes = inimigoLimpezaGrupo(false)
    expect(antes.segundos).toBe(3)
    expect(antes.tiros.map((t) => t.passou)).toEqual([false, false])
    const depois = inimigoLimpezaGrupo(true)
    expect(depois.segundos).toBe(9)
    expect(depois.tiros).toHaveLength(6)
    expect(depois.tiros.filter((t) => t.passou)).toHaveLength(4)
    expect(depois.tiros.map((t) => t.saiu)).toEqual([1.5, 3, 4.5, 6, 7.5, 9])
  })
})

describe('InimigoQuizScene', () => {
  test('as cenas 2D desenham o palco do inimigo com os tiros do motor', () => {
    const meioAntes = render('inimigo-meio', false)
    expect(meioAntes).toContain('data-origem="meio"')
    expect(contar(meioAntes, 'data-tiro-inimigo=')).toBe(0)
    expect(meioAntes).toContain('data-inimiga="300"')
    const meio = render('inimigo-meio', true)
    expect(meio).toContain('data-inimiga="200"')
    expect(contar(meio, 'data-tiro-inimigo="middle"')).toBe(2)
    const segueAntes = render('inimigo-segue', false)
    expect(segueAntes).toContain('data-origem="inimiga"')
    expect(contar(segueAntes, 'data-tiro-inimigo=')).toBe(0)
    const segue = render('inimigo-segue', true)
    expect(segue).toContain('data-inimiga="600"')
    expect(contar(segue, 'data-tiro-inimigo="enemy"')).toBe(1)
    const acertaAntes = render('inimigo-acerta', false)
    expect(texto(acertaAntes)).toContain('Vidas 3')
    expect(acertaAntes).not.toContain('data-encostou')
    const acerta = render('inimigo-acerta', true)
    expect(texto(acerta)).toContain('Vidas 2')
    expect(acerta).toContain('data-encostou')
    expect(contar(acerta, 'data-tiro-inimigo=')).toBe(1)
  })

  test('cada cena tem a descrição para quem não vê o desenho, antes e depois do teste', () => {
    for (const scene of ['inimigo-meio', 'inimigo-segue', 'inimigo-acerta', 'inimigo-limpeza'])
      for (const result of [false, true]) {
        const html = render(scene, result)
        expect(html).toContain('aria-live="polite"')
        expect(html).toContain('role="img"')
        expect(html).toContain(result ? 'O que aconteceu' : 'Antes do teste')
        expect(texto(html)).not.toMatch(/\bIA\b/)
      }
    expect(texto(render('inimigo-meio', false))).toContain('ainda não há tiro no ar')
    expect(texto(render('inimigo-meio', true))).toContain('O tiro nasceu no meio da tela')
    expect(texto(render('inimigo-segue', true))).toContain('O tiro nasceu embaixo dela')
    expect(texto(render('inimigo-acerta', true))).toContain('A nave ficou com 2 vidas')
  })

  test('inimigo-limpeza: a caixa tirosInimigos com 2 tiros; depois, 6, quatro atrás da câmera', () => {
    const antes = render('inimigo-limpeza', false)
    expect(antes).toContain('data-inimigo-limpeza')
    expect(antes).toMatch(/data-grupo="tirosInimigos" data-no-grupo="2"/)
    expect(contar(antes, 'data-tiro-3d="vindo"')).toBe(2)
    expect(antes).not.toContain('data-tiro-3d="atras-da-camera"')
    expect(texto(antes)).toContain('no grupo: 2')
    expect(texto(antes)).toContain('tirosInimigos')
    expect(texto(antes)).not.toContain('atrás da câmera')
    const depois = render('inimigo-limpeza', true)
    expect(depois).toMatch(/data-grupo="tirosInimigos" data-no-grupo="6"/)
    expect(contar(depois, 'data-tiro-3d="vindo"')).toBe(2)
    expect(contar(depois, 'data-tiro-3d="atras-da-camera"')).toBe(4)
    expect(texto(depois)).toContain('no grupo: 6')
    expect(texto(depois)).toContain('atrás da câmera')
    expect(texto(depois)).toContain('Patrulha (3D)')
    expect(depois).toContain('Os outros quatro já passaram da nave')
  })

  test('o quiz de previsão monta a cena do inimigo pelo prefixo', () => {
    const content: QuizBlock = {
      kind: 'quiz',
      passingScore: 100,
      questions: [
        {
          id: 'limpeza',
          predictionScene: 'inimigo-limpeza',
          prompt: 'Quantos tiros há no grupo?',
          choices: [
            { id: 'a', label: 'Dois' },
            { id: 'b', label: 'Seis' },
          ],
        },
      ],
    }
    const html = renderToStaticMarkup(
      <PredictionQuiz blockId="quiz" content={content} quizState={null} />,
    )
    expect(html).toContain('data-inimigo-limpeza')
  })
})
