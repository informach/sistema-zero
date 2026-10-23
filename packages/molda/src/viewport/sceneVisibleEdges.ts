import { DataTexture, type MeshStandardMaterial } from 'three'
import type { Vec3 } from '../core/model'
import type { SceneMeshFace, SceneMeshGeometry, Vec2 } from '../scene/document'
import { meshEdgeKey } from '../scene/meshTopology'
import { requireScene } from '../scene/validation'

type Interval = [number, number]
export type SceneEdgeSegments = Array<readonly [Vec3, Vec3]>

/** Split at actual texel boundaries, so small holes cannot fall between samples. */
function visibleIntervals(
  material: MeshStandardMaterial,
  a: Vec2,
  b: Vec2,
  winding: number,
): Interval[] {
  if (!material.transparent && material.alphaTest === 0) return [[0, 1]]
  const map = material.map
  requireScene(!map || map instanceof DataTexture, 'contour', 'Textura do contorno ausente.')
  const raster = map?.image
  const cuts = new Set([0, 1])
  if (raster)
    for (const [axis, size] of [
      [0, raster.width],
      [1, raster.height],
    ] as const) {
      const from = a[axis],
        to = b[axis]
      if (from === to) continue
      const first = Math.max(0, Math.floor(Math.min(from, to) * size) + 1)
      const last = Math.min(size, Math.ceil(Math.max(from, to) * size) - 1)
      for (let n = first; n <= last; n++) cuts.add((n / size - from) / (to - from))
    }
  const sorted = [...cuts].sort((x, y) => x - y)
  const result: Interval[] = []
  for (let i = 1; i < sorted.length; i++) {
    const lo = sorted[i - 1]!,
      hi = sorted[i]!,
      t = (lo + hi) / 2
    let alpha = material.opacity
    if (raster) {
      const pixels = raster.data
      requireScene(pixels, 'contour', 'Pixels do contorno ausentes.')
      const u = a[0] + (b[0] - a[0]) * t
      const rawV = a[1] + (b[1] - a[1]) * t
      const v = map?.flipY ? 1 - rawV : rawV
      // A geometric edge on a texel boundary belongs to the face's interior side.
      // floor() alone reads padding/the next island at the right and bottom borders.
      const inside: Vec2 = [
        -(b[1] - a[1]) * winding,
        (b[0] - a[0]) * winding * (map?.flipY ? -1 : 1),
      ]
      const texel = (coordinate: number, size: number, direction: number) => {
        const scaled = coordinate * size,
          boundary = Math.round(scaled)
        const index =
          direction < 0 && Math.abs(scaled - boundary) < 1e-10 ? boundary - 1 : Math.floor(scaled)
        return Math.max(0, Math.min(size - 1, index))
      }
      const x = texel(u, raster.width, inside[0])
      const y = texel(v, raster.height, inside[1])
      alpha *= pixels[(y * raster.width + x) * 4 + 3]! / 255
    }
    if (alpha < material.alphaTest || (material.transparent && alpha === 0)) continue
    const previous = result.at(-1)
    if (previous?.[1] === lo) previous[1] = hi
    else result.push([lo, hi])
  }
  return result
}

/** Shared edges survive wherever either adjacent face is visible; loose edges remain editable. */
export function sceneVisibleEdges(
  mesh: SceneMeshGeometry,
  positions: ReadonlyMap<string, Vec3>,
  materialFor: (face: SceneMeshFace) => MeshStandardMaterial | null,
): SceneEdgeSegments {
  const edges = new Map<string, { from: string; to: string; intervals: Interval[] }>()
  for (const face of Object.values(mesh.faces)) {
    const material = materialFor(face)
    if (!material) continue
    let area = 0
    face.corners.forEach(({ uv }, i) => {
      const next = face.corners[(i + 1) % face.corners.length]!.uv
      area += uv[0] * next[1] - next[0] * uv[1]
    })
    for (let i = 0; i < face.corners.length; i++) {
      const a = face.corners[i]!,
        b = face.corners[(i + 1) % face.corners.length]!
      const key = meshEdgeKey(a.vertexId, b.vertexId)
      let edge = edges.get(key)
      if (!edge) {
        edge = { from: a.vertexId, to: b.vertexId, intervals: [] }
        edges.set(key, edge)
      }
      const visible = visibleIntervals(material, a.uv, b.uv, Math.sign(area))
      edge.intervals.push(
        ...(edge.from === a.vertexId
          ? visible
          : visible.map(([lo, hi]): Interval => [1 - hi, 1 - lo])),
      )
    }
  }
  for (const [from, to] of mesh.looseEdges)
    edges.set(meshEdgeKey(from, to), { from, to, intervals: [[0, 1]] })
  const segments: SceneEdgeSegments = []
  for (const { from, to, intervals } of edges.values()) {
    const a = positions.get(from),
      b = positions.get(to)
    if (!a || !b) continue
    const merged: Interval[] = []
    for (const [lo, hi] of intervals.sort((x, y) => x[0] - y[0])) {
      const previous = merged.at(-1)
      if (previous && lo <= previous[1]) previous[1] = Math.max(previous[1], hi)
      else merged.push([lo, hi])
    }
    const point = (t: number): Vec3 => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]
    for (const [lo, hi] of merged) segments.push([point(lo), point(hi)])
  }
  return segments
}
