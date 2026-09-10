import type { MoldaSceneDocument, SceneMeshGeometry } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
} from '../scene/matrix'
import { meshComponentVertices, type SceneComponentSelection } from '../scene/meshComponents'
import { meshMovementWeights, moveMeshWithWeights } from '../scene/meshSoftMovement'
import { transformMeshVertices } from '../scene/meshVertices'
import { number, requireScene } from '../scene/validation'
import type { EditorStore } from './editorStore'
import { createSceneMeshGesture } from './sceneMeshGesture'

/** Convert world-space handle deltas into the captured mesh-local space, retaining shear. */
export function createSceneComponentTransformGesture(
  editor: EditorStore<MoldaSceneDocument>,
  onError: (error: unknown) => void,
) {
  const gesture = createSceneMeshGesture(editor, onError)
  let space: {
    world: Readonly<AffineMatrix>
    inverse: AffineMatrix
    vertices: readonly string[]
    weights: ReadonlyMap<string, number> | null
  } | null = null
  function cancel() {
    space = null
    gesture.cancel()
  }
  return {
    begin(selection: SceneComponentSelection, expected: SceneMeshGeometry, softRadius = 0) {
      cancel()
      try {
        number(softRadius, 'radius', 0)
        const { nodeId } = selection
        const index = indexSceneDocument(editor.getState().asset)
        const world = index.scene.worldMatrices.get(nodeId)
        const inverse = world && affineInverse(world)
        requireScene(
          world && inverse,
          'transform',
          'A peça está achatada demais para mover seus pontos. Ajuste a escala primeiro.',
        )
        const vertices = meshComponentVertices(expected, selection)
        if (!vertices.length || !gesture.begin(nodeId, expected)) return false
        const weights = softRadius
          ? meshMovementWeights(expected, vertices, world, softRadius)
          : null
        space = { world, inverse, vertices, weights }
        return true
      } catch (error) {
        gesture.cancel()
        onError(error)
        return false
      }
    },
    preview(delta: AffineMatrix) {
      const initial = space
      if (!initial) return false
      const accepted = gesture.preview((mesh) => {
        const worldDelta = composeTransform({ kind: 'affine', matrix: delta })
        const identity = identityMatrix()
        if (worldDelta.every((value, i) => value === identity[i])) return mesh
        if (initial.weights) {
          requireScene(
            worldDelta.every((value, i) => (i >= 12 && i <= 14) || value === identity[i]),
            'transform',
            'O movimento suave usa apenas Mover. Desligue essa opção para girar ou mudar o tamanho.',
          )
          const inverse = initial.inverse
          const [x, y, z] = worldDelta.slice(12, 15) as [number, number, number]
          return moveMeshWithWeights(mesh, initial.weights, [
            inverse[0] * x + inverse[4] * y + inverse[8] * z,
            inverse[1] * x + inverse[5] * y + inverse[9] * z,
            inverse[2] * x + inverse[6] * y + inverse[10] * z,
          ])
        }
        return transformMeshVertices(
          mesh,
          initial.vertices,
          affineMultiply(initial.inverse, affineMultiply(worldDelta, initial.world)),
        )
      })
      if (!accepted) space = null
      return accepted
    },
    end(commit: boolean) {
      space = null
      return gesture.end(commit)
    },
    cancel,
  }
}
