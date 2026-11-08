import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  discoverySpeech,
  type ExperimentationActivity,
  LIGHTHOUSE_NOT_GOALS,
  openScene,
  type SceneAction,
  type SceneState,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneActivityView } from '../src/components/scene-activity'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { PortaDoNao } from '../src/components/scene-door-not'
import {
  CHAVE,
  FAROL,
  INICIO,
  podeAndarNaIlha,
  setasNaVista,
  VISTA,
} from '../src/components/scene-ilha-porta'

/**
 * "O que muda com o não?" (A Ilha do Farol, aula 3), desde 08/11/2026 NA ILHA 3D DO JOGO DO CURSO
 * (pedido dela: a cena é o jogo do curso, não o mapa 2D da Chave do Farol). O personagem anda, pega
 * a chave no chão e a porta do farol pergunta quando ele chega nela; o "não" é uma peça que encaixa
 * na pergunta. Nada de bloco, Se, então, senão nem variável.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'lighthouse-key',
  cenario: 'ilha',
  setup: { freeExploration: true, goals: [...LIGHTHOUSE_NOT_GOALS] },
}
const start = sceneStart(activity)
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const falas: string[] = []
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
        instruction: '',
        dialogue: (text: string): ReactNode => {
          falas.push(text)
          return <p data-fala>{text}</p>
        },
        tools: null,
        continuar: null,
      }}
    >
      <PortaDoNao />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
const nao = (not: boolean): SceneAction => ({ type: 'door-question', not })

describe('a porta com o não: a tela livre na ilha 3D', () => {
  test('a cena é a ilha do jogo, com o aviso do jogo da Ilha', () => {
    const html = tela(play([]))
    expect(html).toContain('sz-island-world')
    expect(texto(html)).toContain('Encontre a chave e leve o personagem até o farol.')
    expect(html).toContain('data-heroi="-6.50,0.75"')
  })

  test('sem os botões de antes nem vocabulário de montagem', () => {
    for (const s of [play([]), play([{ type: 'try-lighthouse-door' }]), play([nao(true)])])
      expect(texto(tela(s))).not.toMatch(
        /Dar a chave|Testar a porta|Pôr o não|temChave|\bbloco|\bSe\b|\bentão\b|\bsenão\b/,
      )
  })

  test('o "não" é uma peça que encaixa na pergunta da porta', () => {
    const sem = tela(play([]))
    expect(texto(sem)).toContain('A porta ··· está trancada?')
    expect(sem).toContain('aria-label="Encaixar o não na pergunta"')
    const com = tela(play([nao(true)]))
    expect(texto(com)).toContain('A porta não está trancada?')
    expect(com).toContain('aria-label="Tirar o não da pergunta"')
  })

  test('o caderninho diz se o personagem tem a chave', () => {
    expect(texto(tela(play([])))).toContain('Tem a chave? NÃO')
    expect(texto(tela(play([{ type: 'key-state', hasKey: true }])))).toContain('Tem a chave? SIM')
  })

  test('os dois cartões perguntam, e a fala é a do motor', () => {
    falas.length = 0
    const html = texto(tela(play([])))
    expect(html).toContain('Sem a chave: o "não" muda a resposta da porta?')
    expect(html).toContain('E com a chave?')
    expect(falas).toContain(discoverySpeech('door-not-start'))
  })
})

describe('a ilha do jogo: os lugares e as setas', () => {
  test('o personagem anda pelas áreas do jogo, sem atravessar as pedras nem o farol', () => {
    expect(podeAndarNaIlha(INICIO)).toBe(true)
    expect(podeAndarNaIlha({ x: 2, z: 0.75 })).toBe(true) // a ponte
    expect(podeAndarNaIlha({ x: 2, z: 2 })).toBe(false) // o mar ao lado da ponte
    expect(podeAndarNaIlha({ x: -2, z: -1 })).toBe(false) // as pedras
    expect(podeAndarNaIlha(FAROL)).toBe(false) // o farol é sólido
    expect(podeAndarNaIlha({ x: CHAVE.x - 0.6, z: CHAVE.z })).toBe(true) // dá para pegar a chave
  })

  test('as setas giram com a câmera, como no Jogo 3D: ↑ leva para longe dela', () => {
    const cima = setasNaVista(0, -1)
    // A câmera está à esquerda e na frente (az negativo): longe dela é para a direita e o fundo.
    expect(cima.vx).toBeCloseTo(-Math.sin(VISTA.az))
    expect(cima.vz).toBeCloseTo(-Math.cos(VISTA.az))
    expect(cima.vx).toBeGreaterThan(0)
    expect(cima.vz).toBeLessThan(0)
    // → é a direita da câmera: (cos az, −sin az). Sem giro, as setas seriam o x e o z do mundo.
    const direita = setasNaVista(1, 0)
    expect(direita.vx).toBeCloseTo(Math.cos(VISTA.az))
    expect(direita.vz).toBeCloseTo(-Math.sin(VISTA.az))
  })
})

describe('a porta escolhe a tela pelo caso', () => {
  const render = (a: ExperimentationActivity) => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'A porta',
      instructions: 'Teste a porta.',
      hints: [],
      activity: a,
    })
    return renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-porta', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={a}
      />,
    )
  }
  test('as metas do não abrem a pergunta com o não na ilha 3D; o Farol segue com a porta de sempre', () => {
    const ilha = render(activity)
    expect(ilha).toContain('Encaixar o não na pergunta')
    expect(ilha).toContain('sz-island-world')
    const farol = render({
      ...activity,
      cenario: 'farol',
      setup: { freeExploration: true, goals: ['locked-without-key', 'opened-with-key'] },
    })
    expect(farol).toContain('Jogar de novo')
    expect(farol).not.toContain('Encaixar o não na pergunta')
    expect(farol).not.toContain('sz-island-world')
  })
})
