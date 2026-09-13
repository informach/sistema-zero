import { describe, expect, test } from 'bun:test'
import {
  applyExperienceSegment,
  type ExplorationActivity,
  experienceAnswers,
  type LearningAnswers,
  readExperienceCheckpoint,
  readExperienceSegment,
} from '@sistemazero/core/learning'
import { ExperienceController } from '../src/lib/experience-controller'

const activity: ExplorationActivity = { type: 'exploration', version: 3, mission: 'world' }
function accept(answers: LearningAnswers) {
  const segment = readExperienceSegment(activity, answers)
  if (!segment) throw new Error('Invalid fixture')
  return experienceAnswers(activity, applyExperienceSegment(activity, null, segment))
}
describe('experience persistence controller', () => {
  test('saving and reloading preserves the observations seen during the animation', () => {
    const activity = { type: 'exploration', version: 3, mission: 'spawn' } as const
    const controller = new ExperienceController(activity, 'session-123')
    for (let frame = 0; frame < 20; frame++) controller.dispatch({ type: 'advance', seconds: 0.05 })
    const seen = controller.getSnapshot()
    const saved = controller.previewConfirm()
    expect(readExperienceCheckpoint(activity, saved)?.session).toEqual(seen)
    const reloaded = new ExperienceController(activity, 'session-123', saved)
    expect(reloaded.getSnapshot()).toEqual(seen)
  })
  test('restoring time commands preserves the boundary of a pending request', () => {
    const motion = { type: 'exploration', version: 3, mission: 'impulse' } as const
    const original = new ExperienceController(motion, 'session-123')
    original.dispatch({ type: 'advance', seconds: 0.2 })
    const request = original.segment()
    original.dispatch({ type: 'advance', seconds: 0.4 })
    const restored = new ExperienceController(motion, 'session-123')
    expect(restored.restore(original.draft())).toBe(true)
    expect(restored.segment()).toEqual(request)
    expect(restored.getSnapshot().state.elapsed).toBeCloseTo(0.6)
  })
  test('a lost response retries the same segment, including after browser reload', () => {
    const original = new ExperienceController(activity, 'session-123')
    original.dispatch({ type: 'create' })
    const request = original.segment()
    if (!request) throw new Error('Missing segment')
    const reloaded = new ExperienceController(activity, 'session-123')
    expect(reloaded.restore(original.draft())).toBe(true)
    expect(reloaded.segment()).toEqual(request)
    reloaded.dispatch({ type: 'connect', port: 'draw', enabled: true })
    reloaded.acknowledge(accept(request))
    expect(readExperienceSegment(activity, reloaded.segment() ?? {})?.commands).toEqual([
      { type: 'connect', port: 'draw', enabled: true },
    ])
    expect(reloaded.getSnapshot().state.discoveries).toEqual(['hidden', 'visible'])
  })
  test('reload after server acceptance removes only the acknowledged prefix', () => {
    const original = new ExperienceController(activity, 'session-123')
    original.dispatch({ type: 'create' })
    const request = original.segment()
    if (!request) throw new Error('Missing segment')
    original.dispatch({ type: 'connect', port: 'draw', enabled: true })
    const reloaded = new ExperienceController(activity, 'session-123', accept(request))
    expect(reloaded.restore(original.draft())).toBe(true)
    expect(readExperienceSegment(activity, reloaded.segment() ?? {})?.commands).toEqual([
      { type: 'connect', port: 'draw', enabled: true },
    ])
    expect(reloaded.getSnapshot().state.actions).toBe(2)
  })
})
