import { SCENE_LIMITS } from '../scene/limits'
import {
  GLTF_INPUT_LIMITS,
  GltfInputError,
  gltfInteger,
  gltfList,
  gltfRecord,
  requireGltf,
} from './gltfInput'
import type { GltfMesh } from './gltfMeshes'
import { gltfName } from './gltfMetadata'
import { type GltfNode, readGltfNodes } from './gltfNodes'

export interface GltfScene {
  name: string | null
  roots: number[]
}
export interface GltfGraph {
  nodes: GltfNode[]
  roots: number[]
  order: number[]
  scenes: GltfScene[]
  defaultScene: number | null
}

/** Pure graph/reference reader, not native materialization or skin/animation validation. */
export function readGltfGraph(
  input: unknown,
  meshes: readonly GltfMesh[],
  resources: { skins: number; cameras: number } = { skins: 0, cameras: 0 },
): GltfGraph {
  const row = gltfRecord(input, 'glTF')
  const graph = readGltfNodes(row.nodes, meshes, resources)
  let rootReferences = 0
  const scenes = gltfList(row.scenes, 'scenes', GLTF_INPUT_LIMITS.scenes).map((value, i) => {
    const path = `scenes[${i}]`,
      scene = gltfRecord(value, path)
    const list = gltfList(scene.nodes, `${path}.nodes`, GLTF_INPUT_LIMITS.nodes)
    rootReferences += list.length
    if (rootReferences > GLTF_INPUT_LIMITS.sceneRoots)
      throw new GltfInputError('budget', 'scenes', 'Há referências de cena demais neste arquivo.')
    const seen = new Set<number>()
    const roots = list.map((value) => {
      const node = gltfInteger(value, `${path}.nodes`, 0, graph.nodes.length - 1)
      requireGltf(
        graph.nodes[node]!.parent === null && !seen.has(node),
        `${path}.nodes`,
        'A cena precisa de raízes únicas, sem nós que já tenham pai.',
      )
      seen.add(node)
      return node
    })
    return { name: gltfName(scene.name, `${path}.name`), roots }
  })
  const defaultScene =
    row.scene === undefined ? null : gltfInteger(row.scene, 'scene', 0, scenes.length - 1)
  return { ...graph, scenes, defaultScene }
}

/** Explicit selection. null means a scene-less library, never "merge all scenes". */
export function selectGltfScene(graph: GltfGraph, sceneIndex: number | null): number[] {
  let roots: readonly number[]
  if (sceneIndex === null) {
    requireGltf(graph.scenes.length === 0, 'scene', 'Escolha uma das cenas deste arquivo.')
    roots = graph.roots
  } else {
    gltfInteger(sceneIndex, 'scene', 0, graph.scenes.length - 1)
    roots = graph.scenes[sceneIndex]!.roots
  }
  const selected: number[] = []
  const append = (node: number) => {
    if (selected.length === SCENE_LIMITS.nodes)
      throw new GltfInputError('budget', 'scene', 'Esta cena tem nós demais para editar no Molda.')
    selected.push(node)
  }
  for (const root of roots) append(root)
  for (let cursor = 0; cursor < selected.length; cursor++)
    for (const child of graph.nodes[selected[cursor]!]!.children) append(child)
  return selected
}
