import { cross, dot, normalize, scale, sub } from '../model/vec'
import type { SceneMeshGeometry, Vec2 } from './document'
import { packSceneShelves } from './imageAtlas'
import { type AffineMatrix, identityMatrix, transformDirection } from './matrix'
import { prepareMeshCoplanarSelection } from './meshCoplanarSelection'
import { meshFaceFrame } from './meshFaceFrame'
import { indexMeshEdges } from './meshTopology'
import { indexMeshUv, mapMeshUv, meshUvBounds, meshUvFaces } from './meshUv'
import { createUvTriangleIndex } from './meshUvOverlap'
import { unfoldMeshUv } from './meshUvUnfold'
import { requireScene } from './validation'

/** Pixel-sized charts, with shared coordinates on each connected planar side. No fit-to-sheet scaling. */
export function pixelMeshUv(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  density: number,
  world: Readonly<AffineMatrix> = identityMatrix(),
) {
  requireScene(
    Number.isFinite(density) && density > 0,
    'uv.density',
    'Escolha uma densidade de pixels válida.',
  )
  const selected = meshUvFaces(mesh, ids).sort()
  requireScene(selected.length, 'faces', 'Escolha faces com área para mapear.')
  const metric: SceneMeshGeometry = {
    ...mesh,
    vertices: Object.fromEntries(
      Object.entries(mesh.vertices).map(([id, point]) => [id, transformDirection(world, point)]),
    ),
  }
  const planes = prepareMeshCoplanarSelection(metric)
  const topology = indexMeshEdges(metric)
  const remaining = new Set(selected)
  const charts: Array<{
    faces: string[]
    points: Map<string, Vec2>
    min: Vec2
    width: number
    height: number
  }> = []
  for (const seed of selected) {
    if (!remaining.has(seed)) continue
    const frame = meshFaceFrame(metric, seed)
    // The fallback is an angular choice, independent of the node's scale magnitude.
    const objectUp = normalize(transformDirection(world, [0, 1, 0]))
    let up = objectUp
    up = sub(up, scale(frame.normal, dot(up, frame.normal)))
    if (Math.hypot(...up) < 1e-8) {
      up = normalize(transformDirection(world, [0, 0, dot(frame.normal, objectUp) > 0 ? -1 : 1]))
      up = sub(up, scale(frame.normal, dot(up, frame.normal)))
    }
    up = normalize(up)
    const right = normalize(cross(up, frame.normal))
    const points = new Map<string, Vec2>()
    const triangles = createUvTriangleIndex(frame.extent * density)
    const faces: string[] = []
    const members = new Set<string>()
    for (const id of planes.faces([seed], remaining)) {
      if (
        id !== seed &&
        !(topology.byFace.get(id) ?? []).some((edge) =>
          topology.edges.get(edge)!.some((incident) => members.has(incident.faceId)),
        )
      )
        continue
      const face = metric.faces[id]!
      for (const { vertexId } of face.corners)
        if (!points.has(vertexId)) {
          const local = metric.vertices[vertexId]!
          const uv: Vec2 = [dot(local, right) * density, dot(local, up) * density]
          requireScene(
            uv.every(Number.isFinite),
            'uv',
            'Essa peça excede o tamanho para mapear em pixels.',
          )
          points.set(vertexId, uv)
        }
      const candidate = meshFaceFrame(metric, id).triangles.map((triangle) => {
        const vertices = triangle.map((corner) => points.get(face.corners[corner]!.vertexId)!)
        const min: Vec2 = [
          Math.min(...vertices.map((p) => p[0])),
          Math.min(...vertices.map((p) => p[1])),
        ]
        const max: Vec2 = [
          Math.max(...vertices.map((p) => p[0])),
          Math.max(...vertices.map((p) => p[1])),
        ]
        return { points: vertices, min, max }
      })
      // Coincident/layered faces stay independent, instead of painting through each other.
      if (candidate.some((a) => triangles.overlaps(a))) continue
      for (const triangle of candidate) triangles.add(triangle)
      faces.push(id)
      members.add(id)
      remaining.delete(id)
    }
    requireScene(faces.length, 'uv', 'Não foi possível organizar as faces desta peça.')
    const used = new Set(
      faces.flatMap((id) => mesh.faces[id]!.corners.map((corner) => corner.vertexId)),
    )
    const coordinates = [...used].map((id) => points.get(id)!)
    const min: Vec2 = [
      Math.min(...coordinates.map((p) => p[0])),
      Math.min(...coordinates.map((p) => p[1])),
    ]
    charts.push({
      faces,
      points,
      min,
      width: pixelExtent(Math.max(...coordinates.map((p) => p[0])) - min[0]),
      height: pixelExtent(Math.max(...coordinates.map((p) => p[1])) - min[1]),
    })
  }
  const layout = packSceneShelves(charts)
  requireScene(
    layout,
    'uv',
    'Essa peça não cabe na textura com esse tamanho de pixel. Use uma densidade menor ou divida a peça.',
  )
  const side = Math.max(layout.width, layout.height)
  const byFace = new Map<string, number>()
  charts.forEach((chart, i) => {
    for (const id of chart.faces) byFace.set(id, i)
  })
  const mapped = mapMeshUv(mesh, selected, (_uv, id, corner): Vec2 => {
    const i = byFace.get(id)!
    const chart = charts[i]!,
      slot = layout.slots[i]!
    const point = chart.points.get(mesh.faces[id]!.corners[corner]!.vertexId)!
    return [(slot.x + point[0] - chart.min[0]) / side, (slot.y + point[1] - chart.min[1]) / side]
  })
  const result = {
    mesh: mapped,
    width: side,
    height: side,
    charts: charts.map((chart) => chart.faces),
  }
  // Curved triangulated pieces otherwise become one thin chart per facet. Try the bounded
  // connected unfolding and keep it only if it uses fewer islands at the same pixel density.
  if (
    selected.length > 8 &&
    selected.length <= 64 &&
    charts.length > 8 &&
    selected.every((id) => metric.faces[id]!.corners.length === 3)
  ) {
    try {
      const opened = unfoldPixelMeshUv(mesh, metric, selected, density)
      if (opened && opened.charts.length < charts.length && opened.width <= side) return opened
    } catch {
      // A difficult non-planar piece still has the valid per-plane layout above.
    }
  }
  return result
}

function unfoldPixelMeshUv(
  mesh: SceneMeshGeometry,
  metric: SceneMeshGeometry,
  selected: readonly string[],
  density: number,
) {
  const opened = unfoldMeshUv(metric, selected, 0.01)
  const groups = indexMeshUv(opened)
    .islands.map((group) => group.filter((id) => selected.includes(id)))
    .filter((group) => group.length)
  const first = metric.faces[selected[0]!]!
  const a = first.corners[0]!,
    b = first.corners[1]!
  const p = metric.vertices[a.vertexId]!,
    q = metric.vertices[b.vertexId]!
  const physical = Math.hypot(...sub(q, p))
  const uvA = opened.faces[selected[0]!]!.corners[0]!.uv,
    uvB = opened.faces[selected[0]!]!.corners[1]!.uv
  const projected = Math.hypot(uvB[0] - uvA[0], uvB[1] - uvA[1])
  if (!physical || !projected) return null
  const factor = (physical * density) / projected
  const boxes = groups.map((faces) => {
    const { min, max } = meshUvBounds(opened, faces)
    return {
      faces,
      min,
      width: pixelExtent((max[0] - min[0]) * factor),
      height: pixelExtent((max[1] - min[1]) * factor),
    }
  })
  const layout = packSceneShelves(boxes)
  if (!layout) return null
  const side = Math.max(layout.width, layout.height)
  const byFace = new Map(groups.flatMap((group, i) => group.map((id) => [id, i] as const)))
  const mapped = mapMeshUv(mesh, selected, (_uv, id, corner): Vec2 => {
    const i = byFace.get(id)!,
      box = boxes[i]!,
      slot = layout.slots[i]!,
      point = opened.faces[id]!.corners[corner]!.uv
    return [
      (slot.x + (point[0] - box.min[0]) * factor) / side,
      (slot.y + (point[1] - box.min[1]) * factor) / side,
    ]
  })
  return { mesh: mapped, width: side, height: side, charts: groups }
}

/** Only absorb floating-point error at integer boundaries; fractional coverage rounds up. */
export function pixelExtent(value: number) {
  const integer = Math.round(value)
  return Math.max(1, Math.ceil(Math.abs(value - integer) <= 1e-10 ? integer : value))
}
