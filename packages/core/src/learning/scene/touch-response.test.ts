import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation, sceneGoals } from './evaluate'
import { isSceneActivity } from './index'
import { sceneReadout, sceneSituation } from './readout'

describe('touch-response', () => {
  test('é uma experimentação nativa do catálogo', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: 'touch-response' })).toBe(true)
  })

  test('só conclui depois de testar sem reação e depois ver a resposta', () => {
    const start = { scene: 'touch-response' } as const
    let state = openScene(start)
    state = stepScene(start, state, { type: 'connect', port: 'touch', enabled: true })
    expect(sceneGoals(start.scene, state).filter((goal) => goal.complete)).toHaveLength(0)

    state = stepScene(start, state, { type: 'connect', port: 'touch', enabled: false })
    state = stepScene(start, state, { type: 'start', input: 'tap' })
    expect(state.match.screen).toBe('start')
    expect(
      sceneGoals(start.scene, state)
        .filter((goal) => goal.complete)
        .map((goal) => goal.id),
    ).toEqual(['no-response'])

    state = stepScene(start, state, { type: 'connect', port: 'touch', enabled: true })
    expect(evaluateExperimentation(start.scene, state).passed).toBe(false)
    state = stepScene(start, state, { type: 'start', input: 'tap' })
    expect(state.match.screen).toBe('playing')
    expect(evaluateExperimentation(start.scene, state).passed).toBe(true)
    expect(sceneReadout(start.scene, state)).toContainEqual({
      label: 'arbusto',
      value: 'invisível',
      tone: 'a',
    })
    expect(sceneSituation(start.scene, state)).toBe(
      'O arbusto ficou invisível e o coelho apareceu.',
    )

    const novoTeste = stepScene(start, state, { type: 'home' })
    expect(novoTeste.match.screen).toBe('start')
    expect(novoTeste.match.touch).toBe(true)
    expect(sceneSituation(start.scene, novoTeste)).toBe('O arbusto está visível.')

    const reinicio = stepScene(start, state, { type: 'reset' })
    expect(reinicio.match.screen).toBe('start')
    expect(reinicio.match.touch).toBe(false)
  })
})
