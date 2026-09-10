import type { MoldaSceneDocument, SceneMeshGeometry } from './document'
import { type AffineMatrix, affineInverse, affineMultiply, composeTransform } from './matrix'
import type { SceneSkinBinding } from './skin'
import { readSceneSkinBindings } from './skinBinding'
import * as v from './validation'

/** Derived per revision, owned arrays only. No document/images/Three objects retained. */
export interface PreparedSceneSkin {
  readonly nodeId: string
  readonly joints: ReadonlyArray<{
    readonly nodeId: string
    readonly inverseBindMatrix: Readonly<AffineMatrix>
  }>
  readonly vertexIds: readonly string[]
  readonly positions: Float64Array
  readonly jointIndices: Uint16Array
  readonly weights: Float64Array
}

export function prepareSceneSkin(
  document: MoldaSceneDocument,
  input: SceneSkinBinding,
): PreparedSceneSkin {
  const binding = readSceneSkinBindings([input], document)[0]!,
    node = document.nodes.find((node) => node.id === binding.nodeId),
    geometry =
      node?.kind === 'mesh'
        ? document.geometries.find((geometry) => geometry.id === node.geometryId)
        : null
  v.requireScene(geometry?.kind === 'mesh', 'skin', 'A malha do vínculo não está mais disponível.')
  return compileSceneSkinGeometry(binding, geometry)
}

/** Already-indexed authorial data. Compile each binding once, not the whole document per skin. */
export function compileSceneSkinGeometry(
  binding: SceneSkinBinding,
  geometry: SceneMeshGeometry,
): PreparedSceneSkin {
  const vertexIds = Object.keys(geometry.vertices),
    positions = new Float64Array(vertexIds.length * 3),
    jointIndices = new Uint16Array(vertexIds.length * 4),
    weights = new Float64Array(vertexIds.length * 4),
    jointIndex = new Map(binding.joints.map((joint, i) => [joint.nodeId, i]))
  for (const [vertex, vertexId] of vertexIds.entries()) {
    positions.set(geometry.vertices[vertexId]!, vertex * 3)
    for (const [slot, influence] of binding.weights[vertexId]!.entries()) {
      jointIndices[vertex * 4 + slot] = jointIndex.get(influence.jointId)!
      weights[vertex * 4 + slot] = influence.weight
    }
  }
  return {
    nodeId: binding.nodeId,
    joints: binding.joints.map((joint) => ({
      ...joint,
      inverseBindMatrix: [...joint.inverseBindMatrix] as AffineMatrix,
    })),
    vertexIds,
    positions,
    jointIndices,
    weights,
  }
}

/** One palette per pose, not one matrix per vertex/corner. Mesh-local output.
 * inverse(mesh world now) × joint world now × inverse-bind.
 */
export function sceneSkinPalette(
  prepared: PreparedSceneSkin,
  worldMatrices: ReadonlyMap<string, Readonly<AffineMatrix>>,
): Float64Array {
  const readWorld = (nodeId: string) => {
    const matrix = worldMatrices.get(nodeId)
    v.requireScene(matrix, 'pose', 'A pose não contém todas as peças e ossos do vínculo.')
    return composeTransform({ kind: 'affine', matrix: [...matrix] as AffineMatrix })
  }
  const inverseMesh = affineInverse(readWorld(prepared.nodeId))
  v.requireScene(
    inverseMesh,
    'pose',
    'A escala desta pose não permite calcular a deformação com segurança.',
  )
  const palette = new Float64Array(prepared.joints.length * 16)
  for (const [i, joint] of prepared.joints.entries()) {
    const worldSkin = affineMultiply(readWorld(joint.nodeId), joint.inverseBindMatrix)
    palette.set(affineMultiply(inverseMesh, worldSkin), i * 16)
  }
  return palette
}

/** CPU reference/bake path. Viewports can upload the joint palette without baking geometry per frame. */
export function deformSceneSkin(
  prepared: PreparedSceneSkin,
  worldMatrices: ReadonlyMap<string, Readonly<AffineMatrix>>,
): Float64Array {
  const palette = sceneSkinPalette(prepared, worldMatrices),
    output = new Float64Array(prepared.positions.length)
  for (let vertex = 0; vertex < prepared.vertexIds.length; vertex++) {
    const positionOffset = vertex * 3,
      x = prepared.positions[positionOffset]!,
      y = prepared.positions[positionOffset + 1]!,
      z = prepared.positions[positionOffset + 2]!
    let px = 0,
      py = 0,
      pz = 0
    for (let slot = vertex * 4; slot < vertex * 4 + 4; slot++) {
      const weight = prepared.weights[slot]!
      if (weight === 0) continue
      const i = prepared.jointIndices[slot]! * 16
      px +=
        weight * (palette[i]! * x + palette[i + 4]! * y + palette[i + 8]! * z + palette[i + 12]!)
      py +=
        weight *
        (palette[i + 1]! * x + palette[i + 5]! * y + palette[i + 9]! * z + palette[i + 13]!)
      pz +=
        weight *
        (palette[i + 2]! * x + palette[i + 6]! * y + palette[i + 10]! * z + palette[i + 14]!)
    }
    v.requireScene(
      Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz),
      'pose',
      'A deformação excedeu o limite numérico.',
    )
    output[positionOffset] = px
    output[positionOffset + 1] = py
    output[positionOffset + 2] = pz
  }
  return output
}
