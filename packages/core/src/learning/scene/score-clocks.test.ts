import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneState } from './state'

const start = { scene: 'score' as const }

describe('Somar ponto em dois relógios e três telas', () => {
  test('A cada quadro soma 60 em um segundo; A cada 1 segundos soma 1', () => {
    let state = openScene(start)
    state = stepScene(start, state, { type: 'score-place', clock: 'frame', guarded: false })
    state = stepScene(start, state, { type: 'advance', seconds: 0.5 })
    expect(state.match.points).toBe(0)
    expect(state.evidence.discoveries).not.toContain('score-runaway')
    state = stepScene(start, state, { type: 'advance', seconds: 0.5 })
    expect(state.match.points).toBe(60)
    expect(state.evidence.discoveries).toContain('score-runaway')
    state = stepScene(start, state, { type: 'score-place', clock: 'second', guarded: false })
    state = stepScene(start, state, { type: 'advance', seconds: 1 })
    expect(state.match.points).toBe(1)
    expect(isSceneState(state)).toBe(true)
  })

  test('o Se segura os pontos no início e no fim, guardando o valor da partida', () => {
    let state = openScene(start)
    state = stepScene(start, state, { type: 'score-place', clock: 'second', guarded: true })
    state = stepScene(start, state, { type: 'advance', seconds: 1 })
    expect(state.match.points).toBe(0)
    expect(state.evidence.discoveries).toContain('score-waiting')
    state = stepScene(start, state, { type: 'start', input: 'key' })
    state = stepScene(start, state, { type: 'advance', seconds: 2 })
    expect(state.match.points).toBe(2)
    state = stepScene(start, state, { type: 'collide' })
    state = stepScene(start, state, { type: 'advance', seconds: 1 })
    expect(state.match.points).toBe(2)
    expect(state.evidence.discoveries).toContain('score-kept')
  })
})
