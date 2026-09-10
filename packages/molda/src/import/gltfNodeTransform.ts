import type { Vec3 } from '../core/model'
import type { AffineMatrix, Quaternion, SceneTransform } from '../scene/matrix'
import { requireGltf } from './gltfInput'
import { gltfNumbers } from './gltfMetadata'

// Numerical unit/orthogonality acceptance, compatible with the native quaternion reader.
// This does not change the original values or factor a singular matrix.
const UNIT_TOLERANCE = 1e-6

export function readGltfNodeTransform(row: Record<string, unknown>, path: string): SceneTransform {
  if (row.matrix !== undefined) {
    requireGltf(
      row.translation === undefined && row.rotation === undefined && row.scale === undefined,
      path,
      'A transformação não pode misturar matrix e TRS.',
    )
    const matrix = gltfNumbers(row.matrix, 16, `${path}.matrix`) as AffineMatrix
    requireGltf(
      matrix[3] === 0 && matrix[7] === 0 && matrix[11] === 0 && matrix[15] === 1,
      `${path}.matrix`,
      'A matriz precisa ser afim.',
    )
    const axes: Vec3[] = []
    for (let c = 0; c < 3; c++) {
      const x = matrix[c * 4]!,
        y = matrix[c * 4 + 1]!,
        z = matrix[c * 4 + 2]!
      const magnitude = Math.max(Math.abs(x), Math.abs(y), Math.abs(z))
      if (magnitude === 0) continue
      const scaled: Vec3 = [x / magnitude, y / magnitude, z / magnitude]
      const length = Math.hypot(...scaled)
      axes.push([scaled[0] / length, scaled[1] / length, scaled[2] / length])
    }
    // Nonzero columns must be orthogonal; zero columns are legal, including full collapse.
    for (let a = 0; a < axes.length; a++)
      for (let b = a + 1; b < axes.length; b++) {
        const u = axes[a]!,
          v = axes[b]!
        requireGltf(
          Math.abs(u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) <= UNIT_TOLERANCE,
          `${path}.matrix`,
          'A matriz local glTF não pode conter cisalhamento.',
        )
      }
    return { kind: 'affine', matrix }
  }
  const translation =
    row.translation === undefined
      ? ([0, 0, 0] as Vec3)
      : (gltfNumbers(row.translation, 3, `${path}.translation`) as Vec3)
  const scale =
    row.scale === undefined
      ? ([1, 1, 1] as Vec3)
      : (gltfNumbers(row.scale, 3, `${path}.scale`) as Vec3)
  const rotation =
    row.rotation === undefined
      ? ([0, 0, 0, 1] as Quaternion)
      : (gltfNumbers(row.rotation, 4, `${path}.rotation`) as Quaternion)
  requireGltf(
    rotation.every((value) => value >= -1 && value <= 1) &&
      Math.abs(Math.hypot(...rotation) - 1) <= UNIT_TOLERANCE,
    `${path}.rotation`,
    'A rotação precisa ser um quaternion unitário.',
  )
  return { kind: 'trs', translation, rotation, scale }
}
