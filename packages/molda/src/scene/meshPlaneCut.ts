import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { dot, sub } from '../model/vec'
import type { SceneMeshFace, SceneMeshGeometry, Vec2 } from './document'
import { SCENE_LIMITS } from './limits'
import { meshFaceFrame, requireAffineFaceUv, requireConvexMeshFace } from './meshFaceFrame'
import { indexMeshEdges, meshEdgeKey, meshIdAllocator } from './meshTopology'
import { number, requireScene, tuple } from './validation'

export interface MeshCutPlane {
  origin: Vec3
  normal: Vec3
}

/** Weighted interpolation retains Double coordinates and avoids overflowing b - a. */
function between(a: number, b: number, t: number) {
  return number((1 - t) * a + t * b, 'cut')
}

/** Split surfaces and construction lines; keep both sides, sharing intersection points, never capping or deleting. */
export function cutMeshByPlane(
  mesh: SceneMeshGeometry,
  plane: MeshCutPlane,
  nextId: () => string = newId,
) {
  tuple(plane.origin, 3, 'plane.origin')
  tuple(plane.normal, 3, 'plane.normal')
  const normalScale = Math.max(...plane.normal.map(Math.abs))
  requireScene(normalScale > 0, 'plane.normal', 'Escolha uma direção para o corte.')
  const scaled = plane.normal.map((v) => v / normalScale)
  const length = Math.hypot(...scaled)
  const normal = scaled.map((v) => v / length) as Vec3
  const axisAligned =
    normal.filter((v) => v !== 0).length === 1 ? normal.findIndex((v) => v !== 0) : -1
  const distances = new Map(
    Object.entries(mesh.vertices).map(([id, p]) => [
      id,
      number(dot(sub(p, plane.origin), normal), 'plane'),
    ]),
  )
  const temporary = new Set([...Object.keys(mesh.vertices), ...Object.keys(mesh.faces)])
  let serial = 0
  const reserve = () => {
    let id = `plane:${serial++}`
    while (temporary.has(id)) id = `plane:${serial++}`
    temporary.add(id)
    return id
  }
  const crossings = new Map<string, { id: string; a: string; b: string; t: number; point: Vec3 }>()
  const topology = indexMeshEdges(mesh)
  const edges = new Map<string, readonly [string, string]>(
    [...topology.edges].map(([id, entries]) => [id, [entries[0]!.a, entries[0]!.b]]),
  )
  for (const pair of mesh.looseEdges) edges.set(meshEdgeKey(...pair), pair)
  for (const [key, [a, b]] of edges) {
    const da = distances.get(a)
    const db = distances.get(b)
    requireScene(da !== undefined && db !== undefined, 'vertices', 'Ponto ausente no corte.')
    if (!((da < 0 && db > 0) || (da > 0 && db < 0))) continue
    const scale = Math.max(Math.abs(da), Math.abs(db))
    const t = da / scale / (da / scale - db / scale)
    requireScene(
      t > 0 && t < 1,
      'cut',
      'Esse corte ultrapassa a precisão dos pontos. Afaste-o da borda.',
    )
    const pa = mesh.vertices[a]!
    const pb = mesh.vertices[b]!
    const point = pa.map((v, axis) => between(v, pb[axis]!, t)) as Vec3
    if (axisAligned >= 0) point[axisAligned] = plane.origin[axisAligned]!
    requireScene(
      [pa, pb].every((p) => p.some((v, axis) => v !== point[axis])),
      'cut',
      'Esse corte ficaria sobre um ponto existente. Afaste-o da borda.',
    )
    crossings.set(key, { id: reserve(), a, b, t, point })
  }
  const vertices = Object.fromEntries([
    ...Object.entries(mesh.vertices),
    ...[...crossings.values()].map((c) => [c.id, c.point] as const),
  ])
  const faces: Array<[string, SceneMeshFace]> = []
  const sourceFaceIds = new Map<string, string>()
  const faceSides = new Map<string, -1 | 0 | 1>()
  const changedFaces: string[] = []
  const newFaces = new Set<string>()
  for (const [id, face] of Object.entries(mesh.faces)) {
    const signs = face.corners.map((c) => distances.get(c.vertexId)!)
    if (!signs.some((d) => d < 0) || !signs.some((d) => d > 0)) {
      faces.push([id, face])
      sourceFaceIds.set(id, id)
      faceSides.set(id, signs.some((d) => d < 0) ? -1 : signs.some((d) => d > 0) ? 1 : 0)
      continue
    }
    const frame = meshFaceFrame(mesh, id)
    requireConvexMeshFace(
      frame,
      'Divida a face com reentrâncias em triângulos antes desse corte.',
      true,
    )
    requireAffineFaceUv(frame)
    const clip = (side: number): SceneMeshFace => {
      const corners: SceneMeshFace['corners'] = []
      face.corners.forEach((a, i) => {
        const b = face.corners[(i + 1) % face.corners.length]!
        if (signs[i]! * side >= 0) corners.push(a)
        const crossing = crossings.get(meshEdgeKey(a.vertexId, b.vertexId))
        if (!crossing) return
        const t = crossing.a === a.vertexId ? crossing.t : 1 - crossing.t
        corners.push({
          vertexId: crossing.id,
          uv: a.uv.map((v, axis) => between(v, b.uv[axis]!, t)) as Vec2,
        })
      })
      requireScene(
        corners.length >= 3 && corners.length <= SCENE_LIMITS.faceCorners,
        'faces',
        'Esse corte ultrapassa o limite de cantos de uma face.',
      )
      return { ...face, corners }
    }
    const firstSide = signs[0]! < 0 ? -1 : 1
    const first = clip(firstSide)
    const second = clip(-firstSide)
    const childId = reserve()
    const children = { ...mesh, vertices, faces: { first, second } }
    for (const child of ['first', 'second']) {
      requireScene(
        dot(meshFaceFrame(children, child).normal, frame.normal) >= 1 - 1e-10,
        'cut',
        'O corte ficou estreito demais. Mova o plano um pouco.',
      )
    }
    faces.push([id, first], [childId, second])
    sourceFaceIds.set(id, id)
    sourceFaceIds.set(childId, id)
    faceSides.set(id, firstSide)
    faceSides.set(childId, firstSide === 1 ? -1 : 1)
    changedFaces.push(id, childId)
    newFaces.add(childId)
  }
  const looseEdges = mesh.looseEdges.flatMap((edge): Array<[string, string]> => {
    const crossing = crossings.get(meshEdgeKey(...edge))
    return crossing
      ? [
          [edge[0], crossing.id],
          [crossing.id, edge[1]],
        ]
      : [edge]
  })
  requireScene(
    Object.keys(vertices).length <= SCENE_LIMITS.vertices &&
      looseEdges.length <= SCENE_LIMITS.looseEdges &&
      faces.reduce((sum, [, face]) => sum + face.corners.length - 2, 0) <= SCENE_LIMITS.triangles,
    'cut',
    'Esse corte ultrapassa o orçamento da malha.',
  )
  if (!crossings.size && !changedFaces.length)
    return { mesh, vertexIds: [], faceIds: [], edgeIds: [], sourceFaceIds, faceSides }
  const allocate = meshIdAllocator(mesh, nextId)
  const assigned = new Map([...crossings.values()].map((c) => [c.id, allocate()]))
  for (const id of newFaces) assigned.set(id, allocate())
  const actual = (id: string) => assigned.get(id) ?? id
  const changed = new Set(changedFaces)
  const result: SceneMeshGeometry = {
    ...mesh,
    vertices: Object.fromEntries(Object.entries(vertices).map(([id, p]) => [actual(id), p])),
    faces: Object.fromEntries(
      faces.map(([id, face]) => [
        actual(id),
        changed.has(id)
          ? {
              ...face,
              corners: face.corners.map((c) =>
                assigned.has(c.vertexId) ? { ...c, vertexId: actual(c.vertexId) } : c,
              ),
            }
          : face,
      ]),
    ),
    looseEdges: looseEdges.map((pair) =>
      assigned.has(pair[0]) || assigned.has(pair[1]) ? [actual(pair[0]), actual(pair[1])] : pair,
    ),
  }
  const onPlane = new Set([
    ...[...distances].filter(([, distance]) => distance === 0).map(([id]) => id),
    ...[...crossings.values()].map((c) => actual(c.id)),
  ])
  const edgeIds = [...indexMeshEdges(result).edges]
    .filter(
      ([id, incident]) =>
        !topology.edges.has(id) && onPlane.has(incident[0]!.a) && onPlane.has(incident[0]!.b),
    )
    .map(([id]) => id)
  return {
    mesh: result,
    vertexIds: [...crossings.values()].map((c) => actual(c.id)),
    faceIds: changedFaces.map(actual),
    edgeIds,
    sourceFaceIds: new Map([...sourceFaceIds].map(([id, source]) => [actual(id), source])),
    faceSides: new Map([...faceSides].map(([id, side]) => [actual(id), side])),
  }
}
