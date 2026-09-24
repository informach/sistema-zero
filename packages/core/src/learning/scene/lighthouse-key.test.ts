import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { isSceneActivity } from './index'
import { isSceneState } from './state'

describe('a chave do farol', () => {
  const start = { scene: 'lighthouse-key' } as const

  test('só reconhece a diferença depois das duas tentativas na porta', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: start.scene })).toBe(true)
    let state = openScene(start)
    expect(state.lighthouse).toEqual({ hasKey: false, door: 'closed' })
    expect(state.evidence.discoveries).toEqual([])
    state = stepScene(start, state, { type: 'try-lighthouse-door' })
    expect(state.lighthouse.door).toBe('closed')
    expect(state.evidence.discoveries).toContain('locked-without-key')
    state = stepScene(start, state, { type: 'key-state', hasKey: true })
    expect(evaluateExperimentation(start.scene, state).passed).toBe(false)
    state = stepScene(start, state, { type: 'try-lighthouse-door' })
    expect(state.lighthouse.door).toBe('open')
    expect(state.evidence.discoveries).toContain('opened-with-key')
    expect(evaluateExperimentation(start.scene, state).passed).toBe(true)
    expect(isSceneState(state)).toBe(true)
  })

  test('ignora ações de outras cenas e permite refazer sem apagar descobertas', () => {
    const initial = openScene(start)
    expect(stepScene(start, initial, { type: 'play-shoot' })).toBe(initial)
    const withKey = stepScene(start, initial, { type: 'key-state', hasKey: true })
    expect(withKey.evidence.discoveries).toEqual([])
    const restarted = stepScene(start, withKey, { type: 'reset' })
    expect(restarted.lighthouse).toEqual({ hasKey: false, door: 'closed' })
  })
})
