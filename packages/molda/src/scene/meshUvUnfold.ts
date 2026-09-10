import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry, Vec2 } from './document'
import { faceTurn } from './meshFaceFrame'
import { indexMeshEdges, type SceneHalfEdge } from './meshTopology'
import { mapMeshUv } from './meshUv'
import { projectMeshUvFaces, requireMeshUvFaceArea } from './meshUvAutoProjection'
import { packMeshUvGroups } from './meshUvPacking'
import { triangulateFace } from './triangulate'
import * as v from './validation'

// Bound overlap work per chart instead of comparing every selected face with every other face.
const MAX_CHART_FACES = 64
const MAX_CHART_TRIANGLES = 128
interface FlatFace {
  points: Vec2[]
  triangles: Array<[number, number, number]>
  min: Vec2
  max: Vec2
}
function flatFace(points: Vec2[]): FlatFace | null {
  const result = triangulateFace(points.map((p): Vec3 => [p[0], p[1], 0]))
  if (result.status !== 'ok') return null
  return {
    points,
    triangles: result.triangles,
    min: [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))],
    max: [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))],
  }
}

/** Strict separating axes: boundary contact is allowed; no epsilon accepts a small overlap. */
function trianglesOverlap(a: Vec2[], b: Vec2[]) {
  for (const [polygon, other] of [
    [a, b],
    [b, a],
  ] as const) {
    const sign = Math.sign(faceTurn(polygon[0]!, polygon[1]!, polygon[2]!))
    if (!sign) return true // Uncertain geometry cannot authorize a join.
    for (let i = 0; i < 3; i++) {
      const p = polygon[i]!,
        q = polygon[(i + 1) % 3]!
      // Cross products keep the edge's own endpoints exactly zero. Normalizing
      // separate normal components introduces a spurious overlap along a shared edge.
      if (other.every((point) => faceTurn(p, q, point) * sign <= 0)) return false
    }
  }
  return true
}
function overlap(a: FlatFace, b: FlatFace) {
  if ([0, 1].some((axis) => a.max[axis]! <= b.min[axis]! || b.max[axis]! <= a.min[axis]!))
    return false
  return a.triangles.some((left) =>
    b.triangles.some((right) =>
      trianglesOverlap(
        left.map((i) => a.points[i]!),
        right.map((i) => b.points[i]!),
      ),
    ),
  )
}

function unfoldNeighbor(
  parent: FlatFace,
  edge: SceneHalfEdge,
  child: FlatFace,
  opposite: SceneHalfEdge,
) {
  const a = child.points[opposite.corner]!,
    b = child.points[(opposite.corner + 1) % child.points.length]!
  const targetA = parent.points[(edge.corner + 1) % parent.points.length]!,
    targetB = parent.points[edge.corner]!
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    tx = targetB[0] - targetA[0],
    ty = targetB[1] - targetA[1]
  const length = Math.hypot(dx, dy),
    targetLength = Math.hypot(tx, ty)
  if (
    !length ||
    !targetLength ||
    Math.abs(length - targetLength) > Math.max(length, targetLength) * 1e-10
  )
    return null
  let cosine = (dx / length) * (tx / targetLength) + (dy / length) * (ty / targetLength)
  let sine = (dx / length) * (ty / targetLength) - (dy / length) * (tx / targetLength)
  const norm = Math.hypot(cosine, sine)
  if (!norm) return null
  cosine /= norm
  sine /= norm
  const points = child.points.map((point): Vec2 => {
    const x = point[0] - a[0],
      y = point[1] - a[1]
    return [targetA[0] + x * cosine - y * sine, targetA[1] + x * sine + y * cosine]
  })
  // Exact shared endpoints, not a tolerance-based weld. These are newly generated UVs only.
  points[opposite.corner] = [...targetA]
  points[(opposite.corner + 1) % points.length] = [...targetB]
  return flatFace(points)
}

/**
 * Greedy rigid unfolding of planar facets. Not angle relaxation or a minimum-seam solver.
 * Explicit cuts are barriers; non-manifold/material boundaries and overlaps stay separated.
 * The result stores only canonical per-corner UV, never a second authorial seam map.
 */
export function unfoldMeshUv(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  padding: number,
  cuts: readonly string[] = [],
) {
  v.number(padding, 'uv.padding', 0, 0.25)
  const { selected, planar } = projectMeshUvFaces(mesh, ids)
  const chosen = new Set(selected),
    topology = indexMeshEdges(mesh)
  const barriers = new Set(cuts)
  v.requireScene(barriers.size === cuts.length, 'uv.cuts', 'Escolha cada corte uma vez.')
  for (const key of barriers)
    v.requireScene(
      topology.edges.get(key)?.some((edge) => chosen.has(edge.faceId)),
      'uv.cuts',
      'Esse corte não pertence às faces escolhidas.',
    )
  if (!selected.length) return mesh
  const originals = new Map(
    selected.map((id) => {
      const face = flatFace(planar.faces[id]!.corners.map((corner) => corner.uv))
      v.requireScene(face, 'uv', 'A face não tem espaço suficiente para abrir sem perder precisão.')
      return [id, face] as const
    }),
  )
  const placed = new Map<string, FlatFace>(),
    groups: string[][] = []
  for (const root of [...selected].sort()) {
    if (placed.has(root)) continue
    const group = [root]
    const members = new Set(group)
    groups.push(group)
    placed.set(root, originals.get(root)!)
    let triangles = originals.get(root)!.triangles.length
    for (let cursor = 0; cursor < group.length; cursor++) {
      const id = group[cursor]!,
        parent = placed.get(id)!
      for (const key of topology.byFace.get(id)!) {
        if (barriers.has(key) || group.length >= MAX_CHART_FACES) continue
        const incident = topology.edges.get(key)!
        if (incident.length !== 2) continue
        const edge = incident.find((edge) => edge.faceId === id)!,
          opposite = incident.find((e) => e.faceId !== id)
        if (
          !opposite ||
          opposite.a !== edge.b ||
          opposite.b !== edge.a ||
          !chosen.has(opposite.faceId) ||
          placed.has(opposite.faceId) ||
          mesh.faces[id]!.materialId !== mesh.faces[opposite.faceId]!.materialId
        )
          continue
        const source = originals.get(opposite.faceId)!
        if (triangles + source.triangles.length > MAX_CHART_TRIANGLES) continue
        // A different path around a cycle must not silently reconnect an explicit cut.
        if (
          topology.byFace
            .get(opposite.faceId)!
            .some(
              (key) =>
                barriers.has(key) &&
                topology.edges.get(key)!.some((entry) => members.has(entry.faceId)),
            )
        )
          continue
        const candidate = unfoldNeighbor(parent, edge, source, opposite)
        if (!candidate || group.some((faceId) => overlap(placed.get(faceId)!, candidate))) continue
        placed.set(opposite.faceId, candidate)
        group.push(opposite.faceId)
        members.add(opposite.faceId)
        triangles += candidate.triangles.length
      }
    }
  }
  const opened = mapMeshUv(mesh, selected, (_uv, id, corner) => placed.get(id)!.points[corner]!)
  const packed = packMeshUvGroups(opened, groups, padding)
  requireMeshUvFaceArea(packed, selected)
  // Packing also changes floating-point scale/translation: check the final coordinates,
  // not only the candidate before packing. This work stays bounded by chart size.
  for (const group of groups) {
    const faces = group.map((id) => flatFace(packed.faces[id]!.corners.map((corner) => corner.uv))!)
    for (let i = 0; i < faces.length; i++)
      for (let j = i + 1; j < faces.length; j++)
        v.requireScene(
          !overlap(faces[i]!, faces[j]!),
          'uv',
          'Essas faces ficam sobrepostas ao caber na textura. Separe mais cortes ou abra por faces.',
        )
  }
  for (const key of barriers) {
    const incident = topology.edges.get(key)!
    if (incident.length !== 2 || incident.some((edge) => !chosen.has(edge.faceId))) continue
    const [a, b] = incident as [SceneHalfEdge, SceneHalfEdge]
    if (a.a !== b.b || a.b !== b.a) continue
    const left = packed.faces[a.faceId]!.corners,
      right = packed.faces[b.faceId]!.corners
    v.requireScene(
      left[a.corner]!.uv.some(
        (value, axis) => value !== right[(b.corner + 1) % right.length]!.uv[axis],
      ) ||
        left[(a.corner + 1) % left.length]!.uv.some(
          (value, axis) => value !== right[b.corner]!.uv[axis],
        ),
      'uv.cuts',
      'A margem não deixa espaço para esse corte. Aumente a margem entre ilhas.',
    )
  }
  return packed
}
