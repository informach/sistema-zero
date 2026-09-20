import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneSetup } from './index'
import { GAME_STATE_PRESETS } from './presets'
import { sceneReadout } from './readout'
import { initialExperiment, packExperiment, readExperimentSession } from './session'

const caso = {
  scene: 'game-state' as const,
  setup: { preset: GAME_STATE_PRESETS['pedra-40-quadros'] },
}

describe('game-state no Desafio', () => {
  test('o relógio toca a cada 40 quadros e a pergunta segura três toques', () => {
    const first = openScene(caso)
    expect(first.crowd.interval).toBe(40 / 30)
    const before = stepScene(caso, first, { type: 'advance', seconds: 0.7 })
    expect(before.crowd.born).toBe(0)
    const outside = stepScene(caso, before, { type: 'advance', seconds: 0.7 })
    expect(outside.crowd.born).toBe(1)
    expect(outside.evidence.discoveries).toContain('outside')

    const guarded = stepScene(caso, outside, {
      type: 'connect',
      port: 'condition',
      enabled: true,
    })
    const twoTicks = stepScene(caso, guarded, { type: 'advance', seconds: 80 / 30 })
    expect(twoTicks.crowd.born).toBe(0)
    expect(twoTicks.evidence.discoveries).not.toContain('waiting')
    const threeTicks = stepScene(caso, twoTicks, { type: 'advance', seconds: 40 / 30 })
    expect(threeTicks.evidence.discoveries).toContain('waiting')
    expect(threeTicks.crowd.born).toBe(0)
    expect(threeTicks.evidence.observations.find((item) => item.id === 'waiting')?.label).toBe(
      'O relógio tocou três vezes e nenhuma pedra nasceu.',
    )
    const readings = sceneReadout('game-state', threeTicks)
    expect(readings).toContainEqual({ label: 'toques do relógio', value: '3', tone: 'a' })
    expect(readings).toContainEqual({ label: 'nascimentos', value: '0', tone: 'b' })
    expect(readings).toContainEqual({ label: 'condição', value: 'falsa', tone: 'plain' })
    expect(stepScene(caso, threeTicks, { type: 'reset' }).crowd.interval).toBe(40 / 30)
  })

  test('recusa relógio ou momento que não pertencem ao caso', () => {
    expect(isSceneSetup({ preset: GAME_STATE_PRESETS['pedra-40-quadros'] }, 'game-state')).toBe(
      true,
    )
    expect(
      isSceneSetup(
        {
          preset: { id: 'pedra-40-quadros', clockFrames: 18, waitingSeconds: 4, moment: 'screen' },
        },
        'game-state',
      ),
    ).toBe(false)
  })

  test('retoma sessão antiga com o intervalo que o motor já usava', () => {
    const start = { scene: 'game-state' as const }
    const session = initialExperiment(start)
    const antigo = {
      ...session,
      state: {
        ...session.state,
        crowd: { ...session.state.crowd, interval: 1 },
      },
    }
    const resumed = readExperimentSession('game-state', packExperiment('game-state', antigo))
    expect(resumed?.state.crowd.interval).toBe(0.6)
  })
})
