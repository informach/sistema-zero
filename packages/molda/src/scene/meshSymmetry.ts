import { newId } from '../core/id'
import type { SceneMeshGeometry, SceneMeshSymmetry } from './document'
import { meshLocalBox, mirrorMeshFaces } from './meshComponentOperations'
import type { SceneComponentMode } from './meshComponents'
import { meshEdgeKey } from './meshTopology'
import * as v from './validation'

const sources = new WeakMap<SceneMeshGeometry, SceneMeshGeometry>()
/** Editing sees only authorial topology. Drawing/export keep the materialized full geometry. */
export function meshSymmetrySource(mesh: SceneMeshGeometry): SceneMeshGeometry {
  if (!mesh.symmetry) return mesh
  const cached = sources.get(mesh)
  if (cached) return cached
  const { symmetry, ...base } = mesh,
    generated = new Set(Object.values(symmetry.faces))
  const faces = Object.fromEntries(Object.entries(mesh.faces).filter(([id]) => !generated.has(id)))
  const used = new Set(Object.values(faces).flatMap((f) => f.corners.map((c) => c.vertexId)))
  for (const edge of mesh.looseEdges) for (const id of edge) used.add(id)
  const removed = new Set(
    Object.entries(symmetry.vertices)
      .filter(([a, b]) => a !== b)
      .map(([, b]) => b),
  )
  const result = {
    ...base,
    faces,
    vertices: Object.fromEntries(
      Object.entries(mesh.vertices).filter(([id]) => !removed.has(id) || used.has(id)),
    ),
  }
  sources.set(mesh, result)
  return result
}

export function symmetrySourceIds(
  mesh: SceneMeshGeometry,
  mode: SceneComponentMode,
  ids: readonly string[],
) {
  const symmetry = mesh.symmetry
  if (!symmetry) return [...new Set(ids)]
  const vertices = new Map(Object.entries(symmetry.vertices).map(([a, b]) => [b, a])),
    faces = new Map(Object.entries(symmetry.faces).map(([a, b]) => [b, a]))
  return [
    ...new Set(
      ids.map((id) => {
        if (mode === 'face') return faces.get(id) ?? id
        if (mode === 'vertex') return vertices.get(id) ?? id
        let pair: unknown
        try {
          pair = JSON.parse(id)
        } catch {
          return id
        }
        if (
          !Array.isArray(pair) ||
          pair.length !== 2 ||
          typeof pair[0] !== 'string' ||
          typeof pair[1] !== 'string'
        )
          return id
        return meshEdgeKey(vertices.get(pair[0]) ?? pair[0], vertices.get(pair[1]) ?? pair[1])
      }),
    ),
  ]
}

/** A cut can insert points into an unselected neighbor without editing that region. */
function preservesBoundary(before: SceneMeshGeometry, after: SceneMeshGeometry, id: string) {
  const old = before.faces[id]!,
    face = after.faces[id]
  if (!face || old.materialId !== face.materialId || face.corners.length < old.corners.length)
    return false
  const start = face.corners.findIndex((c) => c.vertexId === old.corners[0]!.vertexId)
  if (start < 0) return false
  const corners = [...face.corners.slice(start), ...face.corners.slice(0, start)],
    oldIds = new Set(old.corners.map((c) => c.vertexId))
  let cursor = 0
  for (let i = 0; i < old.corners.length; i++) {
    const a = old.corners[i]!,
      b = old.corners[(i + 1) % old.corners.length]!,
      first = corners[cursor++]
    if (first?.vertexId !== a.vertexId || !first.uv.every((n, axis) => n === a.uv[axis]))
      return false
    const p = after.vertices[a.vertexId],
      q = after.vertices[b.vertexId]
    if (!p || !q) return false
    const extent = Math.max(...p.map((n, axis) => Math.abs(q[axis]! - n)))
    const vector = p.map((n, axis) => (q[axis]! - n) / extent),
      length = vector.reduce((n, v) => n + v * v, 0)
    let last = 0
    while (cursor < corners.length && corners[cursor]!.vertexId !== b.vertexId) {
      const inserted = corners[cursor++]!
      if (oldIds.has(inserted.vertexId) || !after.vertices[inserted.vertexId]) return false
      const point = after.vertices[inserted.vertexId]!.map((n, axis) => (n - p[axis]!) / extent),
        t = point.reduce((n, v, axis) => n + v * vector[axis]!, 0) / length
      if (
        !(t > last && t < 1) ||
        point.some((n, axis) => Math.abs(n - t * vector[axis]!) > 1e-10) ||
        inserted.uv.some(
          (n, axis) => Math.abs(n - ((1 - t) * a.uv[axis]! + t * b.uv[axis]!)) > 1e-10,
        )
      )
        return false
      last = t
    }
  }
  return cursor === corners.length
}

/** Stable pairs survive changes; new source topology gets pairs in the same transaction. */
export function synchronizeMeshSymmetry(
  previous: SceneMeshGeometry,
  edited: SceneMeshGeometry,
  nextId = newId,
  includeNewFaces = false,
): SceneMeshGeometry {
  const symmetry = previous.symmetry
  if (!symmetry || edited.symmetry) return edited
  const base = meshSymmetrySource(previous),
    selected = new Set(Object.keys(symmetry.faces)),
    sourceVertices = new Set(Object.keys(symmetry.vertices))
  for (const [id, face] of Object.entries(base.faces))
    if (!selected.has(id))
      v.requireScene(
        edited.faces[id] === face || preservesBoundary(base, edited, id),
        'symmetry',
        'Esse ajuste alcança faces fora da fonte do espelho. Pare de espelhar para editar essa região.',
      )
  const affected =
    includeNewFaces ||
    [...selected].some((id) => edited.faces[id] !== base.faces[id]) ||
    [...sourceVertices].some((id) => edited.vertices[id] !== base.vertices[id])
  for (const id of [...selected]) if (!Object.hasOwn(edited.faces, id)) selected.delete(id)
  if (affected) {
    for (const id of Object.keys(edited.faces)) if (!Object.hasOwn(base.faces, id)) selected.add(id)
  } else {
    for (const [id, face] of Object.entries(edited.faces))
      if (
        !Object.hasOwn(base.faces, id) &&
        face.corners.every((c) => sourceVertices.has(c.vertexId))
      )
        selected.add(id)
  }
  if (!selected.size) return edited
  return mirrorMeshFaces(
    edited,
    [...selected],
    { axis: symmetry.axis, center: symmetry.center, copy: true, continuous: true },
    nextId,
    symmetry,
  ).mesh
}

/** Strict relation parser: no dangling pairs, alternate writable copies, or stale generated paint. */
export function readMeshSymmetry(raw: unknown, mesh: SceneMeshGeometry): SceneMeshSymmetry {
  const row = v.record(raw, 'symmetry', ['version', 'axis', 'center', 'faces', 'vertices'])
  v.requireScene(row.version === 1, 'symmetry.version', 'Versão do espelho não reconhecida.')
  const axis = v.number(row.axis, 'symmetry.axis', 0, 2, true) as 0 | 1 | 2,
    center = v.number(row.center, 'symmetry.center')
  function pairs(raw: unknown, available: object, path: string) {
    const map = v.record(raw, path),
      entries = Object.entries(map).map(([a, b]) => [v.id(a, path), v.id(b, path)] as const)
    v.requireScene(
      new Set(entries.map(([, b]) => b)).size === entries.length,
      path,
      'Pares de espelho repetidos.',
    )
    for (const [a, b] of entries)
      v.requireScene(
        Object.hasOwn(available, a) && Object.hasOwn(available, b),
        path,
        'Parte do espelho ausente.',
      )
    return Object.fromEntries(entries)
  }
  const faces = pairs(row.faces, mesh.faces, 'symmetry.faces'),
    vertices = pairs(row.vertices, mesh.vertices, 'symmetry.vertices'),
    tolerance = meshLocalBox(mesh).extent * 1e-10
  v.requireScene(
    Object.keys(faces).length > 0,
    'symmetry.faces',
    'O espelho precisa de faces fonte.',
  )
  const generatedFaces = new Set(Object.values(faces)),
    generatedVertices = new Set(
      Object.entries(vertices)
        .filter(([a, b]) => a !== b)
        .map(([, b]) => b),
    )
  const used = new Set<string>()
  for (const [a, b] of Object.entries(faces)) {
    v.requireScene(
      a !== b && !generatedFaces.has(a),
      'symmetry.faces',
      'A fonte do espelho precisa ser independente.',
    )
    const source = mesh.faces[a]!,
      target = mesh.faces[b]!,
      corners = [...source.corners].reverse()
    v.requireScene(
      source.materialId === target.materialId &&
        corners.length === target.corners.length &&
        corners.every((c, i) => {
          used.add(c.vertexId)
          const t = target.corners[i]!
          return vertices[c.vertexId] === t.vertexId && c.uv.every((n, axis) => n === t.uv[axis])
        }),
      'symmetry.faces',
      'A pintura ou a forma do espelho não corresponde à fonte.',
    )
  }
  v.requireScene(
    used.size === Object.keys(vertices).length &&
      [...used].every((id) => Object.hasOwn(vertices, id)),
    'symmetry.vertices',
    'Pares de pontos incompletos.',
  )
  let side = 0
  for (const [a, b] of Object.entries(vertices)) {
    const p = mesh.vertices[a]!,
      q = mesh.vertices[b]!,
      distance = p[axis] - center
    v.requireScene(
      !generatedVertices.has(a),
      'symmetry.vertices',
      'Um ponto gerado não pode ser fonte.',
    )
    v.requireScene(
      p.every((n, i) => Math.abs(q[i]! - (i === axis ? center + (center - n) : n)) <= tolerance),
      'symmetry.vertices',
      'A posição do espelho não corresponde à fonte.',
    )
    v.requireScene(
      a !== b || Math.abs(distance) <= tolerance,
      'symmetry.vertices',
      'Somente pontos no plano podem ser compartilhados.',
    )
    if (Math.abs(distance) > tolerance) {
      const sign = Math.sign(distance)
      v.requireScene(
        side === 0 || sign === side,
        'symmetry.vertices',
        'A fonte atravessa o plano do espelho.',
      )
      side = sign
    }
  }
  for (const [id, face] of Object.entries(mesh.faces))
    if (!generatedFaces.has(id))
      v.requireScene(
        face.corners.every((c) => !generatedVertices.has(c.vertexId)),
        'symmetry.faces',
        'Uma face editável usa pontos gerados pelo espelho.',
      )
  v.requireScene(side !== 0, 'symmetry.vertices', 'A fonte do espelho precisa sair do plano.')
  for (const edge of mesh.looseEdges)
    v.requireScene(
      edge.every((id) => !generatedVertices.has(id)),
      'symmetry.vertices',
      'Uma linha editável usa pontos gerados pelo espelho.',
    )
  return { version: 1, axis, center, faces, vertices }
}
