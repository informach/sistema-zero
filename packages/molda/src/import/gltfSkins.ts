import type { GltfAccessor } from './gltfAccessors'
import type { GltfGraph } from './gltfGraph'
import {
  GLTF_INPUT_LIMITS,
  GltfInputError,
  gltfInteger,
  gltfList,
  gltfRecord,
  requireGltf,
} from './gltfInput'
import type { GltfMeshViewUses } from './gltfMeshAttributes'
import { gltfName } from './gltfMetadata'
import { indexGltfSkinHierarchy, validateGltfSkinScenes } from './gltfSkinHierarchy'
import { readGltfSkinMatrices } from './gltfSkinMatrices'

export interface GltfSkin {
  name: string | null
  /** Ordered glTF node indices. Nodes may also carry meshes/cameras/attachments. */
  joints: number[]
  skeleton: number | null
  /** null means identity per joint, not an accessor filled with zero matrices. */
  inverseBindMatrices: number | null
}

/** Core skin metadata and dependencies, not weight validation or native binding conversion. */
export function readGltfSkins(
  input: unknown,
  graph: GltfGraph,
  accessors: readonly GltfAccessor[],
  meshUses: GltfMeshViewUses,
): GltfSkin[] {
  let jointCount = 0
  const rows = gltfList(input, 'skins', GLTF_INPUT_LIMITS.skins).map((value, i) => {
    const path = `skins[${i}]`,
      row = gltfRecord(value, path),
      joints = row.joints
    requireGltf(
      Array.isArray(joints) && joints.length > 0,
      `${path}.joints`,
      'O esqueleto precisa declarar juntas.',
    )
    jointCount += joints.length
    if (jointCount > GLTF_INPUT_LIMITS.skinJoints)
      throw new GltfInputError('budget', 'skins', 'Há referências de juntas demais neste arquivo.')
    return { row, joints, path }
  })
  if (!rows.length) {
    for (let i = 0; i < graph.nodes.length; i++)
      requireGltf(
        graph.nodes[i]!.skin === null,
        `nodes[${i}].skin`,
        'O vínculo de esqueleto não existe.',
      )
    return []
  }
  const hierarchy = indexGltfSkinHierarchy(graph),
    checkedMatrices = new Set<number>(),
    skinRoots: number[] = []
  const skins = rows.map(({ row, joints: source, path }): GltfSkin => {
    const seen = new Set<number>()
    const joints = Array.from(source, (value) => {
      const node = gltfInteger(value, `${path}.joints`, 0, graph.nodes.length - 1)
      requireGltf(
        !seen.has(node),
        `${path}.joints`,
        'Uma junta não pode aparecer duas vezes no mesmo esqueleto.',
      )
      seen.add(node)
      return node
    })
    const root = hierarchy.roots[joints[0]!]!,
      skeleton =
        row.skeleton === undefined
          ? null
          : gltfInteger(row.skeleton, `${path}.skeleton`, 0, graph.nodes.length - 1)
    for (const joint of joints) {
      requireGltf(
        hierarchy.roots[joint] === root,
        `${path}.joints`,
        'As juntas precisam de uma raiz comum.',
      )
      if (skeleton !== null)
        requireGltf(
          hierarchy.contains(skeleton, joint),
          `${path}.skeleton`,
          'O skeleton precisa ser ancestral de todas as juntas.',
        )
    }
    skinRoots.push(root)
    return {
      name: gltfName(row.name, `${path}.name`),
      joints,
      skeleton,
      inverseBindMatrices: readGltfSkinMatrices(
        row.inverseBindMatrices,
        joints.length,
        accessors,
        meshUses,
        checkedMatrices,
        `${path}.inverseBindMatrices`,
      ),
    }
  })
  validateGltfSkinScenes(graph, skinRoots, hierarchy.roots)
  return skins
}
