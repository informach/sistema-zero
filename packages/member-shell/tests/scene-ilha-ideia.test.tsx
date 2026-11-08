import { describe, expect, test } from 'bun:test'
import {
  discoverySpeech,
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { IslandDiscovery, passoDaSeta } from '../src/components/scene-island-discovery'

/**
 * As três experiências 3D da Ilha do Farol, desde 08/11/2026 (proposta "Experiências do Faísca"
 * aprovada): a câmera é um controle com três lugares (Frente, Lado, Cima); cada número tem − e + na
 * cor do eixo do Estúdio 3D, e o papel dele só aparece depois de a criança ir para os dois lados;
 * no contato, o jogo confere o encontro o tempo todo e o resultado fica na cena.
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
const falas: string[] = []
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
        instruction: '',
        dialogue: (text: string): ReactNode => {
          falas.push(text)
          return <p data-fala>{text}</p>
        },
        tools: null,
        continuar: null,
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
const SEM_BOTOES_ANTIGOS = /Ver de frente|Ver de lado|Ver de cima|Testar o encontro|X−|X\+|Z−|Z\+/

describe('Ilha: o ponto de vista', () => {
  const { activity, play } = caso(['other-view', 'same-place'])

  test('a câmera é um controle com três lugares, e a pergunta grande só vem depois', () => {
    const inicio = tela(activity, play([]))
    expect(inicio).toContain('aria-label="Onde fica a câmera"')
    expect(texto(inicio)).not.toMatch(SEM_BOTOES_ANTIGOS)
    expect(inicio).not.toContain('sz-discovery-palpite-grande')
    const lado = tela(activity, play([{ type: 'island-view', view: 'side' }]))
    expect(lado).toContain('sz-discovery-palpite-grande')
    expect(texto(lado)).toContain('O lugar da câmera')
  })

  test('a fala é a do motor', () => {
    falas.length = 0
    tela(activity, play([]))
    expect(falas).toContain(discoverySpeech('island-view-start'))
  })
})

describe('Ilha: os três números', () => {
  const { activity, play } = caso(['axis-x', 'axis-y', 'axis-z'])

  test('cada número tem − e +, e o papel só aparece depois dos dois lados', () => {
    const inicio = texto(tela(activity, play([])))
    expect(inicio).not.toMatch(SEM_BOTOES_ANTIGOS)
    expect(inicio).not.toContain('anda no chão')
    expect(inicio).not.toContain('é a altura')
    const umLado = texto(tela(activity, play([eixo('y', 2)])))
    expect(umLado).not.toContain('é a altura')
    const doisLados = texto(tela(activity, play([eixo('y', 2), eixo('y', 0)])))
    expect(doisLados).toContain('é a altura')
    expect(doisLados).not.toContain('anda no chão')
  })

  test('os botões dizem o número e o lado', () => {
    const html = tela(activity, play([]))
    for (const e of ['x', 'y', 'z']) {
      expect(html).toContain(`aria-label="${e} mais meio"`)
      expect(html).toContain(`aria-label="${e} menos meio"`)
    }
  })
})

describe('Ilha: o contato', () => {
  const { activity, play } = caso(['contact-apart', 'contact-touch'])

  test('o resultado do encontro fica na cena desde o começo, como no jogo', () => {
    const inicio = texto(tela(activity, play([])))
    expect(inicio).not.toMatch(SEM_BOTOES_ANTIGOS)
    expect(inicio).toContain('Não encostou')
    // A chave começa em y 3: em y 2 ela encosta no personagem.
    expect(texto(tela(activity, play([eixo('y', 2)])))).toContain('Encostou!')
  })

  test('as setas seguem a câmera: de lado, → é a direita da tela (o z menor)', () => {
    expect(passoDaSeta('top', 'direita')).toEqual({ eixo: 'x', sinal: 1 })
    expect(passoDaSeta('front', 'cima')).toEqual({ eixo: 'z', sinal: -1 })
    expect(passoDaSeta('side', 'direita')).toEqual({ eixo: 'z', sinal: -1 })
    expect(passoDaSeta('side', 'cima')).toEqual({ eixo: 'x', sinal: -1 })
    expect(passoDaSeta('side', 'baixo')).toEqual({ eixo: 'x', sinal: 1 })
  })

  test('os módulos vêm na ordem do que a criança faz: câmera, altura e andar', () => {
    const html = texto(tela(activity, play([])))
    const camera = html.indexOf('A câmera')
    const altura = html.indexOf('Altura da chave')
    const andar = html.indexOf('Andar')
    expect(camera).toBeGreaterThan(-1)
    expect(camera).toBeLessThan(altura)
    expect(altura).toBeLessThan(andar)
  })
})
