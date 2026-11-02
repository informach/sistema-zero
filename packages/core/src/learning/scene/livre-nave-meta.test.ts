import { describe, expect, test } from 'bun:test'
import { scenePaths } from '../../../tests/fixtures/exploration-paths'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  isSceneSetup,
  sceneStart,
  sceneTargets,
} from './index'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'
import { isSceneState, SCORE_GOAL } from './state'

/**
 * A meta do jogo (`score-goal`, Nave contra Asteroides, Dia 5, 02/11/2026): o placar sobe a cada
 * acerto, a placa da meta é uma constante (26) e o sinal decide se chegar a 26 já vale (≥) ou se é
 * preciso passar (>). Só a ideia, em exploração livre com o Zappy.
 */
export const BLOCO_DA_META: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'score-goal',
  cenario: 'nave',
  setup: { freeExploration: true, goals: ['igual-conta', 'maior-pula', 'placa-fixa'] },
}
const start = sceneStart(BLOCO_DA_META)
const jogar = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const fala = (actions: SceneAction[]) => discoveryGuidance(BLOCO_DA_META, jogar(actions)).id
const ACERTO: SceneAction = { type: 'goal-hit' }
const acertos = (n: number): SceneAction[] => Array.from({ length: n }, () => ACERTO)
const sinal = (op: '>' | '>='): SceneAction => ({ type: 'goal-op', op })
const DE_NOVO: SceneAction = { type: 'goal-restart' }
const PLACA: SceneAction = { type: 'goal-edit' }

const falas = new Map(discoverySpeechSteps('score-goal').map(({ id, text }) => [id, text] as const))

describe('a meta do jogo: o Zappy fala só da ideia', () => {
  test('as falas têm o prefixo da cena', () => {
    expect(falas.size).toBe(9)
    for (const id of falas.keys()) expect(id.startsWith('score-goal-')).toBe(true)
  })
  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, Se, então, senão, variável, constante nem código', (id) => {
    // "Constante" é a palavra do bloco, só explicada na montagem.
    expect(falas.get(id)).not.toMatch(
      /\bbloco|\bregra|\bentão\b|\bsenão\b|\bSe\b|variável|constante|código|\baperte\b/,
    )
  })
  const ANTES: [string, RegExp][] = [
    ['score-goal-start', /veio|já deu|\b27\b|passar|constante|não muda/i],
    ['score-goal-try', /veio|já deu|\b27\b|passar|constante|não muda/i],
    ['score-goal-running', /veio|já deu|\b27\b|passar/i],
    ['score-goal-running-placa', /continuou|constante|não muda/i],
    // Depois de um teste, a fala explica ESTE e não conta o outro.
    ['score-goal-equal', /\b27\b|passar|não deu/i],
    ['score-goal-greater', /igual à meta também|chegou a 26, o jogo já/i],
    ['score-goal-placa', /continuou|constante|não muda/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('a meta do jogo: o motor', () => {
  test('a partida começa perto do fim, com a placa em 26 e o sinal maior que', () => {
    expect(openScene(start).scoreGoal).toEqual({
      points: SCORE_GOAL.start,
      op: '>',
      goal: 26,
      hits: 0,
      won: false,
    })
  })
  test('com ≥ a vitória vem no 26; com > o 26 passa e ela vem no 27', () => {
    const igual = jogar([sinal('>='), ...acertos(3)])
    expect(igual.scoreGoal).toMatchObject({ points: 26, won: true })
    expect(igual.evidence.discoveries).toEqual(['igual-conta'])
    const maior26 = jogar([sinal('>'), ...acertos(3)])
    expect(maior26.scoreGoal).toMatchObject({ points: 26, won: false })
    expect(maior26.evidence.discoveries).toEqual([])
    const maior27 = jogar([sinal('>'), ...acertos(4)])
    expect(maior27.scoreGoal).toMatchObject({ points: 27, won: true })
    expect(maior27.evidence.discoveries).toEqual(['maior-pula'])
  })
  test('depois da vitória, acertar não soma mais; trocar o sinal e Jogar de novo recomeçam', () => {
    expect(jogar([sinal('>='), ...acertos(5)]).scoreGoal.points).toBe(26)
    expect(jogar([sinal('>='), ...acertos(2), sinal('>')]).scoreGoal).toMatchObject({
      points: SCORE_GOAL.start,
      hits: 0,
      op: '>',
    })
    expect(jogar([...acertos(2), DE_NOVO]).scoreGoal).toMatchObject({ points: 23, hits: 0 })
  })
  test('a placa nunca muda; a meta cai só no MEIO da partida', () => {
    expect(jogar([PLACA]).evidence.discoveries).toEqual([])
    expect(jogar([PLACA]).scoreGoal.goal).toBe(26)
    expect(jogar([sinal('>='), ...acertos(3), PLACA]).evidence.discoveries).not.toContain(
      'placa-fixa',
    )
    const meio = jogar([ACERTO, PLACA])
    expect(meio.scoreGoal.goal).toBe(26)
    expect(meio.evidence.discoveries).toEqual(['placa-fixa'])
  })
  test('o caso só escolhe o sinal; acertos e tentativas são da criança', () => {
    expect(isSceneSetup({ ...BLOCO_DA_META.setup, actions: [sinal('>=')] }, 'score-goal')).toBe(
      true,
    )
    expect(isSceneSetup({ ...BLOCO_DA_META.setup, actions: [ACERTO] }, 'score-goal')).toBe(false)
  })
  test('o retrato guardado volta igual, e o incoerente é recusado', () => {
    let sessao = initialExperiment(start)
    for (const a of [sinal('>='), ...acertos(3)]) sessao = stepExperiment(start, sessao, a).session
    const lido = readExperimentSession('score-goal', packExperiment('score-goal', sessao))
    expect(lido?.state.scoreGoal).toEqual(sessao.state.scoreGoal)
    const s = sessao.state
    expect(isSceneState({ ...s, scoreGoal: { ...s.scoreGoal, won: false } })).toBe(false)
    expect(isSceneState({ ...s, scoreGoal: { ...s.scoreGoal, goal: 30 } })).toBe(false)
  })
})

describe('a meta do jogo: a fala acompanha a ordem escolhida', () => {
  test('começando por maior que (o de fábrica)', () => {
    expect(fala([])).toBe('score-goal-start')
    expect(fala([ACERTO])).toBe('score-goal-running-placa')
    expect(fala([ACERTO, PLACA])).toBe('score-goal-placa-seen')
    expect(fala([ACERTO, PLACA, ...acertos(3)])).toBe('score-goal-greater')
    expect(fala([ACERTO, PLACA, ...acertos(3), sinal('>=')])).toBe('score-goal-try')
    expect(fala([ACERTO, PLACA, ...acertos(3), sinal('>='), ...acertos(3)])).toBe(
      'score-goal-complete',
    )
  })
  test('começando por maior ou igual, com a placa por último', () => {
    expect(fala([sinal('>='), ...acertos(3)])).toBe('score-goal-equal')
    expect(fala([sinal('>='), ...acertos(3), sinal('>')])).toBe('score-goal-try')
    const sinais = [sinal('>='), ...acertos(3), sinal('>'), ...acertos(4)]
    expect(fala(sinais)).toBe('score-goal-placa')
    expect(fala([...sinais, DE_NOVO])).toBe('score-goal-placa')
    expect(fala([...sinais, DE_NOVO, ACERTO])).toBe('score-goal-running-placa')
    expect(fala([...sinais, DE_NOVO, ACERTO, PLACA])).toBe('score-goal-complete')
  })
})

describe('a meta do jogo: o caminho livre', () => {
  test('completa as três metas e fecha com score-goal-complete', () => {
    let sessao = initialExperiment(start)
    for (const a of scenePaths['score-goal']) sessao = stepExperiment(start, sessao, a).session
    for (const meta of sceneTargets(BLOCO_DA_META))
      expect(sessao.state.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(BLOCO_DA_META, sessao.state).id).toBe('score-goal-complete')
  })
})
