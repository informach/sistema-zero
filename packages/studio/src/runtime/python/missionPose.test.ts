import { expect, test } from 'bun:test'
import { createPythonMissionPoseTracker } from './missionPose'

test('a mission sees only presented poses and a live renderer turn, never pending model coordinates', () => {
  const tracker = createPythonMissionPoseTracker(2)
  tracker.stage(1, 0, 0, true)
  tracker.advance()
  expect(tracker.read(1)).toBeNull()
  tracker.present()
  expect(tracker.read(1)?.y).toBe(0)
  tracker.stage(1, 0, 10, true)
  expect(tracker.read(1)?.y).toBe(0)
  tracker.present()
  tracker.advance()
  expect(tracker.read(1)).toEqual({
    x: 0,
    y: 10,
    frame: 2,
    generation: 1,
    errors: 0,
    paused: false,
  })
  tracker.stage(1, 0, 10, false)
  tracker.present()
  expect(tracker.read(1)).toBeNull()
  tracker.retire()
  expect(tracker.read(1)).toBeNull()
  expect(() => tracker.stage(2, 0, 0, true)).toThrow()
})

test('pose tracking has a hard object bound and a new draw list drops objects not drawn', () => {
  const tracker = createPythonMissionPoseTracker(1)
  tracker.stage(1, 4, 5, true)
  expect(() => tracker.stage(2, 3, 4, true)).toThrow()
  tracker.present()
  tracker.advance()
  tracker.clearStage()
  tracker.present()
  tracker.advance()
  expect(tracker.read(1)).toBeNull()
})
