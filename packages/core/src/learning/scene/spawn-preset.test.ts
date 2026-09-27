import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { isSceneSetup } from './index'
import { SPAWN_PRESETS } from './presets'
import { isSceneState } from './state'

describe('o nascimento por quadros', () => {
  const setup = {
    preset: SPAWN_PRESETS['pedra-quadros'],
    goals: ['every-frame', 'with-timer', 'same-fall'],
  }
  const start = { scene: 'spawn' as const, setup }

  test('o caso valida os intervalos da aula', () => {
    expect(isSceneSetup(setup, 'spawn')).toBe(true)
    expect(
      isSceneSetup({ ...setup, preset: { ...setup.preset, intervals: [20, 30, 80] } }, 'spawn'),
    ).toBe(false)
    expect(isSceneSetup({ ...setup, goals: ['velocities'] }, 'spawn')).toBe(false)
    const initial = openScene(start)
    expect(initial.crowd.interval).toBe(40 / 30)
    expect(stepScene(start, initial, { type: 'interval', seconds: 1 })).toBe(initial)
  })

  test('mais pedras nascem com 20 quadros, mas cada uma cai 3 por quadro', () => {
    let state = openScene(start)
    state = stepScene(start, state, { type: 'advance', seconds: 1 })
    expect(state.evidence.discoveries).toContain('every-frame')
    state = stepScene(start, state, { type: 'connect', port: 'timer', enabled: true })
    state = stepScene(start, state, { type: 'advance', seconds: 100 / 30 })
    expect(state.evidence.discoveries).toContain('with-timer')
    expect(state.crowd.fallBaseline).toBe(180)
    expect(state.evidence.discoveries).not.toContain('same-fall')
    state = stepScene(start, state, { type: 'interval', seconds: 20 / 30 })
    state = stepScene(start, state, { type: 'advance', seconds: 80 / 30 })
    expect(state.evidence.discoveries).toContain('same-fall')
    expect(state.crowd.fallComparison).toBe(180)
    expect(state.crowd.cacti.find((stone) => stone.id === 1)?.y).toBe(150)
    expect(evaluateExperimentation('spawn', state, true, undefined, setup.goals).passed).toBe(true)
    expect(isSceneState(state)).toBe(true)
    const reset = stepScene(start, state, { type: 'reset' })
    expect(reset.crowd.interval).toBe(40 / 30)
    expect(reset.crowd.fallBaseline).toBeUndefined()
    expect(reset.evidence.discoveries).toContain('same-fall')
  })
})
