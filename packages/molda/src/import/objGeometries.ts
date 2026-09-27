import type { SceneMeshGeometry } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import { readSceneGeometry } from '../scene/readGeometry'
import { SceneValidationError } from '../scene/validation'
import type { ObjDocument } from './objDocument'
import {
  type ObjGeometryMaterials,
  type ObjGeometryPlan,
  planObjGeometries,
} from './objGeometryPlan'
import { ObjInputError } from './objInput'
import { objNativeUv } from './objUvTransform'

export interface ObjGeometryIssue {
  code:
    | 'closing-corners-removed'
    | 'construction-points'
    | 'construction-lines'
    | 'repeated-line-indices-omitted'
    | 'line-uv-omitted'
    | 'construction-material-omitted'
    | 'flat-normals'
    | 'smoothing-groups-omitted'
    | 'third-uv-coordinate-omitted'
    | 'rational-weight-omitted'
    | 'unreferenced-vertices'
    | 'undrawn-degenerate-faces'
    | 'undrawn-self-intersection-faces'
    | 'undrawn-precision-faces'
  geometryId: string
  /** Part declaration (or the unused-position pool), not a claim to enumerate every affected line. */
  path: string
  count: number
}
export interface ObjNativeGeometryPart {
  objectLine: number | null
  geometry: SceneMeshGeometry
}

/** Geometry only. Material resources, object hierarchy, full-document bounds and adoption come later. */
export function convertObjGeometries(source: ObjDocument, materials: ObjGeometryMaterials) {
  return convertPlannedObjGeometries(source, planObjGeometries(source, materials))
}

/** Internal synchronous composition: plans must belong to this same immutable source. */
export function convertPlannedObjGeometries(
  source: ObjDocument,
  plans: readonly ObjGeometryPlan[],
) {
  const parts: ObjNativeGeometryPart[] = [],
    issues: ObjGeometryIssue[] = [],
    budget = { vertices: 0, triangles: 0, edges: 0 }
  for (const plan of plans) {
    const geometry: SceneMeshGeometry = {
        id: plan.geometryId,
        kind: 'mesh',
        vertices: {},
        faces: {},
        looseEdges: [],
      },
      counts = new Map<ObjGeometryIssue['code'], number>(),
      issue = (code: ObjGeometryIssue['code'], count: number) => {
        if (count) counts.set(code, (counts.get(code) ?? 0) + count)
      }
    for (const vertex of plan.vertices) {
      const offset = vertex * 4
      geometry.vertices[`v_${vertex}`] = [
        source.positions[offset]!,
        source.positions[offset + 1]!,
        source.positions[offset + 2]!,
      ]
      // Every retained point is editable/drawn by component overlays, even without a triangle.
      // Do not change the native Float64 authoring domain or silently clamp imported coordinates.
      if (!geometry.vertices[`v_${vertex}`]!.every((value) => Number.isFinite(Math.fround(value))))
        throw new ObjInputError(
          'unsupported',
          `native.geometries.${plan.geometryId}.vertices.v_${vertex}`,
          'Um ponto está longe demais para desenhar na oficina. As coordenadas não foram alteradas.',
        )
      issue('rational-weight-omitted', Number(source.positions[offset + 3] !== 1))
    }
    if (plan.objectLine === null) issue('unreferenced-vertices', plan.vertices.length)
    for (const item of plan.elements) {
      const element = source.elements[item.index]!,
        state = source.states[element.state]!
      if (element.kind === 'face') {
        if (item.materialId === null) throw new Error('Face material was not planned')
        const uvPath = `lines[${element.line}].uv`,
          corners = Array.from({ length: item.count }, (_, i) => {
            const offset = (element.offset + i) * 3,
              uv = source.corners[offset + 1]!
            if (uv >= 0)
              issue('third-uv-coordinate-omitted', Number(source.texcoords[uv * 3 + 2] !== 0))
            return {
              vertexId: `v_${source.corners[offset]}`,
              // OBJ and native V run upward; decoder rows are reversed by material conversion.
              uv: item.uvTransform
                ? objNativeUv(
                    source.texcoords[uv * 3]!,
                    source.texcoords[uv * 3 + 1]!,
                    item.uvTransform,
                    uvPath,
                  )
                : ([
                    uv >= 0 ? source.texcoords[uv * 3]! : 0,
                    uv >= 0 ? source.texcoords[uv * 3 + 1]! : 0,
                  ] as [number, number]),
            }
          })
        geometry.faces[`f_${element.line}`] = { materialId: item.materialId, corners }
        issue('closing-corners-removed', item.closingCorners)
        issue('flat-normals', Number(element.hasNormals))
        issue('smoothing-groups-omitted', Number(state.smoothing > 0))
      } else {
        issue('construction-material-omitted', Number(state.material !== null))
        if (element.kind === 'points') issue('construction-points', item.count)
        else {
          issue('construction-lines', item.count - 1)
          for (let i = 0; i < item.count; i++) {
            const offset = (element.offset + i) * 3
            issue('line-uv-omitted', Number(source.corners[offset + 1]! >= 0))
            if (!i) continue
            const a = source.corners[offset - 3]!,
              b = source.corners[offset]!
            if (a === b) issue('repeated-line-indices-omitted', 1)
            else geometry.looseEdges.push([`v_${a}`, `v_${b}`])
          }
        }
      }
    }
    try {
      const checked = readSceneGeometry(geometry, `geometries.${geometry.id}`, budget)
      if (checked.kind !== 'mesh') throw new Error('Expected an editable mesh')
      for (const problem of buildSceneGeometry(checked).issues)
        issue(`undrawn-${problem.code}-faces`, 1)
      parts.push({ objectLine: plan.objectLine, geometry: checked })
    } catch (error) {
      if (!(error instanceof SceneValidationError)) throw error
      throw new ObjInputError('unsupported', `native.${error.path}`, error.message)
    }
    for (const [code, count] of counts)
      issues.push({ code, count, geometryId: geometry.id, path: plan.path })
  }
  return {
    parts,
    issues,
    costs: { vertices: budget.vertices, triangles: budget.triangles, looseEdges: budget.edges },
  }
}
