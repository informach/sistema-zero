import type { SceneTransform } from '../scene/matrix'
import { GLTF_INPUT_LIMITS, gltfInteger, gltfList, gltfRecord, requireGltf } from './gltfInput'
import type { GltfMesh } from './gltfMeshes'
import { gltfName, gltfNumbers } from './gltfMetadata'
import { readGltfNodeTransform } from './gltfNodeTransform'

export interface GltfNode {
  name: string | null
  parent: number | null
  children: number[]
  transform: SceneTransform
  mesh: number | null
  skin: number | null
  camera: number | null
  /** null inherits the mesh defaults; an explicit override is owned by this node. */
  weights: number[] | null
}

export function readGltfNodes(
  input: unknown,
  meshes: readonly GltfMesh[],
  resources: { skins: number; cameras: number },
): { nodes: GltfNode[]; roots: number[]; order: number[] } {
  gltfInteger(resources.skins, 'skins.length')
  gltfInteger(resources.cameras, 'cameras.length')
  const rows = gltfList(input, 'nodes', GLTF_INPUT_LIMITS.nodes).map((row, i) =>
    gltfRecord(row, `nodes[${i}]`),
  )
  const parents = new Int32Array(rows.length).fill(-1)
  const children = rows.map((row, i) =>
    gltfList(row.children, `nodes[${i}].children`, rows.length).map((value) => {
      const child = gltfInteger(value, `nodes[${i}].children`, 0, rows.length - 1)
      requireGltf(
        child !== i && parents[child] === -1,
        `nodes[${i}].children`,
        'Um nó não pode repetir filhos, ter dois pais ou ser seu próprio filho.',
      )
      parents[child] = i
      return child
    }),
  )
  const roots: number[] = []
  for (let i = 0; i < rows.length; i++) if (parents[i] === -1) roots.push(i)
  const order = [...roots]
  for (let cursor = 0; cursor < order.length; cursor++)
    for (const child of children[order[cursor]!]!) order.push(child)
  requireGltf(order.length === rows.length, 'nodes', 'A hierarquia contém um ciclo.')
  const skinMeshes = new Set<number>()
  const nodes = rows.map((row, i): GltfNode => {
    const path = `nodes[${i}]`
    const mesh =
      row.mesh === undefined ? null : gltfInteger(row.mesh, `${path}.mesh`, 0, meshes.length - 1)
    const skin =
      row.skin === undefined ? null : gltfInteger(row.skin, `${path}.skin`, 0, resources.skins - 1)
    const camera =
      row.camera === undefined
        ? null
        : gltfInteger(row.camera, `${path}.camera`, 0, resources.cameras - 1)
    requireGltf(
      (skin === null && row.weights === undefined) || mesh !== null,
      path,
      'Skin e pesos precisam de uma malha no mesmo nó.',
    )
    if (skin !== null && mesh !== null && !skinMeshes.has(mesh)) {
      requireGltf(
        meshes[mesh]!.primitives.every(
          (primitive) =>
            primitive.attributes.has('JOINTS_0') && primitive.attributes.has('WEIGHTS_0'),
        ),
        `${path}.mesh`,
        'Todas as primitives de uma malha com skin precisam de juntas e pesos.',
      )
      skinMeshes.add(mesh)
    }
    return {
      name: gltfName(row.name, `${path}.name`),
      parent: parents[i] === -1 ? null : parents[i]!,
      children: children[i]!,
      transform: readGltfNodeTransform(row, path),
      mesh,
      skin,
      camera,
      weights:
        row.weights === undefined
          ? null
          : gltfNumbers(row.weights, meshes[mesh!]!.weights.length, `${path}.weights`),
    }
  })
  return { nodes, roots, order }
}
