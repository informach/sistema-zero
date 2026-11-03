import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import {
  discoveryGuidance,
  type ExperimentationActivity,
  openScene,
  type SceneAction,
  type SceneState,
  sceneStart,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneActivityView } from '../src/components/scene-activity'
import { DiscoveryContext } from '../src/components/scene-discovery-frame'
import { LivreScoreGoal } from '../src/components/scene-livre/score-goal'

/**
 * A meta do jogo (Nave contra Asteroides, Dia 5, 02/11/2026): só a ideia, sem bloco nem Se; em que
 * acerto vem a vitória e o que a placa faz só aparecem depois do teste; o destaque é o gesto da fala.
 */
const activity: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'score-goal',
  cenario: 'nave',
  setup: { freeExploration: true, goals: ['igual-conta', 'maior-pula', 'placa-fixa'] },
}
const start = sceneStart(activity)
const play = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const ACERTO: SceneAction = { type: 'goal-hit' }
const acertos = (n: number): SceneAction[] => Array.from({ length: n }, () => ACERTO)
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
        instruction: discoveryGuidance(activity, state).text,
        dialogue: (text) => <p>{text}</p>,
        tools: null,
      }}
    >
      <LivreScoreGoal />
    </DiscoveryContext.Provider>,
  )
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const destaques = (html: string) =>
  [...html.matchAll(/data-tom="gesto"[^>]*>(.*?)<\/button>/g)].map((m) => texto(m[1] ?? '').trim())

describe('a meta do jogo', () => {
  test('abre com o placar em 23, a placa em 26 e Acertar uma pedra em destaque', () => {
    const html = tela(openScene(start))
    const lido = texto(html)
    expect(lido).toContain('Placar 23')
    expect(lido).toContain('Meta 26')
    for (const rotulo of [
      'Maior que (&gt;)',
      'Maior ou igual (≥)',
      'Acertar uma pedra',
      'Jogar de novo',
      'Tentar mudar a placa',
    ])
      expect(lido).toContain(rotulo)
    expect(lido).toContain('0 de 3 descobertas')
    expect(destaques(html)).toEqual(['Acertar uma pedra'])
    expect(html).toContain('data-placa="26"')
  })

  test('⚠️⚠️ só a ideia: nenhum bloco, Se, então, senão, variável nem código', () => {
    for (const s of [openScene(start), play(acertos(4)), play([ACERTO, { type: 'goal-edit' }])]) {
      const lido = texto(tela(s))
      expect(lido).not.toMatch(/\bbloco|\bregra\b|\bentão\b|\bsenão\b|\bSe\b|variável|código/)
    }
  })

  test('cada caso só se revela depois de testado', () => {
    const inicio = texto(tela(openScene(start)))
    expect(inicio.match(/Teste para descobrir/g)?.length).toBe(3)
    expect(inicio).not.toMatch(/veio no|continuou 26/)
    const maior = texto(tela(play(acertos(4))))
    expect(maior).toContain('O 26 não deu a vitória. Ela veio no 27.')
    expect(maior.match(/Teste para descobrir/g)?.length).toBe(2)
    expect(maior).not.toContain('A vitória veio no 26.')
  })

  test('o destaque segue a fala', () => {
    // No meio da partida, a fala propõe a placa.
    expect(destaques(tela(play([ACERTO])))).toEqual(['Tentar mudar a placa'])
    // Vitória com maior que: a fala propõe o outro sinal.
    expect(destaques(tela(play([ACERTO, { type: 'goal-edit' }, ...acertos(3)])))).toEqual([
      'Maior ou igual (≥)',
    ])
    // Tudo visto: nada em destaque.
    const tudo = play([
      ACERTO,
      { type: 'goal-edit' },
      ...acertos(3),
      { type: 'goal-op', op: '>=' },
      ...acertos(3),
    ])
    expect(destaques(tela(tudo))).toEqual([])
    expect(texto(tela(tudo))).toContain('3 de 3 descobertas')
  })
})

describe('a cena entra pela tela livre', () => {
  test('o bloco com exploração livre abre a meta do jogo', () => {
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'A meta do jogo',
      instructions: 'Compare os sinais.',
      hints: [],
      activity,
    })
    const html = renderToStaticMarkup(
      <SceneActivityView
        block={{ id: 'experiencia-meta', kind: 'interactive', sortOrder: 0, content }}
        content={content}
        activity={activity}
      />,
    )
    expect(html).toContain('Tentar mudar a placa')
  })
})
