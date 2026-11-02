import { describe, expect, test } from 'bun:test'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneId,
  type SceneStart,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import {
  LivreAcceleration,
  proximoGestoDaAceleracao,
} from '../src/components/scene-livre/acceleration'
import { LivreControls, proximoGestoDoConvite } from '../src/components/scene-livre/controls'
import { LivreHitbox, proximoGestoDaArea } from '../src/components/scene-livre/hitbox'
import { TELAS_LIVRES } from '../src/components/scene-livre/index'
import { LivreNumberLine, proximoGestoDaReta } from '../src/components/scene-livre/number-line'
import { LivreScore, proximoGestoDoPlacar } from '../src/components/scene-livre/score'

/**
 * As telas livres de `controls`, `hitbox`, `score`, `number-line` e `acceleration` (Corre Dino,
 * frente C, 02/11/2026). Só a IDEIA na tela; o que cada caso faz aparece depois do teste; o destaque
 * é o gesto que o Zappy pede.
 */
const caso = (scene: SceneId, goals?: string[]) => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene,
    cenario: 'corre-dino',
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
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
/** Os rótulos dos botões em destaque (tom `gesto`). */
const destaques = (html: string) =>
  [...html.matchAll(/<button[^>]*data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) =>
    texto(m[1] ?? '').trim(),
  )
/** Nada de bloco, regra, Se/então/senão, código nem campo do Estúdio na tela livre. */
const SO_A_IDEIA =
  /\bregra\b|\bbloco|\bentão\b|\bsenão\b|\bSe o\b|\bSe a\b|Somar ponto|estado do jogo|Quando apertar|Distância do cacto|Tamanho da área do Dino|condição|valor da base|A cada quadro do jogo|Mudar velocidade|\bcomando|\bcódigo|\bevento/

const segundo: SceneAction = { type: 'advance', seconds: 1 }
const descobrir = (html: string) => texto(html).match(/Teste para descobrir/g)?.length ?? 0

test('as cinco telas estão no registro das telas livres', () => {
  expect(TELAS_LIVRES.controls).toBe(LivreControls)
  expect(TELAS_LIVRES.hitbox).toBe(LivreHitbox)
  expect(TELAS_LIVRES.score).toBe(LivreScore)
  expect(TELAS_LIVRES['number-line']).toBe(LivreNumberLine)
  expect(TELAS_LIVRES.acceleration).toBe(LivreAcceleration)
})

describe('controls: o que o jogo escuta para começar', () => {
  const { activity, play } = caso('controls', ['missing-touch', 'start-key', 'start-tap'])
  const tocar: SceneAction = { type: 'start', input: 'tap' }
  const enter: SceneAction = { type: 'start', input: 'key' }
  const inicio: SceneAction = { type: 'home' }
  const tudo = (enabled: boolean): SceneAction => ({ type: 'connect', port: 'touch', enabled })
  const ver = (s: SceneState) => tela(activity, s, <LivreControls />)

  test('só a ideia, os botões e a lista do que comparar', () => {
    for (const s of [play([]), play([tocar, enter]), play([tudo(true), tocar])]) {
      const lido = texto(ver(s))
      expect(lido).not.toMatch(SO_A_IDEIA)
      for (const rotulo of [
        'Só o Enter',
        'Qualquer tecla ou toque',
        'Tocar na tela',
        'Apertar Enter',
        'Voltar à tela de início',
        'Escutando só o Enter, toque na tela de início e observe.',
      ])
        expect(lido).toContain(rotulo)
    }
  })

  test('o que cada jeito faz só aparece depois do teste dele', () => {
    expect(descobrir(ver(play([])))).toBe(3)
    const toque = texto(ver(play([tocar])))
    expect(toque).toContain('Nada acontece: o jogo não ouve o toque')
    expect(toque).not.toContain('A partida começa')
    expect(texto(ver(play([tocar, enter])))).toContain('A partida começa')
    expect(texto(ver(play([tudo(true), tocar])))).toContain('quem joga no celular')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Tocar na tela'],
      [[tudo(true)], 'Só o Enter'],
      [[tocar], 'Apertar Enter'],
      [[tocar, enter], 'Voltar à tela de início'],
      [[tocar, enter, inicio], 'Qualquer tecla ou toque'],
      [[tocar, enter, inicio, tudo(true)], 'Tocar na tela'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDoConvite(discoveryGuidance(activity, s)?.id, s.match)).not.toBeNull()
      expect(destaques(ver(s))).toEqual([esperado])
    }
    expect(destaques(ver(play([tocar, enter, inicio, tudo(true), tocar])))).toEqual([])
  })
})

describe('hitbox: a área de contato e o desenho', () => {
  const mover = (distance: number): SceneAction => ({ type: 'move', distance })
  const area = (pct: number): SceneAction => ({ type: 'resize', width: (pct * 64) / 100 })
  const ate = (d: number) =>
    Array.from({ length: Math.round((149 - d) / 10) }, (_, i) => mover(149 - 10 * (i + 1)))

  test('aula 9: só aproximar e afastar, sem os tamanhos de área', () => {
    const { activity, play } = caso('hitbox', ['contact'])
    const html = tela(activity, play([]), <LivreHitbox />)
    const lido = texto(html)
    expect(lido).not.toMatch(SO_A_IDEIA)
    expect(lido).toContain('Aproximar o cacto')
    expect(lido).toContain('Afastar o cacto')
    expect(lido).not.toContain('Tamanho da área de contato')
    expect(descobrir(html)).toBe(1)
    expect(destaques(html)).toEqual(['Aproximar o cacto'])
    expect(texto(tela(activity, play(ate(49)), <LivreHitbox />))).toContain(
      'BATEU com os desenhos ainda separados',
    )
  })

  const { activity, play } = caso('hitbox', ['contact', 'area-contrast', 'too-small'])
  const ver = (s: SceneState) => tela(activity, s, <LivreHitbox />)

  test('aula 10: as três áreas, só a ideia, e cada resultado depois do teste', () => {
    const antes = ver(play([]))
    expect(texto(antes)).not.toMatch(SO_A_IDEIA)
    for (const rotulo of ['100%', '80%', '40%', 'Tamanho da área de contato do Dino'])
      expect(texto(antes)).toContain(rotulo)
    expect(descobrir(antes)).toBe(3)
    const bateu = texto(ver(play(ate(49))))
    expect(bateu).toContain('BATEU com os desenhos ainda separados')
    expect(bateu).not.toContain('A batida sumiu')
    expect(texto(ver(play([...ate(49), area(80)])))).toContain('A batida sumiu')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string | null][] = [
      [[], 'Aproximar o cacto'],
      [[area(80)], '100%'],
      [ate(49), '80%'],
      [[...ate(49), mover(59)], 'Aproximar o cacto'],
      [[...ate(49), mover(39)], 'Afastar o cacto'],
      [[...ate(49), area(80)], 'Aproximar o cacto'],
      [[...ate(49), area(80), mover(39)], '40%'],
      [[...ate(49), area(80), mover(29)], 'Afastar o cacto'],
      [[...ate(49), area(80), mover(39), area(40)], null],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDaArea(discoveryGuidance(activity, s)?.id, s.contact) !== null).toBe(
        esperado !== null,
      )
      expect(destaques(ver(s))).toEqual(esperado ? [esperado] : [])
    }
  })
})

describe('score: quando o ponto soma', () => {
  const { activity, play } = caso('score', [
    'score-runaway',
    'score-idle-wrong',
    'score-start',
    'score-playing',
    'score-end',
  ])
  const lugar = (clock: 'frame' | 'second', guarded: boolean): SceneAction => ({
    type: 'score-place',
    clock,
    guarded,
  })
  const enter: SceneAction = { type: 'start', input: 'key' }
  const ver = (s: SceneState) => tela(activity, s, <LivreScore />)
  const solto = [lugar('frame', false), segundo, lugar('second', false), segundo]

  test('só a ideia: quando o ponto soma e a pergunta, sem "Somar ponto" nem Se', () => {
    for (const s of [play([]), play(solto), play([...solto, lugar('second', true), enter])]) {
      const lido = texto(ver(s))
      expect(lido).not.toMatch(SO_A_IDEIA)
      for (const rotulo of [
        'A cada quadro',
        'A cada segundo',
        'A pergunta: estamos jogando agora?',
        'Passar 1 segundo',
        'Começar a partida',
        'Terminar a partida',
        'Voltar à tela de início',
      ])
        expect(lido).toContain(rotulo)
    }
  })

  test('o que cada caso faz só aparece depois do teste, e o "esperando" também', () => {
    expect(descobrir(ver(play([])))).toBe(5)
    const comPergunta = ver(play([...solto, lugar('second', true)]))
    expect(texto(comPergunta)).not.toContain('esperando')
    expect(texto(comPergunta)).not.toContain('o placar espera')
    const esperou = texto(ver(play([...solto, lugar('second', true), segundo])))
    expect(esperou).toContain('A resposta é não: o placar espera')
    expect(esperou).not.toContain('entra um ponto a cada segundo')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'A cada quadro'],
      [[lugar('frame', false)], 'Passar 1 segundo'],
      [[lugar('frame', false), segundo], 'A cada segundo'],
      [[lugar('frame', false), segundo, lugar('second', false)], 'Passar 1 segundo'],
      [solto, 'Ligar a pergunta'],
      [[...solto, lugar('second', true)], 'Passar 1 segundo'],
      [[...solto, lugar('second', true), segundo], 'Começar a partida'],
      [[...solto, lugar('second', true), segundo, enter], 'Passar 1 segundo'],
      [[...solto, lugar('second', true), segundo, enter, segundo], 'Terminar a partida'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDoPlacar(discoveryGuidance(activity, s)?.id, s.match)).not.toBeNull()
      expect(destaques(ver(s))).toEqual([esperado])
    }
  })
})

describe('number-line: a reta e a pergunta', () => {
  const { activity, play } = caso('number-line', ['colder', 'greater', 'stops', 'silent'])
  const somar: SceneAction = { type: 'sum-minus-one' }
  const voltar: SceneAction = { type: 'restart-case' }
  const sinal = (operator: '>' | '=' | '<'): SceneAction => ({ type: 'compare-op', operator })
  const vezes = (n: number) => Array.from({ length: n }, () => somar)
  const ver = (s: SceneState) => tela(activity, s, <LivreNumberLine />)

  test('só a ideia: a reta, o -1 e os sinais, sem "valor da base"', () => {
    const lido = texto(ver(play([])))
    expect(lido).not.toMatch(SO_A_IDEIA)
    for (const rotulo of [
      'Somar -1',
      '> maior que',
      '= igual a',
      '< menor que',
      'Voltar ao começo',
    ])
      expect(lido).toContain(rotulo)
  })

  test('o que cada teste mostra só aparece depois dele', () => {
    expect(descobrir(ver(play([])))).toBe(4)
    const menor = texto(ver(play(vezes(3))))
    expect(menor).toContain('o número fica menor')
    expect(menor).not.toContain('mora à direita do -9')
    expect(texto(ver(play([...vezes(3), voltar, sinal('>')])))).toContain('mora à direita do -9')
  })

  test('a reta vem antes da base (aula 12): a descoberta do -9 não fala da base', () => {
    const no9 = texto(ver(play([...vezes(3), voltar, sinal('>'), ...vezes(4)])))
    expect(no9).toContain('-9 não é maior que -9')
    expect(no9).not.toMatch(/\bbase\b/i)
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Somar -1'],
      [vezes(3), 'Voltar ao começo'],
      [[...vezes(3), voltar], '> maior que'],
      [[...vezes(3), voltar, sinal('>')], 'Somar -1'],
      [[...vezes(3), voltar, sinal('>'), ...vezes(4)], 'Voltar ao começo'],
      [[...vezes(3), voltar, sinal('>'), ...vezes(4), voltar], '= igual a'],
      [[...vezes(3), voltar, sinal('>'), ...vezes(4), voltar, sinal('=')], 'Somar -1'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDaReta(discoveryGuidance(activity, s)?.id, s.numberLine)).not.toBeNull()
      expect(destaques(ver(s))).toEqual([esperado])
    }
  })
})

describe('acceleration: a base, os cactos e a pergunta', () => {
  const { activity, play } = caso('acceleration', [
    'old-speed',
    'base-limit',
    'variation-limit',
    'past-limit',
  ])
  const cinco = (unit: number): SceneAction => ({
    type: 'sample',
    kind: 'velocity',
    unit,
    guided: false,
  })
  const pergunta = (enabled: boolean): SceneAction => ({ type: 'connect', port: 'limit', enabled })
  const zeros = (n: number) => Array.from({ length: n }, () => cinco(0.1))
  const ver = (s: SceneState) => tela(activity, s, <LivreAcceleration />)

  test('só a ideia: a base e a pergunta, sem "condição" nem o que a resposta faz', () => {
    for (const s of [play([]), play(zeros(4)), play(zeros(5))]) {
      const lido = texto(ver(s))
      expect(lido).not.toMatch(SO_A_IDEIA)
      expect(lido).not.toMatch(/→ fica|→ some|sem a condição/)
      for (const rotulo of ['Passar 5 segundos', 'Desligar a pergunta', 'Voltar ao começo'])
        expect(lido).toContain(rotulo)
    }
  })

  test('o que cada caso faz só aparece depois do teste dele', () => {
    expect(descobrir(ver(play([])))).toBe(4)
    const guardam = texto(ver(play(zeros(2))))
    expect(guardam).toContain('Guardam o número deles')
    expect(guardam).not.toContain('a base para no -9')
    expect(texto(ver(play(zeros(5))))).toContain('A resposta é não, e a base para no -9')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const casos: [SceneAction[], string][] = [
      [[], 'Passar 5 segundos'],
      [zeros(2), 'Passar 5 segundos'],
      [[pergunta(false), ...zeros(5)], 'Ligar a pergunta'],
      [[pergunta(false), ...zeros(5), pergunta(true)], 'Voltar ao começo'],
      [[...zeros(5), cinco(0.9)], 'Desligar a pergunta'],
      [[...zeros(5), cinco(0.9), pergunta(false)], 'Passar 5 segundos'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      expect(proximoGestoDaAceleracao(discoveryGuidance(activity, s)?.id, s.speed)).not.toBeNull()
      expect(destaques(ver(s))).toEqual([esperado])
    }
  })
})
