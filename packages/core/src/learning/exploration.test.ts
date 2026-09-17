import { describe, expect, test } from 'bun:test'
import {
  appendExplorationAction,
  type ExplorationAction,
  type ExplorationActivity,
  type ExplorationMission,
  evaluateExploration,
  initialExploration,
  isInteractiveBlock,
  isLearningAnswers,
  type LearningAnswers,
  replayExploration,
  transitionExploration,
} from './index'

function run(mission: ExplorationMission, actions: ExplorationAction[]) {
  const activity: ExplorationActivity = { type: 'exploration', version: 2, mission }
  let answers: LearningAnswers = {}
  for (const action of actions) answers = appendExplorationAction(activity, answers, action)
  expect(isLearningAnswers(answers)).toBe(true)
  return {
    activity,
    answers,
    state: replayExploration(activity, answers).state,
    result: evaluateExploration(activity, answers),
  }
}
const advance = (seconds: number): ExplorationAction => ({ type: 'advance', seconds })
const connect = (
  port:
    | 'gravity'
    | 'sound'
    | 'timer'
    | 'cleanup'
    | 'condition'
    | 'touch'
    | 'restart'
    | 'limit'
    | 'draw',
): ExplorationAction => ({ type: 'connect', port, enabled: true })

describe('direct exploration contract', () => {
  test('game state needs a new birth in that screen, not a cactus left over from another screen', () => {
    const activity = { type: 'exploration', version: 2, mission: 'game-state' } as const
    let state = transitionExploration(activity, initialExploration(activity), advance(0.6))
    expect(state.discoveries).toContain('outside')
    state = transitionExploration(activity, state, connect('condition'))
    state = transitionExploration(activity, state, { type: 'start', input: 'tap' })
    state = transitionExploration(activity, state, advance(0.001))
    expect(state.discoveries).not.toContain('playing')
    state = transitionExploration(activity, state, advance(0.6))
    expect(state.discoveries).toContain('playing')

    let other = transitionExploration(activity, initialExploration(activity), {
      type: 'start',
      input: 'tap',
    })
    other = transitionExploration(activity, other, advance(0.6))
    other = transitionExploration(activity, other, { type: 'home' })
    other = transitionExploration(activity, other, advance(0.001))
    expect(other.discoveries).not.toContain('outside')
  })
  test('new missions validate independently of legacy trials, with no checkpoint gate', () => {
    const activity: ExplorationActivity = { type: 'exploration', version: 2, mission: 'gravity' }
    expect(
      isInteractiveBlock({
        kind: 'interactive',
        title: 'Dino',
        instructions: 'Toque no Dino',
        hints: [],
        required: false,
        activity,
      }),
    ).toBe(true)
    expect(evaluateExploration(activity, { simulationTrials: ['{"gravity":0.6}'] }).passed).toBe(
      false,
    )
    expect(replayExploration(activity, { explorationVersion: 1, explorationTrace: [] }).valid).toBe(
      false,
    )
    expect(
      replayExploration(activity, {
        explorationVersion: 2,
        explorationMission: 'gravity',
        explorationTrace: ['[{"type":"resize","width":120}]'],
      }).valid,
    ).toBe(false)
  })
  test('layers react immediately, final mounting matters, undo preserves discoveries', () => {
    expect(run('layers', [{ type: 'layer', front: true }]).result.passed).toBe(true)
    const undone = run('layers', [{ type: 'layer', front: true }, { type: 'undo' }])
    expect(undone.state.discoveries).toContain('front')
    expect(undone.state.front).toBe(false)
    expect(undone.result.passed).toBe(false)
  })
  test('gravity requires real rise and return, not selecting a setting or waiting', () => {
    expect(run('gravity', [connect('gravity'), advance(10)]).result.passed).toBe(false)
    const result = run('gravity', [
      { type: 'jump', input: 'tap' },
      advance(0.5),
      connect('gravity'),
      { type: 'jump', input: 'key' },
      advance(1),
    ])
    expect(result.result.passed).toBe(true)
    expect(result.state.y).toBe(0)
  })
  test('impulses have physical durations, consistent gravity and recoverable comparison', () => {
    const activity: ExplorationActivity = { type: 'exploration', version: 2, mission: 'impulse' }
    let state = transitionExploration(activity, initialExploration(activity), {
      type: 'impulse',
      force: 14,
    })
    state = transitionExploration(activity, state, { type: 'jump', input: 'tap' })
    state = transitionExploration(activity, state, advance(1))
    expect(state.y).toBeGreaterThan(0) // force 9 would already have landed at one second.
    const result = run('impulse', [
      { type: 'jump', input: 'tap' },
      advance(1),
      { type: 'impulse', force: 14 },
      { type: 'jump', input: 'tap' },
      advance(2),
    ])
    expect(result.result.passed).toBe(true)
    expect(result.state.observations[0]?.height).toBeCloseTo(67.5)
    expect(result.state.observations[1]?.height).toBeCloseTo((14 * 14) / 1.2)
    expect(result.state.observations.every((o) => o.gravity)).toBe(true)
    expect(replayExploration(activity, JSON.parse(JSON.stringify(result.answers))).state).toEqual(
      result.state,
    )
  })
  test('jump sounds distinguish actual key/tap input from the jump event', () => {
    expect(run('jump-sound', [connect('sound'), advance(20)]).result.passed).toBe(false)
    const result = run('jump-sound', [
      { type: 'jump', input: 'key' },
      advance(0.1),
      { type: 'jump', input: 'key' },
      connect('sound'),
      { type: 'jump', input: 'key' },
      advance(1),
      { type: 'jump', input: 'tap' },
      advance(1),
      { type: 'jump', input: 'key' },
    ])
    expect(result.result.passed).toBe(true)
    expect(result.state.jumpCount).toBe(3)
    expect(result.state.soundCount).toBe(4)
  })
  test('static contact and same-position area comparison need no playback', () => {
    const result = run('hitbox', [
      { type: 'move', distance: 25 },
      { type: 'move', distance: 60 },
      { type: 'resize', width: 100 },
    ])
    expect(result.result.passed).toBe(true)
    const comparison = result.state.observations.filter((o) =>
      ['area-before', 'area-contrast'].includes(o.id),
    )
    expect(comparison.map((o) => o.distance)).toEqual([60, 60])
    expect(comparison.map((o) => o.collision)).toEqual([false, true])
    expect(run('hitbox', [{ type: 'resize', width: 100 }]).result.passed).toBe(false)
  })
  test('a new area comparison replaces both images and survives trace compaction', () => {
    const actions: ExplorationAction[] = [
      { type: 'move', distance: 60 },
      { type: 'resize', width: 100 },
      { type: 'move', distance: 40 },
      { type: 'resize', width: 24 },
    ]
    const second = run('hitbox', actions).state
    const pair = ['area-before', 'area-contrast'].map((id) =>
      second.observations.find((o) => o.id === id),
    )
    expect(pair.map((o) => o?.distance)).toEqual([40, 40])
    expect(pair.map((o) => o?.width)).toEqual([100, 24])
    expect(pair.map((o) => o?.collision)).toEqual([true, false])
    const third = run('hitbox', [...actions, { type: 'resize', width: 120 }]).state
    const latest = ['area-before', 'area-contrast'].map((id) =>
      third.observations.find((o) => o.id === id),
    )
    expect(latest.map((o) => o?.width)).toEqual([24, 120])
    expect(latest.map((o) => o?.collision)).toEqual([false, true])
  })
  test('timer comparison and automatic cleanup keep causal population counts', () => {
    expect(run('spawn', [advance(2), connect('timer'), advance(2)]).result.passed).toBe(true)
    const result = run('cleanup', [advance(6), connect('cleanup'), advance(2)])
    expect(result.result.passed).toBe(true)
    expect(result.state.removed).toBeGreaterThan(0)
    expect(result.state.born - result.state.removed).toBe(result.state.cacti.length)
  })
  test('state, start controls and restart are triggered by actions', () => {
    expect(
      run('game-state', [
        advance(1),
        connect('condition'),
        advance(1),
        { type: 'start', input: 'tap' },
        advance(1),
      ]).result.passed,
    ).toBe(true)
    expect(
      run('controls', [
        { type: 'start', input: 'tap' },
        connect('touch'),
        { type: 'start', input: 'tap' },
        { type: 'home' },
        { type: 'start', input: 'key' },
      ]).result.passed,
    ).toBe(true)
    expect(run('restart', [connect('restart'), advance(30)]).result.passed).toBe(false)
    const result = run('restart', [
      { type: 'start', input: 'tap' },
      { type: 'move', distance: 25 },
      connect('restart'),
      { type: 'restart' },
    ])
    expect(result.result.passed).toBe(true)
    expect(result.state.screen).toBe('playing')
    expect(result.state.distance).toBe(240)
  })
  test('score holds its value outside play, rather than resetting on screen selection', () => {
    const result = run('score', [
      connect('condition'),
      advance(1),
      { type: 'start', input: 'key' },
      advance(3),
      { type: 'collide' },
      advance(2),
    ])
    expect(result.result.passed).toBe(true)
    expect(result.state.points).toBe(3)
    const home = transitionExploration(result.activity, result.state, { type: 'home' })
    expect(home.points).toBe(3)
  })
  test('guided samples guarantee contrast; free repeats never masquerade as different', () => {
    const repeated: ExplorationAction[] = [0.2, 0.2].map((unit) => ({
      type: 'sample',
      kind: 'position',
      unit,
      guided: false,
    }))
    expect(run('random', repeated).state.discoveries).not.toContain('positions')
    const result = run('random', [
      { type: 'sample', kind: 'position', unit: 0, guided: true },
      { type: 'sample', kind: 'position', unit: 1, guided: true },
      { type: 'sample', kind: 'velocity', unit: 0, guided: true },
      { type: 'sample', kind: 'velocity', unit: 1, guided: true },
    ])
    expect(result.result.passed).toBe(true)
    expect(result.state.positionSamples).toEqual([500, 560])
    expect(result.state.velocitySamples).toEqual([-5, -6])
  })
  test('discoveries follow elapsed model time regardless of frame size', () => {
    for (const mission of ['spawn', 'score', 'game-state'] as const) {
      const activity = { type: 'exploration', version: 2, mission } as const
      const steps: ExplorationAction[] =
        mission === 'spawn'
          ? [advance(2), connect('timer'), advance(2)]
          : [
              advance(1),
              connect('condition'),
              advance(1),
              { type: 'start', input: 'key' },
              advance(2),
              { type: 'collide' },
              advance(1),
            ]
      let whole = initialExploration(activity)
      let frames = initialExploration(activity)
      for (const action of steps) {
        whole = transitionExploration(activity, whole, action)
        if (action.type === 'advance') {
          for (let i = 0; i < action.seconds * 25; i++)
            frames = transitionExploration(activity, frames, advance(0.04))
        } else frames = transitionExploration(activity, frames, action)
      }
      expect(frames.discoveries).toEqual(whole.discoveries)
      expect(frames.born).toBe(whole.born)
      expect(frames.points).toBe(whole.points)
    }
    const score = { type: 'exploration', version: 2, mission: 'score' } as const
    let state = transitionExploration(score, initialExploration(score), connect('condition'))
    state = transitionExploration(score, state, advance(0.3))
    expect(state.discoveries).not.toContain('score-start')
    state = transitionExploration(score, state, { type: 'start', input: 'key' })
    state = transitionExploration(score, state, { type: 'collide' })
    state = transitionExploration(score, state, advance(0.3))
    expect(state.discoveries).not.toContain('score-end')
    state = transitionExploration(score, state, advance(0.2))
    expect(state.discoveries).toContain('score-end')
  })
  test('acceleration clamps the base, preserves old velocities and applies integer variation', () => {
    const result = run('acceleration', [
      { type: 'sample', kind: 'velocity', unit: 0, guided: true },
      connect('limit'),
      ...Array.from({ length: 5 }, (): ExplorationAction => ({ type: 'clock' })),
      { type: 'sample', kind: 'velocity', unit: 1, guided: true },
    ])
    expect(result.result.passed).toBe(true)
    expect(result.state.base).toBe(-9)
    expect(result.state.cacti.map((c) => c.velocity)).toEqual([-5, -10])
  })
  test('reset retains discoveries and hints, old data cannot inject result flags', () => {
    const result = run('world', [
      { type: 'create' },
      connect('draw'),
      { type: 'hint', level: 2 },
      { type: 'reset' },
    ])
    expect(result.result.passed).toBe(true)
    expect(result.state.created).toBe(false)
    expect(result.state.hints).toBe(2)
    expect(
      evaluateExploration(result.activity, { completed: true, discoveries: ['hidden', 'visible'] })
        .passed,
    ).toBe(false)
  })
  test('a long session never emits an invalid or silently truncated answer', () => {
    const activity = { type: 'exploration', version: 2, mission: 'acceleration' } as const
    let answers: LearningAnswers = {}
    for (let i = 0; i < 1000; i++)
      answers = appendExplorationAction(activity, answers, { type: 'clock' })
    const saved = JSON.stringify(answers)
    const after = appendExplorationAction(activity, answers, { type: 'clock' })
    expect(after).toBe(answers)
    expect(JSON.stringify(after)).toBe(saved)
    expect(replayExploration(activity, after).valid).toBe(true)
  })
})
