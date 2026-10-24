import { describe, expect, test } from 'bun:test'
import { createPgzeroFramePacer } from './pacing'

/** A fixed pseudo-random sequence in [-1, 1]: the same jitter on every run. */
function noise(seed = 7) {
  // A small seed starts the sequence near -1; a few draws spread it.
  let state = seed
  for (let draw = 0; draw < 8; draw++) state = (state * 16807) % 2147483647
  return () => {
    state = (state * 16807) % 2147483647
    return (state / 2147483647) * 2 - 1
  }
}

/** Display frames of `seconds` at `hz` with up to `jitter` ms of vsync jitter; the game frames. */
function play(hz: number, { seconds = 10, jitter = 0.3, random = false, seed = 7 } = {}) {
  const pacer = createPgzeroFramePacer()
  const next = noise(seed)
  const ran: number[] = []
  let consecutive = 0
  let previous = false
  for (let tick = 0; tick < hz * seconds; tick++) {
    const now = (tick * 1000) / hz + (random ? next() * jitter : tick % 2 ? jitter : -jitter)
    const ready = pacer.ready(now)
    if (ready) {
      ran.push(now)
      if (previous) consecutive++
    }
    previous = ready
  }
  const gaps = ran.slice(1).map((time, index) => time - ran[index]!)
  // A hole of two 60 Hz frames: a skipped game frame.
  return { frames: ran.length, hitches: gaps.filter((gap) => gap > 25).length, consecutive }
}

describe('Pygame Zero frame pacing', () => {
  test('the game runs at 60 frames per second on any fast display', () => {
    for (const hz of [60, 75, 90, 120, 144, 165, 240, 360]) {
      const { frames } = play(hz)
      expect(frames).toBeGreaterThanOrEqual(598)
      expect(frames).toBeLessThanOrEqual(602)
    }
  })

  test('a 60 Hz display runs the game on every display frame', () => {
    const pacer = createPgzeroFramePacer()
    for (let tick = 0; tick < 600; tick++)
      expect(pacer.ready((tick * 1000) / 60 + (tick % 2 ? 0.4 : -0.4))).toBe(true)
  })

  test('vsync jitter of a couple of milliseconds never skips a frame on a 60 Hz display', () => {
    for (const seed of [7, 11, 23, 42])
      for (const jitter of [1.5, 2]) {
        const { frames, hitches } = play(60, { seconds: 30, jitter, random: true, seed })
        expect(frames).toBe(1800)
        // A skipped frame would leave a 33 ms hole.
        expect(hitches).toBe(0)
      }
  })

  test('larger jitter skips at most the one frame that measures the display', () => {
    for (const jitter of [2.5, 3, 4])
      expect(play(60, { seconds: 30, jitter, random: true }).hitches).toBeLessThanOrEqual(1)
  })

  test('a display at about 60 Hz never keeps drifting into skipped frames', () => {
    for (const hz of [59.94, 60.05]) {
      const { frames, hitches } = play(hz, { seconds: 30, jitter: 1.5, random: true })
      expect(hitches).toBe(0)
      // One game frame per display frame.
      expect(frames).toBe(Math.ceil(hz * 30))
    }
    // 61 Hz drifts 0.27 ms per frame: at most the one skip that measures it, then none.
    for (const jitter of [0, 1.5])
      expect(play(61, { seconds: 30, jitter, random: true }).hitches).toBeLessThanOrEqual(1)
  })

  test('at 120 Hz the game never runs on two display frames in a row, even with jitter', () => {
    for (const jitter of [0, 1.5]) {
      const { frames, consecutive } = play(120, { jitter, random: true })
      expect(consecutive).toBe(0)
      expect(frames).toBeGreaterThanOrEqual(598)
      expect(frames).toBeLessThanOrEqual(602)
    }
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
