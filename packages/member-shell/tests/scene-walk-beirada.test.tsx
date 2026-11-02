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
import { WalkNaBeirada } from '../src/components/scene-walk-beirada'

/**
 * "A beirada da tela" (Farol, Dia 1, parte 5, 01/11/2026): só a IDEIA. Nada de bloco, regra,
 * comando, ordem dos blocos nem x; a ordem aparece dentro do quadro (passinho, depois a conferência).
 */
const METAS = ['left-the-screen', 'came-back-inside', 'stayed-inside']
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'lighthouse-walk',
  cenario: 'farol',
  setup: { freeExploration: true, goals: [...METAS] },
}
const start: SceneStart = { scene: 'lighthouse-walk', setup: activity.setup }
const QUADRO: SceneAction = { type: 'advance', seconds: 1 / 30 }
const SETA: SceneAction = { type: 'hold-arrow', held: true }
const LIMITE: SceneAction = { type: 'keep-on-screen', enabled: true }
const quadros = (n: number) => Array.from({ length: n }, () => QUADRO)
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
      <WalkNaBeirada />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('a beirada da tela do Farol', () => {
  test('abre com o limite desligado, a velocidade de verdade em destaque e a faixa fora da tela', () => {
    const html = tela(openScene(start))
    expect(texto(html)).toContain('Ligar o limite da tela')
    expect(texto(html)).toContain('O limite está desligado: ninguém confere a beirada.')
    expect(html).toMatch(/data-tom="gesto"[^>]*>.*Velocidade de verdade/)
    expect(html).toContain('data-fora-da-tela')
    expect(texto(html)).toContain('0 de 3 descobertas')
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, regra, comando, ordem dos blocos nem x', () => {
    const estados = [
      openScene(start),
      play([SETA, ...quadros(100)]),
      play([LIMITE, SETA, ...quadros(80)]),
    ]
    for (const s of estados) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(
        /\bbloco|\bregra\b|comando|teclado de teste|\bx\b|sprite|ordem|mover →|limitar/i,
      )
    }
  })

  test('na beirada com o limite, a tira e a frase mostram o passinho e depois a conferência', () => {
    const html = tela(play([LIMITE, SETA, ...quadros(80)]))
    expect(texto(html)).toContain('✋ segurou')
    expect(texto(html)).not.toContain('voltou')
    expect(texto(html)).toContain(
      'Neste quadro: o passinho ia levar ele para fora; depois o jogo conferiu a beirada e segurou ele dentro.',
    )
    expect(texto(html)).toContain('Desligar o limite da tela')
    expect(html).toContain('data-puxou="true"')
  })

  test('ligar o limite com ele fora: a tira diz que voltou, sem inventar um passinho', () => {
    const fora = play([SETA, ...quadros(90), { type: 'hold-arrow', held: false }])
    const voltou = [LIMITE, QUADRO].reduce((s, a) => stepScene(start, s, a), fora)
    const lido = texto(tela(voltou))
    expect(lido).toContain('↩ voltou')
    expect(lido).toContain(
      'Neste quadro: ele estava fora; o jogo conferiu a beirada e puxou de volta para dentro.',
    )
    expect(lido).not.toContain('passinho ia levar')
  })

  test('fora da tela sem o limite, o recado oferece ligar o limite ou voltar', () => {
    const html = tela(play([SETA, ...quadros(100)]))
    expect(texto(html)).toContain(
      'Ele saiu da janela do jogo. Ligue o limite da tela ou clique em Voltar ao início.',
    )
    expect(html).toMatch(/data-tom="gesto"[^>]*>Ligar o limite da tela/)
  })
})

describe('a experiência do limite escolhe a beirada pela meta dela', () => {
  const render = (a: ExperimentationActivity) => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'A beirada da tela',
      instructions: 'Leve o personagem até a beirada.',
      hints: [],
      activity: a,
    })
    return renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-limite', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={a}
      />,
    )
  }
  test('caso novo abre a beirada; o caso antigo (antes de reimportar) segue com a bancada antiga', () => {
    const nova = render(activity)
    expect(nova).toContain('Ligar o limite da tela')
    expect(nova).not.toContain('Adicionar bloco de limite')
    const antiga = render({
      ...activity,
      setup: {
        freeExploration: true,
        goals: ['left-the-screen', 'stayed-inside', 'compared-command-order'],
      },
    })
    expect(antiga).toContain('Adicionar bloco de limite')
    expect(antiga).not.toContain('Ligar o limite da tela')
  })
})
