import { planBbmodelAnimations } from './bbmodelAnimationPlan'
import { bbmodelAnimationTextBudget } from './bbmodelAnimationText'
import type { BbmodelAnimationMarker, BbmodelAnimationStructure } from './bbmodelAnimationTypes'
import type { BbmodelEnvelope } from './bbmodelEnvelope'
import {
  BbmodelInputError,
  bbmodelRecord,
  BBMODEL_INPUT_LIMITS as limits,
  requireBbmodel,
} from './bbmodelInput'
import { bbmodelBoolean, bbmodelNumber } from './bbmodelValues'

function optionalNumber(value: unknown, path: string): number | null {
  return value === undefined ? null : bbmodelNumber(value, path)
}

/**
 * Reads source structure only. Finite metadata is not native timing approval; expressions,
 * key values, animator targets and unknown fields stay inert. The envelope must not change
 * during this call. Result containers are owned; raw source records remain borrowed/read-only.
 */
export function readBbmodelAnimationStructure(
  envelope: BbmodelEnvelope,
): BbmodelAnimationStructure {
  if (envelope.modelFormat !== 'free')
    throw new BbmodelInputError(
      'unsupported',
      'meta.model_format',
      'Esta leitura de animações precisa do formato genérico do Blockbench.',
    )
  const { plans, counts } = planBbmodelAnimations(envelope),
    text = bbmodelAnimationTextBudget(
      limits.animationMetadataChars,
      'Há texto demais nos metadados das animações.',
    ),
    byUuid = new Map<string, number>()
  // Validate every header and the aggregate text budget before copying any keyframe list.
  const headers = plans.map((plan) => {
    const { source, path, index } = plan,
      uuid = text.identifier(source.uuid, `${path}.uuid`)
    requireBbmodel(!byUuid.has(uuid), `${path}.uuid`, 'Duas animações usam o mesmo identificador.')
    byUuid.set(uuid, index)
    return {
      index,
      path,
      uuid,
      name: text.optional(source.name, `${path}.name`),
      loop: source.loop === undefined ? 'once' : text.identifier(source.loop, `${path}.loop`),
      override: bbmodelBoolean(source.override, `${path}.override`, false),
      selected: bbmodelBoolean(source.selected, `${path}.selected`, false),
      length: source.length === undefined ? 0 : bbmodelNumber(source.length, `${path}.length`),
      snapping: optionalNumber(source.snapping, `${path}.snapping`),
      scope: optionalNumber(source.scope, `${path}.scope`),
      saved:
        source.saved === undefined ? null : bbmodelBoolean(source.saved, `${path}.saved`, true),
      filePath: text.optional(source.path, `${path}.path`),
      groupName: text.optional(source.group_name, `${path}.group_name`),
      timing: {
        timeUpdate: text.expression(source.anim_time_update, `${path}.anim_time_update`),
        blendWeight: text.expression(source.blend_weight, `${path}.blend_weight`),
        startDelay: text.expression(source.start_delay, `${path}.start_delay`),
        loopDelay: text.expression(source.loop_delay, `${path}.loop_delay`),
      },
      markers: Array.from(plan.markerRows, (raw, marker): BbmodelAnimationMarker => {
        const markerPath = `${path}.markers[${marker}]`,
          row = bbmodelRecord(raw, markerPath)
        return {
          path: markerPath,
          time: row.time === undefined ? 0 : bbmodelNumber(row.time, `${markerPath}.time`),
          color: row.color === undefined ? 0 : bbmodelNumber(row.color, `${markerPath}.color`),
          name: text.markerName(row.name, `${markerPath}.name`),
          source: row,
        }
      }),
      animators: plan.animators.map((animator) => ({
        key: text.identifier(animator.key, animator.path),
        path: animator.path,
        name: text.optional(animator.source.name, `${animator.path}.name`),
        type:
          animator.source.type === undefined
            ? null
            : text.identifier(animator.source.type, `${animator.path}.type`),
        source: animator.source,
        keyframes: animator.keyframes,
      })),
      source,
    }
  })
  const clips = headers.map((header) => ({
    ...header,
    animators: header.animators.map((animator) => ({
      ...animator,
      keyframes: Array.from(animator.keyframes, (raw, key) =>
        bbmodelRecord(raw, `${animator.path}.keyframes[${key}]`),
      ),
    })),
  }))
  return {
    version: envelope.version,
    clips,
    byUuid,
    counts: { ...counts, metadataChars: text.chars },
  }
}
