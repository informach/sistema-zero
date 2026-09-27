import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState, type SceneStart } from './state'

const start: SceneStart = { scene: 'invincibility' }
const act = (state: ReturnType<typeof openScene>, action: Parameters<typeof stepScene>[2]) =>
  stepScene(start, state, action)

describe('a janela de invencibilidade', () => {
  test.each([
    [0, 0, [1, 10, 30], 'no-shield'],
    [45, 2, [1], 'window'],
    [15, 1, [1, 30], 'expires'],
  ] as const)('com %i quadros, as pedras somem e restam %i vidas', (duration, hearts, damaged, goal) => {
    let state = act(openScene(start), { type: 'shield', frames: duration })
    state = act(state, { type: 'reset' })
    for (let i = 0; i < 3; i++) state = act(state, { type: 'advance-to' })
    expect(state.invincibility.struck).toEqual([1, 10, 30])
    expect(state.invincibility.damaged).toEqual([...damaged])
    expect(state.invincibility.hearts).toBe(hearts)
    expect(state.evidence.discoveries).toContain(goal)
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })

  test('o contador chega a zero antes de a terceira pedra bater com proteção 15', () => {
    let state = act(openScene(start), { type: 'shield', frames: 15 })
    state = act(state, { type: 'advance', seconds: 16 / 30 })
    expect(state.invincibility.frames).toBe(16)
    expect(state.invincibility.remaining).toBe(0)
    expect(state.invincibility.hearts).toBe(2)
  })

  test('trocar a duração e voltar ao começo preserva o controle e as descobertas', () => {
    let state = act(openScene(start), { type: 'advance', seconds: 1 })
    state = act(state, { type: 'shield', frames: 45 })
    state = act(state, { type: 'reset' })
    expect(state.invincibility.protection).toBe(45)
    expect(state.invincibility.frames).toBe(0)
    expect(state.invincibility.hearts).toBe(3)
    expect(state.evidence.discoveries).toContain('no-shield')
  })
})
