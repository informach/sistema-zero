import { expect, test } from 'bun:test'
import { openScene, sceneClockShouldStop, stepScene } from './engine'
import { isExperimentationActivity, isSceneSetup } from './index'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'

const walk = {
  scene: 'lighthouse-walk' as const,
  setup: {
    freeExploration: true,
    actions: [{ type: 'movement-command' as const, enabled: false }],
    goals: [
      'no-movement-command',
      'still-without-arrow',
      'moves-each-frame',
      'stopped-after-release',
    ],
  },
}
test('editing, key input and time are independent; long exploration is replayable', () => {
  let s = openScene(walk)
  expect(s.walk.movement).toBe(false)
  s = stepScene(walk, s, { type: 'hold-arrow', held: true })
  s = stepScene(walk, s, { type: 'walk-frames', count: 10 })
  expect(s.walk.x).toBe(208)
  expect(s.evidence.discoveries).toContain('no-movement-command')
  s = stepScene(walk, s, { type: 'movement-command', enabled: true })
  expect(s.walk.x).toBe(208)
  for (let i = 0; i < 15; i++) s = stepScene(walk, s, { type: 'walk-frames', count: 10 })
  expect(s.walk.x).toBe(658)
  s = stepScene(walk, s, { type: 'hold-arrow', held: false })
  s = stepScene(walk, s, { type: 'walk-frames', count: 1 })
  expect(s.evidence.discoveries).toContain('stopped-after-release')
  s = stepScene(walk, s, { type: 'restart-walk' })
  expect(s.evidence.discoveries).toContain('moves-each-frame')
  expect(isSceneSetup(walk.setup, 'lighthouse-walk')).toBe(true)
  expect(isExperimentationActivity({ type: 'experimentation', ...walk })).toBe(true)
})
test('the two order tests survive undo and saved-session replay', () => {
  let s = initialExperiment(walk)
  s = stepExperiment(walk, s, { type: 'test-walk-order' }).session
  s = stepExperiment(walk, s, { type: 'walk-order', order: 'reverse' }).session
  s = stepExperiment(walk, s, { type: 'test-walk-order' }).session
  expect(s.state.evidence.discoveries).toContain('compared-command-order')
  const restored = readExperimentSession(walk.scene, packExperiment(walk.scene, s))
  if (!restored) throw Error('Saved exploration was not restored')
  expect(restored.state.walk.testedOrders).toEqual(['correct', 'reverse'])
  const undone = stepExperiment(walk, restored, { type: 'undo' }).session
  expect(undone.state.evidence.discoveries).not.toContain('compared-command-order')
})
test('reaction can be enabled first, both targets count across new trials, empty can be first', () => {
  const start = { scene: 'touch-response' as const, setup: { freeExploration: true } }
  let s = openScene(start)
  expect(s.match.gardenRound).toBe(2)
  s = stepScene(start, s, { type: 'connect', port: 'touch', enabled: true })
  s = stepScene(start, s, { type: 'touch-hiding-place', id: 1 })
  expect(s.evidence.discoveries).not.toContain('second-target')
  s = stepScene(start, s, { type: 'restart-hiding-places' })
  s = stepScene(start, s, { type: 'touch-hiding-place', id: 0 })
  expect(s.evidence.discoveries).toContain('second-target')
  const count = { scene: 'found-counter' as const, setup: { freeExploration: true } }
  expect(
    stepScene(count, openScene(count), { type: 'look-around' }).evidence.discoveries,
  ).toContain('no-find')
})
test('editing memory after a collection changes the next encounter only', () => {
  const start = { scene: 'collect-and-remember' as const, setup: { freeExploration: true } }
  let s = stepScene(start, openScene(start), { type: 'collect-key' })
  s = stepScene(start, s, { type: 'remember-collection', enabled: true })
  expect(s.collection.remember).toBe(true)
  expect(s.collection.hasKey).toBe(false)
  s = stepScene(start, s, { type: 'restart-collection' })
  s = stepScene(start, s, { type: 'collect-key' })
  s = stepScene(start, s, { type: 'remember-collection', enabled: false })
  expect(s.collection.hasKey).toBe(true)
})

test('automatic close-up exploration continues after the screen boundary; manual frames clear fractional carry', () => {
  let before = openScene(walk)
  before.walk.movement = true
  before.walk.arrow = true
  before.walk.x = 479
  const after = stepScene(walk, before, { type: 'advance', seconds: 1 / 30 })
  expect(sceneClockShouldStop(walk.scene, before, after, undefined, true)).toBe(false)
  expect(sceneClockShouldStop(walk.scene, before, after)).toBe(true)
  before = stepScene(walk, after, { type: 'advance', seconds: 0.01 })
  expect(before.clock.carry).toBeGreaterThan(0)
  const manual = stepScene(walk, before, { type: 'walk-frames', count: 10 })
  expect(manual.clock.carry).toBe(0)
  expect(manual.walk.frame).toBe(before.walk.frame + 10)
})
