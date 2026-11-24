import { describe, expect, test } from 'bun:test'
import { discoveryGuidance, discoverySpeechSteps } from './discovery-guidance'
import { openScene, stepScene } from './engine'
import { sceneGoals } from './evaluate'
import {
  isSceneActivity,
  isSceneSetup,
  type SceneActivity,
  sceneModelFor,
  sceneTargets,
} from './index'
import { SCORE_GOAL_PRESETS, SPAWN_PRESETS } from './presets'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'
import { isSceneState, type SceneStart } from './state'
import { falasDaCena } from './voz'

const goal: SceneActivity = {
  type: 'experimentation',
  scene: 'score-goal',
  setup: { freeExploration: true, preset: SCORE_GOAL_PRESETS['vinte-acertos'] },
}
const spawn: SceneActivity = {
  type: 'experimentation',
  scene: 'spawn',
  setup: {
    freeExploration: true,
    preset: SPAWN_PRESETS['pedra-segundos'],
    goals: ['every-frame', 'with-timer'],
  },
}

describe('casos concretos da nova Nave, sem mudar o legado', () => {
  test('metas e intervalos canônicos passam; adulteração e uso em outra cena são recusados', () => {
    expect(isSceneActivity(goal)).toBe(true)
    expect(isSceneActivity(spawn)).toBe(true)
    expect(
      isSceneSetup(
        { ...goal.setup, preset: { ...SCORE_GOAL_PRESETS['vinte-acertos'], goal: 21 } },
        'score-goal',
      ),
    ).toBe(false)
    expect(isSceneSetup(goal.setup, 'spawn')).toBe(false)
    expect(isSceneSetup({ ...spawn.setup, goals: ['same-fall'] }, 'spawn')).toBe(false)
    expect(
      isSceneSetup(
        { ...spawn.setup, preset: { ...SPAWN_PRESETS['pedra-segundos'], intervals: [1.4] } },
        'spawn',
      ),
    ).toBe(false)
  })
  test('a meta20 começa em17, não fecha na abertura e vence em20 com maior ou igual', () => {
    let s = openScene(goal)
    expect(s.scoreGoal).toMatchObject({ points: 17, goal: 20, hits: 0, won: false })
    expect(s.evidence.discoveries).toEqual([])
    s = stepScene(goal, s, { type: 'goal-op', op: '>=' })
    for (let i = 0; i < 2; i++) s = stepScene(goal, s, { type: 'goal-hit' })
    expect(s.scoreGoal.won).toBe(false)
    s = stepScene(goal, s, { type: 'goal-hit' })
    expect(s.scoreGoal).toMatchObject({ points: 20, won: true })
    expect(s.evidence.discoveries).toContain('igual-conta')
    expect(isSceneState(s)).toBe(true)
    expect(discoveryGuidance(goal, s).text).toContain('chegou a 20')
  })
  test('maior que precisa21; trocar sinal e reiniciar restauram17 com a placa20', () => {
    let s = openScene(goal)
    for (let i = 0; i < 3; i++) s = stepScene(goal, s, { type: 'goal-hit' })
    expect(s.scoreGoal).toMatchObject({ points: 20, won: false })
    s = stepScene(goal, s, { type: 'goal-hit' })
    expect(s.scoreGoal).toMatchObject({ points: 21, won: true })
    s = stepScene(goal, s, { type: 'goal-restart' })
    expect(s.scoreGoal).toMatchObject({ points: 17, goal: 20, hits: 0, won: false })
    s = stepScene(goal, s, { type: 'goal-op', op: '>=' })
    expect(s.scoreGoal.points).toBe(17)
    s = stepScene(goal, s, { type: 'goal-hit' })
    s = stepScene(goal, s, { type: 'goal-edit' })
    expect(s.scoreGoal.goal).toBe(20)
    expect(s.evidence.discoveries).toContain('placa-fixa')
    const discoveries = [...s.evidence.discoveries]
    s = stepScene(goal, s, { type: 'reset' })
    expect(s.scoreGoal).toMatchObject({ points: 17, goal: 20, hits: 0, won: false })
    expect(s.evidence.discoveries).toEqual(discoveries)
    expect(isSceneState(s)).toBe(true)
  })
  test('sem caso novo, a meta antiga segue26 e o reinício segue23', () => {
    const legacy: SceneStart = { scene: 'score-goal' }
    let s = openScene(legacy)
    expect(s.scoreGoal).toMatchObject({ points: 23, goal: 26 })
    for (let i = 0; i < 4; i++) s = stepScene(legacy, s, { type: 'goal-hit' })
    expect(s.scoreGoal).toMatchObject({ points: 27, won: true })
    s = stepScene(legacy, s, { type: 'goal-restart' })
    expect(s.scoreGoal.points).toBe(23)
    expect(discoverySpeechSteps('score-goal')[0]?.text).toContain('23')
    expect(discoverySpeechSteps('score-goal')[0]?.text).toContain('26')
  })
  test('fala, catálogo e gravação do caso20 usam os mesmos números', () => {
    const inventory = discoverySpeechSteps('score-goal', goal.setup)
    expect(inventory.map((x) => x.text).join(' ')).not.toMatch(/\b(?:23|26|27)\b/)
    expect(inventory[0]?.text).toContain('17')
    expect(sceneModelFor(goal).success).toContain('20')
    expect(
      sceneModelFor(goal)
        .goals.map((g) => g.label)
        .join(' '),
    ).not.toMatch(/\b(?:26|27)\b/)
    expect(
      sceneGoals('score-goal', openScene(goal))
        .map((g) => g.label)
        .join(' '),
    ).not.toMatch(/\b(?:26|27)\b/)
    const recording = falasDaCena({ activity: goal })
    expect(recording.map((f) => f.speechText).join(' ')).not.toMatch(/\b(?:23|26|27)\b/)
    expect(recording.find((f) => f.slot === 'discovery:score-goal-start')?.visibleText).toContain(
      '17',
    )
    expect(
      falasDaCena({ activity: spawn })
        .map((f) => f.speechText)
        .join(' '),
    ).not.toMatch(/40|80|60 quadros/)
  })
  test('pedras em segundos:30 sem relógio, duas em3s com1,5 e nenhuma evidência prévia', () => {
    let s = openScene(spawn)
    expect(s.crowd.interval).toBe(1.5)
    expect(s.evidence.discoveries).toEqual([])
    s = stepScene(spawn, s, { type: 'advance', seconds: 1 })
    expect(s.crowd.born).toBe(30)
    expect(s.evidence.discoveries).toContain('every-frame')
    s = stepScene(spawn, s, { type: 'connect', port: 'timer', enabled: true })
    expect(s.crowd.born).toBe(0)
    s = stepScene(spawn, s, { type: 'advance', seconds: 1 })
    expect(s.crowd.born).toBe(0)
    s = stepScene(spawn, s, { type: 'advance', seconds: 1 })
    expect(s.crowd.born).toBe(1)
    s = stepScene(spawn, s, { type: 'advance', seconds: 1 })
    expect(s.crowd.born).toBe(2)
    expect(s.crowd.cacti.every((c) => typeof c.y === 'number' && c.velocity === 3)).toBe(true)
    expect(s.evidence.discoveries).toContain('with-timer')
    expect(discoveryGuidance(spawn, s).id).toBe('spawn-complete-two')
    expect(isSceneState(s)).toBe(true)
  })
  test('troca de segundos e reinício conservam descobertas; só a chuva recomeça', () => {
    let s = openScene(spawn)
    s = stepScene(spawn, s, { type: 'connect', port: 'timer', enabled: true })
    const before = s
    expect(stepScene(spawn, s, { type: 'interval', seconds: 1.4 })).toBe(before)
    s = stepScene(spawn, s, { type: 'interval', seconds: 0.5 })
    expect(s.caption).toContain('0,5 s')
    s = stepScene(spawn, s, { type: 'advance', seconds: 1 })
    expect(s.crowd.born).toBe(2)
    const observations = [...s.evidence.discoveries]
    s = stepScene(spawn, s, { type: 'interval', seconds: 2 })
    expect(s.crowd.born).toBe(0)
    expect(s.evidence.discoveries).toEqual(observations)
    s = stepScene(spawn, s, { type: 'reset' })
    expect(s.crowd.interval).toBe(1.5)
    expect(s.evidence.discoveries).toEqual(observations)
    expect(sceneTargets(spawn)).toEqual(['every-frame', 'with-timer'])
  })
  test('pedra40quadros e cacto continuam iguais; fala nova não promete medição em quadros', () => {
    const old: SceneStart = { scene: 'spawn', setup: { preset: SPAWN_PRESETS['pedra-quadros'] } }
    let s = openScene(old)
    expect(s.crowd.interval).toBe(40 / 30)
    expect(stepScene(old, s, { type: 'interval', seconds: 1.5 })).toBe(s)
    s = stepScene(old, s, { type: 'interval', seconds: 20 / 30 })
    expect(s.caption).toContain('20 quadros')
    expect(openScene({ scene: 'spawn' }).crowd.interval).toBe(1)
    expect(SPAWN_PRESETS['cacto-segundos'].intervals).toEqual([0.5, 1, 1.4, 2])
    const inventory = discoverySpeechSteps('spawn', spawn.setup)
    expect(inventory.map((x) => x.text).join(' ')).toContain('1,5')
    expect(inventory.map((x) => x.text).join(' ')).not.toMatch(/40|80|60 quadros/)
    const noGoals = {
      ...spawn,
      setup: { freeExploration: true, preset: SPAWN_PRESETS['pedra-segundos'] },
    }
    expect(
      discoveryGuidance(noGoals as SceneActivity, {
        ...s,
        evidence: { ...s.evidence, discoveries: ['every-frame', 'with-timer'] },
      }).id,
    ).toBe('spawn-complete-two')
  })
  test('checkpoint20 só restaura no caso20, inclusive o histórico de desfazer', () => {
    let session = initialExperiment(goal)
    session = stepExperiment(goal, session, { type: 'goal-op', op: '>=' }).session
    session = stepExperiment(goal, session, { type: 'goal-hit' }).session
    const packed = packExperiment('score-goal', session)
    expect(readExperimentSession('score-goal', packed, goal.setup)?.state.scoreGoal).toEqual(
      session.state.scoreGoal,
    )
    expect(readExperimentSession('score-goal', packed)).toBeNull()
    const legacy = packExperiment('score-goal', initialExperiment({ scene: 'score-goal' }))
    expect(readExperimentSession('score-goal', legacy, goal.setup)).toBeNull()
    expect(readExperimentSession('score-goal', legacy)?.state.scoreGoal.goal).toBe(26)
    const mixed = { ...session, past: [openScene({ scene: 'score-goal' })] }
    expect(
      readExperimentSession('score-goal', packExperiment('score-goal', mixed), goal.setup),
    ).toBeNull()
    const reset = stepExperiment(goal, session, { type: 'reset' }).session
    expect(reset.state.scoreGoal.points).toBe(17)
    expect(reset.state.evidence.discoveries).toEqual([])
  })
  test('guardar, restaurar e continuar conserva a altura das pedras em queda', () => {
    let session = initialExperiment(spawn)
    session = stepExperiment(spawn, session, {
      type: 'connect',
      port: 'timer',
      enabled: true,
    }).session
    for (let i = 0; i < 20; i++)
      session = stepExperiment(spawn, session, { type: 'advance', seconds: 0.1 }).session
    const restored = readExperimentSession('spawn', packExperiment('spawn', session), spawn.setup)
    expect(restored?.state.crowd.cacti).toEqual(session.state.crowd.cacti)
    expect(restored?.state.crowd.cacti[0]?.y).toBeGreaterThan(-30)
    const continued = stepExperiment(spawn, restored!, { type: 'advance', seconds: 0.1 }).session
    expect(continued.state.crowd.cacti[0]!.y).toBeGreaterThan(restored!.state.crowd.cacti[0]!.y!)
  })
})
