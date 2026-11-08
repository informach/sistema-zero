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
import {
  Door,
  type GestoDaMemoria,
  Memory,
  Position,
  proximoGestoDaMemoria,
} from '../src/components/scene-discovery-controls'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'

/**
 * Dias 2 e 3 do Farol (02/11/2026): a memória da chave, a pergunta da porta e os dois números, só
 * com a IDEIA. Nada de regra, ação de guardar, bloco, então ou senão na tela; a lista diz o que
 * comparar, e a porta só mostra o que cada resposta faz depois de a criança testar aquele caso.
 */
const caso = (scene: ExperimentationActivity['scene'], goals?: string[]) => {
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
  /\bregra\b|ação de guardar|\badicionar\b|\bretirar\b|\bbloco|\bentão\b|\bsenão\b/i

describe('Dia 2: a memória da chave', () => {
  const { activity, play } = caso('collect-and-remember')

  test('o botão liga e desliga a memória da chave, sem regra nem ação', () => {
    for (const s of [
      play([]),
      play([{ type: 'remember-collection', enabled: true }]),
      play([{ type: 'remember-collection', enabled: true }, { type: 'collect-key' }]),
    ]) {
      const lido = texto(tela(activity, s, <Memory />))
      expect(lido).not.toMatch(SO_A_IDEIA)
    }
    // ⭐ 08/11/2026: a memória é o LÁPIS do caderninho do jogo, um interruptor.
    expect(texto(tela(activity, play([]), <Memory />))).toContain('Lápis desligado')
    expect(
      texto(tela(activity, play([{ type: 'remember-collection', enabled: true }]), <Memory />)),
    ).toContain('Lápis ligado')
  })

  test('o caderninho mostra o que o jogo anotou; temChave só aparece na montagem', () => {
    const antes = texto(tela(activity, play([]), <Memory />))
    expect(antes).toContain('Caderninho do jogo Tem a chave? NÃO')
    expect(antes).not.toContain('temChave')
    const anotou = texto(
      tela(
        activity,
        play([{ type: 'remember-collection', enabled: true }, { type: 'collect-key' }]),
        <Memory />,
      ),
    )
    expect(anotou).toContain('Tem a chave? SIM')
    expect(anotou).not.toContain('temChave')
    // Sem o lápis, pegar a chave tira a chave do chão, mas o caderninho continua NÃO.
    const semLapis = tela(activity, play([{ type: 'collect-key' }]), <Memory />)
    expect(texto(semLapis)).toContain('Tem a chave? NÃO')
    expect(semLapis).not.toContain('sz-discovery-chave-brilha')
  })

  test('o botão em destaque é o gesto que o Zappy pede', () => {
    const ligar: SceneAction = { type: 'remember-collection', enabled: true }
    const desligar: SceneAction = { type: 'remember-collection', enabled: false }
    const encostar: SceneAction = { type: 'collect-key' }
    const recomecar: SceneAction = { type: 'restart-collection' }
    const casos: [SceneAction[], Exclude<GestoDaMemoria, null>][] = [
      [[], 'encostar'],
      [[encostar], 'memoria'],
      [[encostar, ligar], 'recomecar'],
      [[encostar, ligar, recomecar], 'encostar'],
      [[ligar, encostar], 'memoria'],
      [[ligar, encostar, desligar], 'recomecar'],
      [[ligar, encostar, desligar, recomecar], 'encostar'],
      [[encostar, ligar, recomecar, encostar], 'afastar'],
      [[encostar, ligar, recomecar, encostar, { type: 'leave-key' }], 'recomecar'],
    ]
    for (const [acoes, esperado] of casos) {
      const s = play(acoes)
      const fala = discoveryGuidance(activity, s)?.id
      expect([fala, proximoGestoDaMemoria(fala, s.collection)]).toEqual([fala, esperado])
    }
  })

  test('os cartões perguntam e o andar livre tem as quatro setas', () => {
    const html = tela(activity, play([]), <Memory />)
    const lido = texto(html)
    expect(lido).toContain('Pegou a chave com o lápis desligado. O caderninho mudou?')
    expect(lido).toContain('E com o jogo anotando?')
    expect(lido).toContain('Se o personagem se afastar, continua anotado?')
    expect(lido).toContain('E numa partida nova?')
    for (const seta of ['cima', 'baixo', 'a esquerda', 'a direita'])
      expect(html).toContain(`aria-label="Andar para ${seta}"`)
    expect(lido).toContain('Jogar de novo')
  })
})

describe('Dia 3: a pergunta da porta', () => {
  const { activity, play } = caso('lighthouse-key')
  const testar: SceneAction = { type: 'try-lighthouse-door' }
  const dar: SceneAction = { type: 'key-state', hasKey: true }

  test('sim e não, sem regra, então nem senão; sem botão de dar a chave', () => {
    for (const s of [play([]), play([testar]), play([testar, dar, testar])]) {
      const lido = texto(tela(activity, s, <Door />))
      expect(lido).not.toMatch(SO_A_IDEIA)
      expect(lido).toContain('Sem a chave, o que a porta faz?')
      expect(lido).toContain('E com a chave?')
      expect(lido).not.toContain('Dar a chave')
    }
  })

  test('a porta responde no balão da cena, e o caderninho diz o que ela olhou', () => {
    const antes = texto(tela(activity, play([]), <Door />))
    expect(antes).toContain('Tem a chave? NÃO')
    expect(antes).not.toContain('Sem a chave, não abro.')
    const semChave = texto(tela(activity, play([testar]), <Door />))
    expect(semChave).toContain('Sem a chave, não abro.')
    const comChave = texto(tela(activity, play([dar, testar]), <Door />))
    expect(comChave).toContain('Tem a chave! Pode entrar.')
    expect(comChave).toContain('Tem a chave? SIM')
  })
})

describe('Dia 3: os dois números', () => {
  const { activity, play } = caso('lighthouse-position', ['x-minus', 'x-plus', 'y-minus', 'y-plus'])

  test('os cartões perguntam sem dizer para onde a chave vai; os números têm − e +', () => {
    const html = tela(activity, play([]), <Position />)
    const lido = texto(html)
    for (const pergunta of [
      'E se o x diminuir?',
      'E se o x aumentar?',
      'E se o y diminuir?',
      'Se o y aumentar, a chave sobe ou desce?',
    ])
      expect(lido).toContain(pergunta)
    expect(lido).not.toMatch(/para a esquerda|para a direita|a chave sobe\.|desce!/i)
    expect(html).toContain('aria-label="x menos 60"')
    expect(html).toContain('aria-label="y mais 40"')
    expect(lido).toContain('x cresce →')
    expect(lido).toContain('y cresce ↓')
    // O desafio do alvo só aparece com as quatro descobertas.
    expect(lido).not.toContain('Mostrar o alvo')
  })
})
