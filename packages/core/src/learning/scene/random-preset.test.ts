import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation, sceneHintStep } from './evaluate'
import { isSceneSetup } from './index'
import { RANDOM_GOALS_BY_PRESET, RANDOM_PRESETS } from './presets'
import { isSceneState } from './state'

const sortear = (unit: number) =>
  ({ type: 'sample', kind: 'position', unit, guided: false }) as const

describe('o sorteio das duas aulas', () => {
  test('o preset da pedra aceita metas próprias e recusa o módulo de velocidade', () => {
    const setup = {
      preset: RANDOM_PRESETS['pedra-acima'],
      goals: ['positions', 'above'],
    }
    expect(isSceneSetup(setup, 'random')).toBe(true)
    expect(isSceneSetup({ ...setup, goals: ['positions', 'repeat', 'above'] }, 'random')).toBe(
      false,
    )
    expect(isSceneSetup({ ...setup, goals: ['velocities'] }, 'random')).toBe(false)
    expect(isSceneSetup(setup, 'spawn')).toBe(false)
    const start = { scene: 'random' as const, setup }
    const initial = openScene(start)
    expect(initial.speed.spots).toHaveLength(61)
    expect(initial.speed.fallingY).toBe(-30)
    expect(isSceneState(initial)).toBe(true)
    expect(
      stepScene(start, initial, { type: 'sample', kind: 'velocity', unit: 0.8, guided: false }),
    ).toBe(initial)
  })

  test('oito lugares podem sair diferentes; a pedra entra pelo alto quando o tempo passa', () => {
    const start = {
      scene: 'random' as const,
      setup: {
        preset: RANDOM_PRESETS['pedra-acima'],
        goals: ['positions', 'above'],
      },
    }
    let state = openScene(start)
    for (let index = 0; index < 8; index++)
      state = stepScene(start, state, sortear((index + 0.1) / 61))
    expect(state.evidence.discoveries).toContain('positions')
    expect(state.evidence.discoveries).not.toContain('repeat')
    expect(state.evidence.discoveries).not.toContain('above')
    state = stepScene(start, state, { type: 'advance', seconds: 10 / 30 })
    expect(state.speed.fallingY).toBe(0)
    expect(state.evidence.discoveries).toContain('above')
    state = stepScene(start, state, sortear(0.1 / 61))
    expect(state.evidence.discoveries).toContain('repeat')
    expect(
      evaluateExperimentation('random', state, true, undefined, start.setup.goals).passed,
    ).toBe(true)
    expect(isSceneState(state)).toBe(true)
    const reset = stepScene(start, state, { type: 'reset' })
    expect(reset.speed.fallingY).toBe(-30)
    expect(reset.evidence.discoveries).toContain('above')
  })

  test('pedra acima conclui sem obrigar uma repetição improvável', () => {
    const start = {
      scene: 'random' as const,
      setup: { preset: RANDOM_PRESETS['pedra-acima'] },
    }
    let state = openScene(start)
    for (let index = 0; index < 8; index++)
      state = stepScene(start, state, sortear((index + 0.1) / 61))
    state = stepScene(start, state, { type: 'advance', seconds: 10 / 30 })

    expect(state.evidence.discoveries).toContain('positions')
    expect(state.evidence.discoveries).toContain('above')
    expect(state.evidence.discoveries).not.toContain('repeat')
    expect(
      evaluateExperimentation(
        'random',
        state,
        true,
        undefined,
        RANDOM_GOALS_BY_PRESET['pedra-acima'],
      ).passed,
    ).toBe(true)
  })

  test('a ajuda da pedra fala dos controles que existem neste caso', () => {
    const start = {
      scene: 'random' as const,
      setup: { preset: RANDOM_PRESETS['pedra-acima'] },
    }
    let state = openScene(start)
    expect(sceneHintStep('random', state, 2).texto).not.toContain('velocidade')

    state = stepScene(start, state, sortear(0.1 / 61))
    state = stepScene(start, state, sortear(1.1 / 61))
    expect(state.evidence.discoveries).toContain('positions')
    expect(sceneHintStep('random', state, 1).metas).toContain('above')
    expect(sceneHintStep('random', state, 2).texto).not.toContain('cacto')
  })
})
