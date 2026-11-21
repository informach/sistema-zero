/**
 * Games focus their canvas and controls after loading, outside the Run click's activation.
 * Chromium 158+ requires explicit delegation to cross-origin/opaque frames. The default
 * `src` allowlist suffices: no wildcard and no change to the frame's sandbox authority.
 */
export const GAME_FRAME_FOCUS_ALLOW = 'focus-without-user-activation'

/** Classic previews and public JavaScript players already allow fullscreen. */
export const CLASSIC_GAME_FRAME_ALLOW = `fullscreen; ${GAME_FRAME_FOCUS_ALLOW}`
