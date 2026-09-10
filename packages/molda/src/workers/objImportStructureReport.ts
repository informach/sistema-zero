import { MTL_INPUT_LIMITS } from '../import/mtlInput'
import type { ObjGeometryIssue } from '../import/objGeometries'
import type { ObjHierarchyIssue } from '../import/objHierarchy'
import { OBJ_INPUT_LIMITS } from '../import/objInput'
import type { ObjMaterialSelectionIssue } from '../import/objMaterialSelection'
import * as v from '../scene/validation'
import { reportCode, reportPath, reportTarget } from './objImportReportValues'

const GEOMETRY: Record<ObjGeometryIssue['code'], true> = {
  'closing-corners-removed': true,
  'construction-points': true,
  'construction-lines': true,
  'repeated-line-indices-omitted': true,
  'line-uv-omitted': true,
  'construction-material-omitted': true,
  'flat-normals': true,
  'smoothing-groups-omitted': true,
  'third-uv-coordinate-omitted': true,
  'rational-weight-omitted': true,
  'unreferenced-vertices': true,
  'undrawn-degenerate-faces': true,
  'undrawn-self-intersection-faces': true,
  'undrawn-precision-faces': true,
}
const HIERARCHY: Record<ObjHierarchyIssue['code'], true> = {
  'name-generated': true,
  'name-shortened': true,
  'empty-object-preserved': true,
  'empty-objects-omitted': true,
  'group-memberships-omitted': true,
}
const SELECTION: Record<ObjMaterialSelectionIssue['code'], true> = {
  'library-scope-selected': true,
  'duplicate-material-selected': true,
  'missing-material-default': true,
}
export function readObjGeometryIssue(
  raw: unknown,
  geometries: ReadonlySet<string>,
): ObjGeometryIssue {
  const row = v.record(raw, 'issue.detail', ['code', 'geometryId', 'path', 'count'])
  return {
    code: reportCode(row.code, GEOMETRY),
    path: reportPath(row.path),
    geometryId: reportTarget(row.geometryId, geometries, 'issue.geometryId'),
    count: v.number(row.count, 'issue.count', 1, OBJ_INPUT_LIMITS.references, true),
  }
}
export function readObjHierarchyIssue(raw: unknown, nodes: ReadonlySet<string>): ObjHierarchyIssue {
  const row = v.record(raw, 'issue.detail'),
    code = reportCode(row.code, HIERARCHY)
  switch (code) {
    case 'name-generated':
    case 'name-shortened':
    case 'empty-object-preserved':
      v.record(row, 'issue.detail', ['code', 'path', 'nodeId'])
      return {
        code,
        path: reportPath(row.path),
        nodeId: reportTarget(row.nodeId, nodes, 'issue.nodeId'),
      }
    case 'empty-objects-omitted':
      v.record(row, 'issue.detail', ['code', 'path', 'count'])
      return {
        code,
        path: v.choice(row.path, ['objects'], 'issue.path'),
        count: v.number(row.count, 'issue.count', 1, OBJ_INPUT_LIMITS.states, true),
      }
    case 'group-memberships-omitted': {
      v.record(row, 'issue.detail', ['code', 'path', 'sets', 'names', 'elements', 'memberships'])
      const sets = v.number(row.sets, 'issue.sets', 1, OBJ_INPUT_LIMITS.states, true),
        names = v.number(row.names, 'issue.names', 1, OBJ_INPUT_LIMITS.groupNames, true),
        elements = v.number(row.elements, 'issue.elements', sets, OBJ_INPUT_LIMITS.elements, true),
        memberships = v.number(
          row.memberships,
          'issue.memberships',
          Math.max(names, elements),
          names * elements,
          true,
        )
      return {
        code,
        path: v.choice(row.path, ['groups'], 'issue.path'),
        sets,
        names,
        elements,
        memberships,
      }
    }
  }
}
export function readObjSelectionIssue(raw: unknown, libraries: number): ObjMaterialSelectionIssue {
  const row = v.record(raw, 'issue.detail'),
    code = reportCode(row.code, SELECTION)
  switch (code) {
    case 'library-scope-selected':
      v.record(row, 'issue.detail', ['code', 'policy'])
      return { code, policy: v.choice(row.policy, ['declaration', 'all'], 'issue.policy') }
    case 'duplicate-material-selected':
      v.record(row, 'issue.detail', ['code', 'library', 'material', 'name', 'policy', 'ignored'])
      return {
        code,
        library: v.number(row.library, 'issue.library', 0, libraries - 1, true),
        material: v.number(row.material, 'issue.material', 0, MTL_INPUT_LIMITS.materials - 1, true),
        name: v.text(row.name, 'issue.name', MTL_INPUT_LIMITS.nameChars),
        policy: v.choice(row.policy, ['first', 'last'], 'issue.policy'),
        ignored: v.number(row.ignored, 'issue.ignored', 1, MTL_INPUT_LIMITS.materials - 1, true),
      }
    case 'missing-material-default': {
      v.record(row, 'issue.detail', ['code', 'name', 'scope', 'faces'])
      const scope = v.record(row.scope, 'issue.scope'),
        kind = v.choice(scope.kind, ['all', 'none', 'declaration'], 'issue.scope.kind')
      v.record(scope, 'issue.scope', kind === 'declaration' ? ['kind', 'index'] : ['kind'])
      return {
        code,
        name: v.text(row.name, 'issue.name', OBJ_INPUT_LIMITS.nameChars),
        faces: v.number(row.faces, 'issue.faces', 1, OBJ_INPUT_LIMITS.elements, true),
        scope:
          kind === 'declaration'
            ? {
                kind,
                index: v.number(
                  scope.index,
                  'issue.scope.index',
                  0,
                  OBJ_INPUT_LIMITS.states - 1,
                  true,
                ),
              }
            : { kind },
      }
    }
  }
}
