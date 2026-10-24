import { describe, expect, test } from 'bun:test'
import { createPgzeroFramePacer } from './pacing'

/** Game frames run in `seconds` of a display at `hz`, with a little vsync jitter. */
function gameFrames(hz: number, seconds = 10, jitter = 0.3) {
  const pacer = createPgzeroFramePacer()
  let frames = 0
  for (let tick = 0; tick < hz * seconds; tick++) {
    const now = (tick * 1000) / hz + (tick % 2 ? jitter : -jitter)
    if (pacer.ready(now)) frames++
  }
  return frames
}

describe('Pygame Zero frame pacing', () => {
  test('the game runs at 60 frames per second on any display', () => {
    for (const hz of [60, 75, 90, 120, 144, 165, 240, 360]) {
      const frames = gameFrames(hz)
      expect(frames).toBeGreaterThanOrEqual(598)
      expect(frames).toBeLessThanOrEqual(602)
    }
  })

  test('a 60 Hz display runs the game on every display frame', () => {
    const pacer = createPgzeroFramePacer()
    for (let tick = 0; tick < 600; tick++)
      expect(pacer.ready((tick * 1000) / 60 + (tick % 2 ? 0.4 : -0.4))).toBe(true)
  })

  test('a slow display is not made up with several game frames at once', () => {
    const pacer = createPgzeroFramePacer()
    expect(pacer.ready(0)).toBe(true)
    // The tab was busy for a second: the next display frame runs once, then the clock resumes.
    expect(pacer.ready(1000)).toBe(true)
    expect(pacer.ready(1001)).toBe(false)
    expect(pacer.ready(1000 + 1000 / 60)).toBe(true)
  })
})
