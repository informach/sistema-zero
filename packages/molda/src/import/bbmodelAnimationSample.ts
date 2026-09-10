import type {
  BbmodelNumericAnimationKey,
  BbmodelNumericAnimationTrack,
} from './bbmodelAnimationTrackTypes'
import { BbmodelInputError } from './bbmodelInput'
import { type BbmodelVec3, bbmodelNumber } from './bbmodelValues'

function finiteCurve(value: number, path: string): number {
  if (!Number.isFinite(value))
    throw new BbmodelInputError(
      'unsupported',
      path,
      'Esta curva produz um valor fora da faixa numérica do Molda.',
    )
  return value
}
function mix(a: number, b: number, t: number): number {
  return a === b ? a : (1 - t) * a + t * b
}
function post(key: BbmodelNumericAnimationKey): BbmodelVec3 {
  return key.points[1] ?? key.points[0]
}
/** De Casteljau: no polynomial coefficient expansion or intermediate b-a overflow. */
function cubic(a: number, b: number, c: number, d: number, t: number): number {
  const ab = mix(a, b, t),
    bc = mix(b, c, t),
    cd = mix(c, d, t)
  return mix(mix(ab, bc, t), mix(bc, cd, t), t)
}
/**
 * Handles in [0,1] make the time curve monotone, even when they cross. Bisect down
 * to representable doubles, not a fixed decimal epsilon or a 201-point lookup table.
 * 1,076 halvings cover [0,1] down through the smallest F64 subnormal and adjacency.
 */
function bezierParameter(target: number, a: number, b: number): number {
  let low = 0,
    high = 1
  for (let iteration = 0; iteration < 1076; iteration++) {
    const middle = low + (high - low) / 2
    if (middle === low || middle === high) {
      const leftError = Math.abs(cubic(0, a, b, 1, low) - target),
        rightError = Math.abs(cubic(0, a, b, 1, high) - target)
      return leftError <= rightError ? low : high
    }
    const x = cubic(0, a, b, 1, middle)
    if (x === target) return middle
    if (x < target) low = middle
    else high = middle
  }
  throw new Error('Bezier time bisection did not reach adjacent finite doubles')
}
function bezierAxis(
  before: BbmodelNumericAnimationKey,
  after: BbmodelNumericAnimationKey,
  axis: 0 | 1 | 2,
  gap: number,
  alpha: number,
): number {
  const from = post(before)[axis],
    to = after.points[0][axis],
    rightTime = before.bezier?.rightTime[axis] ?? 0.1,
    leftTime = after.bezier?.leftTime[axis] ?? -0.1,
    // Clamp in source time units before division, avoiding an overflowing handle/gap ratio.
    a = Math.max(0, Math.min(gap, rightTime)) / gap,
    b = 1 + Math.min(0, Math.max(-gap, leftTime)) / gap,
    right = finiteCurve(
      from + (before.bezier?.rightValue[axis] ?? 0),
      `${before.path}.bezier_right_value[${axis}]`,
    ),
    left = finiteCurve(
      to + (after.bezier?.leftValue[axis] ?? 0),
      `${after.path}.bezier_left_value[${axis}]`,
    )
  return cubic(from, right, left, to, bezierParameter(alpha, a, b))
}
function catmullAxis(a: number, b: number, previous: number, next: number, t: number): number {
  const reverse = 1 - t,
    base = mix(a, b, t * t * (3 - 2 * t)),
    tangentA = b / 2 - previous / 2,
    tangentB = next / 2 - a / 2
  return base + t * reverse * reverse * tangentA - t * t * reverse * tangentB
}

/**
 * Mathematical adaptation, NOT Blockbench playback emulation. Exact key times use pre;
 * after the key uses post. No 1/1200 snapping or approximate Bezier table. Catmull pre/post
 * splits its tangent instead of shifting the segment parameter. A converter must disclose
 * these rules and obtain explicit adaptation consent before producing native clips.
 *
 * The prepared track stays immutable. Loop neighbours affect Catmull tangents only, not
 * time wrapping. Rotation values remain Euler degrees: no quaternion/global/base-pose logic.
 * O(log keys) lookup, constant working space, own XYZ or null for an empty track.
 */
export function sampleBbmodelContinuousTrack(
  track: BbmodelNumericAnimationTrack,
  seconds: number,
  catmullLoopNeighbours: boolean,
): BbmodelVec3 | null {
  const time = bbmodelNumber(seconds, 'animation.sample.time'),
    { keys } = track
  let low = 0,
    high = keys.length
  while (low < high) {
    const middle = (low + high) >>> 1,
      key = keys[middle]
    if (!key) throw new Error('Prepared animation track changed during sampling')
    if (key.time < time) low = middle + 1
    else high = middle
  }
  const before = keys[low - 1],
    after = keys[low]
  if (after && (!before || after.time === time)) return [...after.points[0]]
  if (!before) return null
  const from = post(before)
  if (!after || before.interpolation === 'step') return [...from]
  const gap = finiteCurve(after.time - before.time, `${after.path}.time`),
    alpha = (time - before.time) / gap
  if (!(alpha > 0 && alpha < 1))
    throw new BbmodelInputError(
      'unsupported',
      `${before.path}.time`,
      'A diferença entre estes tempos é grande demais para amostrar este instante com precisão.',
    )
  const to = after.points[0],
    catmull = before.interpolation === 'catmullrom' || after.interpolation === 'catmullrom',
    bezier = before.interpolation === 'bezier' || after.interpolation === 'bezier'
  let previous: BbmodelVec3 = from,
    next: BbmodelVec3 = to
  if (catmull) {
    const loop = catmullLoopNeighbours && keys.length >= 3,
      previousKey = keys[low - 2] ?? (loop ? keys[keys.length - 2] : undefined),
      nextKey = keys[low + 1] ?? (loop ? keys[1] : undefined)
    if (before.points.length === 1 && previousKey) previous = post(previousKey)
    if (after.points.length === 1 && nextKey) next = nextKey.points[0]
  }
  function axis(index: 0 | 1 | 2): number {
    // Capture narrowed keys for the synchronous callback without asserting away absent entries.
    if (!before || !after) throw new Error('Missing prepared animation segment')
    const result = catmull
      ? catmullAxis(from[index], to[index], previous[index], next[index], alpha)
      : bezier
        ? bezierAxis(before, after, index, gap, alpha)
        : mix(from[index], to[index], alpha)
    return finiteCurve(result, before.path)
  }
  return [axis(0), axis(1), axis(2)]
}
