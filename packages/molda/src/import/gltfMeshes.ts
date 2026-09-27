import type { GltfAccessor } from './gltfAccessors'
import {
  GLTF_INPUT_LIMITS,
  GltfInputError,
  gltfInteger,
  gltfList,
  gltfRecord,
  requireGltf,
} from './gltfInput'
import {
  type GltfMeshViewUses,
  gltfMeshAccessor,
  markGltfMeshUse,
  readGltfMeshAttributes,
} from './gltfMeshAttributes'
import { expandGltfTopology, type GltfTopology, gltfTopologyLength } from './gltfTopology'

export interface GltfMeshPrimitive {
  attributes: Map<string, number>
  indicesAccessor: number | null
  material: number | null
  mode: number
  targets: Array<Map<string, number>>
  topology: GltfTopology
}
export interface GltfMesh {
  name: string | null
  primitives: GltfMeshPrimitive[]
  weights: number[]
}
interface PrimitivePlan extends Omit<GltfMeshPrimitive, 'topology'> {
  count: number
  source: Float64Array | null
  length: number
}

/** Core mesh layout/topology, not a native conversion. Keep original JSON for extension/loss review. */
export function readGltfMeshes(
  input: unknown,
  accessors: readonly GltfAccessor[],
  materialCount = 0,
): { meshes: GltfMesh[]; viewUses: GltfMeshViewUses } {
  const viewUses: GltfMeshViewUses = new Map()
  const checks = { viewUses, tangents: new Set<number>() }
  let primitiveCount = 0,
    topologyIndices = 0
  const prepared = gltfList(input, 'meshes', GLTF_INPUT_LIMITS.meshes).map((value, meshIndex) => {
    const path = `meshes[${meshIndex}]`,
      row = gltfRecord(value, path)
    requireGltf(
      row.name === undefined || typeof row.name === 'string',
      `${path}.name`,
      'O nome da malha precisa ser texto.',
    )
    if (typeof row.name === 'string' && row.name.length > GLTF_INPUT_LIMITS.pathLength)
      throw new GltfInputError('budget', `${path}.name`, 'O nome da malha é longo demais.')
    requireGltf(
      row.primitives !== undefined,
      `${path}.primitives`,
      'A malha precisa declarar primitives.',
    )
    const list = gltfList(row.primitives, `${path}.primitives`, GLTF_INPUT_LIMITS.primitives)
    primitiveCount += list.length
    if (primitiveCount > GLTF_INPUT_LIMITS.primitives)
      throw new GltfInputError('budget', 'meshes', 'Há primitives demais neste arquivo.')
    const primitives: PrimitivePlan[] = list.map((value, i) => {
      const field = `${path}.primitives[${i}]`,
        primitive = gltfRecord(value, field)
      const attributes = readGltfMeshAttributes(
        primitive.attributes,
        accessors,
        checks,
        `${field}.attributes`,
      )
      const vertices = accessors[attributes.values().next().value!]!.count
      const mode = gltfInteger(
        primitive.mode === undefined ? 4 : primitive.mode,
        `${field}.mode`,
        0,
        6,
      )
      const material =
        primitive.material === undefined
          ? null
          : gltfInteger(primitive.material, `${field}.material`, 0, materialCount - 1)
      let indicesAccessor: number | null = null,
        source: Float64Array | null = null,
        count = vertices
      if (primitive.indices !== undefined) {
        indicesAccessor = gltfMeshAccessor(primitive.indices, accessors, `${field}.indices`)
        const accessor = accessors[indicesAccessor]!
        requireGltf(
          accessor.type === 'SCALAR' &&
            !accessor.normalized &&
            (accessor.componentType === 5121 ||
              accessor.componentType === 5123 ||
              accessor.componentType === 5125),
          `${field}.indices`,
          'Índices precisam ser escalares inteiros sem sinal.',
        )
        markGltfMeshUse(indicesAccessor, accessor, 'indices', viewUses, `${field}.indices`)
        const restart =
          accessor.componentType === 5121
            ? 255
            : accessor.componentType === 5123
              ? 65535
              : 4294967295
        for (const index of accessor.values)
          requireGltf(
            Number.isSafeInteger(index) && index >= 0 && index < vertices && index !== restart,
            `${field}.indices`,
            'Um índice não aponta para um vértice ou usa primitive restart.',
          )
        source = accessor.values
        count = accessor.count
      }
      const length = gltfTopologyLength(mode, count, field)
      topologyIndices += length
      if (topologyIndices > GLTF_INPUT_LIMITS.topologyIndices)
        throw new GltfInputError(
          'budget',
          'meshes',
          'A topologia expandida ultrapassa o limite de memória do Molda.',
        )
      const targets = gltfList(
        primitive.targets,
        `${field}.targets`,
        GLTF_INPUT_LIMITS.morphTargets,
      ).map((target, j) =>
        readGltfMeshAttributes(target, accessors, checks, `${field}.targets[${j}]`, attributes),
      )
      return { attributes, indicesAccessor, material, mode, targets, count, source, length }
    })
    const targetCount = primitives[0]!.targets.length
    requireGltf(
      primitives.every((primitive) => primitive.targets.length === targetCount),
      path,
      'As primitives da malha precisam ter a mesma quantidade de morph targets.',
    )
    let weights = Array<number>(targetCount).fill(0)
    if (row.weights !== undefined) {
      const values = gltfList(row.weights, `${path}.weights`, GLTF_INPUT_LIMITS.morphTargets)
      requireGltf(
        values.length === targetCount,
        `${path}.weights`,
        'Os pesos padrão precisam corresponder aos morph targets.',
      )
      weights = values.map((value) => {
        requireGltf(
          typeof value === 'number' && Number.isFinite(value),
          `${path}.weights`,
          'Os pesos padrão precisam ser finitos.',
        )
        return value
      })
    }
    return { name: row.name ?? null, primitives, weights }
  })
  const meshes = prepared.map((mesh) => ({
    ...mesh,
    primitives: mesh.primitives.map(({ count, source, length, ...primitive }) => ({
      ...primitive,
      topology: expandGltfTopology(primitive.mode, count, source, length),
    })),
  }))
  return { meshes, viewUses }
}
