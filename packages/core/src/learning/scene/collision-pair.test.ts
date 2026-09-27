import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState, type SceneStart } from './state'

const start: SceneStart = { scene: 'collision-pair' }
const act = (state: ReturnType<typeof openScene>, action: Parameters<typeof stepScene>[2]) =>
  stepScene(start, state, action)

describe('apelido e grupo no mesmo encontro', () => {
  test('um encontro manda o grupo inteiro sair quando os dois comandos apontam para grupos', () => {
    const state = act(openScene(start), { type: 'advance', seconds: 1 })
    expect(state.collisionPair.collided).toBe(true)
    expect(state.collisionPair.rocks).toEqual([])
    expect(state.collisionPair.shots).toEqual([])
    expect(state.evidence.discoveries).toContain('whole-group')
    expect(isSceneState(JSON.parse(JSON.stringify(state)))).toBe(true)
  })

  test('os apelidos tiram só o par; os outros cruzam a borda e seguem no grupo', () => {
    let state = openScene(start)
    state = act(state, { type: 'command-target', subject: 'shot', target: 'alias' })
    state = act(state, { type: 'command-target', subject: 'rock', target: 'alias' })
    state = act(state, { type: 'reset' })
    expect([state.collisionPair.shotTarget, state.collisionPair.rockTarget]).toEqual([
      'alias',
      'alias',
    ])
    state = act(state, { type: 'advance', seconds: 1 })
    expect(state.collisionPair.rocks).toEqual([0, 2])
    expect(state.collisionPair.shots).toEqual([0, 2])
    expect(state.evidence.discoveries).toContain('just-the-pair')
    state = act(state, { type: 'advance', seconds: 2 })
    expect(state.collisionPair.rocks).toEqual([0, 2])
    expect(state.evidence.discoveries).toContain('others-stay')
  })

  test('trocar o seletor após a batida não reescreve o resultado', () => {
    let state = act(openScene(start), { type: 'advance', seconds: 1 })
    state = act(state, { type: 'command-target', subject: 'rock', target: 'alias' })
    state = act(state, { type: 'advance', seconds: 2 })
    expect(state.evidence.discoveries).not.toContain('others-stay')
  })
})
