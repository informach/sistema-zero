import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneActivityView } from '../src/components/scene-activity'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { WalkEmCameraLenta } from '../src/components/scene-walk-camera-lenta'

/**
 * "O jogo em câmera lenta" (Farol, Dia 1, 01/11/2026): a experiência trabalha só a IDEIA. Nada de
 * bloco, regra, comando nem x na tela; os blocos ficam para a montagem do Estúdio.
 */
const METAS = ['moves-each-frame', 'stopped-after-release', 'walked-real-speed']
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'lighthouse-walk',
  cenario: 'farol',
  setup: { freeExploration: true, goals: [...METAS] },
}
const start: SceneStart = { scene: 'lighthouse-walk', setup: activity.setup }
const QUADRO: SceneAction = { type: 'advance', seconds: 1 / 30 }
const SETA: SceneAction = { type: 'hold-arrow', held: true }
const SOLTA: SceneAction = { type: 'hold-arrow', held: false }
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))

const tela = (state: SceneState) =>
  renderToStaticMarkup(
    <DiscoveryContext.Provider
      value={{
        activity,
        state,
        dispatch: () => {},
        running: false,
        setRunning: () => {},
        tick: () => {},
        instruction: 'Fala do Zappy',
        dialogue: (text) => <p>{text}</p>,
        tools: null,
      }}
    >
      <WalkEmCameraLenta />
    </DiscoveryContext.Provider>,
  )

/** O texto que a criança lê, sem as marcações. */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('a câmera lenta do Farol', () => {
  test('abre pausada, com a câmera lenta em destaque e a seta solta', () => {
    const html = tela(openScene(start))
    expect(html).toMatch(/data-tom="gesto"[^>]*>.*Câmera lenta/)
    expect(texto(html)).toContain('Quadro 0')
    expect(texto(html)).toContain('Seta apertada? ✗ não')
    expect(texto(html)).toContain('Segure a seta ▶')
    expect(texto(html)).toContain('Velocidade de verdade')
    expect(texto(html)).toContain('Voltar ao início')
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, regra, comando, x nem velocidade na tela', () => {
    const estados = [openScene(start), play([SETA, QUADRO, QUADRO, SOLTA, QUADRO])]
    for (const s of estados) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|comando|teclado de teste|\bx\b|sprite/i)
      expect(lido).not.toMatch(/velocidade \d/i)
    }
  })

  test('cada passinho deixa uma pegada, e a tira diz quando ele andou e quando parou', () => {
    const s = play([SETA, QUADRO, QUADRO, SOLTA, QUADRO])
    const html = tela(s)
    expect(html).toContain('data-pegadas="2"')
    expect(texto(html)).toContain('Quadro 3')
    expect(texto(html)).toContain('passinho')
    expect(texto(html)).toContain('parado')
    expect(html.match(/class="slow-tira-quadro"/g)?.length).toBe(4)
  })

  test('a seta segurada aparece no selo e no botão', () => {
    const html = texto(tela(play([SETA, QUADRO])))
    expect(html).toContain('Seta apertada? ✓ sim')
    expect(html).toContain('Seta apertada ▶')
  })

  test('as três descobertas aparecem com os nomes da ideia', () => {
    const html = texto(tela(openScene(start)))
    expect(html).toContain('Segure a seta e veja um passinho em cada quadro.')
    expect(html).toContain('Solte a seta e veja os quadros passarem sem ele sair do lugar.')
    expect(html).toContain('Veja os passinhos na velocidade de verdade.')
    expect(html).toContain('0 de 3 descobertas')
  })

  test('fora da tela, o recado diz como voltar', () => {
    const s = play([SETA, ...Array.from({ length: 100 }, () => QUADRO)])
    expect(texto(tela(s))).toContain('Ele saiu da tela. Clique em Voltar ao início.')
  })
})

describe('a experiência do Dia 1 escolhe a câmera lenta', () => {
  test('o caso do quadro abre a câmera lenta, e o do limite segue com a bancada dele', () => {
    const render = (a: ExperimentationActivity) => {
      const content = publicInteractiveBlock({
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'O jogo em câmera lenta',
        instructions: 'Segure a seta.',
        hints: [],
        activity: a,
      })
      return renderToStaticMarkup(
        <SceneActivityView
          block={{ id: 'experiencia-quadro', kind: 'interactive', sortOrder: 0, content }}
          content={content}
          activity={a}
        />,
      )
    }
    const quadro = render(activity)
    expect(quadro).toContain('Câmera lenta')
    expect(quadro).not.toContain('Adicionar bloco de mover')
    const limite = render({
      ...activity,
      setup: {
        freeExploration: true,
        goals: ['left-the-screen', 'stayed-inside', 'compared-command-order'],
      },
    })
    expect(limite).toContain('Adicionar bloco de limite')
    expect(limite).not.toContain('Câmera lenta')
    // O bloco ainda com o caso antigo (antes de reimportar) segue com a bancada antiga.
    const antigo = render({
      ...activity,
      setup: {
        freeExploration: true,
        actions: [{ type: 'movement-command', enabled: false }],
        goals: ['no-movement-command', 'still-without-arrow', 'moves-each-frame'],
      },
    })
    expect(antigo).toContain('Adicionar bloco de mover')
    expect(antigo).not.toContain('Câmera lenta')
  })
})
