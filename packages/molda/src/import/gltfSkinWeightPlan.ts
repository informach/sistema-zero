import type { GltfAccessor } from './gltfAccessors'
import type { GltfGraph } from './gltfGraph'
import { GLTF_INPUT_LIMITS, GltfInputError, requireGltf } from './gltfInput'
import type { GltfMesh } from './gltfMeshes'
import type { GltfSkin } from './gltfSkins'

export interface GltfInfluenceSet {
  joints: number
  weights: number
}
export interface GltfSkinWeightPlan {
  sets: GltfInfluenceSet[]
  vertices: number
  path: string
}

/** No accessor values are read until every unique combination fits the work budget. */
export function planGltfSkinWeights(
  graph: GltfGraph,
  meshes: readonly GltfMesh[],
  skins: readonly GltfSkin[],
  accessors: readonly GltfAccessor[],
) {
  const limits = new Map<number, { joints: number; node: number }>()
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i]!
    if (node.skin === null) continue
    const skin = skins[node.skin]
    requireGltf(
      skin !== undefined && node.mesh !== null,
      `nodes[${i}].skin`,
      'O vínculo precisa de malha e esqueleto válidos.',
    )
    const previous = limits.get(node.mesh)
    if (!previous || skin.joints.length < previous.joints)
      limits.set(node.mesh, { joints: skin.joints.length, node: i })
  }
  const layouts: GltfSkinWeightPlan[] = [],
    shared = new Map<string, number>(),
    bound: { mesh: number; node: number; joints: number; layouts: number[] }[] = []
  let slots = 0
  for (const [meshIndex, limit] of limits) {
    const mesh = meshes[meshIndex]
    requireGltf(mesh !== undefined, `nodes[${limit.node}].mesh`, 'A malha do vínculo não existe.')
    const indices = mesh.primitives.map((primitive, i) => {
      const path = `meshes[${meshIndex}].primitives[${i}].attributes`,
        sets: GltfInfluenceSet[] = []
      for (let set = 0; ; set++) {
        const joints = primitive.attributes.get(`JOINTS_${set}`)
        if (joints === undefined) break
        const weights = primitive.attributes.get(`WEIGHTS_${set}`)
        requireGltf(
          weights !== undefined,
          path,
          'Juntas e pesos precisam de conjuntos correspondentes.',
        )
        sets.push({ joints, weights })
      }
      requireGltf(sets.length > 0, path, 'A malha com esqueleto precisa de juntas e pesos.')
      const key = sets.map((set) => `${set.joints}:${set.weights}`).join(','),
        existing = shared.get(key)
      if (existing !== undefined) return existing
      const vertices = accessors[sets[0]!.joints]!.count
      slots += vertices * sets.length * 4
      if (slots > GLTF_INPUT_LIMITS.skinWeightSlots)
        throw new GltfInputError(
          'budget',
          path,
          'Os conjuntos de pesos ultrapassam o limite de processamento.',
        )
      const index = layouts.length
      layouts.push({ sets, vertices, path })
      shared.set(key, index)
      return index
    })
    bound.push({ mesh: meshIndex, ...limit, layouts: indices })
  }
  return { layouts, bound }
}
