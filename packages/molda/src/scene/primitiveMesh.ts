/** Authorial tessellation: connected vertices in Float64, with UV seams on corners. */
import type { ShapeFaceId, Vec3 } from '../core/model'
import { boxMesh } from '../model/mesh'
import type { SceneMeshGeometry, ScenePrimitiveGeometry, Vec2 } from './document'
import { primitiveDetail } from './primitiveDetail'
import { number } from './validation'

const QUAD_UV: readonly Vec2[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
]

class PrimitiveBuilder {
  readonly mesh: SceneMeshGeometry
  readonly surfaceByFace = new Map<string, ShapeFaceId>()

  constructor(readonly source: ScenePrimitiveGeometry) {
    this.mesh = { id: source.id, kind: 'mesh', vertices: {}, faces: {}, looseEdges: [] }
  }

  vertex(id: string, point: Vec3) {
    this.mesh.vertices[id] = [number(point[0], id), number(point[1], id), number(point[2], id)]
  }

  /** Exact endpoints; weighted interpolation avoids overflowing to - from. */
  unitVertex(id: string, unit: Vec3) {
    const coordinate = (axis: 0 | 1 | 2) => {
      const t = (unit[axis] + 1) / 2
      return t === 0
        ? this.source.from[axis]
        : t === 1
          ? this.source.to[axis]
          : (1 - t) * this.source.from[axis] + t * this.source.to[axis]
    }
    this.vertex(id, [coordinate(0), coordinate(1), coordinate(2)])
  }

  face(id: string, surfaceId: ShapeFaceId, vertices: readonly string[], uvs = QUAD_UV) {
    const surface = this.source.surfaces[surfaceId]
    this.mesh.faces[id] = {
      ...(surface?.materialId === undefined ? {} : { materialId: surface.materialId }),
      corners: vertices.map((vertexId, i) => {
        const uv = uvs[i]
        if (!uv) throw new Error('UV ausente na forma.')
        const mapped: Vec2 = surface
          ? [
              surface.uv.origin[0] + uv[0] * surface.uv.u[0] + uv[1] * surface.uv.v[0],
              surface.uv.origin[1] + uv[0] * surface.uv.u[1] + uv[1] * surface.uv.v[1],
            ]
          : [...uv]
        return { vertexId, uv: [number(mapped[0], id), number(mapped[1], id)] }
      }),
    }
    this.surfaceByFace.set(id, surfaceId)
  }
}

function flat(out: PrimitiveBuilder) {
  const box = boxMesh(out.source.from, out.source.to)
  for (const [id, point] of Object.entries(box.vertices)) {
    if (out.source.kind === 'wedge' && (id === 'v_011' || id === 'v_111')) continue
    out.vertex(id, point)
  }
  if (out.source.kind === 'box') {
    for (const face of ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const) {
      const cycle = box.faces[`f_${face}`]
      if (!cycle) throw new Error('Face ausente na caixa.')
      out.face(face, face, cycle.v)
    }
  } else {
    out.face('ny', 'ny', ['v_001', 'v_000', 'v_100', 'v_101'])
    out.face('nz', 'nz', ['v_110', 'v_100', 'v_000', 'v_010'])
    out.face('slope', 'slope', ['v_010', 'v_001', 'v_101', 'v_110'])
    out.face(
      'px',
      'px',
      ['v_110', 'v_101', 'v_100'],
      [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
    )
    out.face(
      'nx',
      'nx',
      ['v_010', 'v_000', 'v_001'],
      [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
    )
  }
}

function cylinder(out: PrimitiveBuilder, segments: number) {
  const ring = (i: number, top: boolean) => `ring:${top ? 'top' : 'bottom'}:${i % segments}`
  const uvOn = (i: number, top: boolean): Vec2 => {
    const angle = ((i % segments) / segments) * Math.PI * 2
    return [(Math.sin(angle) + 1) / 2, (1 + (top ? 1 : -1) * Math.cos(angle)) / 2]
  }
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    for (const top of [true, false])
      out.unitVertex(ring(i, top), [Math.sin(angle), top ? 1 : -1, Math.cos(angle)])
    out.face(
      `side:${i}`,
      'side',
      [ring(i, true), ring(i, false), ring(i + 1, false), ring(i + 1, true)],
      [
        [i / segments, 0],
        [i / segments, 1],
        [(i + 1) / segments, 1],
        [(i + 1) / segments, 0],
      ],
    )
  }
  out.unitVertex('center:top', [0, 1, 0])
  out.unitVertex('center:bottom', [0, -1, 0])
  for (let i = 0; i < segments; i++) {
    out.face(
      `top:${i}`,
      'top',
      ['center:top', ring(i, true), ring(i + 1, true)],
      [[0.5, 0.5], uvOn(i, true), uvOn(i + 1, true)],
    )
    out.face(
      `bottom:${i}`,
      'bottom',
      ['center:bottom', ring(i + 1, false), ring(i, false)],
      [[0.5, 0.5], uvOn(i + 1, false), uvOn(i, false)],
    )
  }
}

function sphere(out: PrimitiveBuilder, around: number, down: number) {
  const vertex = (i: number, j: number) =>
    j === 0 ? 'pole:top' : j === down ? 'pole:bottom' : `ring:${j}:${i % around}`
  out.unitVertex('pole:top', [0, 1, 0])
  out.unitVertex('pole:bottom', [0, -1, 0])
  for (let j = 1; j < down; j++) {
    const phi = (j / down) * Math.PI
    for (let i = 0; i < around; i++) {
      const theta = (i / around) * Math.PI * 2
      out.unitVertex(vertex(i, j), [
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.cos(theta),
      ])
    }
  }
  for (let j = 0; j < down; j++) {
    for (let i = 0; i < around; i++) {
      const corners = [vertex(i, j), vertex(i, j + 1), vertex(i + 1, j + 1), vertex(i + 1, j)]
      const uv: Vec2[] = [
        [i / around, j / down],
        [i / around, (j + 1) / down],
        [(i + 1) / around, (j + 1) / down],
        [(i + 1) / around, j / down],
      ]
      // Poles share one spatial vertex but retain each triangle's authorial UV.
      const indices = j === 0 ? [0, 1, 2] : j === down - 1 ? [0, 2, 3] : [0, 1, 2, 3]
      out.face(
        `around:${j}:${i}`,
        'around',
        indices.map((k) => {
          const id = corners[k]
          if (!id) throw new Error('Vértice ausente na esfera.')
          return id
        }),
        indices.map((k) => {
          const value = uv[k]
          if (!value) throw new Error('UV ausente na esfera.')
          return value
        }),
      )
    }
  }
}

/** One source for native rendering and conversion. Never reconstruct authorial data from GPU buffers. */
export function primitiveMesh(source: ScenePrimitiveGeometry) {
  const out = new PrimitiveBuilder(source)
  if (source.kind === 'box' || source.kind === 'wedge') flat(out)
  else {
    const detail = primitiveDetail(source)
    if (source.kind === 'cylinder') cylinder(out, detail.around)
    else sphere(out, detail.around, detail.down)
  }
  return { mesh: out.mesh, surfaceByFace: out.surfaceByFace }
}
