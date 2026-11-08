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
const start: SceneStart = { scene: 'lighthouse-walk', setup: activity.setup, cenario: 'farol' }
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

describe('a câmera lenta do Farol (moldura nova, 08/11/2026)', () => {
  test('abre pausada: a tecla de seta, Devagar e Rápido, Pausar e Começo, e o personagem em x 21', () => {
    const s = openScene(start)
    expect(s.walk.x).toBe(21)
    const html = tela(s)
    expect(texto(html)).toContain('Quadro 0')
    expect(texto(html)).toContain('seta solta')
    expect(html).toContain('aria-label="Seta para a direita: segure para o personagem andar"')
    expect(texto(html)).toContain('Devagar')
    expect(texto(html)).toContain('Rápido')
    expect(texto(html)).toContain('Pausar')
    expect(texto(html)).toContain('Começo')
    expect(texto(html)).toContain('Os quadros do jogo')
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, regra, comando nem número de velocidade na tela', () => {
    const estados = [openScene(start), play([SETA, QUADRO, QUADRO, SOLTA, QUADRO])]
    for (const s of estados) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|comando|teclado de teste|\bx\b|sprite/i)
      expect(lido).not.toMatch(/velocidade \d/i)
    }
  })

  test('cada passinho deixa uma pegada no chão, e a tira diz quando ele andou e quando parou', () => {
    const s = play([SETA, QUADRO, QUADRO, SOLTA, QUADRO])
    const html = tela(s)
    expect(html.match(/<ellipse/g)?.length).toBe(2)
    expect(texto(html)).toContain('Quadro 3')
    expect(texto(html)).toContain('passinho')
    expect(texto(html)).toContain('parado')
    // Seis lugares sempre (os vazios reservam a tira), quatro com quadro.
    expect(html.match(/class="slow-tira-quadro"/g)?.length).toBe(6)
    expect(html.match(/data-current=/g)?.length).toBe(4)
  })

  test('a seta segurada afunda a tecla e aparece no selo do filme', () => {
    const html = tela(play([SETA, QUADRO]))
    expect(texto(html)).toContain('seta apertada')
    expect(html).toMatch(/aria-pressed="true"[^>]*data-mao/)
  })

  test('os três cartões perguntam, sem contar o resultado antes do teste', () => {
    const html = texto(tela(openScene(start)))
    expect(html).toContain('O que acontece em cada quadro com a seta apertada?')
    expect(html).toContain('E com a seta solta?')
    expect(html).toContain('E bem rápido?')
    expect(html).toContain('0 de 3 descobertas')
    expect(html).not.toMatch(/um quadro, um passinho|fica tudo parado|viram caminhada/i)
  })

  test('com tudo descoberto, a ideia e o "No seu jogo" ficam no balão', () => {
    const s = play([SETA, QUADRO])
    const todas = {
      ...s,
      evidence: { ...s.evidence, discoveries: [...METAS] },
    }
    const lido = texto(tela(todas))
    expect(lido).toContain('O jogo desenha um quadro atrás do outro.')
    expect(lido).toContain('No seu jogo: em cada quadro')
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
    expect(quadro).toContain('Devagar')
    expect(quadro).not.toContain('Adicionar bloco de mover')
    const limite = render({
      ...activity,
      setup: {
        freeExploration: true,
        goals: ['left-the-screen', 'stayed-inside', 'compared-command-order'],
      },
    })
    expect(limite).toContain('Adicionar bloco de limite')
    expect(limite).not.toContain('Devagar')
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
    expect(antigo).not.toContain('Devagar')
  })
})
