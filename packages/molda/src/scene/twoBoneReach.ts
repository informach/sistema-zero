import type { Vec3 } from '../core/model'
import { readSceneBendLimit, type SceneBendLimit } from './bendLimit'
import { record, requireScene, tuple } from './validation'

export interface TwoBoneReachInput {
  root: Vec3
  middle: Vec3
  tip: Vec3
  target: Vec3
  hint?: Vec3
  limit?: SceneBendLimit
}
export interface TwoBoneReach {
  middle: Vec3
  tip: Vec3
  status: 'reached' | 'too-far' | 'too-close' | 'bend-limit'
  bend: 'hint' | 'pose' | 'axis'
  direction: 'target' | 'pose'
}

function difference(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
function length(value: Vec3) {
  const result = Math.hypot(...value)
  requireScene(Number.isFinite(result), 'reach', 'A distância excede a precisão deste ajuste.')
  return result
}
function unit(value: Vec3): Vec3 | null {
  const size = length(value)
  return size ? [value[0] / size, value[1] / size, value[2] / size] : null
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function perpendicular(direction: Vec3, toward: Vec3): Vec3 | null {
  const candidate = unit(toward)
  if (!candidate) return null
  const normal = cross(direction, candidate),
    size = length(normal)
  if (size <= 64 * Number.EPSILON) return null
  return unit(cross([normal[0] / size, normal[1] / size, normal[2] / size], direction))
}

/** Two rigid segments in one Euclidean frame. Does not decompose transforms or write a document. */
export function solveTwoBoneReach(input: TwoBoneReachInput): TwoBoneReach {
  const raw = record(input, 'reach', ['root', 'middle', 'tip', 'target', 'hint', 'limit']),
    root = tuple(raw.root, 3, 'reach.root') as Vec3,
    middle = tuple(raw.middle, 3, 'reach.middle') as Vec3,
    tip = tuple(raw.tip, 3, 'reach.tip') as Vec3,
    target = tuple(raw.target, 3, 'reach.target') as Vec3,
    hint = raw.hint === undefined ? null : (tuple(raw.hint, 3, 'reach.hint') as Vec3),
    limit = raw.limit === undefined ? null : readSceneBendLimit(raw.limit, 'reach.limit'),
    upper = difference(middle, root),
    lower = difference(tip, middle),
    toward = difference(target, root),
    firstLength = length(upper),
    secondLength = length(lower),
    targetLength = length(toward)
  requireScene(
    firstLength > 0 && secondLength > 0,
    'reach',
    'Os dois ossos precisam ter comprimento maior que zero.',
  )
  if (!limit && !hint && target.every((value, i) => value === tip[i]))
    return {
      middle,
      tip,
      status: 'reached',
      bend: 'pose',
      direction: targetLength ? 'target' : 'pose',
    }
  const direction = unit(toward) ?? unit(difference(tip, root)) ?? unit(upper)!,
    scale = Math.max(firstLength, secondLength),
    first = firstLength / scale,
    second = secondLength / scale,
    minimum = Math.abs(firstLength - secondLength) / scale,
    maximum = first + second,
    requested = targetLength / scale
  // Half-angle form avoids cancellation near a complete fold and never squares source units.
  const radius = (degrees: number) =>
      degrees === 0
        ? maximum
        : degrees === 180
          ? minimum
          : Math.hypot(
              minimum,
              2 * Math.sqrt(first) * Math.sqrt(second) * Math.cos((degrees * Math.PI) / 360),
            ),
    inner = limit ? radius(limit.max) : minimum,
    outer = limit ? radius(limit.min) : maximum
  requireScene(
    !limit || ((limit.min === 0 || outer < maximum) && (limit.max === 180 || inner > minimum)),
    'reach.limit',
    'Essa faixa de dobra é pequena demais para a precisão dos comprimentos. A pose original não mudou.',
  )
  const distance = Math.min(outer, Math.max(inner, requested)),
    status: TwoBoneReach['status'] =
      requested > outer
        ? outer < maximum
          ? 'bend-limit'
          : 'too-far'
        : requested < inner
          ? inner > minimum
            ? 'bend-limit'
            : 'too-close'
          : 'reached'
  if (status === 'reached' && !hint && target.every((value, i) => value === tip[i]))
    return {
      middle,
      tip,
      status,
      bend: 'pose',
      direction: targetLength ? 'target' : 'pose',
    }

  let bend: TwoBoneReach['bend'] = 'hint',
    side = hint ? perpendicular(direction, difference(hint, root)) : null
  if (!side) {
    bend = 'pose'
    side = perpendicular(direction, upper)
  }
  if (!side) {
    bend = 'axis'
    let axis = 0
    for (let i = 1; i < 3; i++) if (Math.abs(direction[i]!) < Math.abs(direction[axis]!)) axis = i
    const basis: Vec3 = [0, 0, 0]
    basis[axis] = 1
    side = perpendicular(direction, basis)!
  }
  // Cosine rule in units of the longer bone; avoid squaring huge/tiny source lengths.
  const boundary = distance === maximum || (distance > 0 && distance === minimum),
    along =
      distance === maximum
        ? first
        : distance > 0 && distance === minimum
          ? firstLength >= secondLength
            ? first
            : -first
          : distance
            ? (distance + (((firstLength - secondLength) / scale) * maximum) / distance) / 2
            : 0,
    square = (first - along) * (first + along)
  requireScene(
    square >= -1024 * Number.EPSILON,
    'reach',
    'Não foi possível calcular a dobra com segurança.',
  )
  const height = boundary ? 0 : Math.sqrt(Math.max(0, square)),
    nextMiddle = root.map(
      (value, i) => value + scale * (direction[i]! * along + side[i]! * height),
    ) as Vec3,
    nextTip =
      status === 'reached'
        ? target
        : (root.map((value, i) => value + scale * (direction[i]! * distance)) as Vec3),
    measured = [length(difference(nextMiddle, root)), length(difference(nextTip, nextMiddle))]
  for (const [i, original] of [firstLength, secondLength].entries())
    requireScene(
      Math.abs((measured[i]! - original) / original) <= 1024 * Number.EPSILON,
      'reach',
      'Não foi possível preservar os comprimentos com essa precisão. A pose original não mudou.',
    )
  if (limit) {
    const a = unit(difference(nextMiddle, root))!,
      b = unit(difference(nextTip, nextMiddle))!,
      angle = Math.atan2(length(cross(a, b)), a[0] * b[0] + a[1] * b[1] + a[2] * b[2]),
      tolerance = 1024 * Number.EPSILON
    requireScene(
      angle >= (limit.min * Math.PI) / 180 - tolerance &&
        angle <= (limit.max * Math.PI) / 180 + tolerance,
      'reach.limit',
      'Não foi possível respeitar a faixa de dobra com essa precisão. A pose original não mudou.',
    )
  }
  return {
    middle: nextMiddle,
    tip: nextTip,
    status,
    bend,
    direction: targetLength ? 'target' : 'pose',
  }
}
