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
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { cartoesDaAtividade } from '../src/components/scene-faisca-livre'
import { CabanaLivre } from '../src/components/scene-poder-cabana'
import { SimbolosLivre } from '../src/components/scene-poder-simbolos'

/**
 * As telas livres dos Poderes "O baú dos símbolos" e "O segredo da cabana" (08/11/2026, proposta
 * "Experiências do Faísca" aprovada): o personagem ANDA até as pedras, as peças e a porta (os botões
 * de gesto saíram), como o baú decide e o "e"/"ou" da cabana são peças que se trocam, e o caderninho
 * fala do jeito da criança (sem `passo`, `temChave` nem `temEmblema`).
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
  /Tocar o sol|Tocar a lua|Tocar a estrela|Pegar a chave|Pegar o emblema|Encostar na cabana|O baú confere a vez|O baú só conta|temChave|temEmblema|\bbloco|\bentão\b|\bsenão\b/
const tocar = (symbol: 'sol' | 'lua' | 'estrela'): SceneAction => ({ type: 'touch-symbol', symbol })

describe('Símbolos: a tela livre', () => {
  const { activity, play } = caso('symbol-sequence')

  test('sem os botões de gesto nem o nome da variável', () => {
    for (const s of [play([]), play([tocar('sol')]), play([tocar('lua')])])
      expect(texto(tela(activity, s, <SimbolosLivre />))).not.toMatch(BOTOES_ANTIGOS)
  })

  test('a peça de como o baú decide se troca; o caderninho diz o passo da placa', () => {
    const inicio = texto(tela(activity, play([]), <SimbolosLivre />))
    expect(inicio).toContain('O baú confere a ordem dos símbolos')
    expect(inicio).toContain('Em que passo da placa? 0 de 3')
    expect(texto(tela(activity, play([tocar('sol')]), <SimbolosLivre />))).toContain(
      'Em que passo da placa? 1 de 3',
    )
    const contando = play([{ type: 'sequence-mode', mode: 'count' }, tocar('lua')])
    const html = texto(tela(activity, contando, <SimbolosLivre />))
    expect(html).toContain('O baú confere só quantos foram tocados')
    expect(html).toContain('Quantos símbolos tocados? 1 de 3')
  })

  test('a fala é a do motor', () => {
    falas.length = 0
    tela(activity, play([]), <SimbolosLivre />)
    expect(falas).toContain(discoverySpeech('symbols-start'))
  })
})

describe('Cabana: a tela livre', () => {
  const { activity, play } = caso('two-pieces')
  const pegar = (piece: 'key' | 'emblem'): SceneAction => ({ type: 'take-piece', piece })

  test('sem os botões de gesto nem os nomes das variáveis', () => {
    for (const s of [play([]), play([pegar('key')]), play([pegar('key'), { type: 'try-cabin' }])])
      expect(texto(tela(activity, s, <CabanaLivre />))).not.toMatch(BOTOES_ANTIGOS)
  })

  test('a pergunta da cabana aparece inteira, com o "e" que se troca por "ou"', () => {
    const inicio = texto(tela(activity, play([]), <CabanaLivre />))
    expect(inicio).toContain('Tem a chave e ⇄ tem o emblema?')
    expect(inicio).toContain('Tem a chave? NÃO')
    expect(inicio).toContain('Tem o emblema? NÃO')
    const ou = play([{ type: 'cabin-rule', rule: 'or' }, pegar('key')])
    const html = texto(tela(activity, ou, <CabanaLivre />))
    expect(html).toContain('Tem a chave ou ⇄ tem o emblema?')
    expect(html).toContain('Tem a chave? SIM')
  })
})

describe('as metas da atividade decidem os cartões', () => {
  test('sem metas no caso, todos; com metas, só as do caso, na ordem da tela', () => {
    const cartoes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(cartoesDaAtividade(cartoes, { setup: { freeExploration: true } })).toEqual(cartoes)
    expect(
      cartoesDaAtividade(cartoes, { setup: { freeExploration: true, goals: ['c', 'a'] } }),
    ).toEqual([{ id: 'a' }, { id: 'c' }])
  })
})
