import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { isSceneActivity } from './index'
import { hydrateSceneState, isSceneState } from './state'

describe('a chave do farol', () => {
  const start = { scene: 'lighthouse-key' } as const

  test('só reconhece a diferença depois das duas tentativas na porta', () => {
    expect(isSceneActivity({ type: 'experimentation', scene: start.scene })).toBe(true)
    let state = openScene(start)
    expect(state.lighthouse).toEqual({ hasKey: false, door: 'closed', checkedKey: null })
    expect(state.evidence.discoveries).toEqual([])
    state = stepScene(start, state, { type: 'try-lighthouse-door' })
    expect(state.lighthouse.door).toBe('closed')
    expect(state.lighthouse.checkedKey).toBe(false)
    expect(state.evidence.discoveries).toContain('locked-without-key')
    state = stepScene(start, state, { type: 'key-state', hasKey: true })
    expect(state.lighthouse.checkedKey).toBeNull()
    expect(evaluateExperimentation(start.scene, state).passed).toBe(false)
    state = stepScene(start, state, { type: 'try-lighthouse-door' })
    expect(state.lighthouse.door).toBe('open')
    expect(state.lighthouse.checkedKey).toBe(true)
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
    expect(restarted.lighthouse).toEqual({ hasKey: false, door: 'closed', checkedKey: null })
  })

  test('a marca de uma aba antiga que não bate com a porta é limpa, e o retrato abre', () => {
    // O motor anterior trocava a chave sem limpar a marca: ficava "testou sem chave" com a chave na mão.
    const testada = stepScene(start, openScene(start), { type: 'try-lighthouse-door' })
    const antiga = { ...testada, lighthouse: { ...testada.lighthouse, hasKey: true } }
    expect(isSceneState(antiga)).toBe(false)
    const hidratada = hydrateSceneState(antiga) as typeof antiga
    expect(hidratada.lighthouse.checkedKey).toBeNull()
    expect(isSceneState(hidratada)).toBe(true)
    // A tentativa coerente fica como está.
    expect((hydrateSceneState(testada) as typeof testada).lighthouse.checkedKey).toBe(false)
  })
})
