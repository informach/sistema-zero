export type PaintPointerPoint = Readonly<Pick<PointerEvent, 'clientX' | 'clientY'>>
type PaintRect = Readonly<Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>>

/** Only synthetic positions are budgeted. Every recorded endpoint is still delivered once. */
export const MAX_PAINT_PATH_SAMPLES = 256

function clip(from: PaintPointerPoint, to: PaintPointerPoint, rect: PaintRect) {
  const values = [
    from.clientX,
    from.clientY,
    to.clientX,
    to.clientY,
    rect.left,
    rect.top,
    rect.right,
    rect.bottom,
  ]
  if (!values.every(Number.isFinite) || rect.right <= rect.left || rect.bottom <= rect.top)
    return null
  let enter = 0,
    exit = 1
  for (const [start, end, low, high] of [
    [from.clientX, to.clientX, rect.left, rect.right],
    [from.clientY, to.clientY, rect.top, rect.bottom],
  ] as const) {
    const delta = end - start
    if (!Number.isFinite(delta)) return null
    if (delta === 0) {
      if (start < low || start > high) return null
      continue
    }
    const a = (low - start) / delta,
      b = (high - start) / delta
    enter = Math.max(enter, Math.min(a, b))
    exit = Math.min(exit, Math.max(a, b))
    if (enter > exit) return null
  }
  const at = (t: number): PaintPointerPoint => ({
    clientX: Math.min(rect.right, Math.max(rect.left, mix(from.clientX, to.clientX, t))),
    clientY: Math.min(rect.bottom, Math.max(rect.top, mix(from.clientY, to.clientY, t))),
  })
  return { start: at(enter), end: at(exit), enter, exit }
}

function mix(a: number, b: number, t: number) {
  // Keep the closer endpoint exact; subtracting an enormous external coordinate is poorly conditioned.
  return t <= 0.5 ? a + (b - a) * t : b + (a - b) * (1 - t)
}

/** Screen-space approximation, not interpolation between 3D hits or a geodesic solver. */
export function* paintPointerPath(
  from: PaintPointerPoint,
  to: PaintPointerPoint,
  rect: PaintRect,
  suggestedSpacing: number,
): Generator<PaintPointerPoint, void> {
  // Snapshot all caller fields before exposing the first yielded position.
  const endpoint = { clientX: to.clientX, clientY: to.clientY }
  const segment = clip(from, endpoint, rect)
  if (segment) {
    const { start, end, enter, exit } = segment
    const distance = Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY)
    if (distance > 0 && Number.isFinite(distance)) {
      const spacing = Number.isFinite(suggestedSpacing)
        ? Math.min(16, Math.max(1, suggestedSpacing))
        : 1
      const steps = Math.min(MAX_PAINT_PATH_SAMPLES - 1, Math.max(1, Math.ceil(distance / spacing)))
      for (let i = enter === 0 ? 1 : 0; i <= steps; i++) {
        if (i === steps && exit === 1) break
        yield {
          clientX: mix(start.clientX, end.clientX, i / steps),
          clientY: mix(start.clientY, end.clientY, i / steps),
        }
      }
    }
  }
  yield endpoint
}
