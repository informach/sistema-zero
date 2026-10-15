import type { SpriteAnimation, SpriteMeta } from '../assets'

/** Constant-time frame calculation also handles a late visual frame. Rules never depend on it. */
export function advanceAnimation(
  animation: SpriteAnimation,
  elapsedSeconds: number,
): { frame: number; finished: boolean } {
  const count = animation.to - animation.from + 1
  const elapsed = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0)
  const index = Math.floor(elapsed * animation.fps)
  return {
    frame: animation.from + (animation.loop ? index % count : Math.min(index, count - 1)),
    finished: !animation.loop && index >= count,
  }
}

export function frameRect(
  sprite: SpriteMeta | undefined,
  sheetWidth: number,
  sheetHeight: number,
  frame: number,
) {
  if (!sprite) return { x: 0, y: 0, width: sheetWidth, height: sheetHeight }
  const columns = sheetWidth / sprite.frameW,
    rows = sheetHeight / sprite.frameH
  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    !Number.isInteger(frame) ||
    frame < 0 ||
    frame >= columns * rows
  )
    throw new Error('Frame fora da spritesheet.')
  return {
    x: (frame % columns) * sprite.frameW,
    y: Math.floor(frame / columns) * sprite.frameH,
    width: sprite.frameW,
    height: sprite.frameH,
  }
}
