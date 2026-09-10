import type { Vec3 } from '../core/model'
import type { SceneMeshFace, SceneMeshGeometry, Vec2 } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'

/** Private transport, not a document format. Every buffer is derived and may be transferred. */
export interface SceneMeshPacket {
  version: 1
  id: string
  vertexIds: string[]
  faceIds: string[]
  materialIds: (string | null)[]
  positions: Float64Array<ArrayBuffer>
  uv: Float64Array<ArrayBuffer>
  corners: Uint32Array<ArrayBuffer>
  sizes: Uint16Array<ArrayBuffer>
  edges: Uint32Array<ArrayBuffer>
}

/** Caller has already passed the strict geometry reader on the worker side. */
export function packSceneMesh(mesh: SceneMeshGeometry): SceneMeshPacket {
  const vertexIds = Object.keys(mesh.vertices)
  const faceIds = Object.keys(mesh.faces)
  const index = new Map(vertexIds.map((id, i) => [id, i]))
  const cornerCount = faceIds.reduce((n, id) => n + mesh.faces[id]!.corners.length, 0)
  const positions = new Float64Array(vertexIds.length * 3)
  const uv = new Float64Array(cornerCount * 2)
  const corners = new Uint32Array(cornerCount)
  const sizes = new Uint16Array(faceIds.length)
  const edges = new Uint32Array(mesh.looseEdges.length * 2)
  const materialIds: (string | null)[] = []
  const vertexIndex = (id: string) => {
    const value = index.get(id)
    v.requireScene(value !== undefined, 'packet', 'Vértice ausente.')
    return value
  }
  vertexIds.forEach((id, i) => {
    positions.set(mesh.vertices[id]!, i * 3)
  })
  let cursor = 0
  faceIds.forEach((id, i) => {
    const face = mesh.faces[id]!
    sizes[i] = face.corners.length
    materialIds.push(face.materialId ?? null)
    for (const corner of face.corners) {
      corners[cursor] = vertexIndex(corner.vertexId)
      uv.set(corner.uv, cursor * 2)
      cursor++
    }
  })
  mesh.looseEdges.forEach(([a, b], i) => {
    edges.set([vertexIndex(a), vertexIndex(b)], i * 2)
  })
  return {
    version: 1,
    id: mesh.id,
    vertexIds,
    faceIds,
    materialIds,
    positions,
    uv,
    corners,
    sizes,
    edges,
  }
}

export function sceneMeshPacketTransfers(packet: SceneMeshPacket): ArrayBuffer[] {
  return [
    packet.positions.buffer,
    packet.uv.buffer,
    packet.corners.buffer,
    packet.sizes.buffer,
    packet.edges.buffer,
  ]
}

function ids(raw: unknown, path: string, limit: number) {
  const result = v.list(raw, path, limit).map((raw) => v.id(raw, path))
  v.requireScene(new Set(result).size === result.length, path, 'Identificador repetido.')
  return result
}

/** Validate all resource bounds, IDs, references, finite doubles and topology before returning authorial data. */
export function readSceneMeshPacket(raw: unknown): SceneMeshGeometry {
  const row = v.record(raw, 'packet', [
    'version',
    'id',
    'vertexIds',
    'faceIds',
    'materialIds',
    'positions',
    'uv',
    'corners',
    'sizes',
    'edges',
  ])
  v.requireScene(row.version === 1, 'packet.version', 'Transporte desconhecido.')
  const id = v.id(row.id, 'packet.id')
  const vertexIds = ids(row.vertexIds, 'packet.vertexIds', SCENE_LIMITS.vertices)
  const faceIds = ids(row.faceIds, 'packet.faceIds', SCENE_LIMITS.triangles)
  const materials = v.list(row.materialIds, 'packet.materialIds', faceIds.length)
  v.requireScene(materials.length === faceIds.length, 'packet.materialIds', 'Dimensão inválida.')
  const { positions, uv, corners, sizes, edges } = row
  v.requireScene(
    positions instanceof Float64Array &&
      positions.buffer instanceof ArrayBuffer &&
      positions.length === vertexIds.length * 3,
    'packet.positions',
    'Coordenadas inválidas.',
  )
  v.requireScene(
    sizes instanceof Uint16Array &&
      sizes.buffer instanceof ArrayBuffer &&
      sizes.length === faceIds.length,
    'packet.sizes',
    'Faces inválidas.',
  )
  let cornerCount = 0
  let triangles = 0
  for (const size of sizes) {
    v.requireScene(
      size >= 3 && size <= SCENE_LIMITS.faceCorners,
      'packet.sizes',
      'Quantidade de cantos inválida.',
    )
    cornerCount += size
    triangles += size - 2
  }
  v.requireScene(
    triangles <= SCENE_LIMITS.triangles,
    'packet.sizes',
    'Triângulos fora do orçamento.',
  )
  v.requireScene(
    uv instanceof Float64Array && uv.buffer instanceof ArrayBuffer && uv.length === cornerCount * 2,
    'packet.uv',
    'UV inválido.',
  )
  v.requireScene(
    corners instanceof Uint32Array &&
      corners.buffer instanceof ArrayBuffer &&
      corners.length === cornerCount,
    'packet.corners',
    'Cantos inválidos.',
  )
  v.requireScene(
    edges instanceof Uint32Array &&
      edges.buffer instanceof ArrayBuffer &&
      edges.length % 2 === 0 &&
      edges.length / 2 <= SCENE_LIMITS.looseEdges,
    'packet.edges',
    'Arestas fora do orçamento.',
  )
  const vertices = Object.fromEntries(
    vertexIds.map((id, i) => [
      id,
      [
        v.number(positions[i * 3], 'packet.positions'),
        v.number(positions[i * 3 + 1], 'packet.positions'),
        v.number(positions[i * 3 + 2], 'packet.positions'),
      ] as Vec3,
    ]),
  )
  const vertex = (index: number) => {
    const id = vertexIds[index]
    v.requireScene(id !== undefined, 'packet.corners', 'Vértice ausente.')
    return id
  }
  let cursor = 0
  const faces = Object.fromEntries(
    faceIds.map((id, i): [string, SceneMeshFace] => {
      const face: SceneMeshFace = { corners: [] }
      const material = materials[i]
      if (material !== null) face.materialId = v.id(material, 'packet.materialIds')
      const seen = new Set<number>()
      for (let corner = 0; corner < sizes[i]!; corner++, cursor++) {
        const index = corners[cursor]!
        v.requireScene(!seen.has(index), 'packet.corners', 'Vértice repetido na face.')
        seen.add(index)
        face.corners.push({
          vertexId: vertex(index),
          uv: [
            v.number(uv[cursor * 2], 'packet.uv'),
            v.number(uv[cursor * 2 + 1], 'packet.uv'),
          ] as Vec2,
        })
      }
      return [id, face]
    }),
  )
  const looseEdges: [string, string][] = []
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i]!
    const b = edges[i + 1]!
    v.requireScene(a !== b, 'packet.edges', 'Aresta inválida.')
    looseEdges.push([vertex(a), vertex(b)])
  }
  return { id, kind: 'mesh', vertices, faces, looseEdges }
}
