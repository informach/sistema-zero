import type { SceneMeshFace, SceneMeshGeometry } from './document'
import type { SceneComponentMode } from './meshComponents'
import { meshFaceFrame, requireAffineFaceUv } from './meshFaceFrame'
import { editMeshFaces } from './meshFaces'
import { prepareMeshRemoval } from './meshRemoval'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { triangulateFace } from './triangulate'
import { choice, SceneValidationError } from './validation'

export const MESH_ISSUE_MODES = {
  'invalid-faces': 'face',
  'duplicate-faces': 'face',
  'prepare-faces': 'face',
  'conflicting-winding': 'edge',
  'ambiguous-edges': 'edge',
  'open-edges': 'edge',
  'overlapping-points': 'vertex',
  'unused-points': 'vertex',
  'empty-lines': 'edge',
  'duplicate-lines': 'edge',
} as const satisfies Record<string, SceneComponentMode>
export type MeshIssueKind = keyof typeof MESH_ISSUE_MODES
export interface SceneMeshIssue {
  kind: MeshIssueKind
  ids: string[]
  count: number
}
export const MESH_ISSUE_KINDS = Object.keys(MESH_ISSUE_MODES) as MeshIssueKind[]
export const MESH_FIX_KINDS = [
  'invalid-faces',
  'duplicate-faces',
  'prepare-faces',
  'unused-points',
  'empty-lines',
  'duplicate-lines',
] as const
export type MeshFixKind = (typeof MESH_FIX_KINDS)[number]
export const isMeshFixKind = (kind: MeshIssueKind): kind is MeshFixKind =>
  MESH_FIX_KINDS.some((fix) => fix === kind)

function faceSignature(face: SceneMeshFace) {
  const start = face.corners.reduce(
    (best, corner, i) => (corner.vertexId < face.corners[best]!.vertexId ? i : best),
    0,
  )
  return JSON.stringify([
    face.materialId ?? null,
    [...face.corners.slice(start), ...face.corners.slice(0, start)].map((c) => [
      c.vertexId,
      ...c.uv,
    ]),
  ])
}

/** Advisory findings, never inferred authoring intent. Expensive scans belong to a cancellable worker. */
export function diagnoseSceneMesh(mesh: SceneMeshGeometry): SceneMeshIssue[] {
  const findings = new Map<MeshIssueKind, string[]>()
  const add = (kind: MeshIssueKind, id: string) => {
    const ids = findings.get(kind) ?? []
    ids.push(id)
    findings.set(kind, ids)
  }
  const used = new Set<string>()
  const positions = new Map<string, string[]>()
  for (const [id, point] of Object.entries(mesh.vertices)) {
    const key = JSON.stringify(point)
    const group = positions.get(key) ?? []
    group.push(id)
    positions.set(key, group)
  }
  for (const group of positions.values())
    if (group.length > 1) for (const id of group) add('overlapping-points', id)
  const signatures = new Set<string>()
  for (const [id, face] of Object.entries(mesh.faces)) {
    for (const corner of face.corners) used.add(corner.vertexId)
    const result = triangulateFace(face.corners.map((c) => mesh.vertices[c.vertexId]!))
    if (result.status !== 'ok') {
      add('invalid-faces', id)
      continue
    }
    const signature = faceSignature(face)
    if (signatures.has(signature)) add('duplicate-faces', id)
    signatures.add(signature)
    if (face.corners.length > 3) {
      try {
        requireAffineFaceUv(meshFaceFrame(mesh, id))
      } catch (error) {
        if (!(error instanceof SceneValidationError)) throw error
        add('prepare-faces', id)
      }
    }
  }
  for (const [id, edges] of indexMeshEdges(mesh).edges) {
    if (edges.length === 1) add('open-edges', id)
    else if (edges.length > 2) add('ambiguous-edges', id)
    else if (edges[0]!.a !== edges[1]!.b) add('conflicting-winding', id)
  }
  const seenLines = new Set<string>()
  for (const [a, b] of mesh.looseEdges) {
    used.add(a)
    used.add(b)
    const key = meshEdgeKey(a, b)
    if (mesh.vertices[a]!.every((v, axis) => v === mesh.vertices[b]![axis])) add('empty-lines', key)
    if (seenLines.has(key)) add('duplicate-lines', key)
    seenLines.add(key)
  }
  for (const id of Object.keys(mesh.vertices)) if (!used.has(id)) add('unused-points', id)
  return MESH_ISSUE_KINDS.flatMap((kind) => {
    const ids = findings.get(kind)
    return ids?.length ? [{ kind, ids: [...new Set(ids)], count: ids.length }] : []
  })
}

/** Recompute findings from this immutable source; never blindly apply IDs returned by an old scan. */
export function repairSceneMesh(mesh: SceneMeshGeometry, kind: MeshFixKind): SceneMeshGeometry {
  choice(kind, MESH_FIX_KINDS, 'fix')
  const issue = diagnoseSceneMesh(mesh).find((entry) => entry.kind === kind)
  if (!issue) return mesh
  if (kind === 'unused-points')
    return prepareMeshRemoval(mesh, { mode: 'vertex', ids: issue.ids }).apply()
  if (kind === 'invalid-faces' || kind === 'duplicate-faces')
    return editMeshFaces(mesh, issue.ids, 'remove')
  if (kind === 'prepare-faces') return editMeshFaces(mesh, issue.ids, 'triangulate')
  const chosen = new Set(issue.ids)
  const seen = new Set<string>()
  return {
    ...mesh,
    looseEdges: mesh.looseEdges.filter(([a, b]) => {
      const key = meshEdgeKey(a, b)
      const duplicate = seen.has(key)
      seen.add(key)
      return !chosen.has(key) || (kind === 'duplicate-lines' && !duplicate)
    }),
  }
}
