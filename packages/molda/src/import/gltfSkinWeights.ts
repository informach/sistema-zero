import type { GltfAccessor } from './gltfAccessors'
import type { GltfGraph } from './gltfGraph'
import { requireGltf } from './gltfInput'
import type { GltfMesh } from './gltfMeshes'
import type { GltfSkin } from './gltfSkins'
import { type GltfInfluenceSet, planGltfSkinWeights } from './gltfSkinWeightPlan'
import { type GltfSkinWeightStats, readGltfSkinWeightValues } from './gltfSkinWeightValues'

export interface GltfSkinWeightLayout extends GltfSkinWeightStats {
  sets: GltfInfluenceSet[]
  vertices: number
}
export interface GltfSkinWeights {
  /** glTF mesh index -> layout index for each primitive, in primitive order. */
  meshes: Map<number, number[]>
  /** Owned metadata only, never raw values. Shared layouts are read-only by contract. */
  layouts: GltfSkinWeightLayout[]
}

/**
 * Read after graph/meshes/accessors/skins validation. Only instantiated skinned
 * meshes are checked. No pruning/normalization or native binding allocation.
 * Float32 sum diagnostics require review, not a promise of valid native weights.
 */
export function readGltfSkinWeights(
  graph: GltfGraph,
  meshes: readonly GltfMesh[],
  skins: readonly GltfSkin[],
  accessors: readonly GltfAccessor[],
): GltfSkinWeights {
  const plan = planGltfSkinWeights(graph, meshes, skins, accessors)
  const layouts = plan.layouts.map((layout) => ({
    sets: layout.sets,
    vertices: layout.vertices,
    ...readGltfSkinWeightValues(layout, accessors),
  }))
  const result = new Map<number, number[]>()
  for (const bound of plan.bound) {
    for (const [primitive, index] of bound.layouts.entries()) {
      const layout = layouts[index]!
      requireGltf(
        layout.maximumJoint < bound.joints,
        `meshes[${bound.mesh}].primitives[${primitive}].attributes.JOINTS_${layout.maximumJointSet}`,
        `A junta está fora do esqueleto usado pelo nó ${bound.node}.`,
      )
    }
    result.set(bound.mesh, bound.layouts)
  }
  return { meshes: result, layouts }
}
