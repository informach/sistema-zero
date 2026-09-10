import type { SceneMeshGeometry, Vec2 } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import type { GltfAccessor } from './gltfAccessors'
import {
  type GltfGeometryMaterials,
  type GltfGeometryRequest,
  planGltfGeometries,
} from './gltfGeometryPlan'
import { gltfGeometryValues } from './gltfGeometryValues'
import type { GltfMesh } from './gltfMeshes'

export interface GltfGeometryIssue {
  code:
    | 'missing-position'
    | 'construction-points'
    | 'construction-lines'
    | 'repeated-indices-omitted'
    | 'morph-controls-baked'
    | 'flat-normals'
    | 'tangents-omitted'
    | 'colors-omitted'
    | 'extra-uv-sets-omitted'
    | 'custom-attributes-omitted'
    | 'undrawn-degenerate-faces'
    | 'undrawn-self-intersection-faces'
    | 'undrawn-precision-faces'
  geometryId: string
  path: string
  /** Elements affected: primitives, topology elements, targets, attributes or faces, per code. */
  count: number
}

export interface GltfGeometrySource {
  meshIndex: number
  geometryId: string
  /** One slot per source primitive, including skipped ones. No numeric buffers are retained. */
  primitives: Array<{ vertexIds: string[]; attributes: Map<string, number> }>
}

/** Geometry stage only. Hierarchy, materials, skin, animation and extension review remain separate. */
export function convertGltfGeometries(
  meshes: readonly GltfMesh[],
  accessors: readonly GltfAccessor[],
  requests: readonly GltfGeometryRequest[],
  materials: GltfGeometryMaterials,
): { geometries: SceneMeshGeometry[]; sources: GltfGeometrySource[]; issues: GltfGeometryIssue[] } {
  const plans = planGltfGeometries(meshes, accessors, requests, materials)
  const issues: GltfGeometryIssue[] = [],
    sources: GltfGeometrySource[] = []
  const geometries = plans.map((plan) => {
    const geometry: SceneMeshGeometry = {
      id: plan.geometryId,
      kind: 'mesh',
      vertices: {},
      faces: {},
      looseEdges: [],
    }
    const sourceMap: GltfGeometrySource = {
      meshIndex: plan.meshIndex,
      geometryId: plan.geometryId,
      primitives: [],
    }
    const issue = (code: GltfGeometryIssue['code'], path: string, count: number) => {
      if (count) issues.push({ code, path, geometryId: plan.geometryId, count })
    }
    issue('morph-controls-baked', `${plan.path}.weights`, plan.weights.length)
    plan.primitives.forEach(({ source, path, position, uvName, materialId }, p) => {
      const vertexIds: string[] = []
      sourceMap.primitives.push({ vertexIds, attributes: new Map(source.attributes) })
      if (!position) {
        issue('missing-position', path, 1)
        return
      }
      const point = gltfGeometryValues(
        source,
        accessors,
        'POSITION',
        plan.weights,
        `${path}.attributes`,
      )
      const uv = gltfGeometryValues(source, accessors, uvName, plan.weights, `${path}.attributes`)
      const hasUv = source.attributes.has(uvName)
      for (let v = 0; v < position.count; v++) {
        const vertexId = `p_${p}_v_${v}`
        vertexIds.push(vertexId)
        geometry.vertices[vertexId] = [point(v * 3), point(v * 3 + 1), point(v * 3 + 2)]
      }
      let colors = 0,
        extraUvs = 0,
        custom = 0
      for (const name of source.attributes.keys()) {
        if (name.startsWith('COLOR_')) colors++
        else if (name.startsWith('TEXCOORD_') && name !== uvName) extraUvs++
        else if (name.startsWith('_')) custom++
      }
      issue('flat-normals', `${path}.attributes.NORMAL`, Number(source.attributes.has('NORMAL')))
      issue(
        'tangents-omitted',
        `${path}.attributes.TANGENT`,
        Number(source.attributes.has('TANGENT')),
      )
      issue('colors-omitted', `${path}.attributes`, colors)
      issue('extra-uv-sets-omitted', `${path}.attributes`, extraUvs)
      issue('custom-attributes-omitted', `${path}.attributes`, custom)
      const { kind, indices } = source.topology
      issue('construction-points', path, kind === 'points' ? indices.length : 0)
      issue('construction-lines', path, kind === 'lines' ? indices.length / 2 : 0)
      let repeated = 0
      if (kind === 'lines') {
        for (let i = 0; i < indices.length; i += 2) {
          const a = indices[i]!,
            b = indices[i + 1]!
          if (a === b) repeated++
          else geometry.looseEdges.push([vertexIds[a]!, vertexIds[b]!])
        }
      } else if (kind === 'triangles') {
        const corner = (v: number) => ({
          vertexId: vertexIds[v]!,
          // glTF V=0 is at the image top; native material pixels are canonical bottom-up.
          uv: hasUv ? ([uv(v * 2), 1 - uv(v * 2 + 1)] as Vec2) : ([0, 0] as Vec2),
        })
        for (let i = 0; i < indices.length; i += 3) {
          const a = indices[i]!,
            b = indices[i + 1]!,
            c = indices[i + 2]!
          if (a === b || a === c || b === c) repeated++
          else
            geometry.faces[`p_${p}_f_${i / 3}`] = {
              materialId,
              corners: [corner(a), corner(b), corner(c)],
            }
        }
      }
      issue('repeated-indices-omitted', path, repeated)
    })
    // Use the same draw contract as the editor; keep authored faces even when they cannot draw.
    const undrawn = new Map<'degenerate' | 'self-intersection' | 'precision', number>()
    for (const entry of buildSceneGeometry(geometry).issues)
      undrawn.set(entry.code, (undrawn.get(entry.code) ?? 0) + 1)
    for (const [code, count] of undrawn) issue(`undrawn-${code}-faces`, plan.path, count)
    sources.push(sourceMap)
    return geometry
  })
  return { geometries, sources, issues }
}
