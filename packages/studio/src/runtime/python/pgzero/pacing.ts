/** Pygame Zero 1.2.1 runs `clock.tick(60)`: one game frame every 1/60 s, whatever the display. */
export const PGZERO_FRAME_MS = 1000 / 60
/** A display frame that arrives up to this early still counts (vsync jitter). */
const EARLY_MS = 1

/**
 * Decides which display frames (requestAnimationFrame) run a game frame. On a 60 Hz display it
 * is every one; at 120 Hz every other one; at 144 Hz it averages 60 per second. A late frame
 * never makes the game run twice in a row to catch up (Pygame Zero does not either).
 */
export function createPgzeroFramePacer(frameMs = PGZERO_FRAME_MS) {
  let due = Number.NEGATIVE_INFINITY
  return {
    /** True when the display frame at `now` should run the game. */
    ready(now: number) {
      if (now + EARLY_MS < due) return false
      due = now - due > frameMs ? now + frameMs : due + frameMs
      return true
    },
  }
}
