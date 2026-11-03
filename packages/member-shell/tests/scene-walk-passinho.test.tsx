import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneStart,
  type SceneState,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneActivityView } from '../src/components/scene-activity'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { WalkComPassinho } from '../src/components/scene-walk-passinho'

/**
 * "O tamanho do passinho" (Nave contra Asteroides, Dia 1, 02/11/2026): a velocidade só com a ideia.
 * Nada de bloco, Mover nem número da velocidade; cada passinho só se revela depois de testado; o
 * botão em destaque é o gesto que a fala do Zappy (`stride-*`) pede.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'lighthouse-walk',
  cenario: 'nave',
  setup: { freeExploration: true, goals: ['step-speed-1', 'step-speed-3'] },
}
const start: SceneStart = sceneStart(activity)
const QUADRO: SceneAction = { type: 'advance', seconds: 1 / 30 }
const SETA: SceneAction = { type: 'hold-arrow', held: true }
const LENTA: SceneAction = { type: 'walk-pace', pace: 'lenta' }
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const GRANDE_VISTO = [LENTA, SETA, QUADRO, QUADRO]
const OS_DOIS = [...GRANDE_VISTO, { type: 'walk-speed', speed: 1 } as const, QUADRO, QUADRO]

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
      <WalkComPassinho />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) => texto(m[1] ?? '').trim())

describe('o tamanho do passinho', () => {
  test('abre com a escolha do passinho, a câmera lenta em destaque e as duas descobertas', () => {
    const html = tela(openScene(start))
    const lido = texto(html)
    expect(lido).toContain('O tamanho do passinho')
    expect(lido).toContain('Passinho pequeno')
    expect(lido).toContain('Passinho grande')
    expect(lido).toContain('Compare os quadros com o passinho pequeno.')
    expect(lido).toContain('Compare os quadros com o passinho grande.')
    expect(lido).toContain('0 de 2 descobertas')
    expect(destaques(html)).toEqual(['Câmera lenta'])
    // O passinho de agora (o grande, de fábrica) aparece escolhido.
    expect(html).toMatch(/aria-current="true"[^>]*>Passinho grande/)
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, Mover, sprite nem número da velocidade', () => {
    for (const s of [openScene(start), play(GRANDE_VISTO), play(OS_DOIS)]) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|comando|\bMover\b|sprite|\bx\b/i)
      expect(lido).not.toMatch(/velocidade \d/i)
    }
  })

  test('cada passinho só se revela depois de testado', () => {
    const inicio = texto(tela(openScene(start)))
    expect(inicio.match(/Teste para descobrir/g)?.length).toBe(2)
    expect(inicio).not.toMatch(/curtinhos|compridos|mais longe/)
    const grande = tela(play(GRANDE_VISTO))
    expect(texto(grande)).toContain('6 passinhos compridos')
    expect(texto(grande).match(/Teste para descobrir/g)?.length).toBe(1)
    expect(texto(grande)).not.toContain('curtinhos')
    expect(grande).toContain('data-passinho="3"')
    const dois = texto(tela(play(OS_DOIS)))
    expect(dois).toContain('6 passinhos curtinhos')
    expect(dois).not.toContain('Teste para descobrir')
    expect(dois).toContain('2 de 2 descobertas')
  })

  test('o destaque segue a fala: testado o grande, trocar para o pequeno; tudo visto, a velocidade de verdade', () => {
    expect(destaques(tela(play(GRANDE_VISTO)))).toEqual(['Passinho pequeno'])
    expect(destaques(tela(play(OS_DOIS)))).toEqual(['Velocidade de verdade'])
  })

  test('trocar o passinho volta ao começo: as marcas contam um tamanho só', () => {
    const s = play([...GRANDE_VISTO, QUADRO, { type: 'walk-speed', speed: 1 }])
    expect(tela(s)).toContain('data-pegadas="0"')
  })
})

describe('a experiência do Dia 1 escolhe a tela pelo caso', () => {
  const render = (a: ExperimentationActivity) => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'O tamanho do passinho',
      instructions: 'Compare os passinhos.',
      hints: [],
      activity: a,
    })
    return renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-passinho', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={a}
      />,
    )
  }
  test('as metas da velocidade abrem o passinho; a câmera lenta segue com a dela', () => {
    expect(render(activity)).toContain('Passinho pequeno')
    const lenta = render({
      ...activity,
      setup: {
        freeExploration: true,
        goals: ['moves-each-frame', 'stopped-after-release', 'walked-real-speed'],
      },
    })
    expect(lenta).toContain('Câmera lenta')
    expect(lenta).not.toContain('Passinho pequeno')
  })
})
