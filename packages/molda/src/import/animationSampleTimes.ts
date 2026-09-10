/**
 * Private temporal helpers: finite native-range bounds, start <= end, integer FPS 1..120.
 * Frame membership is decided using the actual division, not rounded multiplication alone.
 */
function interiorFrames(start: number, end: number, fps: number) {
  let first = Math.floor(start * fps) + 1,
    last = Math.ceil(end * fps) - 1
  while (first / fps <= start) first++
  while ((first - 1) / fps > start) first--
  while (last / fps >= end) last--
  while ((last + 1) / fps < end) last++
  return { first, last }
}

/** Includes both bounds exactly (once for a zero-length window), without allocating a grid. */
export function countRegularAnimationTimes(start: number, end: number, fps: number): number {
  if (start === end) return 1
  const { first, last } = interiorFrames(start, end, fps)
  return 2 + Math.max(0, last - first + 1)
}

/**
 * Exact ordered union of window bounds, authored finite times and an explicitly chosen grid.
 * Authored times are already strictly increasing; those outside the window are not emitted.
 * No snap, epsilon, time copies or Set/sort. Consumers enforce their aggregate output budget.
 */
export function* mergeAnimationSampleTimes(
  authored: Iterable<number>,
  start: number,
  end: number,
  fps: number,
  mode: 'authored' | 'grid',
): Generator<number> {
  yield start
  if (start === end) return
  const { first, last } = mode === 'grid' ? interiorFrames(start, end, fps) : { first: 0, last: -1 }
  let frame = first
  for (const time of authored) {
    if (time <= start) continue
    if (time >= end) break
    while (frame <= last && frame / fps < time) yield frame++ / fps
    if (frame <= last && frame / fps === time) frame++
    yield time
  }
  while (frame <= last) yield frame++ / fps
  yield end
}
