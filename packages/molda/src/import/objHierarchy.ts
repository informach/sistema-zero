import type { ModelSceneNode } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { id, SceneValidationError } from '../scene/validation'
import { nativeImportName } from './nativeImportName'
import type { ObjDocument, ObjElementState } from './objDocument'
import type { ObjGeometryPlan } from './objGeometryPlan'
import { ObjInputError, objBudget, requireObj } from './objInput'

export interface ObjHierarchyOptions {
  /** Explicit o declarations without geometry are editable empty groups by default. */
  emptyObjects?: 'preserve' | 'omit'
}
export type ObjHierarchyIssue =
  | {
      code: 'name-generated' | 'name-shortened' | 'empty-object-preserved'
      path: string
      nodeId: string
    }
  | { code: 'empty-objects-omitted'; path: 'objects'; count: number }
  | {
      code: 'group-memberships-omitted'
      path: 'groups'
      /** Distinct USED source group-list declarations, not every cloned element state. */
      sets: number
      /** Unique non-default names across those lists. */
      names: number
      elements: number
      /** Unique non-default memberships per element; no duplicated geometry is created. */
      memberships: number
    }
export interface ObjHierarchy {
  nodes: ModelSceneNode[]
  /** Declaration line -> native object; zero only when the implicit object has geometry. */
  objectNodeIds: Map<number, string>
  unusedNodeId: string | null
  issues: ObjHierarchyIssue[]
}

export function readObjHierarchyOptions(value: ObjHierarchyOptions) {
  requireObj(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha opções de organização OBJ.',
  )
  for (const key of Object.keys(value))
    requireObj(
      key === 'emptyObjects',
      `options.${key}`,
      'Esta opção de organização não é conhecida.',
    )
  const emptyObjects = value.emptyObjects === undefined ? 'preserve' : value.emptyObjects
  requireObj(
    emptyObjects === 'preserve' || emptyObjects === 'omit',
    'options.emptyObjects',
    'Escolha se os objetos vazios serão preservados.',
  )
  return { emptyObjects }
}
function nativeId(value: string, path: string) {
  try {
    return id(value, path)
  } catch (error) {
    if (!(error instanceof SceneValidationError)) throw error
    throw new ObjInputError('invalid', error.path, error.message, { cause: error })
  }
}

function groupIssue(
  source: ObjDocument,
): Extract<ObjHierarchyIssue, { code: 'group-memberships-omitted' }> | null {
  const uses = new Map<readonly string[], number>(),
    names = new Set<string>()
  // Group lists are shared immutable source metadata. Expand each list once, not once per face.
  for (const element of source.elements) {
    const groups = source.states[element.state]!.groups
    uses.set(groups, (uses.get(groups) ?? 0) + 1)
  }
  let sets = 0,
    elements = 0,
    memberships = 0
  for (const [groups, count] of uses) {
    const distinct = new Set(groups.filter((name) => name !== 'default'))
    if (!distinct.size) continue
    sets++
    elements += count
    memberships += distinct.size * count
    for (const name of distinct) names.add(name)
  }
  return sets
    ? {
        code: 'group-memberships-omitted',
        path: 'groups',
        sets,
        names: names.size,
        elements,
        memberships,
      }
    : null
}

/**
 * Object declarations are roots, not a guessed g hierarchy. Parts come from the
 * same immutable geometry plan. This stage never reads coordinates or pixels,
 * recenters an object, creates instances, approves losses or adopts a document.
 */
export function convertObjHierarchy(
  source: ObjDocument,
  parts: readonly Pick<ObjGeometryPlan, 'objectLine' | 'geometryId'>[],
  defaultMaterialId: string,
  options: ObjHierarchyOptions = {},
): ObjHierarchy {
  const policy = readObjHierarchyOptions(options)
  requireObj(Array.isArray(parts), 'geometries', 'Esperava partes de geometria planejadas.')
  objBudget(parts.length, SCENE_LIMITS.geometries, 'geometries')
  const materialId = nativeId(defaultMaterialId, 'materials.defaultId'),
    byObject = new Map<number | null, string>(),
    geometryIds = new Set<string>()
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i],
      path = `geometries[${i}]`
    requireObj(
      part !== null && typeof part === 'object' && !Array.isArray(part),
      path,
      'Esperava uma parte planejada.',
    )
    requireObj(
      part.objectLine === null || (Number.isSafeInteger(part.objectLine) && part.objectLine >= 0),
      `${path}.objectLine`,
      'A parte precisa apontar para uma declaração de objeto ou para pontos sem uso.',
    )
    requireObj(
      !byObject.has(part.objectLine),
      path,
      'Cada objeto precisa de uma única parte planejada.',
    )
    const geometryId = nativeId(part.geometryId, `${path}.geometryId`)
    requireObj(
      !geometryIds.has(geometryId),
      `${path}.geometryId`,
      'As partes precisam de IDs distintos.',
    )
    geometryIds.add(geometryId)
    byObject.set(part.objectLine, geometryId)
  }
  const declarations = new Set<number>(),
    rows: Array<{ state: ObjElementState; geometryId: string | null }> = [],
    unusedGeometryId = byObject.get(null)
  let omitted = 0
  for (const state of source.states) {
    if (declarations.has(state.objectLine)) continue
    declarations.add(state.objectLine)
    const geometryId = byObject.get(state.objectLine) ?? null
    if (state.objectLine === 0 && geometryId === null) continue
    if (geometryId === null && policy.emptyObjects === 'omit') {
      omitted++
      continue
    }
    objBudget(rows.length + 1 + Number(unusedGeometryId !== undefined), SCENE_LIMITS.nodes, 'nodes')
    rows.push({ state, geometryId })
  }
  for (const line of byObject.keys())
    requireObj(
      line === null || declarations.has(line),
      'geometries.objectLine',
      'A parte aponta para uma declaração de objeto ausente.',
    )
  const nodes: ModelSceneNode[] = [],
    objectNodeIds = new Map<number, string>(),
    issues: ObjHierarchyIssue[] = [],
    groups = groupIssue(source)
  if (omitted) issues.push({ code: 'empty-objects-omitted', path: 'objects', count: omitted })
  if (groups) issues.push(groups)
  function node(nodeId: string, name: string, geometryId: string | null): ModelSceneNode {
    const transform: ModelSceneNode['transform'] = {
      kind: 'trs',
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    }
    const base = {
      id: nodeId,
      name,
      parentId: null,
      hidden: false,
      locked: false,
      transform,
    }
    return geometryId === null
      ? { ...base, kind: 'group' }
      : { ...base, kind: 'mesh', geometryId, materialId }
  }
  for (const { state, geometryId } of rows) {
    const nodeId = `obj_node_${state.objectLine}`,
      path = state.objectLine === 0 ? 'objects.default' : `lines[${state.objectLine}]`,
      { name, change } = nativeImportName(
        state.object,
        state.objectLine === 0 ? 'Objeto inicial' : `Objeto ${state.objectLine}`,
      )
    if (change) issues.push({ code: change, path, nodeId })
    if (geometryId === null) issues.push({ code: 'empty-object-preserved', path, nodeId })
    nodes.push(node(nodeId, name, geometryId))
    objectNodeIds.set(state.objectLine, nodeId)
  }
  const unusedNodeId = unusedGeometryId === undefined ? null : 'obj_node_unused'
  if (unusedNodeId !== null) {
    nodes.push(node(unusedNodeId, 'Pontos sem uso', unusedGeometryId!))
    issues.push({ code: 'name-generated', path: 'vertices.unused', nodeId: unusedNodeId })
  }
  return { nodes, objectNodeIds, unusedNodeId, issues }
}
