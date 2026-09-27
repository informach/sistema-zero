import type { ModelSceneNode } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { id, SceneValidationError } from '../scene/validation'
import type { BbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelNativeGeometryPlan } from './bbmodelNativeGeometryPlan'
import type { BbmodelNodeMetadata } from './bbmodelNodeMetadata'
import type { BbmodelSelection } from './bbmodelSelection'
import type { BbmodelTransform } from './bbmodelTransforms'
import { nativeImportName } from './nativeImportName'

export interface BbmodelHierarchyOptions {
  groupFlags?: 'reject' | 'inherit'
  exportFlags?: 'reject' | 'discard'
}
export interface BbmodelHierarchyIssue {
  code:
    | 'name-generated'
    | 'name-shortened'
    | 'group-visibility-inherited'
    | 'group-lock-inherited'
    | 'export-flag-discarded'
  path: string
  node: number
  nodeId: string
}
export interface BbmodelHierarchyResources {
  geometries: readonly BbmodelNativeGeometryPlan[]
  /** Source node index → native default material. Per-face texture links stay on geometry. */
  defaultMaterials: ReadonlyMap<number, string>
}

export function readBbmodelHierarchyOptions(value: BbmodelHierarchyOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como organizar as peças.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'groupFlags' || key === 'exportFlags',
      `options.${key}`,
      'Esta opção de organização não é conhecida.',
    )
  const groupFlags = value.groupFlags === undefined ? 'reject' : value.groupFlags,
    exportFlags = value.exportFlags === undefined ? 'reject' : value.exportFlags
  requireBbmodel(
    groupFlags === 'reject' || groupFlags === 'inherit',
    'options.groupFlags',
    'Escolha como aplicar os estados dos grupos.',
  )
  requireBbmodel(
    exportFlags === 'reject' || exportFlags === 'discard',
    'options.exportFlags',
    'Escolha como tratar as marcas de exportação.',
  )
  return { groupFlags, exportFlags }
}
function budget(value: number, maximum: number): void {
  if (value > maximum)
    throw new BbmodelInputError(
      'budget',
      'nodes',
      'Há peças ou grupos demais para editar no Molda.',
    )
}
function unsupported(path: string, message: string): never {
  throw new BbmodelInputError('unsupported', path, message)
}

/**
 * Matching private free-format graph, ALL-node metadata, selection, rest transforms and resource plans.
 * No reparenting, extra pivot node, geometry/world bake, source schema approval or native adoption.
 * Source group toggles edit descendant flags; native groups inherit flags at evaluation time.
 */
export function convertBbmodelHierarchy(
  graph: BbmodelGraph,
  metadata: readonly BbmodelNodeMetadata[],
  selection: BbmodelSelection,
  transforms: ReadonlyMap<number, BbmodelTransform>,
  resources: BbmodelHierarchyResources,
  options: BbmodelHierarchyOptions = {},
): {
  nodes: ModelSceneNode[]
  nodeIds: ReadonlyMap<number, string>
  byUuid: ReadonlyMap<string, string>
  issues: BbmodelHierarchyIssue[]
} {
  const policy = readBbmodelHierarchyOptions(options)
  budget(selection.nodes.length, SCENE_LIMITS.nodes)
  budget(resources.geometries.length, SCENE_LIMITS.geometries)
  if (metadata.length !== graph.nodes.length)
    throw new Error('Incomplete bbmodel hierarchy metadata stage')
  const nodeIds = new Map(selection.nodes.map(({ node }) => [node, `bbmodel_node_${node}`])),
    geometryByNode = new Map(resources.geometries.map((plan) => [plan.node, plan])),
    issues: BbmodelHierarchyIssue[] = []
  // Validate all identities, links and policies before copying any local transform values.
  const planned = selection.nodes.map((selected) => {
    const { node, parent, kind } = selected,
      entry = graph.nodes[node],
      info = metadata[node],
      transform = transforms.get(node),
      geometry = geometryByNode.get(node),
      nodeId = nodeIds.get(node)!
    if (
      !entry ||
      !info ||
      info.kind === 'unresolved' ||
      info.node !== node ||
      info.kind !== kind ||
      !transform ||
      entry.parent !== parent ||
      (parent !== null && !nodeIds.has(parent)) ||
      (kind !== 'group' &&
        (!geometry || geometry.kind !== kind || geometry.sourcePath !== info.sourcePath))
    )
      throw new Error('Mismatched bbmodel hierarchy stages')
    const path = info.sourcePath
    if (!info.export) {
      if (policy.exportFlags === 'reject')
        unsupported(
          `${path}.export`,
          'Esta peça tem uma marca de exportação que o Molda não armazena. Continuar sem essa marca exige uma escolha.',
        )
      issues.push({ code: 'export-flag-discarded', path: `${path}.export`, node, nodeId })
    }
    if (kind === 'group') {
      for (const flag of ['visibility', 'locked'] as const) {
        const active = flag === 'visibility' ? !info.visible : info.locked
        if (!active) continue
        if (policy.groupFlags === 'reject')
          unsupported(
            `${path}.${flag}`,
            'No Molda, esconder ou travar um grupo também afeta suas peças. Escolha aplicar essa herança.',
          )
        issues.push({
          code: flag === 'visibility' ? 'group-visibility-inherited' : 'group-lock-inherited',
          path: `${path}.${flag}`,
          node,
          nodeId,
        })
      }
    }
    let materialId: string | undefined
    if (kind !== 'group') {
      const material = resources.defaultMaterials.get(node),
        materialPath = `nodeMaterials[${node}]`
      try {
        materialId = id(material, materialPath)
      } catch (error) {
        if (!(error instanceof SceneValidationError)) throw error
        throw new BbmodelInputError('invalid', error.path, error.message, { cause: error })
      }
    }
    const { name, change } = nativeImportName(
      info.name,
      `${kind === 'group' ? 'Grupo' : 'Peça'} ${node + 1}`,
    )
    if (change) issues.push({ code: change, path: `${path}.name`, node, nodeId })
    return { selected, entry, info, transform, geometry, materialId, nodeId, name }
  })
  const nodes = planned.map(
    ({ selected, info, transform, geometry, materialId, nodeId, name }): ModelSceneNode => {
      const base = {
        id: nodeId,
        name,
        parentId: selected.parent === null ? null : nodeIds.get(selected.parent)!,
        hidden: !info.visible,
        locked: info.locked,
        transform: {
          kind: 'trs' as const,
          translation: [...transform.local.translation] as typeof transform.local.translation,
          rotation: [...transform.local.rotation] as typeof transform.local.rotation,
          scale: [...transform.local.scale] as typeof transform.local.scale,
        },
      }
      return selected.kind === 'group'
        ? { ...base, kind: 'group' }
        : {
            ...base,
            kind: 'mesh',
            geometryId: geometry!.geometryId,
            materialId: materialId!,
          }
    },
  )
  return {
    nodes,
    nodeIds,
    byUuid: new Map(planned.map(({ entry, nodeId }) => [entry.uuid, nodeId])),
    issues,
  }
}
