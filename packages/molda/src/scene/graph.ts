/** Per-revision hierarchy index. No stored child lists, recursion, DOM or scene engine. */
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  type SceneTransform,
} from './matrix'

export interface SceneNode {
  id: string
  parentId: string | null
  transform: SceneTransform
}

export type SceneGraphErrorCode =
  | 'invalid-id'
  | 'duplicate-id'
  | 'missing-parent'
  | 'cycle'
  | 'missing-selection'
  | 'singular-parent'

export class SceneGraphError extends Error {
  constructor(
    readonly code: SceneGraphErrorCode,
    readonly nodeId: string,
  ) {
    super(`Scene graph ${code}: ${nodeId}`)
    this.name = 'SceneGraphError'
  }
}

/** Derived data belongs to this document revision; rebuild after a hierarchy/transform edit. */
export interface SceneIndex<T extends SceneNode> {
  readonly nodes: ReadonlyMap<string, T>
  readonly roots: readonly string[]
  readonly children: ReadonlyMap<string, readonly string[]>
  readonly order: readonly string[]
  readonly worldMatrices: ReadonlyMap<string, Readonly<AffineMatrix>>
}

export function indexSceneNodes<T extends SceneNode>(nodes: readonly T[]): SceneIndex<T> {
  const byId = new Map<string, T>()
  const roots: string[] = []
  const children = new Map<string, string[]>()
  const localMatrices = new Map<string, AffineMatrix>()
  for (const node of nodes) {
    if (typeof node.id !== 'string' || !node.id) throw new SceneGraphError('invalid-id', node.id)
    if (byId.has(node.id)) throw new SceneGraphError('duplicate-id', node.id)
    byId.set(node.id, node)
    localMatrices.set(node.id, composeTransform(node.transform))
  }
  for (const node of nodes) {
    if (node.parentId === null) roots.push(node.id)
    else {
      if (!byId.has(node.parentId)) throw new SceneGraphError('missing-parent', node.id)
      const siblings = children.get(node.parentId) ?? []
      siblings.push(node.id)
      children.set(node.parentId, siblings)
    }
  }
  // Every node has exactly one parent. A root-first queue visits each edge once;
  // any unreachable remainder is cyclic, including cycles disconnected from a valid root.
  const order = [...roots]
  const worldMatrices = new Map<string, AffineMatrix>()
  for (let cursor = 0; cursor < order.length; cursor += 1) {
    const id = order[cursor] as string
    const node = byId.get(id) as T
    const local = localMatrices.get(id) as AffineMatrix
    const parentWorld = node.parentId === null ? null : worldMatrices.get(node.parentId)
    worldMatrices.set(id, parentWorld ? affineMultiply(parentWorld, local) : local)
    for (const child of children.get(id) ?? []) order.push(child)
  }
  if (order.length !== nodes.length) {
    const cyclic = nodes.find((node) => !worldMatrices.has(node.id))
    throw new SceneGraphError('cycle', cyclic?.id ?? '')
  }
  return { nodes: byId, roots, children, order, worldMatrices }
}

/** Selection is derived from the current hierarchy, including descendants only once. */
export function selectSceneSubtrees<T extends SceneNode>(
  index: SceneIndex<T>,
  selectedIds: readonly string[],
) {
  const selected = new Set(selectedIds)
  for (const id of selected)
    if (!index.nodes.has(id)) throw new SceneGraphError('missing-selection', id)
  const covered = new Set<string>()
  const roots = new Set<string>()
  for (const id of index.order) {
    const node = index.nodes.get(id)
    if (!node) throw new Error('Índice de cena incompleto.')
    const ancestorSelected = node.parentId !== null && covered.has(node.parentId)
    if (ancestorSelected || selected.has(id)) covered.add(id)
    if (selected.has(id) && !ancestorSelected) roots.add(id)
  }
  return { selected, covered, roots }
}

/**
 * Move selected subtree roots atomically. Descendants move with their parent once.
 * Retain the exact affine transform, including shear and negative scale, instead
 * of decomposing into an approximation. Geometry and node-specific data stay owned.
 */
export function reparentPreservingWorld<T extends SceneNode>(
  nodes: readonly T[],
  selectedIds: readonly string[],
  parentId: string | null,
): readonly T[] {
  const index = indexSceneNodes(nodes)
  if (parentId !== null && !index.nodes.has(parentId)) {
    throw new SceneGraphError('missing-parent', parentId)
  }
  const { covered, roots: selectedRoots } = selectSceneSubtrees(index, selectedIds)
  const roots = [...selectedRoots].filter((id) => index.nodes.get(id)?.parentId !== parentId)
  if (parentId !== null && covered.has(parentId)) throw new SceneGraphError('cycle', parentId)
  if (!roots.length) return nodes
  const parentWorld = parentId === null ? identityMatrix() : index.worldMatrices.get(parentId)
  const inverse = parentWorld ? affineInverse(parentWorld) : null
  if (!inverse) throw new SceneGraphError('singular-parent', parentId ?? '')
  // Prepare every changed transform before returning any new state to a command/store.
  const transforms = new Map<string, SceneTransform>()
  for (const id of roots) {
    const world = index.worldMatrices.get(id) as AffineMatrix
    transforms.set(id, { kind: 'affine', matrix: affineMultiply(inverse, world) })
  }
  return nodes.map((node) => {
    const transform = transforms.get(node.id)
    return transform ? { ...node, parentId, transform } : node
  })
}
