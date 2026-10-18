import { ByteLru } from '../core/byteLru'
import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { dot, sub } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import { SCENE_LIMITS } from './limits'
import { meshFaceFrame } from './meshFaceFrame'
import { prepareMeshRegionVertices } from './meshRegionVertices'
import { indexMeshEdges, meshFaceRegion, meshIdAllocator, type SceneHalfEdge } from './meshTopology'
import { triangulateFace } from './triangulate'
import { number, requireScene, tuple } from './validation'

/** Extrudes each connected planar region along its normal. No internal walls or paint resampling. */
export function extrudeMeshFaces(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  distance: number,
  nextId: () => string = newId,
): SceneMeshGeometry {
  return extrude(mesh, ids, distance, nextId, (id) => meshFaceFrame(mesh, id))
}

type ExtrusionFrame = Pick<
  ReturnType<typeof meshFaceFrame>,
  'face' | 'points' | 'normal' | 'origin' | 'extent'
>

/** One immutable snapshot/gesture, never a global cache or a cache attached to history. */
export function prepareMeshExtrusion(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  options: { retainBase?: boolean } = {},
) {
  const selected = [...ids]
  // Thickness adds a bottom later, so its original interior points still belong to that base.
  const retainBase = options.retainBase === true
  const frames = new ByteLru<string, ExtrusionFrame>({
    maxBytes: 8 * 1024 * 1024,
    maxEntries: SCENE_LIMITS.triangles,
    // Conservative owned payload + reference slots; source faces/points are not cloned.
    // This is a cache accounting limit, not a JavaScript heap measurement.
    sizeOf: (id, frame) => 512 + id.length * 2 + frame.points.length * 32,
  })
  let disposed = false
  const frameFor = (id: string) => {
    const cached = frames.get(id)
    if (cached) return cached
    const { face, points, normal, origin, extent } = meshFaceFrame(mesh, id)
    const value = { face, points, normal, origin, extent }
    frames.set(id, value)
    return value
  }
  return {
    apply(distance: number, nextId: () => string = newId, offset?: Vec3) {
      requireScene(!disposed, 'gesture', 'Esse ajuste já terminou. Escolha as faces novamente.')
      return extrude(mesh, selected, distance, nextId, frameFor, offset, retainBase)
    },
    get retainedBytes() {
      return frames.bytes
    },
    dispose() {
      frames.clear()
      disposed = true
    },
  }
}

function extrude(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  distance: number,
  nextId: () => string,
  frameFor: (id: string) => ExtrusionFrame,
  offset?: Vec3,
  retainBase = false,
): SceneMeshGeometry {
  number(distance, 'distance')
  if (offset) tuple(offset, 3, 'offset')
  const chosen = new Set(ids)
  for (const id of chosen)
    requireScene(Object.hasOwn(mesh.faces, id), 'faces', 'Essa face não existe mais.')
  if ((offset ? offset.every((n) => n === 0) : distance === 0) || !chosen.size) return mesh
  const topology = indexMeshEdges(mesh)
  const regionVertices = prepareMeshRegionVertices(mesh)
  const allocate = meshIdAllocator(mesh, nextId)
  const vertices = { ...mesh.vertices }
  const faces = { ...mesh.faces }
  const visited = new Set<string>()
  for (const seed of chosen) {
    if (visited.has(seed)) continue
    const region = meshFaceRegion(topology, [seed], chosen)
    const members = new Set(region)
    const frame = frameFor(seed)
    const displacement: Vec3 = offset ?? [
      frame.normal[0] * distance,
      frame.normal[1] * distance,
      frame.normal[2] * distance,
    ]
    const boundary: SceneHalfEdge[] = []
    const copied = new Map<string, string>()
    for (const id of region) {
      visited.add(id)
      const current = frameFor(id)
      requireScene(
        dot(frame.normal, current.normal) >= 1 - 1e-10 &&
          current.points.every((p) => {
            const d = sub(p, frame.origin)
            const extent = Math.max(frame.extent, current.extent, ...d.map(Math.abs))
            return (
              Math.abs(dot([d[0] / extent, d[1] / extent, d[2] / extent], frame.normal)) <= 1e-10
            )
          }),
        'faces',
        'Para puxar juntas, escolha faces planas voltadas para o mesmo lado.',
      )
      for (const key of topology.byFace.get(id) ?? []) {
        const incident = topology.edges.get(key)!
        requireScene(
          incident.length <= 2 && (incident.length === 1 || incident[0]!.a === incident[1]!.b),
          'faces',
          'Há faces sobrepostas ou viradas nessa ligação. Ajuste a ligação antes de puxar.',
        )
        if (incident.filter((edge) => members.has(edge.faceId)).length === 1)
          boundary.push(incident.find((edge) => edge.faceId === id)!)
      }
    }
    requireScene(boundary.length > 0, 'faces', 'Escolha uma região com borda para puxar.')
    const ownership = regionVertices(
      region,
      boundary.map((edge) => edge.a),
    )
    for (const id of ownership.points) {
      const vertexId = retainBase || ownership.copied.has(id) ? allocate() : id
      const p = mesh.vertices[id]!
      vertices[vertexId] = [
        number(p[0] + displacement[0], 'vertices'),
        number(p[1] + displacement[1], 'vertices'),
        number(p[2] + displacement[2], 'vertices'),
      ]
      copied.set(id, vertexId)
    }
    for (const id of region) {
      const current = frameFor(id)
      faces[id] = {
        ...current.face,
        corners: current.face.corners.map((corner) => {
          return { ...corner, vertexId: copied.get(corner.vertexId)! }
        }),
      }
    }
    for (const edge of boundary) {
      const source = mesh.faces[edge.faceId]!
      // Only new walls get new unit-square UV. Existing cap corners retain the exact paint.
      const corners = [edge.a, edge.b, copied.get(edge.b)!, copied.get(edge.a)!].map(
        (vertexId, i) => ({
          vertexId,
          uv: (
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ] as [number, number][]
          )[i]!,
        }),
      )
      requireScene(
        triangulateFace(corners.map((c) => vertices[c.vertexId]!)).status === 'ok',
        'faces',
        'Essa distância não permite desenhar a lateral. Tente outro valor.',
      )
      faces[allocate()] = { ...source, corners }
    }
  }
  return { ...mesh, vertices, faces }
}
