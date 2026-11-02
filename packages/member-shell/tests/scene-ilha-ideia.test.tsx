import { describe, expect, test } from 'bun:test'
import {
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { IslandDiscovery } from '../src/components/scene-island-discovery'

/**
 * A Ilha do Farol (02/11/2026): o papel de cada número da posição (chão ou altura) é a descoberta
 * da experiência. O rótulo de um eixo só aparece depois de a criança ir para mais e para menos
 * nele, como o "?" da porta do Farol; antes, a tela mostra só o nome do número.
 */
const caso = (goals: string[]) => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene: 'island-3d',
    setup: { goals, freeExploration: true },
  }
  const start: SceneStart = { scene: 'island-3d', setup: activity.setup }
  const play = (actions: SceneAction[]) =>
    actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
  return { activity, play }
}
const tela = (activity: ExperimentationActivity, state: SceneState) =>
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
      <IslandDiscovery />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const eixo = (axis: 'x' | 'y' | 'z', value: number): SceneAction => ({
  type: 'island-axis',
  axis,
  value,
})
const PAPEL = /Altura|direção do chão|no chão|na altura/

describe('Ilha: os rótulos dos eixos esperam a investigação', () => {
  const { activity, play } = caso(['axis-x', 'axis-y', 'axis-z'])

  test('antes de explorar, nenhum número diz se é chão ou altura', () => {
    const lido = texto(tela(activity, play([])))
    expect(lido).not.toMatch(PAPEL)
    expect(lido).toContain('Três números para o lugar da chave')
    // Ir só para um lado ainda não revela o papel.
    expect(texto(tela(activity, play([eixo('y', 3)])))).not.toMatch(PAPEL)
  })

  test('depois de ir para mais e para menos num número, só o rótulo dele aparece', () => {
    const lido = texto(tela(activity, play([eixo('y', 3), eixo('y', 0)])))
    expect(lido).toContain('Y · Altura')
    expect(lido).not.toMatch(/direção do chão/)
    expect(lido).toContain('Três números para o lugar da chave')
  })

  test('com os três investigados, a tela resume o que a criança descobriu', () => {
    const lido = texto(
      tela(
        activity,
        play([
          eixo('x', 4),
          eixo('x', -4),
          eixo('z', 4),
          eixo('z', -4),
          eixo('y', 3),
          eixo('y', 0),
        ]),
      ),
    )
    expect(lido).toContain('X · Uma direção do chão')
    expect(lido).toContain('Z · Outra direção do chão')
    expect(lido).toContain('x e z no chão · y na altura')
  })

  test('no contato, que vem depois da posição, os rótulos ficam à vista', () => {
    const contato = caso(['contact-apart', 'contact-touch'])
    expect(texto(tela(contato.activity, contato.play([])))).toContain('Y · Altura')
  })

  test('a troca de vista pede para observar, sem afirmar que os objetos ficaram no lugar', () => {
    const vista = caso(['other-view', 'same-place'])
    const lido = texto(tela(vista.activity, vista.play([{ type: 'island-view', view: 'side' }])))
    expect(lido).not.toMatch(/continuam no mesmo lugar/)
  })
})
