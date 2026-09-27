import { boxMesh } from '../model/mesh'
import { SCENE_LIMITS } from '../scene/limits'
import type { BbmodelCubeDirection, BbmodelGeometrySource } from './bbmodelGeometryTypes'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelSelection } from './bbmodelSelection'
import { bbmodelKeyPath } from './bbmodelValues'

export interface BbmodelNativeGeometryOptions {
  /** Explicit diagonal fidelity versus editable polygons; either choice is reported for mesh quads. */
  quads?: 'source-triangles' | 'editable-quads'
  unsupportedFaces?: 'reject' | 'omit'
}
export interface BbmodelNativeFacePlan {
  id: string
  sourceFace: number
  /** Native vertex index and its corner in the original face; no UV values are read here. */
  corners: Array<{ vertex: number; sourceCorner: number }>
}
export interface BbmodelNativeGeometryPlan {
  node: number
  kind: 'cube' | 'mesh'
  geometryId: string
  sourcePath: string
  vertexCount: number
  faces: BbmodelNativeFacePlan[]
  looseEdges: Array<[number, number]>
  costs: { vertices: number; triangles: number; looseEdges: number }
}
export interface BbmodelTopologyIssue {
  code:
    | 'disabled-faces'
    | 'construction-faces'
    | 'duplicate-construction-edges'
    | 'unsupported-faces-omitted'
    | 'quads-to-source-triangles'
    | 'editable-quad-adaptation'
  node: number
  path: string
  /** Face occurrences, not triangle count or an enumeration of all affected source paths. */
  count: number
}
export const BBMODEL_CUBE_SURFACES = {
  north: 'nz',
  east: 'px',
  south: 'pz',
  west: 'nx',
  up: 'py',
  down: 'ny',
} as const satisfies Record<BbmodelCubeDirection, string>

export function readBbmodelNativeGeometryOptions(value: BbmodelNativeGeometryOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha opções de geometria.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'quads' || key === 'unsupportedFaces',
      `options.${key}`,
      'Esta opção de geometria não é conhecida.',
    )
  const quads = value.quads === undefined ? 'source-triangles' : value.quads
  const unsupportedFaces = value.unsupportedFaces === undefined ? 'reject' : value.unsupportedFaces
  requireBbmodel(
    quads === 'source-triangles' || quads === 'editable-quads',
    'options.quads',
    'Escolha como converter as faces de quatro cantos.',
  )
  requireBbmodel(
    unsupportedFaces === 'reject' || unsupportedFaces === 'omit',
    'options.unsupportedFaces',
    'Escolha como tratar as faces ainda não suportadas.',
  )
  return { quads, unsupportedFaces }
}
function budget(value: number, max: number, path: string): void {
  if (value > max)
    throw new BbmodelInputError(
      'budget',
      path,
      'A geometria ultrapassa o limite de edição do Molda.',
    )
}
function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

/**
 * Bounded topology/cost plan for matching immutable geometry and selection.
 * No source XYZ/UV, normal/box/appearance approval, raster decode or native materialization.
 */
export function planBbmodelNativeGeometry(
  source: readonly BbmodelGeometrySource[],
  selection: BbmodelSelection,
  options: BbmodelNativeGeometryOptions = {},
) {
  const policy = readBbmodelNativeGeometryOptions(options)
  budget(
    selection.geometries.length,
    Math.min(SCENE_LIMITS.geometries, SCENE_LIMITS.renderedParts),
    'geometries',
  )
  const byNode = new Map(source.map((shape) => [shape.node, shape]))
  const shapes = selection.geometries.map((node) => {
    const shape = byNode.get(node)
    requireBbmodel(
      shape !== undefined && shape.kind !== 'unresolved',
      'geometries',
      'A parte selecionada precisa ter uma geometria conhecida.',
    )
    return shape
  })
  let vertices = 0,
    triangles = 0,
    edges = 0
  // Every retained point, including unused/disabled/construction points, before face planning.
  for (const shape of shapes) {
    vertices += shape.kind === 'cube' ? 8 : shape.vertexIds.length
    budget(vertices, SCENE_LIMITS.vertices, `${shape.sourcePath}.vertices`)
  }
  // Reuse our own cube topology; these unit coordinates do not read or repair source endpoints.
  const cube = boxMesh([0, 0, 0], [1, 1, 1])
  const cubeIndices = new Map(Object.keys(cube.vertices).map((id, i) => [id, i]))
  const plans: BbmodelNativeGeometryPlan[] = []
  const issues: BbmodelTopologyIssue[] = []
  for (const shape of shapes) {
    const plan: BbmodelNativeGeometryPlan = {
      node: shape.node,
      kind: shape.kind,
      geometryId: `bbmodel_geometry_${shape.node}`,
      sourcePath: shape.sourcePath,
      vertexCount: shape.kind === 'cube' ? 8 : shape.vertexIds.length,
      faces: [],
      looseEdges: [],
      costs: {
        vertices: shape.kind === 'cube' ? 8 : shape.vertexIds.length,
        triangles: 0,
        looseEdges: 0,
      },
    }
    const counts = new Map<BbmodelTopologyIssue['code'], number>()
    const issue = (code: BbmodelTopologyIssue['code']) =>
      counts.set(code, (counts.get(code) ?? 0) + 1)
    const seenEdges = new Set<string>()
    const surfaceEdges = new Set<string>()
    const allCubeEdges = new Map<string, [number, number]>()
    const addEdge = (a: number, b: number) => {
      const key = edgeKey(a, b)
      if (a === b || seenEdges.has(key)) return false
      budget(edges + 1, SCENE_LIMITS.looseEdges, shape.sourcePath)
      edges++
      plan.costs.looseEdges++
      seenEdges.add(key)
      plan.looseEdges.push([a, b])
      return true
    }
    for (let sourceFace = 0; sourceFace < shape.faces.length; sourceFace++) {
      const face = shape.faces[sourceFace]!
      const path =
        shape.kind === 'cube'
          ? bbmodelKeyPath(`${shape.sourcePath}.faces`, shape.faces[sourceFace]!.direction)
          : bbmodelKeyPath(`${shape.sourcePath}.faces`, shape.faces[sourceFace]!.id)
      const indices =
        shape.kind === 'cube'
          ? cube.faces[`f_${BBMODEL_CUBE_SURFACES[shape.faces[sourceFace]!.direction]}`]!.v.map(
              (id) => cubeIndices.get(id)!,
            )
          : Array.from(shape.faces[sourceFace]!.vertices)
      if (shape.kind === 'cube')
        for (let i = 0; i < indices.length; i++) {
          const a = indices[i]!,
            b = indices[(i + 1) % indices.length]!
          allCubeEdges.set(edgeKey(a, b), [a, b])
        }
      // Mesh outlines exist independently of texture/visibility on non-surface faces.
      if (shape.kind === 'mesh' && indices.length < 3) {
        issue('construction-faces')
        if (indices.length === 2 && !addEdge(indices[0]!, indices[1]!))
          issue('duplicate-construction-edges')
        continue
      }
      if (face.texture.kind === 'disabled') {
        issue('disabled-faces')
        continue
      }
      if (indices.length > 4 || new Set(indices).size !== indices.length) {
        if (policy.unsupportedFaces === 'reject')
          throw new BbmodelInputError(
            'unsupported',
            path,
            'Esta face não pode ser convertida sem omissão. Seus pontos foram preservados na fonte.',
          )
        issue('unsupported-faces-omitted')
        continue
      }
      const count = indices.length - 2
      budget(triangles + count, SCENE_LIMITS.triangles, path)
      triangles += count
      plan.costs.triangles += count
      const split =
        shape.kind === 'mesh' && indices.length === 4 && policy.quads === 'source-triangles'
      if (shape.kind === 'mesh' && indices.length === 4)
        issue(split ? 'quads-to-source-triangles' : 'editable-quad-adaptation')
      const polygons = split
        ? [
            [0, 1, 2],
            [0, 2, 3],
          ]
        : [indices.map((_, i) => i)]
      for (let polygon = 0; polygon < polygons.length; polygon++)
        plan.faces.push({
          id: `f_${sourceFace}_${polygon}`,
          sourceFace,
          corners: polygons[polygon]!.map((sourceCorner) => ({
            vertex: indices[sourceCorner]!,
            sourceCorner,
          })),
        })
      if (shape.kind === 'cube')
        for (let i = 0; i < indices.length; i++)
          surfaceEdges.add(edgeKey(indices[i]!, indices[(i + 1) % indices.length]!))
    }
    // A box still has its authored wire cage when surfaces are disabled. Keep only uncovered edges.
    for (const [key, [a, b]] of allCubeEdges) if (!surfaceEdges.has(key)) addEdge(a, b)
    for (const [code, count] of counts)
      issues.push({ code, node: shape.node, path: shape.sourcePath, count })
    plans.push(plan)
  }
  return { plans, issues, costs: { vertices, triangles, looseEdges: edges } }
}
