import { describe, expect, test } from 'bun:test'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { MoedasLivre, proximoGestoDasMoedas } from '../src/components/scene-poder-moedas'
import { PonteLivre, proximoGestoDaPonte } from '../src/components/scene-poder-ponte'

/**
 * Os Poderes "A ponte apressada" e "Moedas no caminho" (Faísca, 02/11/2026): só a IDEIA na tela. Nada
 * de bloco, regra, então, senão, grupo nem o bloco que espera; o que cada coisa faz só aparece depois
 * do teste daquele caso, e o botão em destaque é o gesto que a fala do Zappy pede.
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
        instruction: 'Fala do Zappy',
        dialogue: (text) => <p>{text}</p>,
        tools: null,
      }}
    >
      {view}
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const SO_A_IDEIA =
  /\bregra\b|\bbloco|\bentão\b|\bsenão\b|\bgrupo\b|\bsomar\b|depois de \d|"depois de"|\bfazer\b/i
/** O rótulo do botão que está com o tom de gesto (o destaque). */
const destaques = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
    texto(m[1] ?? '').trim(),
  )

describe('Ponte: a tela livre', () => {
  const { activity, play } = caso('timed-bridge')
  const puxar: SceneAction = { type: 'pull-lever' }
  const esperar: SceneAction = { type: 'wait-second' }
  const ponte: SceneAction = { type: 'touch-bridge' }
  const quatro = [esperar, esperar, esperar, esperar]

  test('rótulos sem bloco nem regra', () => {
    for (const s of [play([]), play([ponte]), play([puxar, ...quatro]), play([puxar, ponte])])
      expect(texto(tela(activity, s, <PonteLivre />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <PonteLivre />))
    for (const rotulo of [
      'Puxar a alavanca',
      'Esperar 1 segundo',
      'Encostar na ponte',
      'Recomeçar a partida',
      'Quando puxa a alavanca',
      'Quando a partida começa',
      'Compare o relógio começando na alavanca e junto com a partida.',
    ])
      expect(lido).toContain(rotulo)
  })

  test('o que a alavanca, o relógio e a ponte fazem só aparece depois do teste', () => {
    const antes = texto(tela(activity, play([]), <PonteLivre />))
    expect(antes).not.toContain('A ponte baixa')
    expect(antes).not.toContain('A ponte sobe sozinha')
    expect(antes).not.toContain('Atravessar e tocar o sino')
    expect(antes).not.toContain('Avisar: a ponte está levantada')
    const fechada = texto(tela(activity, play([ponte]), <PonteLivre />))
    expect(fechada).toContain('Avisar: a ponte está levantada')
    expect(fechada).not.toContain('Atravessar e tocar o sino')
    const puxou = texto(tela(activity, play([ponte, puxar]), <PonteLivre />))
    expect(puxou).toContain('A ponte baixa')
    expect(puxou).not.toContain('A ponte sobe sozinha')
    expect(texto(tela(activity, play([puxar, ...quatro]), <PonteLivre />))).toContain(
      'A ponte sobe sozinha',
    )
    expect(texto(tela(activity, play([puxar, ponte]), <PonteLivre />))).toContain(
      'Atravessar e tocar o sino',
    )
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Encostar na ponte'],
      [[ponte], 'Puxar a alavanca'],
      [[ponte, puxar], 'Esperar 1 segundo'],
      [[ponte, puxar, ...quatro], 'Puxar a alavanca'],
      [[ponte, puxar, ...quatro, puxar], 'Encostar na ponte'],
      [[ponte, puxar, ponte], 'Recomeçar a partida'],
      [
        [ponte, puxar, ponte, { type: 'restart-bridge' }, puxar, ...quatro, puxar],
        'Quando a partida começa',
      ],
      // Com o relógio da partida, o destaque espera o relógio chegar a 4 antes de puxar.
      [[{ type: 'timer-place', place: 'start' }], 'Esperar 1 segundo'],
      [[{ type: 'timer-place', place: 'start' }, ...quatro], 'Puxar a alavanca'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const fala = discoveryGuidance(activity, s)?.id
      expect(proximoGestoDaPonte(fala, s.bridge)).not.toBeNull()
      expect([fala, destaques(tela(activity, s, <PonteLivre />))]).toEqual([fala, [esperado]])
    }
  })
})

describe('Moedas: a tela livre', () => {
  const { activity, play } = caso('coin-counter', [
    'each-adds',
    'no-double',
    'counts-again',
    'kept',
    'below-goal',
    'compare-rules',
  ])
  const moeda = (coin: 0 | 1 | 2 | 3 | 4 | 5): SceneAction => ({ type: 'touch-coin', coin })
  const afastar: SceneAction = { type: 'leave-coin' }
  const bau: SceneAction = { type: 'try-chest' }
  const desligar: SceneAction = { type: 'coin-disappears', enabled: false }

  test('rótulos sem bloco, grupo nem somar', () => {
    for (const s of [play([]), play([moeda(0), moeda(1)]), play([moeda(0), bau])])
      expect(texto(tela(activity, s, <MoedasLivre />))).not.toMatch(SO_A_IDEIA)
    const lido = texto(tela(activity, play([]), <MoedasLivre />))
    for (const rotulo of [
      'Afastar',
      'Encostar no baú',
      'Desligar o sumiço da moeda',
      'Pelo menos 5',
      'Exatamente 5',
      'Com mais de 5 moedas, compare as perguntas Pelo menos 5 e Exatamente 5.',
    ])
      expect(lido).toContain(rotulo)
  })

  test('o que a moeda e o baú fazem só aparece depois do teste', () => {
    const antes = texto(tela(activity, play([]), <MoedasLivre />))
    expect(antes).not.toContain('moedas soma 1')
    expect(antes).not.toContain('não conta de novo')
    expect(antes).not.toContain('Abrir o baú')
    expect(antes).not.toContain('Avisar o que falta')
    const duas = texto(tela(activity, play([moeda(0), moeda(1)]), <MoedasLivre />))
    expect(duas).toContain('moedas soma 1')
    expect(duas).not.toContain('não conta de novo')
    expect(texto(tela(activity, play([moeda(0), moeda(1), moeda(0)]), <MoedasLivre />))).toContain(
      'A moeda que sumiu não conta de novo',
    )
    const poucas = texto(tela(activity, play([moeda(0), bau]), <MoedasLivre />))
    expect(poucas).toContain('Avisar o que falta')
    expect(poucas).not.toContain('Abrir o baú')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], '1'],
      [[moeda(0)], '2'],
      [[moeda(0), moeda(1)], 'Afastar'],
      [[moeda(0), moeda(1), afastar], '1 · vazio'],
      [[moeda(0), moeda(1), afastar, moeda(0)], 'Desligar o sumiço da moeda'],
      [
        [moeda(0), moeda(1), afastar, moeda(0), desligar, moeda(2), moeda(3), moeda(2)],
        'Recomeçar a partida',
      ],
      [[moeda(0), moeda(1), afastar, moeda(0), desligar, moeda(2), moeda(3)], '3'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const fala = discoveryGuidance(activity, s)?.id
      expect(proximoGestoDasMoedas(fala, s.coins)).not.toBeNull()
      expect([fala, destaques(tela(activity, s, <MoedasLivre />))]).toEqual([fala, [esperado]])
    }
  })

  test('trocar a pergunta com o personagem no baú não mostra a resposta antes do teste', () => {
    const seis = [moeda(0), moeda(1), moeda(2), moeda(3), moeda(4), moeda(5)]
    const abriu = play([...seis, bau])
    expect(texto(tela(activity, abriu, <MoedasLivre />))).toContain('✓ escolhido')
    const trocou = play([...seis, bau, { type: 'chest-rule', rule: 'equals' }])
    expect(trocou.coins.at).toBeNull()
    expect(trocou.coins.chest).toBe('closed')
    const lido = texto(tela(activity, trocou, <MoedasLivre />))
    expect(lido).toContain('No baú: moedas é exatamente 5?')
    expect(lido).not.toContain('✓ escolhido')
    expect(lido.match(/Aguardando teste/g)?.length).toBe(2)
  })
})
