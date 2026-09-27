import type { SceneAnimationPose } from '../scene/sampleAnimation'
import type { SceneSupportPoint } from './sceneSupports'

/** Four owned presentation points at most. An undrawable requested target never changes the solved pose. */
export function prepareSceneTwoBoneGuide(
  pose: SceneAnimationPose,
  visible: (id: string) => boolean,
): SceneSupportPoint[] {
  const guide = pose.twoBoneGuide
  if (guide?.chain.length !== 3 || new Set(guide.chain).size !== 3) return []
  const points: SceneSupportPoint[] = []
  for (const [i, id] of guide.chain.entries()) {
    const matrix = pose.worldMatrices.get(id)
    if (!visible(id) || !matrix) return []
    const position: [number, number, number] = [matrix[12], matrix[13], matrix[14]]
    if (!position.every((value) => Number.isFinite(Math.fround(value)))) return []
    points.push({ id, position, parent: i ? i - 1 : null, selected: false, locked: true })
  }
  if (
    guide.target.length === 3 &&
    guide.target.every((value) => Number.isFinite(Math.fround(value)))
  )
    points.push({
      id: '$two-bone-target',
      position: [...guide.target],
      parent: 2,
      selected: true,
      locked: true,
    })
  return points
}
