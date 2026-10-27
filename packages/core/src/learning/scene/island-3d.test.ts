import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from './engine'
import { isSceneAction, isSceneSetup } from './index'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'
import { cloneScene, isSceneState, type SceneStart } from './state'

const start = (goals: string[]): SceneStart => ({
  scene: 'island-3d',
  setup: { goals, freeExploration: true },
})
describe('Island exploration', () => {
  test('the complete state, undo and discoveries survive a saved session', () => {
    const a = start(['contact-apart', 'contact-touch'])
    let session = initialExperiment(a)
    for (const action of [
      { type: 'island-test' },
      { type: 'island-axis', axis: 'y', value: 1 },
      { type: 'island-test' },
    ] as const)
      session = stepExperiment(a, session, action).session
    const restored = readExperimentSession('island-3d', packExperiment('island-3d', session))!
    expect(restored.state.island3d).toEqual(session.state.island3d)
    expect(restored.state.evidence.discoveries).toEqual(['contact-apart', 'contact-touch'])
    const undone = stepExperiment(a, restored, { type: 'undo' }).session
    expect(undone.state.island3d!.tested).toBeNull()
    expect(undone.state.evidence.discoveries).toEqual(['contact-apart'])
    const corrupt = structuredClone(session)
    delete corrupt.state.island3d
    expect(readExperimentSession('island-3d', packExperiment('island-3d', corrupt))).toBeNull()
  })
  test('a guess without comparing cannot complete the view; all views remain free', () => {
    const a = start(['other-view', 'same-place'])
    let s = openScene(a)
    s = stepScene(a, s, { type: 'island-answer', answer: 'camera' })
    expect(s.evidence.discoveries).toEqual([])
    s = stepScene(a, s, { type: 'island-view', view: 'top' })
    expect(s.evidence.discoveries).toEqual(['other-view'])
    s = stepScene(a, s, { type: 'island-answer', answer: 'key' })
    expect(s.evidence.discoveries).toHaveLength(1)
    s = stepScene(a, s, { type: 'island-answer', answer: 'camera' })
    expect(s.evidence.discoveries).toContain('same-place')
    expect(isSceneState(s)).toBe(true)
    expect(isSceneSetup(a.setup, 'island-3d')).toBe(true)
  })
  test('all axes work in any order and evidence survives another attempt', () => {
    const a = start(['axis-x', 'axis-y', 'axis-z'])
    let s = openScene(a)
    for (const axis of ['z', 'y', 'x'] as const) {
      s = stepScene(a, s, { type: 'island-axis', axis, value: 4 })
      s = stepScene(a, s, { type: 'island-axis', axis, value: axis === 'y' ? 0 : -4 })
    }
    expect(s.evidence.discoveries).toEqual(['axis-z', 'axis-y', 'axis-x'])
    const c = cloneScene(s)
    c.island3d!.key.x = 1
    expect(s.island3d!.key.x).toBe(-4)
    s = stepScene(a, s, { type: 'island-restart' })
    expect(s.evidence.discoveries).toHaveLength(3)
    s = stepExperiment(a, { state: s, past: [], trials: [] }, { type: 'reset' }).session.state
    expect(s.evidence.discoveries).toEqual([])
  })
  test('recusa valores coerçáveis e metas de experimentos incompatíveis', () => {
    expect(isSceneAction({ type: 'island-view', view: ['side'] }, 'island-3d')).toBe(false)
    expect(isSceneAction({ type: 'island-axis', axis: ['x'], value: 2 }, 'island-3d')).toBe(false)
    expect(isSceneSetup({ goals: ['axis-x', 'contact-touch'] }, 'island-3d')).toBe(false)
    expect(isSceneSetup({ goals: ['axis-z'] }, 'island-3d')).toBe(true)
    const a = start(['axis-z'])
    let s = openScene(a)
    s = stepScene(a, s, { type: 'island-axis', axis: 'z', value: 4 })
    s = stepScene(a, s, { type: 'island-restart' })
    s = stepScene(a, s, { type: 'island-axis', axis: 'z', value: -4 })
    expect(s.evidence.discoveries).toContain('axis-z')
  })
  test('only testing earns contact evidence; edits invalidate the previous result', () => {
    const a = start(['contact-apart', 'contact-touch'])
    let s = openScene(a)
    s = stepScene(a, s, { type: 'island-test' })
    expect(s.island3d!.tested).toBe(false)
    s = stepScene(a, s, { type: 'island-axis', axis: 'y', value: 1 })
    expect(s.island3d!.tested).toBeNull()
    expect(s.evidence.discoveries).toEqual(['contact-apart'])
    s = stepScene(a, s, { type: 'island-test' })
    expect(s.island3d!.tested).toBe(true)
    s = stepScene(a, s, { type: 'island-hero', axis: 'x', value: 4 })
    s = stepScene(a, s, { type: 'island-test' })
    expect(s.island3d!.tested).toBe(false)
    expect(isSceneAction({ type: 'island-axis', axis: 'y', value: NaN }, 'island-3d')).toBe(false)
    expect(isSceneAction({ type: 'island-axis', axis: 'x', value: 2 }, 'coordinates')).toBe(false)
  })
})
