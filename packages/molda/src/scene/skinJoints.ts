import { type AffineMatrix, affineInverse, affineMultiply } from './matrix'
import type { SceneSkinBinding } from './skin'
import { requireScene } from './validation'

/** Capture one new rest relation. Existing joints must never be recaptured as a side effect. */
export function captureSceneSkinJoint(
  nodeId: string,
  jointWorld: Readonly<AffineMatrix> | undefined,
  meshWorld: Readonly<AffineMatrix>,
): SceneSkinBinding['joints'][number] {
  const inverse = jointWorld && affineInverse(jointWorld)
  requireScene(inverse, 'jointIds', 'A pose de um osso não pode ser vinculada com segurança.')
  const inverseBindMatrix = affineMultiply(inverse, meshWorld)
  requireScene(
    affineInverse(inverseBindMatrix),
    'jointIds',
    'A pose de vínculo não pode ser invertida com segurança.',
  )
  return { nodeId, inverseBindMatrix }
}

/** One pass over at most four influences per vertex, not one mesh scan per joint. */
export function sceneSkinJointUsage(skin: SceneSkinBinding) {
  const usage = new Map(skin.joints.map((joint) => [joint.nodeId, { positive: 0, zero: 0 }]))
  for (const influences of Object.values(skin.weights))
    for (const influence of influences) {
      const entry = usage.get(influence.jointId)!
      if (influence.weight > 0) entry.positive++
      else entry.zero++
    }
  return usage
}
