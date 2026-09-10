import { BBMODEL_CUBE_DIRECTIONS, type BbmodelCubeDirection } from './bbmodelGeometryTypes'
import type { BbmodelGraph } from './bbmodelGraph'
import {
  BBMODEL_INPUT_LIMITS,
  BbmodelInputError,
  bbmodelIdentifier,
  bbmodelList,
  bbmodelRecord,
} from './bbmodelInput'
import { bbmodelKeyPath, bbmodelKeys } from './bbmodelValues'

export interface BbmodelCubePlan {
  kind: 'cube'
  node: number
  path: string
  source: Readonly<Record<string, unknown>>
  faces: Array<{ direction: BbmodelCubeDirection; source: Record<string, unknown>; path: string }>
}
export interface BbmodelMeshPlan {
  kind: 'mesh'
  node: number
  path: string
  source: Readonly<Record<string, unknown>>
  vertices: Record<string, unknown>
  vertexIds: string[]
  faces: Array<{
    id: string
    path: string
    source: Record<string, unknown>
    vertices: readonly unknown[]
    uv: Record<string, unknown>
    uvKeys: string[]
  }>
}
export type BbmodelGeometryPlan =
  | BbmodelCubePlan
  | BbmodelMeshPlan
  | { kind: 'unresolved'; node: number; sourcePath: string; type: string | null }

/** All shapes' cardinalities before ANY coordinates or UV values, including hidden/disabled shapes. */
export function planBbmodelGeometry(graph: BbmodelGraph): BbmodelGeometryPlan[] {
  const plans: BbmodelGeometryPlan[] = []
  let vertices = 0,
    faces = 0,
    corners = 0,
    uvPoints = 0
  for (let node = 0; node < graph.nodes.length; node++) {
    const entry = graph.nodes[node]!
    if (entry.kind === 'group') continue
    const { data: source, path } = entry.source
    const type = source.type === undefined ? null : bbmodelIdentifier(source.type, `${path}.type`)
    if (type !== 'cube' && type !== 'mesh') {
      plans.push({ kind: 'unresolved', node, sourcePath: path, type })
      continue
    }
    const faceRows = bbmodelRecord(source.faces, `${path}.faces`)
    const faceKeys = bbmodelKeys(
      faceRows,
      BBMODEL_INPUT_LIMITS.geometryFaces - faces,
      `${path}.faces`,
    )
    faces += faceKeys.length
    if (type === 'cube') {
      if (
        faceKeys.length !== 6 ||
        faceKeys.some((key) => !BBMODEL_CUBE_DIRECTIONS.some((direction) => direction === key))
      )
        throw new BbmodelInputError(
          'unsupported',
          `${path}.faces`,
          'O cubo precisa declarar suas seis faces para abrir sem inventar dados.',
        )
      plans.push({
        kind: 'cube',
        node,
        path,
        source,
        faces: BBMODEL_CUBE_DIRECTIONS.map((direction) => {
          const facePath = bbmodelKeyPath(`${path}.faces`, direction)
          return { direction, path: facePath, source: bbmodelRecord(faceRows[direction], facePath) }
        }),
      })
      continue
    }
    const vertexRows = bbmodelRecord(source.vertices, `${path}.vertices`)
    const vertexIds = bbmodelKeys(
      vertexRows,
      BBMODEL_INPUT_LIMITS.geometryVertices - vertices,
      `${path}.vertices`,
    )
    vertices += vertexIds.length
    const facePlans: BbmodelMeshPlan['faces'] = []
    for (const id of faceKeys) {
      const facePath = bbmodelKeyPath(`${path}.faces`, id)
      const face = bbmodelRecord(faceRows[id], facePath)
      const refs = bbmodelList(
        face.vertices,
        `${facePath}.vertices`,
        BBMODEL_INPUT_LIMITS.faceCorners,
      )
      corners += refs.length
      if (corners > BBMODEL_INPUT_LIMITS.geometryCorners)
        throw new BbmodelInputError(
          'budget',
          `${facePath}.vertices`,
          'Há cantos de faces demais neste arquivo.',
        )
      const uv = face.uv === undefined ? {} : bbmodelRecord(face.uv, `${facePath}.uv`)
      const uvKeys = bbmodelKeys(
        uv,
        BBMODEL_INPUT_LIMITS.geometryUvPoints - uvPoints,
        `${facePath}.uv`,
      )
      uvPoints += uvKeys.length
      facePlans.push({ id, path: facePath, source: face, vertices: refs, uv, uvKeys })
    }
    plans.push({
      kind: 'mesh',
      node,
      path,
      source,
      vertices: vertexRows,
      vertexIds,
      faces: facePlans,
    })
  }
  return plans
}
