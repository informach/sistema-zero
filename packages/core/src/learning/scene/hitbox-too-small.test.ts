import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { sceneAreaWidth, sceneContact } from './state'

const start = { scene: 'hitbox' as const }

describe('os dois extremos da área de colisão', () => {
  test('a área pequena demais deixa os desenhos se tocarem sem marcar batida', () => {
    let state = openScene(start)
    state = stepScene(start, state, { type: 'move', distance: 49 })
    expect(state.evidence.discoveries).toContain('contact')
    state = stepScene(start, state, { type: 'resize', width: sceneAreaWidth(80) })
    expect(state.evidence.discoveries).toContain('area-contrast')
    state = stepScene(start, state, { type: 'move', distance: 40 })
    expect(state.evidence.discoveries).not.toContain('too-small')
    state = stepScene(start, state, { type: 'resize', width: sceneAreaWidth(40) })
    expect(sceneContact(state.contact)).toBe(false)
    expect(state.evidence.discoveries).toContain('too-small')
    expect(evaluateExperimentation('hitbox', state).passed).toBe(true)
  })
})
