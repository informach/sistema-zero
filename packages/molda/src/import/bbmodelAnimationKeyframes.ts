import type {
  BbmodelAnimationBezier,
  BbmodelAnimationChannel,
  BbmodelAnimationKey,
  BbmodelAnimationKeyframes,
  BbmodelAnimationPoint,
  BbmodelKeyAnimator,
} from './bbmodelAnimationKeyTypes'
import { bbmodelAnimationTextBudget } from './bbmodelAnimationText'
import type { BbmodelAnimationAnimator, BbmodelAnimationStructure } from './bbmodelAnimationTypes'
import { bbmodelList, bbmodelRecord, BBMODEL_INPUT_LIMITS as limits } from './bbmodelInput'
import { bbmodelBoolean, bbmodelNumber, bbmodelVec3 } from './bbmodelValues'

function sourceType(declaration: BbmodelAnimationAnimator) {
  if (declaration.key === 'effects') return null
  const type = declaration.type
  if (type === null || type === 'bone') return 'bone'
  return type === 'armature_bone' || type === 'null_object' ? type : null
}
function transformChannel(channel: string, type: string): channel is BbmodelAnimationChannel {
  return (
    channel === 'position' ||
    (type !== 'null_object' && (channel === 'rotation' || channel === 'scale'))
  )
}
function bezier(
  source: Readonly<Record<string, unknown>>,
  path: string,
  interpolation: string,
): BbmodelAnimationBezier | null {
  const fields = [
    'bezier_linked',
    'bezier_left_time',
    'bezier_left_value',
    'bezier_right_time',
    'bezier_right_value',
  ]
  if (interpolation !== 'bezier' && fields.every((field) => source[field] === undefined))
    return null
  return {
    linked: bbmodelBoolean(source.bezier_linked, `${path}.bezier_linked`, true),
    leftTime:
      source.bezier_left_time === undefined
        ? [-0.1, -0.1, -0.1]
        : bbmodelVec3(source.bezier_left_time, `${path}.bezier_left_time`),
    leftValue:
      source.bezier_left_value === undefined
        ? [0, 0, 0]
        : bbmodelVec3(source.bezier_left_value, `${path}.bezier_left_value`),
    rightTime:
      source.bezier_right_time === undefined
        ? [0.1, 0.1, 0.1]
        : bbmodelVec3(source.bezier_right_time, `${path}.bezier_right_time`),
    rightValue:
      source.bezier_right_value === undefined
        ? [0, 0, 0]
        : bbmodelVec3(source.bezier_right_value, `${path}.bezier_right_value`),
  }
}

/**
 * The structure and its raw source must remain immutable for this call. Source-wide budgets
 * already precede values. Reads owned descriptors, not evaluated/sorted curves or native clips.
 * Unknown animator/channel schemas remain explicit and are never interpreted as transforms.
 */
export function readBbmodelAnimationKeyframes(
  structure: BbmodelAnimationStructure,
): BbmodelAnimationKeyframes {
  const text = bbmodelAnimationTextBudget(
      limits.animationKeyTextChars,
      'Há texto demais nas chaves de animação.',
    ),
    counts = {
      transformAnimators: 0,
      unresolvedAnimators: 0,
      transformKeys: 0,
      unresolvedKeys: 0,
      points: 0,
      textChars: 0,
    }
  function point(
    raw: unknown,
    path: string,
    channel: BbmodelAnimationChannel,
    direct: boolean,
  ): BbmodelAnimationPoint {
    const source = bbmodelRecord(raw, path),
      aliasSource =
        !direct && source.values !== undefined
          ? bbmodelRecord(source.values, `${path}.values`)
          : null,
      fallback = channel === 'scale' ? '1' : '0'
    function axis(name: 'x' | 'y' | 'z') {
      const alias = aliasSource !== null && Object.hasOwn(aliasSource, name),
        valuePath = `${path}${alias ? '.values' : ''}.${name}`
      return text.expression(alias ? aliasSource[name] : source[name], valuePath, fallback)
    }
    counts.points++
    return {
      path,
      layout: direct ? 'direct' : aliasSource === null ? 'point' : 'point-values',
      values: [axis('x'), axis('y'), axis('z')],
      source,
      aliasSource,
    }
  }
  const clips = structure.clips.map((clip) => ({
    clip: clip.index,
    animators: clip.animators.map((declaration, index): BbmodelKeyAnimator => {
      const type = sourceType(declaration),
        { source, path } = declaration
      if (type === null) {
        counts.unresolvedAnimators++
        counts.unresolvedKeys += declaration.keyframes.length
        return { kind: 'unresolved', index, declaration }
      }
      counts.transformAnimators++
      return {
        kind: 'transform',
        index,
        declaration,
        sourceType: type,
        rotationGlobal: bbmodelBoolean(source.rotation_global, `${path}.rotation_global`, false),
        quaternionInterpolation:
          source.quaternion_interpolation === undefined
            ? null
            : bbmodelBoolean(
                source.quaternion_interpolation,
                `${path}.quaternion_interpolation`,
                false,
              ),
        keys: declaration.keyframes.map((key, keyIndex): BbmodelAnimationKey => {
          const keyPath = `${path}.keyframes[${keyIndex}]`,
            channel = text.identifier(key.channel, `${keyPath}.channel`),
            base = { index: keyIndex, path: keyPath, source: key }
          if (!transformChannel(channel, type)) {
            counts.unresolvedKeys++
            return { ...base, kind: 'unresolved', channel }
          }
          counts.transformKeys++
          const interpolation =
              key.interpolation === undefined
                ? 'linear'
                : text.identifier(key.interpolation, `${keyPath}.interpolation`),
            points = bbmodelList(
              key.data_points,
              `${keyPath}.data_points`,
              limits.animationPointsPerKey,
            )
          return {
            ...base,
            kind: 'transform',
            channel,
            uuid: key.uuid === undefined ? null : text.identifier(key.uuid, `${keyPath}.uuid`),
            time: key.time === undefined ? 0 : bbmodelNumber(key.time, `${keyPath}.time`),
            color: key.color === undefined ? -1 : bbmodelNumber(key.color, `${keyPath}.color`),
            uniform:
              key.uniform === undefined
                ? null
                : bbmodelBoolean(key.uniform, `${keyPath}.uniform`, false),
            interpolation,
            bezier: bezier(key, keyPath, interpolation),
            points:
              points.length === 0
                ? [point(key, keyPath, channel, true)]
                : Array.from(points, (raw, i) =>
                    point(raw, `${keyPath}.data_points[${i}]`, channel, false),
                  ),
          }
        }),
      }
    }),
  }))
  counts.textChars = text.chars
  return { clips, counts }
}
