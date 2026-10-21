import { animationTrs } from './animationTrs'
import { affineDeterminant, composeTransform, type SceneTransform } from './matrix'
import { SceneValidationError } from './validation'

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

/** Keep genuine shear as affine; represent ordinary move, turn and size edits as TRS. */
export function rigidSceneTransform(transform: SceneTransform): SceneTransform {
  if (transform.kind === 'trs') return transform
  try {
    const { translation, rotation, scale } = sceneTransformTrs(transform)
    return { kind: 'trs', translation, rotation, scale }
  } catch (error) {
    if (error instanceof SceneValidationError) return transform
    throw error
  }
}
