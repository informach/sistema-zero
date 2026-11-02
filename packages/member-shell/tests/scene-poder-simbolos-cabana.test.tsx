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
import {
  CabanaLivre,
  type GestoDaCabana,
  proximoGestoDaCabana,
} from '../src/components/scene-poder-cabana'
import {
  type GestoDosSimbolos,
  proximoGestoDosSimbolos,
  SimbolosLivre,
} from '../src/components/scene-poder-simbolos'

/**
 * Os Poderes "O baú dos símbolos" e "O segredo da cabana" (Faísca, 02/11/2026): só a IDEIA na
 * tela. Nada de bloco, regra, Se, então nem senão; a lista diz o que comparar; o que cada resposta
 * faz só aparece depois do teste daquele caso; o botão em destaque é o gesto que o Zappy pede.
 */
const caso = (scene: 'symbol-sequence' | 'two-pieces') => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene,
    cenario: 'farol',
    setup: { freeExploration: true },
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
  /\b[Rr]egra\b|\b[Bb]loco|\b[Ee]ntão\b|\b[Ss]enão\b|\bSe\b|Quando o\b|Na ordem\b|Só contando|"e"|"ou"/
/** O botão com o tom de gesto (o destaque), pelo texto dele. */
const destaque = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>([^<]*)</g)].map((m) => m[1])

const tocar = (symbol: 'sol' | 'lua' | 'estrela'): SceneAction => ({ type: 'touch-symbol', symbol })

describe('O baú dos símbolos: a tela', () => {
  const { activity, play } = caso('symbol-sequence')

  test('rótulos sem bloco nem regra, nos dois baús', () => {
    for (const s of [
      play([]),
      play([tocar('sol')]),
      play([tocar('lua')]),
      play([{ type: 'sequence-mode', mode: 'count' }, tocar('estrela')]),
    ]) {
      const lido = texto(tela(activity, s, <SimbolosLivre />))
      expect(lido).not.toMatch(SO_A_IDEIA)
      expect(lido).toContain('O baú confere a vez')
      expect(lido).toContain('O baú só conta')
      expect(lido).toContain('Toque o sol e depois a lua e observe passo.')
    }
  })

  test('o que cada resposta faz só aparece depois do teste daquele caso', () => {
    const antes = texto(tela(activity, play([]), <SimbolosLivre />))
    expect(antes).toContain('É a minha vez?')
    expect(antes).not.toContain('passo anda')
    expect(antes).not.toContain('passo volta a 0')
    expect(antes.match(/Teste para descobrir/g)?.length).toBe(2)

    const sol = texto(tela(activity, play([tocar('sol')]), <SimbolosLivre />))
    expect(sol).toContain('O símbolo acende, e passo anda')
    expect(sol).not.toContain('passo volta a 0')

    const meio = texto(tela(activity, play([tocar('lua')]), <SimbolosLivre />))
    expect(meio).toContain('passo volta a 0, e tudo apaga')
    expect(meio).not.toContain('passo anda')

    const conta = texto(
      tela(activity, play([{ type: 'sequence-mode', mode: 'count' }]), <SimbolosLivre />),
    )
    expect(conta).not.toContain('O baú abre')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const rotulo: Record<Exclude<GestoDosSimbolos, null>, string> = {
      sol: 'Tocar o sol',
      lua: 'Tocar a lua',
      estrela: 'Tocar a estrela',
      recomecar: 'Recomeçar a partida',
      ordem: 'O baú confere a vez',
      contar: 'O baú só conta',
    }
    const casos: [SceneAction[], Exclude<GestoDosSimbolos, null>][] = [
      [[], 'sol'],
      [[tocar('sol')], 'lua'],
      [[tocar('sol'), tocar('lua')], 'estrela'],
      [[tocar('sol'), tocar('lua'), tocar('estrela')], 'recomecar'],
      [[tocar('sol'), tocar('lua'), tocar('estrela'), { type: 'restart-symbols' }], 'sol'],
      [
        [tocar('sol'), tocar('lua'), tocar('estrela'), { type: 'restart-symbols' }, tocar('sol')],
        'estrela',
      ],
      [[{ type: 'sequence-mode', mode: 'count' }], 'ordem'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const fala = discoveryGuidance(activity, s)?.id
      expect([fala, proximoGestoDosSimbolos(fala, s.sequence)]).toEqual([fala, esperado])
      expect(destaque(tela(activity, s, <SimbolosLivre />))).toEqual([rotulo[esperado]])
    }
  })

  test('com o baú aberto, os símbolos ficam indisponíveis e recomeçar é o caminho', () => {
    const html = tela(
      activity,
      play([tocar('sol'), tocar('lua'), tocar('estrela')]),
      <SimbolosLivre />,
    )
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Tocar o sol/)
    expect(texto(html)).toContain('Recomeçar a partida fecha o baú')
  })

  test('o aviso do palco não diz "na ordem certa" quando o baú que só conta abre', () => {
    const contando = play([
      tocar('lua'),
      { type: 'sequence-mode', mode: 'count' },
      tocar('estrela'),
      tocar('lua'),
      tocar('sol'),
    ])
    expect(contando.sequence.chest).toBe('open')
    const lido = texto(tela(activity, contando, <SimbolosLivre />))
    expect(lido).toContain('O baú abriu!')
    expect(lido).not.toContain('Na ordem certa')
    expect(
      texto(
        tela(activity, play([tocar('sol'), tocar('lua'), tocar('estrela')]), <SimbolosLivre />),
      ),
    ).toContain('Na ordem certa! O baú abriu.')
  })

  test('a figura da ideia mora embaixo do palco, fora da coluna dos botões', () => {
    const html = tela(activity, play([]), <SimbolosLivre />)
    expect(html.indexOf('A pergunta de cada símbolo')).toBeLessThan(html.indexOf('Tocar o sol'))
    expect(html).toMatch(/sz-discovery-evidence[^>]*>\s*<figure/)
  })
})

const pegar = (piece: 'key' | 'emblem'): SceneAction => ({ type: 'take-piece', piece })
const encostar: SceneAction = { type: 'try-cabin' }

describe('O segredo da cabana: a tela', () => {
  const { activity, play } = caso('two-pieces')

  test('rótulos sem bloco nem regra: a cabana pede as duas peças ou uma das peças', () => {
    for (const s of [
      play([]),
      play([encostar]),
      play([pegar('key'), pegar('emblem'), encostar]),
      play([{ type: 'cabin-rule', rule: 'or' }]),
    ]) {
      const lido = texto(tela(activity, s, <CabanaLivre />))
      expect(lido).not.toMatch(SO_A_IDEIA)
      expect(lido).toContain('A cabana pede as duas peças')
      expect(lido).toContain('A cabana pede uma das peças')
      expect(lido).toContain('Encoste na cabana sem nenhuma peça e observe.')
    }
  })

  test('o que cada resposta faz só aparece depois do teste daquele caso', () => {
    const antes = texto(tela(activity, play([]), <CabanaLivre />))
    expect(antes).not.toContain('Abrir a cabana')
    expect(antes).not.toContain('Avisar o que a cabana pede')
    expect(antes.match(/Teste para descobrir/g)?.length).toBe(2)
    // Pegar uma peça prepara o teste: ainda não responde nada.
    expect(texto(tela(activity, play([pegar('key')]), <CabanaLivre />))).not.toContain(
      'Avisar o que a cabana pede',
    )

    const fechada = texto(tela(activity, play([encostar]), <CabanaLivre />))
    expect(fechada).toContain('Avisar o que a cabana pede')
    expect(fechada).not.toContain('Abrir a cabana')

    const aberta = texto(
      tela(activity, play([encostar, pegar('key'), pegar('emblem'), encostar]), <CabanaLivre />),
    )
    expect(aberta).toContain('Abrir a cabana')
    expect(aberta).toContain('Avisar o que a cabana pede')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const rotulo: Record<Exclude<GestoDaCabana, null>, string> = {
      chave: 'Pegar a chave',
      emblema: 'Pegar o emblema',
      encostar: 'Encostar na cabana',
      recomecar: 'Recomeçar a partida',
      duas: 'A cabana pede as duas peças',
      uma: 'A cabana pede uma das peças',
    }
    const abriu = [encostar, pegar('key'), encostar, pegar('emblem'), encostar]
    const casos: [SceneAction[], Exclude<GestoDaCabana, null>][] = [
      [[], 'encostar'],
      [[encostar], 'chave'],
      [[encostar, pegar('key')], 'encostar'],
      [[encostar, pegar('key'), encostar], 'emblema'],
      [abriu, 'recomecar'],
      [[...abriu, { type: 'restart-cabin' }], 'emblema'],
      [[...abriu, { type: 'restart-cabin' }, pegar('emblem'), pegar('key'), encostar], 'uma'],
      [[{ type: 'cabin-rule', rule: 'or' }, pegar('key'), encostar], 'duas'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const fala = discoveryGuidance(activity, s)?.id
      expect([fala, proximoGestoDaCabana(fala, s.pieces)]).toEqual([fala, esperado])
      expect(destaque(tela(activity, s, <CabanaLivre />))).toEqual([rotulo[esperado]])
    }
  })

  test('trocar o pedido com o personagem na porta não mostra a resposta antiga', () => {
    const html = texto(
      tela(activity, play([encostar, { type: 'cabin-rule', rule: 'or' }]), <CabanaLivre />),
    )
    expect(html).toContain('A cabana pede uma das peças. O personagem tem pelo menos uma?')
    expect(html).not.toContain('resposta deste teste')
    // O encontro seguinte responde a pergunta nova.
    const nova = texto(
      tela(
        activity,
        play([encostar, { type: 'cabin-rule', rule: 'or' }, pegar('key'), encostar]),
        <CabanaLivre />,
      ),
    )
    expect(nova).toContain('resposta deste teste')
  })

  test('os avisos do palco acompanham o que a cabana pede', () => {
    const uma: SceneAction = { type: 'cabin-rule', rule: 'or' }
    const fechada = texto(tela(activity, play([uma, encostar]), <CabanaLivre />))
    expect(fechada).toContain('A cabana pede a chave ou o emblema.')
    expect(fechada).not.toContain('A cabana pede a chave e o emblema.')
    const aberta = texto(tela(activity, play([uma, pegar('key'), encostar]), <CabanaLivre />))
    expect(aberta).toContain('A cabana abriu!')
    expect(aberta).not.toContain('Você tinha as duas peças')
    expect(texto(tela(activity, play([encostar]), <CabanaLivre />))).toContain(
      'A cabana pede a chave e o emblema.',
    )
  })
})
