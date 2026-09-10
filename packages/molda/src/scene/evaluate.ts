import type { ModelSceneNode } from './document'
import type { indexSceneDocument } from './documentIndex'
import type { SceneIndex } from './graph'
import { type AffineMatrix, affineDeterminant, affineMultiply, identityMatrix } from './matrix'

export interface SceneInstance {
  id: string
  name: string
  /** Selection/painting on a procedural mirror resolves to this authorial node. */
  sourceNodeId: string
  geometryId: string
  materialId: string
  worldMatrix: Readonly<AffineMatrix>
  hidden: boolean
  locked: boolean
  /** Reverse triangle winding for -1; zero has no invertible surface normal. */
  orientation: -1 | 0 | 1
}

function orientation(matrix: Readonly<AffineMatrix>): -1 | 0 | 1 {
  const determinant = affineDeterminant(matrix)
  return determinant < 0 ? -1 : determinant > 0 ? 1 : 0
}

/** Parent-first flag inheritance shared by drawing, commands and session helpers. */
export function evaluateSceneNodeFlags(index: SceneIndex<ModelSceneNode>) {
  const flags = new Map<string, { hidden: boolean; locked: boolean }>()
  for (const id of index.order) {
    const node = index.nodes.get(id)
    if (!node) throw new Error('Índice de cena incompleto.')
    const parent = node.parentId === null ? undefined : flags.get(node.parentId)
    flags.set(id, {
      hidden: node.hidden || parent?.hidden === true,
      locked: node.locked || parent?.locked === true,
    })
  }
  return flags
}

/** Derived draw instances. Mirrors never become a second persisted geometry or bitmap. */
export function evaluateSceneInstances(
  index: ReturnType<typeof indexSceneDocument>,
  worldMatrices = index.scene.worldMatrices,
): SceneInstance[] {
  const flags = evaluateSceneNodeFlags(index.scene)
  const instances = new Map<string, SceneInstance>()
  for (const id of index.scene.order) {
    const node = index.scene.nodes.get(id)
    const worldMatrix = worldMatrices.get(id)
    if (!node || !worldMatrix) throw new Error('Índice de cena incompleto.')
    const inherited = flags.get(id)
    if (!inherited) throw new Error('Flags ausentes no índice.')
    if (node.kind !== 'mesh') continue
    instances.set(id, {
      id,
      name: node.name,
      sourceNodeId: id,
      geometryId: node.geometryId,
      materialId: node.materialId,
      worldMatrix,
      ...inherited,
      orientation: orientation(worldMatrix),
    })
  }
  for (const mirror of index.mirrors.values()) {
    const source = instances.get(mirror.sourceId)
    if (!source) throw new Error('O espelho não tem uma peça de origem válida.')
    const axis = mirror.axis === 'x' ? 0 : mirror.axis === 'y' ? 1 : 2
    const reflection = identityMatrix()
    reflection[axis * 5] = -1
    reflection[12 + axis] = 2 * mirror.offset
    const worldMatrix = affineMultiply(reflection, source.worldMatrix)
    instances.set(mirror.id, {
      ...source,
      id: mirror.id,
      name: mirror.name,
      worldMatrix,
      orientation: orientation(worldMatrix),
    })
  }
  return [...instances.values()]
}
