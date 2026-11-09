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
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CoinCounterStage } from '../src/components/scene-coin-counter'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { MoedasLivre } from '../src/components/scene-poder-moedas'
import { PonteLivre } from '../src/components/scene-poder-ponte'
import { TimedBridgeStage } from '../src/components/scene-timed-bridge'

/**
 * As telas livres dos Poderes "A ponte apressada" e "Moedas no caminho" (08/11/2026, proposta
 * "Experiências do Faísca" aprovada): o personagem ANDA até as coisas (os botões de gesto saíram),
 * as regras são peças que se trocam no painel embaixo da cena, o caderninho fala do jeito da criança
 * (sem `ponteAberta`) e o Zappy fala as frases do motor.
 */
const caso = (scene: 'timed-bridge' | 'coin-counter', goals?: string[]) => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene,
    cenario: 'farol',
    setup: { freeExploration: true, ...(goals ? { goals } : {}) },
  }
  const start: SceneStart = { scene, setup: activity.setup }
  const play = (actions: SceneAction[]) =>
    actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
  return { activity, play }
}
const falas: string[] = []
const tela = (activity: ExperimentationActivity, state: SceneState, view: ReactElement) =>
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
      {view}
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
const BOTOES_ANTIGOS =
  /Puxar a alavanca|Encostar na ponte|Esperar 1 segundo|Recomeçar a partida|Encostar na moeda|Afastar|Encostar no baú|ponteAberta|\bbloco|\bentão\b|\bsenão\b/

describe('Ponte: a tela livre', () => {
  const { activity, play } = caso('timed-bridge')
  const puxar: SceneAction = { type: 'pull-lever' }
  const ponte: SceneAction = { type: 'touch-bridge' }

  test('sem os botões de gesto nem o nome da variável', () => {
    for (const s of [play([]), play([ponte]), play([puxar]), play([puxar, ponte])])
      expect(texto(tela(activity, s, <PonteLivre />))).not.toMatch(BOTOES_ANTIGOS)
  })

  test('a peça do relógio se troca, e o caderninho pergunta da ponte', () => {
    const inicio = tela(activity, play([]), <PonteLivre />)
    expect(texto(inicio)).toContain('O relógio começa a contar quando puxa a alavanca')
    expect(inicio).toContain(
      'aria-label="O relógio começa a contar: Quando puxa a alavanca. Toque para trocar por: Quando a partida começa."',
    )
    expect(texto(inicio)).toContain('A ponte está aberta? NÃO')
    const partida = play([{ type: 'timer-place', place: 'start' }])
    expect(texto(tela(activity, partida, <PonteLivre />))).toContain('quando a partida começa')
    expect(texto(tela(activity, play([puxar]), <PonteLivre />))).toContain(
      'A ponte está aberta? SIM',
    )
  })

  test('os seis cartões perguntam, e a fala é a do motor', () => {
    falas.length = 0
    const html = texto(tela(activity, play([]), <PonteLivre />))
    for (const pergunta of [
      'E se for até a ponte sem puxar a alavanca?',
      'O que a alavanca faz?',
      'Dá para atravessar a tempo?',
      'E se o relógio chegar a 4?',
      'Depois que subiu, puxar de novo funciona?',
      'E se o relógio começar com a partida?',
    ])
      expect(html).toContain(pergunta)
    expect(falas).toContain(discoverySpeech('bridge-start'))
  })

  test('o personagem anda livre: o palco não pula para os lugares do motor', () => {
    const html = tela(activity, play([]), <PonteLivre />)
    expect(html).not.toContain('sz-scene-anda')
  })
})

describe('Moedas: a tela livre', () => {
  const metas = ['each-adds', 'kept', 'no-double', 'counts-again', 'below-goal', 'compare-rules']
  const { activity, play } = caso('coin-counter', metas)
  const moeda = (coin: 0 | 1 | 2 | 3 | 4 | 5): SceneAction => ({ type: 'touch-coin', coin })

  test('sem os botões de gesto', () => {
    for (const s of [play([]), play([moeda(0)]), play([moeda(0), { type: 'try-chest' }])])
      expect(texto(tela(activity, s, <MoedasLivre />))).not.toMatch(BOTOES_ANTIGOS)
  })

  test('a pergunta do baú inteira, com a peça que se troca; o sumiço é um interruptor', () => {
    const html = texto(tela(activity, play([]), <MoedasLivre />))
    expect(html).toContain('Tem pelo menos ⇄ 5 moedas?')
    expect(html).toContain('Sumiço ligado')
    expect(html).toContain('Quantas moedas? 0')
    const trocada = play([{ type: 'chest-rule', rule: 'equals' }])
    expect(texto(tela(activity, trocada, <MoedasLivre />))).toContain('Tem exatamente ⇄ 5 moedas?')
    expect(texto(tela(activity, play([moeda(0), moeda(1)]), <MoedasLivre />))).toContain(
      'Quantas moedas? 2',
    )
  })

  test('os cartões seguem as metas da atividade', () => {
    const so = caso('coin-counter', ['each-adds', 'kept'])
    const html = texto(tela(so.activity, so.play([]), <MoedasLivre />))
    expect(html).toContain('O que muda ao pegar uma moeda?')
    expect(html).not.toContain('Com menos de 5, o baú abre?')
  })
})

describe('o palco sem `heroi` continua lendo o nome da variável (full review 08/11/2026)', () => {
  // Os quizzes e as bancadas usam o mesmo palco e ensinam pelo nome da variável: o leitor de tela
  // lê o que a tela escreve. Só a tela livre fala do jeito da criança.
  test('ponte e moedas', () => {
    const ponte = caso('timed-bridge')
    expect(renderToStaticMarkup(<TimedBridgeStage state={ponte.play([])} />)).toContain(
      'ponteAberta é falso',
    )
    expect(
      renderToStaticMarkup(<TimedBridgeStage state={ponte.play([])} heroi={{ x: 21, y: 200 }} />),
    ).not.toContain('ponteAberta')
    const moedas = caso('coin-counter')
    expect(renderToStaticMarkup(<CoinCounterStage state={moedas.play([])} />)).toContain(
      'moedas guarda 0',
    )
  })
})
