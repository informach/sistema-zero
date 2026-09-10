import type { ModelSceneNode } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { identityMatrix, type SceneTransform } from '../scene/matrix'
import { id } from '../scene/validation'
import type { GltfDocument } from './gltfDocument'
import { GltfInputError, requireGltf } from './gltfInput'
import { gltfNativeName } from './gltfNativeName'
import type { GltfSelection } from './gltfSelection'

export interface GltfHierarchyIssue {
  code: 'joint-mesh-split' | 'camera-omitted' | 'name-generated' | 'name-shortened'
  path: string
  nodeId: string
}
export interface GltfHierarchy {
  nodes: ModelSceneNode[]
  /** glTF node -> TRS/joint target. Never redirect these targets to a generated shape child. */
  nodeIds: Map<number, string>
  /** glTF mesh instance node -> native mesh, including joint/mesh splits. */
  meshNodeIds: Map<number, string>
  issues: GltfHierarchyIssue[]
}

function copyTransform(transform: SceneTransform): SceneTransform {
  return transform.kind === 'affine'
    ? { kind: 'affine', matrix: [...transform.matrix] }
    : {
        kind: 'trs',
        translation: [...transform.translation],
        rotation: [...transform.rotation],
        scale: [...transform.scale],
      }
}

/**
 * Native hierarchy stage for a selection from this same immutable source.
 * Geometry IDs match selection.variants; default material is for node-level
 * fallback (converted faces retain their own materials). Does not bind skins,
 * convert animations, approve losses, or validate the complete native document.
 */
export function convertGltfHierarchy(
  source: GltfDocument,
  selection: GltfSelection,
  resources: { geometryIds: readonly string[]; defaultMaterialId: string },
): GltfHierarchy {
  requireGltf(
    resources.geometryIds.length === selection.variants.length,
    'geometries',
    'Cada variante selecionada precisa de uma forma nativa.',
  )
  const geometryIds = new Set<string>()
  for (const geometryId of resources.geometryIds) {
    id(geometryId, 'geometries.id')
    requireGltf(!geometryIds.has(geometryId), 'geometries', 'As formas precisam de IDs distintos.')
    geometryIds.add(geometryId)
  }
  id(resources.defaultMaterialId, 'materials.defaultId')
  const joints = new Set<number>()
  for (const index of selection.dependencies.skins)
    for (const joint of source.skins[index]!.joints) joints.add(joint)
  const instances = new Map(selection.instances.map((instance) => [instance.node, instance])),
    split = new Set(
      selection.instances
        .filter((instance) => joints.has(instance.node))
        .map((instance) => instance.node),
    )
  if (selection.nodes.length + split.size > SCENE_LIMITS.nodes)
    throw new GltfInputError(
      'budget',
      'nodes',
      'Separar ossos e formas ultrapassaria o limite de nós do Molda.',
    )
  const nodes: ModelSceneNode[] = [],
    nodeIds = new Map(selection.nodes.map((index) => [index, `gltf_node_${index}`])),
    meshNodeIds = new Map<number, string>(),
    issues: GltfHierarchyIssue[] = []
  for (const index of selection.nodes) {
    const input = source.graph.nodes[index]!,
      nodeId = nodeIds.get(index)!,
      instance = instances.get(index),
      isSplit = split.has(index),
      { name, change } = gltfNativeName(input.name, `${instance ? 'Parte' : 'Grupo'} ${index + 1}`),
      base = {
        id: nodeId,
        name,
        parentId: input.parent === null ? null : nodeIds.get(input.parent)!,
        transform: copyTransform(input.transform),
        hidden: false,
        locked: false,
      }
    if (change) issues.push({ code: change, path: `nodes[${index}].name`, nodeId })
    if (input.camera !== null)
      issues.push({ code: 'camera-omitted', path: `nodes[${index}].camera`, nodeId })
    if (!instance || isSplit) nodes.push({ ...base, kind: 'group' })
    if (instance) {
      const meshId = isSplit ? `${nodeId}_shape` : nodeId
      nodes.push({
        ...base,
        ...(isSplit
          ? {
              id: meshId,
              name: `Forma ${index + 1}`,
              parentId: nodeId,
              transform: { kind: 'affine', matrix: identityMatrix() } as const,
            }
          : {}),
        kind: 'mesh',
        geometryId: resources.geometryIds[instance.variant]!,
        materialId: resources.defaultMaterialId,
      })
      meshNodeIds.set(index, meshId)
      if (isSplit) issues.push({ code: 'joint-mesh-split', path: `nodes[${index}]`, nodeId })
    }
  }
  return { nodes, nodeIds, meshNodeIds, issues }
}
