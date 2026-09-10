import type { SceneMeshGeometry } from '../scene/document'
import type { SceneGeometryBuffers } from '../scene/geometry'
import { affineInverse, composeTransform } from '../scene/matrix'
import { SCENE_SKIN_WEIGHT_TOLERANCE, type SceneSkinBinding } from '../scene/skin'
import { prepareSceneSkinDraw } from '../scene/skinDraw'
import { compileSceneSkinGeometry } from '../scene/skinPose'
import { requireScene } from '../scene/validation'
import type { GlbBinary } from './GlbBinary'
import type { SceneGlbIssue } from './sceneGlbReport'

/** One portable attribute set per binding, shared by all its material groups and mirrors. */
export function prepareSceneGlbSkin(
  skin: SceneSkinBinding,
  geometry: SceneMeshGeometry,
  built: SceneGeometryBuffers,
  binary: GlbBinary,
  issues: SceneGlbIssue[],
) {
  const prepared = compileSceneSkinGeometry(skin, geometry),
    draw = prepareSceneSkinDraw(prepared, geometry, built),
    matrices = new Float32Array(skin.joints.length * 16)
  let rounded = false,
    zeroSlots = false
  // Validate source sums, not rounded sums; never renormalize the authorial binding.
  for (let offset = 0; offset < prepared.weights.length; offset += 4) {
    let sum = 0
    for (let slot = offset; slot < offset + 4; slot++) {
      const weight = prepared.weights[slot]!
      requireScene(
        Number.isFinite(weight) && weight >= 0 && weight <= 1,
        'export.skin',
        'O vínculo contém um peso inválido.',
      )
      sum += weight
      rounded ||= weight !== Math.fround(weight)
    }
    requireScene(
      Math.abs(sum - 1) <= SCENE_SKIN_WEIGHT_TOLERANCE,
      'export.skin',
      'Os pesos de um ponto não somam 100%.',
    )
  }
  for (const [i, joint] of skin.joints.entries()) {
    const matrix = composeTransform({ kind: 'affine', matrix: joint.inverseBindMatrix })
    for (let component = 0; component < 16; component++) {
      const value = Math.fround(matrix[component]!)
      rounded ||= value !== matrix[component]
      matrix[component] = value
    }
    requireScene(
      matrix.every(Number.isFinite) && affineInverse(matrix),
      'export.skin',
      'A pose guardada de um osso não cabe na precisão do GLB. O vínculo original foi preservado.',
    )
    matrices.set(matrix, i * 16)
  }
  // glTF validators expect unused joint slots to address joint zero. This derived copy
  // keeps slot order and all positive influences, even the smallest representable one.
  for (let i = 0; i < draw.weights.length; i++)
    if (draw.weights[i] === 0 && draw.indices[i] !== 0) {
      zeroSlots = true
      draw.indices[i] = 0
    }
  if (rounded) issues.push({ code: 'skin-precision', sourceId: skin.id })
  if (zeroSlots) issues.push({ code: 'skin-zero-slots', sourceId: skin.id })
  issues.push({ code: 'skin-render-space', sourceId: skin.id })
  return {
    inverseBindMatrices: binary.floats(matrices, 'MAT4'),
    attributes: {
      JOINTS_0: binary.joints(draw.indices),
      WEIGHTS_0: binary.floats(draw.weights, 'VEC4', false, 34962),
    },
  }
}
