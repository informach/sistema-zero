import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { isSceneState } from './state'

const start = { scene: 'symmetry' as const }

describe('o Balde de tinta e o espelho', () => {
  test('encher com o espelho desligado não revela o alcance do espelho', () => {
    const state = stepScene(start, openScene(start), { type: 'fill' })
    expect(state.mirror.filled).toBe(true)
    expect(state.mirror.marks).toEqual([])
    expect(state.evidence.discoveries).not.toContain('fill-ignores-mirror')
  })

  test('o espelho copia o traço, mas não o Balde', () => {
    let state = openScene(start)
    state = stepScene(start, state, { type: 'mirror-mode', mode: 'x' })
    state = stepScene(start, state, { type: 'trace', piece: 'asa' })
    const marcas = [...state.mirror.marks]
    expect(marcas).toContain('asa|x')
    state = stepScene(start, state, { type: 'fill' })
    expect(state.mirror.marks).toEqual(marcas)
    expect(state.mirror.filled).toBe(true)
    expect(state.evidence.discoveries).toContain('fill-ignores-mirror')
    expect(isSceneState(state)).toBe(true)
    state = stepScene(start, state, { type: 'clear-paper' })
    expect(state.mirror.filled).toBe(false)
  })

  test('os quatro pedidos fecham a experimentação', () => {
    const actions = [
      { type: 'trace', piece: 'asa' },
      { type: 'mirror-mode', mode: 'x' },
      { type: 'trace', piece: 'asa' },
      { type: 'mirror-mode', mode: 'y' },
      { type: 'trace', piece: 'asa' },
      { type: 'mirror-mode', mode: 'x' },
      { type: 'fill' },
    ] as const
    const state = actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
    expect(evaluateExperimentation('symmetry', state).passed).toBe(true)
  })
})
