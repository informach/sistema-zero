import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PredictionQuiz } from '../src/components/prediction-quiz'
import { ArmaQuizScene, armaPlacarEstado, armaQuizState } from '../src/components/quiz-arma-scene'
import type { QuizBlock } from '../src/lib/types'

/**
 * As cenas de previsão do Poder "Troca de arma" (Construtor, 28/11/2026): as três 2D rodam no motor
 * da experiência `weapon-swap`; a 3D (`arma-placar`) é o desenho do texto "Arma" que só foi escrito
 * em Ao iniciar.
 */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const render = (scene: string, result: boolean) =>
  renderToStaticMarkup(<ArmaQuizScene scene={scene} result={result} />)
const contar = (html: string, marca: string) => html.split(marca).length - 1
const CENAS = ['arma-trancada', 'arma-plasma', 'arma-reinicio', 'arma-placar']

describe('armaQuizState', () => {
  test('arma-trancada: antes, laser sem o item; depois do E, continua laser', () => {
    const antes = armaQuizState('arma-trancada', false).weaponSwap
    expect(antes).toMatchObject({ weapon: 'laser', unlocked: false, shot: null, last: null })
    const depois = armaQuizState('arma-trancada', true).weaponSwap
    expect(depois).toMatchObject({ weapon: 'laser', unlocked: false, shot: null, last: 'locked' })
  })

  test('arma-plasma: antes, o plasma sem tiro; depois do Espaço, o tiro de plasma', () => {
    const antes = armaQuizState('arma-plasma', false).weaponSwap
    expect(antes).toMatchObject({ weapon: 'plasma', unlocked: true, shot: null, last: 'swap' })
    const depois = armaQuizState('arma-plasma', true).weaponSwap
    expect(depois.shot).toEqual({ weapon: 'plasma', frames: 10 })
    expect(depois.last).toBe('fire')
  })

  test('arma-reinicio: antes, o plasma; depois da Nova partida, laser e plasma trancado', () => {
    const antes = armaQuizState('arma-reinicio', false).weaponSwap
    expect(antes).toMatchObject({ weapon: 'plasma', unlocked: true })
    const depois = armaQuizState('arma-reinicio', true)
    expect(depois.weaponSwap).toMatchObject({
      weapon: 'laser',
      unlocked: false,
      shot: null,
      last: 'back-to-laser',
    })
    expect(depois.evidence.discoveries).toContain('new-match-laser')
  })
})

describe('armaPlacarEstado', () => {
  test('o texto fica laser; a variável vai de laser a plasma', () => {
    expect(armaPlacarEstado(false)).toEqual({ texto: 'laser', arma: 'laser', liberado: true })
    expect(armaPlacarEstado(true)).toEqual({ texto: 'laser', arma: 'plasma', liberado: true })
  })
})

describe('ArmaQuizScene', () => {
  test('as cenas 2D desenham o palco da troca de arma com o motor', () => {
    const trancadaAntes = render('arma-trancada', false)
    expect(texto(trancadaAntes)).toContain('Arma: laser')
    expect(trancadaAntes).toContain('data-item-plasma')
    const trancada = render('arma-trancada', true)
    expect(texto(trancada)).toContain('Arma: laser')
    expect(trancada).toContain('data-item-plasma')
    expect(trancada).not.toContain('data-tiro=')
    const plasmaAntes = render('arma-plasma', false)
    expect(texto(plasmaAntes)).toContain('Arma: plasma')
    expect(plasmaAntes).not.toContain('data-item-plasma')
    expect(plasmaAntes).not.toContain('data-tiro=')
    const plasma = render('arma-plasma', true)
    expect(plasma).toContain('data-tiro="plasma" data-quadros="10"')
    expect(contar(plasma, 'data-marca-do-tiro')).toBe(10)
    expect(texto(plasma)).toContain('Chegou em 10 quadros')
    const reinicioAntes = render('arma-reinicio', false)
    expect(texto(reinicioAntes)).toContain('Arma: plasma')
    const reinicio = render('arma-reinicio', true)
    expect(texto(reinicio)).toContain('Arma: laser')
    expect(reinicio).toContain('data-item-plasma')
  })

  test('arma-placar: antes, texto e variável laser; depois, a variável plasma e o texto laser', () => {
    const antes = render('arma-placar', false)
    expect(antes).toContain('data-arma-placar')
    expect(antes).toContain('data-texto-arma="laser"')
    expect(antes).toContain('data-variavel="arma" data-valor="laser"')
    expect(antes).toContain('data-tecla-e="vai-apertar"')
    expect(antes).not.toContain('data-descompasso')
    expect(antes).not.toContain('data-seta-do-descompasso')
    expect(texto(antes)).toContain('Patrulha (3D)')
    expect(texto(antes)).toContain('plasmaLiberado = verdadeiro')
    expect(antes).not.toContain('plasma&quot;')
    const depois = render('arma-placar', true)
    expect(depois).toContain('data-texto-arma="laser"')
    expect(depois).toContain('data-variavel="arma" data-valor="plasma"')
    expect(depois).toContain('data-descompasso')
    expect(depois).toContain('data-seta-do-descompasso')
    expect(depois).toContain('data-tecla-e="apertada"')
    expect(texto(depois)).toContain('Arma: laser')
    expect(texto(depois)).toContain('o texto não foi escrito de novo')
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
    expect(texto(render('arma-trancada', true))).toContain('A arma continua laser')
    expect(texto(render('arma-plasma', true))).toContain('saiu o plasma')
    expect(texto(render('arma-reinicio', true))).toContain('a arma nasceu como laser')
    expect(texto(render('arma-placar', true))).toContain('continua mostrando Arma: laser')
  })

  test('o quiz de previsão monta a cena da arma pelo prefixo', () => {
    const content: QuizBlock = {
      kind: 'quiz',
      passingScore: 100,
      questions: [
        {
          id: 'placar',
          predictionScene: 'arma-placar',
          prompt: 'O que o texto mostra?',
          choices: [
            { id: 'a', label: 'Arma: plasma' },
            { id: 'b', label: 'Arma: laser' },
          ],
        },
      ],
    }
    const html = renderToStaticMarkup(
      <PredictionQuiz blockId="quiz" content={content} quizState={null} />,
    )
    expect(html).toContain('data-arma-placar')
  })
})
