import type { BbmodelEnvelope } from './bbmodelEnvelope'
import {
  BbmodelInputError,
  bbmodelList,
  bbmodelRecord,
  BBMODEL_INPUT_LIMITS as limits,
} from './bbmodelInput'
import { bbmodelKeyPath, bbmodelKeys } from './bbmodelValues'

/** Container budgets are complete before any numeric metadata, curve values or owned key copies. */
export function planBbmodelAnimations(envelope: BbmodelEnvelope) {
  const clips = bbmodelList(envelope.json.animations, 'animations', limits.animations)
  let animators = 0,
    markers = 0,
    keys = 0,
    dataPoints = 0
  const containers = Array.from(clips, (raw, index) => {
    const path = `animations[${index}]`,
      source = bbmodelRecord(raw, path),
      animatorSource =
        source.animators === undefined ? {} : bbmodelRecord(source.animators, `${path}.animators`),
      animatorIds = bbmodelKeys(
        animatorSource,
        limits.animationAnimators - animators,
        `${path}.animators`,
      ),
      markerRows = bbmodelList(source.markers, `${path}.markers`, limits.animationMarkers - markers)
    animators += animatorIds.length
    markers += markerRows.length
    return { index, path, source, animatorSource, animatorIds, markerRows }
  })
  const plans = containers.map((clip) => ({
    ...clip,
    animators: clip.animatorIds.map((key) => {
      const path = bbmodelKeyPath(`${clip.path}.animators`, key),
        source = bbmodelRecord(clip.animatorSource[key], path),
        keyframes = bbmodelList(source.keyframes, `${path}.keyframes`, limits.animationKeys - keys)
      keys += keyframes.length
      return { key, path, source, keyframes }
    }),
  }))
  for (const clip of plans)
    for (const animator of clip.animators) {
      for (let i = 0; i < animator.keyframes.length; i++) {
        const path = `${animator.path}.keyframes[${i}]`,
          source = bbmodelRecord(animator.keyframes[i], path),
          points = bbmodelList(
            source.data_points,
            `${path}.data_points`,
            limits.animationPointsPerKey,
          )
        dataPoints += Math.max(1, points.length)
        if (dataPoints > limits.animationDataPoints)
          throw new BbmodelInputError(
            'budget',
            'animations.data_points',
            'Há pontos de animação demais neste arquivo.',
          )
      }
    }
  return { plans, counts: { clips: clips.length, animators, markers, keys, dataPoints } }
}
