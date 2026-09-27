import type { SceneMeshGeometry, Vec2 } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import { SCENE_LIMITS } from '../scene/limits'
import { id, SceneValidationError } from '../scene/validation'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelNativeGeometryPlan } from './bbmodelNativeGeometryPlan'
import type { BbmodelNativeUvs } from './bbmodelNativeUvs'
import type { BbmodelNativePositions } from './bbmodelPositions'

export interface BbmodelGeometryIssue {
  code: 'undrawn-degenerate-faces' | 'undrawn-self-intersection-faces' | 'undrawn-precision-faces'
  node: number
  geometryId: string
  path: string
  /** Converted native polygons, not source quad count; stored faces are NOT removed. */
  count: number
}
function budget(value: number, maximum: number, path: string): void {
  if (value > maximum)
    throw new BbmodelInputError(
      'budget',
      path,
      'A geometria ultrapassa o orçamento de edição do Molda.',
    )
}
function materialIds(source: ReadonlyMap<number, string>): ReadonlyMap<number, string> {
  requireBbmodel(
    source instanceof Map,
    'materials',
    'Esperava os vínculos de materiais por textura.',
  )
  budget(source.size, SCENE_LIMITS.materials, 'materials')
  const result = new Map<number, string>()
  for (const [texture, value] of source) {
    const path = `materials[${texture}]`
    requireBbmodel(
      Number.isSafeInteger(texture) && texture >= 0 && texture < BBMODEL_INPUT_LIMITS.textures,
      path,
      'O índice de textura precisa ser um inteiro válido.',
    )
    try {
      result.set(texture, id(value, path))
    } catch (error) {
      if (!(error instanceof SceneValidationError)) throw error
      throw new BbmodelInputError('invalid', error.path, error.message, { cause: error })
    }
  }
  return result
}

/**
 * Matching private/budgeted stages only, not a parser for caller-made topology or coordinate buffers.
 * Textured faces require explicit material links; untextured faces inherit their future node's material.
 * No source reread, image pixels, world transform bake, welding, snapping or appearance approval.
 */
export function convertBbmodelGeometries(
  plans: readonly BbmodelNativeGeometryPlan[],
  positions: readonly BbmodelNativePositions[],
  uvs: readonly BbmodelNativeUvs[],
  materials: ReadonlyMap<number, string>,
): { geometries: SceneMeshGeometry[]; issues: BbmodelGeometryIssue[] } {
  const links = materialIds(materials)
  budget(plans.length, SCENE_LIMITS.geometries, 'geometries')
  budget(
    plans.reduce((total, plan) => total + plan.costs.vertices, 0),
    SCENE_LIMITS.vertices,
    'geometries',
  )
  budget(
    plans.reduce((total, plan) => total + plan.costs.triangles, 0),
    SCENE_LIMITS.triangles,
    'geometries',
  )
  budget(
    plans.reduce((total, plan) => total + plan.costs.looseEdges, 0),
    SCENE_LIMITS.looseEdges,
    'geometries',
  )
  const byPositions = new Map(positions.map((row) => [row.node, row])),
    byUvs = new Map(uvs.map((row) => [row.node, row])),
    issues: BbmodelGeometryIssue[] = []
  // Confirm ALL selected stage identities before allocating/copying the first native geometry.
  const matched = plans.map((plan) => {
    const points = byPositions.get(plan.node),
      uv = byUvs.get(plan.node)
    if (
      !points ||
      !uv ||
      points.geometryId !== plan.geometryId ||
      uv.geometryId !== plan.geometryId ||
      points.positions.length !== plan.vertexCount * 3
    )
      throw new Error('Mismatched bbmodel native geometry stages')
    return { plan, points: points.positions, uv }
  })
  const geometries = matched.map(({ plan, points, uv }): SceneMeshGeometry => {
    const geometry: SceneMeshGeometry = {
      id: plan.geometryId,
      kind: 'mesh',
      vertices: {},
      faces: {},
      looseEdges: [],
    }
    const vertexId = (index: number) => `v_${index}`
    for (let index = 0; index < plan.vertexCount; index++)
      geometry.vertices[vertexId(index)] = [
        points[index * 3]!,
        points[index * 3 + 1]!,
        points[index * 3 + 2]!,
      ]
    for (const face of plan.faces) {
      const mapped = uv.faces.get(face.sourceFace)
      if (!mapped) throw new Error('Missing bbmodel native face UV')
      const materialId = mapped.texture === null ? undefined : links.get(mapped.texture)
      requireBbmodel(
        mapped.texture === null || materialId !== undefined,
        `materials[${mapped.texture}]`,
        'A face texturizada precisa de um material convertido; nenhum material substituto foi escolhido.',
      )
      geometry.faces[face.id] = {
        corners: face.corners.map(({ vertex, sourceCorner }) => {
          const sourceUv = mapped.corners[sourceCorner]
          if (!sourceUv) throw new Error('Missing bbmodel native corner UV')
          return { vertexId: vertexId(vertex), uv: [...sourceUv] as Vec2 }
        }),
        ...(materialId === undefined ? {} : { materialId }),
      }
    }
    geometry.looseEdges = plan.looseEdges.map(([a, b]) => [vertexId(a), vertexId(b)])
    try {
      const counts = new Map<'degenerate' | 'self-intersection' | 'precision', number>()
      for (const issue of buildSceneGeometry(geometry).issues)
        counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1)
      for (const [code, count] of counts)
        issues.push({
          code: `undrawn-${code}-faces`,
          node: plan.node,
          geometryId: plan.geometryId,
          path: plan.sourcePath,
          count,
        })
    } catch (error) {
      if (!(error instanceof SceneValidationError)) throw error
      throw new BbmodelInputError('unsupported', plan.sourcePath, error.message, { cause: error })
    }
    return geometry
  })
  return { geometries, issues }
}
