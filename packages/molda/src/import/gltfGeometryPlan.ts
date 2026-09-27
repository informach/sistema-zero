import { SCENE_LIMITS } from '../scene/limits'
import { id } from '../scene/validation'
import type { GltfAccessor } from './gltfAccessors'
import { GLTF_INPUT_LIMITS, GltfInputError, gltfInteger, requireGltf } from './gltfInput'
import type { GltfMesh, GltfMeshPrimitive } from './gltfMeshes'

export interface GltfGeometryRequest {
  meshIndex: number
  geometryId: string
  /** Node weights override mesh defaults. One request per distinct shape variant. */
  weights?: readonly number[]
}

export interface GltfGeometryMaterials {
  /** Only selected source indices need a mapping; never allocate by the largest source index. */
  ids: ReadonlyMap<number, string>
  defaultId: string
  /** Explicit texture requirements. Absent chooses UV0, or zero UV if none exists. */
  uvSetByMaterial?: ReadonlyMap<number | null, number>
}

export interface GltfGeometryPrimitivePlan {
  source: GltfMeshPrimitive
  path: string
  position: GltfAccessor | null
  uvName: string
  materialId: string
}
export interface GltfGeometryPlan {
  meshIndex: number
  geometryId: string
  path: string
  weights: number[]
  primitives: GltfGeometryPrimitivePlan[]
  /** Native stored topology, including faces that may not draw; repeated indices are omitted. */
  cost: { vertices: number; triangles: number; looseEdges: number }
}

/** The mesh/accessor inputs have already passed their readers; requests are a new boundary. */
export function planGltfGeometries(
  meshes: readonly GltfMesh[],
  accessors: readonly GltfAccessor[],
  requests: readonly GltfGeometryRequest[],
  materials: GltfGeometryMaterials,
): GltfGeometryPlan[] {
  if (requests.length > SCENE_LIMITS.geometries || materials.ids.size > SCENE_LIMITS.materials)
    throw new GltfInputError('budget', 'geometries', 'Há formas ou materiais demais para editar.')
  id(materials.defaultId, 'materials.defaultId')
  materials.ids.forEach((value, i) => {
    gltfInteger(i, 'materials.ids')
    id(value, `materials.ids[${i}]`)
  })
  for (const [material, uv] of materials.uvSetByMaterial ?? []) {
    if (material !== null) {
      gltfInteger(material, 'materials.uvSetByMaterial')
      requireGltf(
        materials.ids.has(material),
        'materials.uvSetByMaterial',
        'O conjunto UV precisa referenciar um material convertido.',
      )
    }
    gltfInteger(uv, 'materials.uvSetByMaterial')
  }
  const geometryIds = new Set<string>()
  const topologyCosts = new Map<number, number>()
  let primitives = 0,
    topologyIndices = 0
  // Count all requested variants before walking their primitives or reading numeric values.
  for (const [i, request] of requests.entries()) {
    const path = `geometries[${i}]`
    gltfInteger(request.meshIndex, `${path}.meshIndex`, 0, meshes.length - 1)
    id(request.geometryId, `${path}.geometryId`)
    requireGltf(
      !geometryIds.has(request.geometryId),
      path,
      'O identificador da forma está repetido.',
    )
    geometryIds.add(request.geometryId)
    primitives += meshes[request.meshIndex]!.primitives.length
    if (primitives > GLTF_INPUT_LIMITS.primitives)
      throw new GltfInputError('budget', path, 'Há primitives demais nas variantes solicitadas.')
    let cost = topologyCosts.get(request.meshIndex)
    if (cost === undefined) {
      cost = 0
      for (const primitive of meshes[request.meshIndex]!.primitives)
        cost += primitive.topology.indices.length
      topologyCosts.set(request.meshIndex, cost)
    }
    topologyIndices += cost
    if (topologyIndices > GLTF_INPUT_LIMITS.topologyIndices)
      throw new GltfInputError(
        'budget',
        path,
        'A topologia das variantes ultrapassa o limite de conversão.',
      )
  }
  let vertices = 0,
    triangles = 0,
    edges = 0
  return requests.map((request) => {
    const before = { vertices, triangles, edges }
    const mesh = meshes[request.meshIndex]!,
      path = `meshes[${request.meshIndex}]`
    const weights = request.weights === undefined ? mesh.weights : request.weights
    requireGltf(
      Array.isArray(weights) && weights.length === mesh.weights.length,
      `${path}.weights`,
      'Os pesos da variante precisam ser finitos e corresponder aos morph targets.',
    )
    // Array.every skips holes; for-of deliberately validates every slot, including absent ones.
    for (const weight of weights)
      requireGltf(
        Number.isFinite(weight),
        `${path}.weights`,
        'Cada morph target precisa de um peso finito.',
      )
    const plans = mesh.primitives.map((source, p): GltfGeometryPrimitivePlan => {
      const field = `${path}.primitives[${p}]`
      const positionIndex = source.attributes.get('POSITION')
      const position = positionIndex === undefined ? null : accessors[positionIndex]!
      const materialId =
        source.material === null ? materials.defaultId : materials.ids.get(source.material)
      requireGltf(
        materialId !== undefined,
        `${field}.material`,
        'O material desta primitive está ausente.',
      )
      const uvSet = materials.uvSetByMaterial?.get(source.material)
      const uvName = `TEXCOORD_${uvSet ?? 0}`
      requireGltf(
        uvSet === undefined || source.attributes.has(uvName),
        `${field}.attributes.${uvName}`,
        'Faltam as coordenadas UV exigidas pelo material.',
      )
      if (position) {
        vertices += position.count
        const { kind, indices } = source.topology
        if (kind === 'lines') {
          for (let i = 0; i < indices.length; i += 2) if (indices[i] !== indices[i + 1]) edges++
        } else if (kind === 'triangles') {
          for (let i = 0; i < indices.length; i += 3)
            if (
              indices[i] !== indices[i + 1] &&
              indices[i] !== indices[i + 2] &&
              indices[i + 1] !== indices[i + 2]
            )
              triangles++
        }
        if (
          vertices > SCENE_LIMITS.vertices ||
          triangles > SCENE_LIMITS.triangles ||
          edges > SCENE_LIMITS.looseEdges
        )
          throw new GltfInputError(
            'budget',
            field,
            'A geometria editável ultrapassa o limite do Molda.',
          )
      }
      return { source, path: field, position, uvName, materialId }
    })
    return {
      meshIndex: request.meshIndex,
      geometryId: request.geometryId,
      path,
      weights: Array.from(weights),
      primitives: plans,
      cost: {
        vertices: vertices - before.vertices,
        triangles: triangles - before.triangles,
        looseEdges: edges - before.edges,
      },
    }
  })
}
