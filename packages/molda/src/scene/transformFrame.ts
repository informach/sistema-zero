import { type AffineMatrix, affineInverse, affineMultiply, identityMatrix } from './matrix'

/**
 * Remove only the lengths of the selected node's local columns. Parent shear/scale stays
 * exact; conjugating by this basis rotates before the node's scale, and scales on its axes.
 * This is a coordinate frame, never a replacement/decomposition of the saved transform.
 */
export function sceneTransformFrame(
  world: Readonly<AffineMatrix>,
  parent?: Readonly<AffineMatrix>,
): AffineMatrix {
  const parentInverse = parent ? affineInverse(parent) : identityMatrix()
  if (!parentInverse) return [...world]
  const local = affineMultiply(parentInverse, world),
    frame = [...world] as AffineMatrix
  for (let axis = 0; axis < 3; axis++) {
    const size = Math.hypot(local[axis * 4]!, local[axis * 4 + 1]!, local[axis * 4 + 2]!)
    if (size > 0)
      for (let row = 0; row < 3; row++) frame[axis * 4 + row] = world[axis * 4 + row]! / size
  }
  return frame
}
