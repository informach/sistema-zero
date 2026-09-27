import type { Vec3 } from '../core/model'
import type { SceneAnimationLocalPose } from './animationPose'
import { type AffineMatrix, composeTransform, type Quaternion } from './matrix'
import { rotationQuaternion } from './rotationQuaternion'
import { requireScene } from './validation'

/** Decompose only a derived gesture result, preserving existing scale signs. Never repair shear. */
export function animationTrs(
  matrix: AffineMatrix,
  reference: SceneAnimationLocalPose,
): SceneAnimationLocalPose {
  composeTransform({ kind: 'affine', matrix })
  composeTransform({ kind: 'trs', ...reference })
  const scale = [0, 1, 2].map(
    (i) =>
      Math.hypot(matrix[i * 4]!, matrix[i * 4 + 1]!, matrix[i * 4 + 2]!) *
      Math.sign(reference.scale[i]!),
  ) as Vec3
  requireScene(
    scale.every((value) => Number.isFinite(value) && value !== 0),
    'scale',
    'Para girar ou mudar o tamanho com as alças, a pose precisa ter tamanho diferente de zero. Você ainda pode usar os campos.',
  )
  const r = [0, 1, 2].map(
    (i): Vec3 => [
      matrix[i * 4]! / scale[i]!,
      matrix[i * 4 + 1]! / scale[i]!,
      matrix[i * 4 + 2]! / scale[i]!,
    ],
  )
  const tolerance = 256 * Number.EPSILON
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 3; b++)
      requireScene(
        Math.abs(r[a]!.reduce((dot, value, i) => dot + value * r[b]![i]!, 0)) <= tolerance,
        'rotation',
        'Esse ajuste inclinaria os eixos da peça. Use os campos locais ou mude o tamanho pelos três eixos juntos.',
      )
  const [m11, m21, m31] = r[0]!,
    [m12, m22, m32] = r[1]!,
    [m13, m23, m33] = r[2]!
  const determinant =
    m11! * (m22! * m33! - m23! * m32!) -
    m12! * (m21! * m33! - m23! * m31!) +
    m13! * (m21! * m32! - m22! * m31!)
  requireScene(
    Math.abs(determinant - 1) <= tolerance,
    'scale',
    'Para virar o lado da pose, use Colar pose espelhada ou os campos de tamanho.',
  )
  let rotation = rotationQuaternion(r[0]!, r[1]!, r[2]!)
  const direction =
    rotation.reduce((dot, value, i) => dot + value * reference.rotation[i]!, 0) < 0 ? -1 : 1
  rotation = rotation.map((value) => value * direction) as Quaternion
  const pose: SceneAnimationLocalPose = {
    space: reference.space,
    translation: [matrix[12], matrix[13], matrix[14]],
    rotation,
    scale,
  }
  const rebuilt = composeTransform({ kind: 'trs', ...pose })
  // A per-column scale prevents a huge translation/axis from hiding shear in a small axis.
  for (let column = 0; column < 3; column++) {
    const magnitude = Math.abs(scale[column]!)
    for (let row = 0; row < 3; row++)
      requireScene(
        Math.abs((rebuilt[column * 4 + row]! - matrix[column * 4 + row]!) / magnitude) <= tolerance,
        'pose',
        'Esse ajuste não cabe numa pose sem inclinar seus eixos.',
      )
  }
  return pose
}
