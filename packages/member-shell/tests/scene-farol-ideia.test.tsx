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
    expect(texto(tela(activity, play([]), <Memory />))).toContain('Ligar a memória da chave')
    expect(
      texto(tela(activity, play([{ type: 'remember-collection', enabled: true }]), <Memory />)),
    ).toContain('Desligar a memória da chave')
  })

  test('o que o encontro faz com o aviso e com temChave só aparece depois do teste', () => {
    const antes = texto(
      tela(activity, play([{ type: 'remember-collection', enabled: true }]), <Memory />),
    )
    expect(antes).not.toContain('O aviso muda')
    expect(antes).not.toContain('O jogo guarda em temChave')
    const semMemoria = texto(tela(activity, play([{ type: 'collect-key' }]), <Memory />))
    expect(semMemoria).toContain('O aviso muda')
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

  test('a lista diz o que comparar', () => {
    const lido = texto(tela(activity, play([]), <Memory />))
    expect(lido).toContain('Compare uma coleta com a memória desligada.')
    expect(lido).toContain('Compare uma coleta com a memória ligada.')
    expect(lido).toContain('Afaste o personagem depois de guardar e observe temChave.')
    expect(lido).toContain('Comece uma partida nova depois de guardar e observe temChave.')
  })
})

describe('Dia 3: a pergunta da porta', () => {
  const { activity, play } = caso('lighthouse-key')
  const testar: SceneAction = { type: 'try-lighthouse-door' }
  const dar: SceneAction = { type: 'key-state', hasKey: true }

  test('sim e não, sem regra, então nem senão', () => {
    for (const s of [play([]), play([testar]), play([testar, dar, testar])]) {
      const lido = texto(tela(activity, s, <Door />))
      expect(lido).not.toMatch(SO_A_IDEIA)
      expect(lido).toContain('A pergunta da porta')
      expect(lido).toContain('Teste a mesma porta com a chave.')
    }
  })

  test('o que cada resposta faz só aparece depois do teste daquele caso', () => {
    const antes = texto(tela(activity, play([]), <Door />))
    expect(antes).not.toContain('Acender o farol')
    expect(antes).not.toContain('Avisar: falta a chave')
    expect(antes.match(/Teste para descobrir/g)?.length).toBe(2)

    const semChave = texto(tela(activity, play([testar]), <Door />))
    expect(semChave).toContain('Avisar: falta a chave')
    expect(semChave).not.toContain('Acender o farol')

    // Testado o caso de agora, o destaque vai para o outro caso, mesmo preparando de novo.
    for (const s of [play([testar]), play([testar, { type: 'key-state', hasKey: false }])]) {
      const html = tela(activity, s, <Door />)
      expect(html).toMatch(/data-tom="gesto"[^>]*>Dar a chave ao personagem/)
      expect(html).not.toMatch(/data-tom="gesto"[^>]*>Testar a porta/)
    }

    const osDois = texto(tela(activity, play([testar, dar, testar]), <Door />))
    expect(osDois).toContain('Avisar: falta a chave')
    expect(osDois).toContain('Acender o farol')
  })
})

describe('Dia 3: os dois números', () => {
  const { activity, play } = caso('lighthouse-position', ['x-minus', 'x-plus', 'y-minus', 'y-plus'])

  test('a lista pede aumentar e diminuir cada número, sem dizer para onde a chave vai', () => {
    const lido = texto(tela(activity, play([]), <Position />))
    for (const meta of [
      'Diminua o x e observe a chave.',
      'Aumente o x e observe a chave.',
      'Diminua o y e observe a chave.',
      'Aumente o y e observe a chave.',
    ])
      expect(lido).toContain(meta)
    expect(lido).not.toMatch(/para a esquerda|para a direita|para cima|para baixo/i)
  })
})
