import { Euler, Quaternion } from 'three'
import type { Vec3 } from '../../../core/model'
import { transformSceneNodes } from '../../../scene/commands'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  quaternionFromEulerXYZ,
} from '../../../scene/matrix'
import { SCENE_COORDINATE_STEP } from '../../../scene/measurementStep'
import { sceneLocalBounds } from '../../../scene/pivot'
import { sceneTransformTrs } from '../../../scene/transformTrs'
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
  let pose: ReturnType<typeof sceneTransformTrs>
  try {
    pose = sceneTransformTrs({ kind: 'affine', matrix })
  } catch {
    return (
      <p className="text-sm text-mld-muted">
        Esta peça usa eixos especiais. Os passos continuam disponíveis; seus eixos serão
        preservados.
      </p>
    )
  }
  const angles = new Euler().setFromQuaternion(new Quaternion(...pose.rotation), 'XYZ')
  const localSize = sceneLocalBounds(document, primary.id)?.size ?? [0, 0, 0]
  const values: Vec3 =
    tool === 'move'
      ? pose.translation
      : tool === 'scale'
        ? (localSize.map((size, axis) => size * Math.abs(pose.scale[axis]!)) as Vec3)
        : [(angles.x * 180) / Math.PI, (angles.y * 180) / Math.PI, (angles.z * 180) / Math.PI]
  return (
    <SceneVectorForm
      key={primary.id + document.updatedAt + tool + values.join(',')}
      label={
        tool === 'move'
          ? 'Posição atual'
          : tool === 'rotate'
            ? 'Giro atual (graus)'
            : 'Tamanho atual'
      }
      hint="Referência: mundo. Estes são os valores atuais da peça."
      values={values}
      min={tool === 'scale' ? SCENE_COORDINATE_STEP : undefined}
      step={tool === 'move' || tool === 'scale' ? SCENE_COORDINATE_STEP : undefined}
      twoDecimals={tool === 'move' || tool === 'scale'}
      disabled={tool === 'scale' && localSize.some((size) => size <= 0)}
      onApply={(value) => {
        if (value.every((component, axis) => component === values[axis])) return
        run((source) => {
          const inverse = affineInverse(matrix)
          requireScene(inverse, 'transform', 'Os eixos desta peça não permitem esse ajuste.')
          const next = {
            ...pose,
            ...(tool === 'move'
              ? { translation: value }
              : tool === 'rotate'
                ? { rotation: quaternionFromEulerXYZ(value) }
                : {
                    scale: value.map(
                      (size, axis) => (Math.sign(pose.scale[axis]!) * size) / localSize[axis]!,
                    ) as Vec3,
                  }),
          }
          return transformSceneNodes(
            source,
            [primary.id],
            affineMultiply(composeTransform({ kind: 'trs', ...next }), inverse),
          )
        })
      }}
    />
  )
}
