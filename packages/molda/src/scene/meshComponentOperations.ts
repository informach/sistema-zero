import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry, SceneMeshSymmetry, Vec2 } from './document'
import { SCENE_LIMITS } from './limits'
import { meshComponentEdges } from './meshComponents'
import { meshFaceFrame } from './meshFaceFrame'
import { indexMeshEdges, meshEdgeKey, meshIdAllocator } from './meshTopology'
import { meshUvFaces } from './meshUv'
import { triangulateFace } from './triangulate'
import { requireScene, tuple } from './validation'

export interface MeshOperationResult {
  mesh: SceneMeshGeometry
  faceIds: string[]
}
export interface MeshMirrorOptions {
  axis: 0 | 1 | 2
  center: number
  copy: boolean
  continuous: boolean
}

export function meshLocalBox(mesh: SceneMeshGeometry) {
  const min: Vec3 = [Infinity, Infinity, Infinity],
    max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const point of Object.values(mesh.vertices))
    for (const axis of [0, 1, 2] as const) {
      min[axis] = Math.min(min[axis], point[axis])
      max[axis] = Math.max(max[axis], point[axis])
    }
  const center: Vec3 = min.map((n, axis) =>
    Number.isFinite(n) ? n / 2 + max[axis]! / 2 : 0,
  ) as Vec3
  const extent = Math.max(...min.map((n, axis) => max[axis]! - n), Number.MIN_VALUE)
  requireScene(
    Number.isFinite(extent),
    'mesh',
    'As dimensões da peça ultrapassam a precisão desse ajuste.',
  )
  return { min, max, center, extent }
}

export function requireMeshOperationBudget(
  mesh: SceneMeshGeometry,
  addedVertices: number,
  addedTriangles: number,
) {
  requireScene(
    Object.keys(mesh.vertices).length + addedVertices <= SCENE_LIMITS.vertices &&
      Object.values(mesh.faces).reduce((n, f) => n + f.corners.length - 2, 0) + addedTriangles <=
        SCENE_LIMITS.triangles,
    'mesh',
    'Esse ajuste ultrapassa o orçamento da malha. Escolha menos faces ou cortes.',
  )
}

const signature = (mesh: SceneMeshGeometry, ids: readonly string[]) =>
  JSON.stringify(
    ids
      .map((id) => mesh.vertices[id]!)
      .map((p) => JSON.stringify(p))
      .sort(),
  )

export function duplicateMeshFaces(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  offset: Vec3,
  nextId = newId,
  allowOverlapPreview = false,
): MeshOperationResult {
  const selected = meshUvFaces(mesh, ids)
  requireScene(selected.length, 'faces', 'Escolha as faces que deseja copiar.')
  tuple(offset, 3, 'offset')
  requireScene(
    allowOverlapPreview || offset.some((n) => n !== 0),
    'offset',
    'Mova a cópia para outro lugar antes de aplicar.',
  )
  const used = new Set(selected.flatMap((id) => mesh.faces[id]!.corners.map((c) => c.vertexId)))
  requireMeshOperationBudget(
    mesh,
    used.size,
    selected.reduce((n, id) => n + mesh.faces[id]!.corners.length - 2, 0),
  )
  const positions = new Map(
    [...used].map((id) => [id, mesh.vertices[id]!.map((n, axis) => n + offset[axis]!) as Vec3]),
  )
  for (const point of positions.values()) tuple(point, 3, 'point')
  if (!offset.every((n) => n === 0)) {
    requireScene(
      [...positions].some(([id, p]) => p.some((n, axis) => n !== mesh.vertices[id]![axis])),
      'offset',
      'Mova a cópia por uma distância maior. Esse valor não muda a posição dos pontos.',
    )
    const existing = new Set(
      Object.values(mesh.faces).map((face) =>
        signature(
          mesh,
          face.corners.map((c) => c.vertexId),
        ),
      ),
    )
    for (const id of selected) {
      const points = mesh.faces[id]!.corners.map((c) => positions.get(c.vertexId)!)
      requireScene(
        !existing.has(JSON.stringify(points.map((p) => JSON.stringify(p)).sort())),
        'offset',
        'Já existe uma face no lugar da cópia. Mova para outro lugar antes de aplicar.',
      )
      requireScene(
        triangulateFace(points).status === 'ok',
        'offset',
        'Esse deslocamento ultrapassa a precisão da face. Use uma distância menor.',
      )
    }
  }
  const allocate = meshIdAllocator(mesh, nextId),
    vertices = { ...mesh.vertices },
    faces = { ...mesh.faces },
    copies = new Map<string, string>(),
    faceIds: string[] = []
  for (const [id, point] of positions) {
    const copy = allocate()
    copies.set(id, copy)
    vertices[copy] = point
  }
  for (const id of selected) {
    const copy = allocate()
    faces[copy] = {
      ...mesh.faces[id]!,
      corners: mesh.faces[id]!.corners.map((c) => ({
        vertexId: copies.get(c.vertexId)!,
        uv: [...c.uv],
      })),
    }
    faceIds.push(copy)
  }
  return { mesh: { ...mesh, vertices, faces }, faceIds }
}

/** Reflection is local to the captured plane; UV travels with its corner when winding reverses. */
export function mirrorMeshFaces(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  options: MeshMirrorOptions,
  nextId = newId,
  previous?: SceneMeshSymmetry,
): MeshOperationResult {
  const selected = meshUvFaces(mesh, ids),
    { axis, center, copy, continuous } = options
  requireScene(selected.length, 'faces', 'Escolha as faces que deseja espelhar.')
  requireScene(
    [0, 1, 2].includes(axis) && Number.isFinite(center),
    'plane',
    'Escolha um eixo e um plano válidos.',
  )
  requireScene(
    !continuous || copy,
    'mirror',
    'Continuar espelhando precisa de uma cópia do outro lado.',
  )
  requireScene(!mesh.symmetry, 'mirror', 'Pare o espelho ativo antes de criar outro.')
  const tolerance = meshLocalBox(mesh).extent * 1e-10
  const used = new Set(selected.flatMap((id) => mesh.faces[id]!.corners.map((c) => c.vertexId)))
  const reflect = (point: Vec3): Vec3 => {
    const p: Vec3 = [...point]
    p[axis] = center + (center - p[axis])
    tuple(p, 3, 'point')
    return p
  }
  const moving = [...used].filter((id) => Math.abs(mesh.vertices[id]![axis] - center) > tolerance)
  requireScene(
    moving.length,
    'mirror',
    'Essas faces estão sobre o plano do espelho. Escolha um lado da peça.',
  )
  if (continuous)
    requireScene(
      moving.every(
        (id) =>
          Math.sign(mesh.vertices[id]![axis] - center) ===
          Math.sign(mesh.vertices[moving[0]!]![axis] - center),
      ),
      'mirror',
      'Escolha faces de um único lado do plano para continuar espelhando.',
    )
  const mirrored = selected.filter((id) =>
    mesh.faces[id]!.corners.some((c) => moving.includes(c.vertexId)),
  )
  const existing = new Set(
    Object.entries(mesh.faces)
      .filter(([id]) => copy || !selected.includes(id))
      .map(([, f]) =>
        signature(
          mesh,
          f.corners.map((c) => c.vertexId),
        ),
      ),
  )
  for (const id of mirrored) {
    const points = mesh.faces[id]!.corners.map((c) =>
      moving.includes(c.vertexId)
        ? reflect(mesh.vertices[c.vertexId]!)
        : mesh.vertices[c.vertexId]!,
    )
    requireScene(
      !existing.has(JSON.stringify(points.map((p) => JSON.stringify(p)).sort())),
      'mirror',
      'Já existe uma face no lugar do espelho. Apague essa face ou escolha outra região.',
    )
  }
  if (copy)
    requireMeshOperationBudget(
      mesh,
      moving.length,
      mirrored.reduce((n, id) => n + mesh.faces[id]!.corners.length - 2, 0),
    )
  const allocate = meshIdAllocator(mesh, nextId),
    vertices = { ...mesh.vertices },
    faces = { ...mesh.faces },
    vertexPairs: Record<string, string> = {},
    facePairs: Record<string, string> = {},
    faceIds: string[] = []
  const reserved = new Set(
    previous
      ? [
          ...Object.values(previous.faces),
          ...Object.entries(previous.vertices)
            .filter(([a, b]) => a !== b)
            .map(([, b]) => b),
        ]
      : [],
  )
  const fresh = () => {
    const id = allocate()
    requireScene(!reserved.has(id), 'id', 'Essa identidade pertence ao espelho. Tente novamente.')
    return id
  }
  if (continuous) {
    // Walls on the weld plane are internal once the reflected half is generated.
    for (const id of selected) if (!mirrored.includes(id)) delete faces[id]
    const active = new Set(mirrored.flatMap((id) => mesh.faces[id]!.corners.map((c) => c.vertexId)))
    for (const id of used) if (!active.has(id)) used.delete(id)
  }
  for (const id of used) {
    const paired = previous?.vertices[id]
    const target = copy && moving.includes(id) ? (paired && paired !== id ? paired : fresh()) : id
    vertexPairs[id] = target
    vertices[target] = moving.includes(id) ? reflect(mesh.vertices[id]!) : mesh.vertices[id]!
  }
  for (const id of mirrored) {
    const target = copy ? (previous?.faces[id] ?? fresh()) : id
    facePairs[id] = target
    faces[target] = {
      ...mesh.faces[id]!,
      corners: [...mesh.faces[id]!.corners]
        .reverse()
        .map((c) => ({ vertexId: vertexPairs[c.vertexId]!, uv: [...c.uv] })),
    }
    faceIds.push(target)
  }
  const result: SceneMeshGeometry = { ...mesh, vertices, faces }
  for (const [id, face] of Object.entries(faces))
    if (face !== mesh.faces[id])
      requireScene(
        triangulateFace(face.corners.map((c) => vertices[c.vertexId]!)).status === 'ok',
        'faces',
        'O espelho deixaria uma face sem área ou cruzada. Ajuste a seleção.',
      )
  if (!copy)
    for (const [id, face] of Object.entries(faces))
      if (face.corners.some((c) => used.has(c.vertexId)))
        requireScene(
          triangulateFace(face.corners.map((c) => vertices[c.vertexId]!)).status === 'ok',
          'faces',
          `O espelho deformaria uma face ligada (${id}). Separe as faces antes de virar.`,
        )
  if (continuous)
    result.symmetry = { version: 1, axis, center, faces: facePairs, vertices: vertexPairs }
  return { mesh: result, faceIds }
}

export function meshHoleMaterials(mesh: SceneMeshGeometry, ids: readonly string[]) {
  const topology = indexMeshEdges(mesh)
  return [
    ...new Set(
      ids.flatMap((id) =>
        (topology.edges.get(id) ?? []).map((e) => mesh.faces[e.faceId]!.materialId ?? ''),
      ),
    ),
  ]
}

/** One simple border, reversed against its neighbors. Concave polygons use the existing triangulator. */
export function fillMeshHole(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  material?: string,
  nextId = newId,
): MeshOperationResult {
  const chosen = [...new Set(ids)],
    edges = meshComponentEdges(mesh),
    topology = indexMeshEdges(mesh),
    adjacency = new Map<string, string[]>()
  requireScene(
    chosen.length >= 3 && chosen.length <= SCENE_LIMITS.faceCorners,
    'edges',
    'Escolha um contorno fechado com pelo menos três linhas.',
  )
  for (const id of chosen) {
    const pair = edges.get(id),
      incident = topology.edges.get(id) ?? []
    requireScene(
      pair && incident.length <= 1,
      'edges',
      'Escolha somente as linhas da borda de um buraco.',
    )
    for (const [a, b] of [pair, [pair[1], pair[0]]]) {
      const neighbors = adjacency.get(a!) ?? []
      neighbors.push(b!)
      adjacency.set(a!, neighbors)
    }
  }
  requireScene(
    [...adjacency.values()].every((neighbors) => neighbors.length === 2),
    'edges',
    'O contorno precisa ser fechado, sem pontas soltas ou ramificações.',
  )
  let cycle: string[] = [],
    current = adjacency.keys().next().value!,
    previous = ''
  do {
    cycle.push(current)
    const next = adjacency.get(current)!.find((id) => id !== previous)!
    previous = current
    current = next
  } while (current !== cycle[0] && cycle.length <= chosen.length)
  requireScene(
    cycle.length === chosen.length && current === cycle[0],
    'edges',
    'Escolha um único contorno fechado por vez.',
  )
  return createMeshFaceFromCycle(mesh, cycle, material, nextId)
}

/** Shared face construction for hole filling and faces between selected edges or points. */
export function createMeshFaceFromCycle(
  mesh: SceneMeshGeometry,
  vertexIds: readonly string[],
  material?: string,
  nextId = newId,
  options: { allowNonPlanar?: boolean } = {},
): MeshOperationResult {
  let cycle = [...vertexIds]
  requireScene(
    cycle.length >= 3 &&
      cycle.length <= SCENE_LIMITS.faceCorners &&
      new Set(cycle).size === cycle.length,
    'vertices',
    'Escolha pelo menos três pontos diferentes para criar uma face.',
  )
  for (const id of cycle)
    requireScene(Object.hasOwn(mesh.vertices, id), 'vertices', 'Esse ponto não existe mais.')
  const topology = indexMeshEdges(mesh)
  const chosen = cycle.map((a, i) => meshEdgeKey(a, cycle[(i + 1) % cycle.length]!))
  requireScene(
    chosen.every((key) => (topology.edges.get(key)?.length ?? 0) <= 1),
    'edges',
    'Essa face usaria uma linha que já liga duas faces. Escolha linhas de uma borda aberta.',
  )
  requireScene(
    !Object.values(mesh.faces).some((face) =>
      cycle.every((id) => face.corners.some((c) => c.vertexId === id)),
    ),
    'faces',
    'Já existe uma face nessa região. Escolha uma região aberta para criar outra.',
  )
  // A construction edge has no winding. Any neighboring face can orient the whole contour.
  const borderAt = cycle.findIndex((a, i) =>
    topology.edges.has(meshEdgeKey(a, cycle[(i + 1) % cycle.length]!)),
  )
  if (borderAt >= 0) {
    const a = cycle[borderAt]!,
      b = cycle[(borderAt + 1) % cycle.length]!
    if (topology.edges.get(meshEdgeKey(a, b))![0]!.a === a) cycle = cycle.reverse()
  }
  for (let i = 0; i < cycle.length; i++) {
    const a = cycle[i]!,
      b = cycle[(i + 1) % cycle.length]!,
      incident = topology.edges.get(meshEdgeKey(a, b))?.[0]
    requireScene(
      !incident || incident.a === b,
      'edges',
      'As faces ao redor estão viradas em sentidos diferentes. Ajuste-as antes de fechar.',
    )
  }
  const existing = new Set(
    Object.values(mesh.faces).map((f) =>
      signature(
        mesh,
        f.corners.map((c) => c.vertexId),
      ),
    ),
  )
  requireScene(!existing.has(signature(mesh, cycle)), 'faces', 'Já existe uma face nesse contorno.')
  const choices = meshHoleMaterials(mesh, chosen)
  requireScene(
    choices.length <= 1 || material !== undefined,
    'material',
    'Escolha qual pintura usar para fechar o buraco.',
  )
  requireScene(
    material === undefined || choices.length === 0 || choices.includes(material),
    'material',
    'Escolha uma das pinturas ao redor do buraco.',
  )
  const materialId = material ?? choices[0],
    face = {
      corners: cycle.map((vertexId) => ({ vertexId, uv: [0, 0] as Vec2 })),
      ...(materialId ? { materialId } : {}),
    }
  let temp = 'hole'
  while (Object.hasOwn(mesh.faces, temp)) temp += ':'
  let frame: ReturnType<typeof meshFaceFrame>
  try {
    frame = meshFaceFrame({ ...mesh, faces: { ...mesh.faces, [temp]: face } }, temp, options)
  } catch {
    throw new Error(
      options.allowNonPlanar
        ? 'Essas linhas se cruzam ou não formam uma face. Escolha outras linhas.'
        : 'Esse contorno precisa estar em uma superfície plana e não se cruzar.',
    )
  }
  requireMeshOperationBudget(mesh, 0, cycle.length - 2)
  const id = meshIdAllocator(mesh, nextId)()
  return {
    mesh: {
      ...mesh,
      faces: {
        ...mesh.faces,
        [id]: {
          ...face,
          corners: face.corners.map((c) => ({
            ...c,
            uv: frame.project(mesh.vertices[c.vertexId]!),
          })),
        },
      },
      looseEdges: mesh.looseEdges.filter(([a, b]) => !chosen.includes(meshEdgeKey(a, b))),
    },
    faceIds: [id],
  }
}
