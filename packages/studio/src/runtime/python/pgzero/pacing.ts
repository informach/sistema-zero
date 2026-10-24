/** Pygame Zero 1.2.1 runs `clock.tick(60)`: one game frame every 1/60 s, whatever the display. */
export const PGZERO_FRAME_MS = 1000 / 60
/** A display this close to 60 Hz (up to ~63 Hz) runs one game frame per display frame. */
const NEAR_60HZ = 0.95

/**
 * Decides which display frames (requestAnimationFrame) run a game frame. On a 60 Hz display it
 * is every one; at 120 Hz every other one; at 144 Hz it averages 60 per second. A late frame
 * never makes the game run twice in a row to catch up (Pygame Zero does not either).
 *
 * A display frame counts when it arrives up to half a display frame early: the next one would
 * be later still. That absorbs vsync jitter of a few milliseconds without skipping a frame (a
 * skipped frame on a 60 Hz display is a 33 ms hiccup). Faster displays keep the game's phase,
 * so they average exactly 60; a display at about 60 Hz (59.94, 60.05, 61) follows its own
 * frames instead, or its slow drift against the 60 Hz clock would skip one now and then.
 */
export function createPgzeroFramePacer(frameMs = PGZERO_FRAME_MS) {
  let due = Number.NEGATIVE_INFINITY
  let last = 0
  /** Whether the previous display frame was skipped: only then is `now - last` one interval. */
  let waiting = false
  /** The display's frame interval, smoothed (0 until a skipped display frame measured it). */
  let period = 0
  return {
    /** True when the display frame at `now` should run the game. */
    ready(now: number) {
      // After a game frame the game may have been busy through display frames: only the
      // interval after a skipped one measures the display (a 60 Hz display never needs it).
      const delta = now - last
      if (waiting && delta >= 2 && delta < 100)
        period = period ? period + (delta - period) * 0.1 : delta
      last = now
      // Until the display is measured: a quarter frame early (never the middle frame of a
      // 120 Hz display), and only a frame barely early (a display just above 60 Hz) re-anchors.
      const tolerance = period ? Math.min(period, frameMs) / 2 : frameMs / 4
      waiting = now + tolerance < due
      if (waiting) return false
      const followDisplay = period ? period >= frameMs * NEAR_60HZ : due - now <= 1
      due = now - due > frameMs || followDisplay ? now + frameMs : due + frameMs
      return true
    },
  }
}
