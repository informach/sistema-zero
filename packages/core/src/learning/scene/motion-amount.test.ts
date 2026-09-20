import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState, type SceneStart } from './state'

const start: SceneStart = { scene: 'motion-amount' }
const act = (state: ReturnType<typeof openScene>, action: Parameters<typeof stepScene>[2]) =>
  stepScene(start, state, action)

describe('o tanto que muda entre dois quadros', () => {
  test('a Prévia alterna quadros iguais sem criar movimento', () => {
    const state = act(openScene(start), { type: 'advance', seconds: 0.25 })
    expect(state.motionAmount.frames).toBe(2)
    expect(state.motionAmount.previewFrame).toBe(0)
    expect(state.evidence.discoveries).toContain('no-change')
  })

  test('mover só a cratera em uma faixa pequena produz a comparação local', () => {
    let state = act(openScene(start), { type: 'nudge', piece: 'crater', amount: 4 })
    state = act(state, { type: 'advance', seconds: 0.25 })
    expect(state.evidence.discoveries).toContain('local-move')
    expect(state.evidence.discoveries).not.toContain('too-much')
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })

  test('mover a pedra inteira em 10 destaca o pulo, e pausar congela a Prévia', () => {
    let state = act(openScene(start), { type: 'nudge', piece: 'body', amount: 10 })
    state = act(state, { type: 'advance', seconds: 0.25 })
    expect(state.evidence.discoveries).toContain('too-much')
    state = act(state, { type: 'play', on: false })
    const frame = state.motionAmount.previewFrame
    state = act(state, { type: 'advance', seconds: 1 })
    expect(state.motionAmount.previewFrame).toBe(frame)
  })
})
