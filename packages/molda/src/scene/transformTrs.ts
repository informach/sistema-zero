import { animationTrs } from './animationTrs'
import { affineDeterminant, composeTransform, type SceneTransform } from './matrix'

/** Exact authoring coordinates, including reflections. Animation gestures keep their own sign gate. */
export function sceneTransformTrs(transform: SceneTransform) {
  const matrix = composeTransform(transform)
  return animationTrs(
    matrix,
    transform.kind === 'trs'
      ? { ...transform, space: 'local' }
      : {
          space: 'local',
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [affineDeterminant(matrix) < 0 ? -1 : 1, 1, 1],
        },
  )
}
