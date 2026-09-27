import { readBbmodelAnimationConstantKey } from './bbmodelAnimationConstantKey'
import type {
  BbmodelAnimationBezier,
  BbmodelAnimationChannel,
  BbmodelAnimationKey,
  BbmodelKeyAnimator,
} from './bbmodelAnimationKeyTypes'
import type {
  BbmodelAnimationInterpolation,
  BbmodelAnimationTrackIssue,
  BbmodelAnimationTrackResult,
  BbmodelNumericAnimationKey,
} from './bbmodelAnimationTrackTypes'
import type { BbmodelVersion } from './bbmodelEnvelope'

type SourceKey = Extract<BbmodelAnimationKey, { kind: 'transform' }>
function knownInterpolation(value: string): value is BbmodelAnimationInterpolation {
  return value === 'linear' || value === 'step' || value === 'catmullrom' || value === 'bezier'
}
function copyBezier(source: BbmodelAnimationBezier | null): BbmodelAnimationBezier | null {
  return source === null
    ? null
    : {
        linked: source.linked,
        leftTime: [...source.leftTime],
        leftValue: [...source.leftValue],
        rightTime: [...source.rightTime],
        rightValue: [...source.rightValue],
      }
}
function shapeIssue(key: SourceKey, legacy: boolean): BbmodelAnimationTrackIssue | null {
  const base = { path: key.path, key: key.index }
  if (!knownInterpolation(key.interpolation))
    return { ...base, code: 'interpolation', interpolation: key.interpolation }
  if (key.points.length < 1 || key.points.length > 2)
    return { ...base, code: 'point-count', count: key.points.length }
  // The pre-5 codec iterates data_points before the Keyframe constructor's direct fallback.
  if (legacy && key.source.data_points === undefined)
    return { ...base, path: `${key.path}.data_points`, code: 'legacy-data-points' }
  if (legacy && key.channel !== 'scale')
    for (const [index, point] of key.points.entries()) {
      if (point.layout === 'direct' || point.aliasSource === null) continue
      const axes = key.channel === 'rotation' ? (['x', 'y'] as const) : (['x'] as const)
      for (const axis of axes) {
        if (!Object.hasOwn(point.aliasSource, axis)) continue
        const shadowed = point.source[axis]
        // A truthy parent value reaches the old rewrite even when values later replaces it.
        if (shadowed && typeof shadowed !== 'string' && typeof shadowed !== 'number')
          return {
            ...base,
            code: 'legacy-shadowed-value',
            path: `${point.path}.${axis}`,
            point: index,
            axis,
          }
      }
    }
  if (
    legacy &&
    key.channel !== 'scale' &&
    key.interpolation === 'bezier' &&
    key.source.bezier_left_value !== undefined &&
    key.source.bezier_right_value === undefined
  )
    return { ...base, path: `${key.path}.bezier_right_value`, code: 'legacy-bezier-pair' }
  return null
}

/**
 * One known channel of an already validated, bounded, immutable animator. This is source
 * preparation, not target/pose approval or native sampling. Other channels remain unapproved.
 * No trimming to clip duration, time epsilon, Euler wrapping, Molang or shared output arrays.
 */
export function prepareBbmodelAnimationTrack(
  animator: Extract<BbmodelKeyAnimator, { kind: 'transform' }>,
  channel: BbmodelAnimationChannel,
  version: BbmodelVersion,
): BbmodelAnimationTrackResult {
  if (animator.sourceType === 'null_object' && channel !== 'position')
    return {
      status: 'unresolved',
      issue: { code: 'unsupported-channel', path: animator.declaration.path },
    }
  const legacy = version !== '5.0',
    sourceKeys: SourceKey[] = [],
    keys: BbmodelNumericAnimationKey[] = [],
    migration = { pointAxes: 0, bezierValueAxes: 0 }
  for (const key of animator.keys) {
    if (key.kind !== 'transform' || key.channel !== channel) continue
    const issue = shapeIssue(key, legacy)
    if (issue) return { status: 'unresolved', issue }
    sourceKeys.push(key)
  }
  // Sort references we own, never the reader's original list. Exact equal times are ambiguous.
  sourceKeys.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
  let previous: SourceKey | undefined,
    reordered = false
  for (const key of sourceKeys) {
    if (previous && key.time === previous.time)
      return {
        status: 'unresolved',
        issue: {
          code: 'duplicate-time',
          path: key.path,
          key: key.index,
          otherKey: previous.index,
          time: key.time,
        },
      }
    if (previous && key.index < previous.index) reordered = true
    previous = key
  }
  for (const key of sourceKeys) {
    const values = readBbmodelAnimationConstantKey(key)
    if (values.status === 'unresolved')
      return {
        status: 'unresolved',
        issue: { code: 'constant', key: key.index, path: key.path, issues: values.issues },
      }
    const [first, second] = values.points
    if (!first || !knownInterpolation(key.interpolation))
      throw new Error('Animation track input changed during preparation')
    const points: BbmodelNumericAnimationKey['points'] = second ? [first, second] : [first],
      bezier = copyBezier(key.bezier)
    if (legacy && channel !== 'scale') {
      const axes = channel === 'rotation' ? ([0, 1] as const) : ([0] as const)
      for (const [index, point] of key.points.entries()) {
        const numeric = points[index]
        if (!numeric) throw new Error('Animation point input changed during preparation')
        // The codec mutates the explicit point BEFORE its values overlay. A direct key
        // (data_points: []) and axes overridden by values must not be inverted here.
        if (point.layout === 'direct') continue
        for (const axis of axes) {
          const name = axis === 0 ? 'x' : 'y'
          if (point.aliasSource !== null && Object.hasOwn(point.aliasSource, name)) continue
          const value = numeric[axis],
            raw = point.values[axis]
          if (value === 0) continue // Preserve source signed zero; native canonicalization is later.
          // The old numeric-string rewrite serializes through Number.toString. Scientific
          // notation would then re-enter Molang, outside our approved literal grammar.
          if (
            typeof raw === 'string' &&
            raw === raw.trim() &&
            !raw.endsWith('F') &&
            String(-value).includes('e')
          )
            return {
              status: 'unresolved',
              issue: {
                code: 'legacy-literal-rewrite',
                path: `${point.path}.${name}`,
                key: key.index,
                point: index,
                axis: name,
              },
            }
          numeric[axis] = -value
          migration.pointAxes++
        }
      }
      // Only active Bezier keys with a declared left value trigger the codec's pair flip.
      if (bezier && key.interpolation === 'bezier' && key.source.bezier_left_value !== undefined)
        for (const axis of axes) {
          for (const vector of [bezier.leftValue, bezier.rightValue]) {
            if (vector[axis] === 0) continue
            vector[axis] = -vector[axis]
            migration.bezierValueAxes++
          }
        }
    }
    keys.push({
      index: key.index,
      path: key.path,
      time: key.time,
      interpolation: key.interpolation,
      points,
      bezier,
    })
  }
  return { status: 'ready', channel, keys, reordered, migration }
}
