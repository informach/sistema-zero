import { Euler, Quaternion } from 'three'
import type { Vec3 } from '../../../core/model'
import { animationTrs } from '../../../scene/animationTrs'
import { transformSceneNodes } from '../../../scene/commands'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  quaternionFromEulerXYZ,
} from '../../../scene/matrix'
import { requireScene } from '../../../scene/validation'
import { SceneVectorForm } from './SceneVectorForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** Exact world values, never relabel the relative deltas used by click-step controls. */
export function SceneTransformCoordinates({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { primary, index, tool, run, document } = workshop
  if (!primary || (tool !== 'move' && tool !== 'rotate' && tool !== 'scale')) return null
  const matrix = [...index.scene.worldMatrices.get(primary.id)!] as AffineMatrix
  let pose: ReturnType<typeof animationTrs>
  try {
    pose = animationTrs(matrix, {
      space: 'local',
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    })
  } catch {
    return (
      <p className="text-sm text-mld-muted">
        Esta peça usa eixos especiais. Os passos continuam disponíveis; seus eixos serão
        preservados.
      </p>
    )
  }
  const angles = new Euler().setFromQuaternion(new Quaternion(...pose.rotation), 'XYZ')
  const values: Vec3 =
    tool === 'move'
      ? pose.translation
      : tool === 'scale'
        ? pose.scale
        : [(angles.x * 180) / Math.PI, (angles.y * 180) / Math.PI, (angles.z * 180) / Math.PI]
  return (
    <SceneVectorForm
      key={primary.id + document.updatedAt + tool + values.join(',')}
      label={
        tool === 'move'
          ? 'Posição atual'
          : tool === 'rotate'
            ? 'Giro atual (graus)'
            : 'Escala atual'
      }
      hint="Referência: mundo. Estes são os valores atuais da peça."
      values={values}
      min={tool === 'scale' ? Number.MIN_VALUE : undefined}
      onApply={(value) =>
        run((source) => {
          const inverse = affineInverse(matrix)
          requireScene(inverse, 'transform', 'Os eixos desta peça não permitem esse ajuste.')
          const next = {
            ...pose,
            ...(tool === 'move'
              ? { translation: value }
              : tool === 'rotate'
                ? { rotation: quaternionFromEulerXYZ(value) }
                : { scale: value }),
          }
          return transformSceneNodes(
            source,
            [primary.id],
            affineMultiply(composeTransform({ kind: 'trs', ...next }), inverse),
          )
        })
      }
    />
  )
}
