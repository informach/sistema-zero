import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState } from './state'

const start = { scene: 'frames' as const }

describe('dois quadros iguais', () => {
  test('a prévia troca de quadro sem criar pulsação', () => {
    let state = openScene(start)
    state = stepScene(start, state, { type: 'same-frames', on: true })
    state = stepScene(start, state, { type: 'rate', perSecond: 8 })
    state = stepScene(start, state, { type: 'play', on: true })
    state = stepScene(start, state, { type: 'advance', seconds: 1 })
    expect(state.animation.swaps).toBeGreaterThanOrEqual(4)
    expect(state.evidence.discoveries).toContain('same-frames')
    expect(state.evidence.discoveries).not.toContain('movement')
    expect(isSceneState(state)).toBe(true)
    state = stepScene(start, state, { type: 'same-frames', on: false })
    state = stepScene(start, state, { type: 'advance', seconds: 1 })
    expect(state.evidence.discoveries).toContain('movement')
  })
})
