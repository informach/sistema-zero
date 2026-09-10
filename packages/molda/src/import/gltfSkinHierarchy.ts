import type { GltfGraph } from './gltfGraph'
import { requireGltf } from './gltfInput'

/** The input forest was validated by readGltfGraph. No recursion or per-joint parent walk. */
export function indexGltfSkinHierarchy(graph: GltfGraph) {
  const roots = new Uint32Array(graph.nodes.length),
    start = new Uint32Array(graph.nodes.length),
    size = new Uint32Array(graph.nodes.length).fill(1)
  const pending = [...graph.roots].reverse()
  let cursor = 0
  while (pending.length) {
    const nodeIndex = pending.pop()!,
      node = graph.nodes[nodeIndex]!
    start[nodeIndex] = cursor++
    roots[nodeIndex] = node.parent === null ? nodeIndex : roots[node.parent]!
    for (let i = node.children.length - 1; i >= 0; i--) pending.push(node.children[i]!)
  }
  for (let i = graph.order.length - 1; i >= 0; i--) {
    const index = graph.order[i]!,
      parent = graph.nodes[index]!.parent
    if (parent !== null) size[parent] = size[parent]! + size[index]!
  }
  return {
    roots,
    contains: (ancestor: number, node: number) =>
      start[node]! >= start[ancestor]! && start[node]! < start[ancestor]! + size[ancestor]!,
  }
}

/** Scene roots are global forest roots, so membership can be checked without cloning subtrees. */
export function validateGltfSkinScenes(
  graph: GltfGraph,
  skinRoots: readonly number[],
  roots: Uint32Array,
): void {
  const membership = new Map<number, Set<number>>()
  for (let i = 0; i < graph.scenes.length; i++)
    for (const root of graph.scenes[i]!.roots) {
      const scenes = membership.get(root)
      if (scenes) scenes.add(i)
      else membership.set(root, new Set([i]))
    }
  const checked = new Set<string>()
  for (let i = 0; i < graph.nodes.length; i++) {
    const skin = graph.nodes[i]!.skin
    if (skin === null) continue
    const skinRoot = skinRoots[skin]
    requireGltf(skinRoot !== undefined, `nodes[${i}].skin`, 'O vínculo de esqueleto não existe.')
    const nodeRoot = roots[i]!,
      key = `${nodeRoot}:${skinRoot}`
    if (nodeRoot === skinRoot || checked.has(key)) continue
    checked.add(key)
    const needed = membership.get(nodeRoot),
      available = membership.get(skinRoot)
    if (needed)
      for (const scene of needed)
        requireGltf(
          available?.has(scene),
          `nodes[${i}].skin`,
          'A cena da malha não contém a árvore de juntas do esqueleto.',
        )
  }
}
