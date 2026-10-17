import type { Vec2 } from './document'
import { faceTurn } from './meshFaceFrame'
import { meshEdgeKey } from './meshTopology'
import { requireScene } from './validation'

const EPS = 1e-10
export function knifeOnSegment(a: Vec2, b: Vec2, p: Vec2) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1]
  const length = dx * dx + dy * dy
  const t = length ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length : 0
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) <= EPS && t >= -EPS && t <= 1 + EPS
    ? t
    : null
}
export function knifeInside(p: Vec2, polygon: readonly Vec2[]) {
  let inside = false
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!,
      b = polygon[(i + 1) % polygon.length]!
    if (knifeOnSegment(a, b, p) !== null) return true
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside
  }
  return inside
}
function intersects(a: Vec2, b: Vec2, c: Vec2, d: Vec2) {
  return (
    (faceTurn(a, b, c) * faceTurn(a, b, d) < -EPS * EPS &&
      faceTurn(c, d, a) * faceTurn(c, d, b) < -EPS * EPS) ||
    knifeOnSegment(a, b, c) !== null ||
    knifeOnSegment(a, b, d) !== null ||
    knifeOnSegment(c, d, a) !== null ||
    knifeOnSegment(c, d, b) !== null
  )
}
type Graph = Map<string, Set<string>>
function connect(graph: Graph, a: string, b: string) {
  graph.get(a)!.add(b)
  graph.get(b)!.add(a)
}
function groups(graph: Graph, skip?: string) {
  const labels = new Map<string, number>()
  let count = 0
  for (const id of graph.keys()) {
    if (id === skip || labels.has(id)) continue
    const queue = [id]
    labels.set(id, count)
    for (let i = 0; i < queue.length; i++)
      for (const next of graph.get(queue[i]!)!) {
        if (next === skip || labels.has(next)) continue
        labels.set(next, count)
        queue.push(next)
      }
    count++
  }
  return { labels, count }
}
export const knifeArea = (polygon: readonly Vec2[]) =>
  polygon.reduce((sum, a, i) => {
    const b = polygon[(i + 1) % polygon.length]!
    return sum + a[0] * b[1] - a[1] * b[0]
  }, 0) / 2

/** A planar graph of authorial boundary + knife lines. Support lines close interior endpoints. */
export function knifeFaceRegions(
  boundary: readonly string[],
  points: ReadonlyMap<string, Vec2>,
  cuts: readonly (readonly [string, string])[],
) {
  const graph: Graph = new Map([...points.keys()].map((id) => [id, new Set()]))
  const polygon = boundary.map((id) => points.get(id)!)
  const boundaryEdges = new Set<string>()
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!,
      b = boundary[(i + 1) % boundary.length]!
    connect(graph, a, b)
    boundaryEdges.add(meshEdgeKey(a, b))
  }
  function visible(a: string, b: string) {
    if (a === b || graph.get(a)!.has(b)) return false
    const start = points.get(a)!,
      end = points.get(b)!
    if (!knifeInside([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], polygon)) return false
    for (const [id, p] of points)
      if (id !== a && id !== b && knifeOnSegment(start, end, p) !== null) return false
    for (const [c, neighbors] of graph)
      for (const d of neighbors) {
        if (c > d || c === a || c === b || d === a || d === b) continue
        if (intersects(start, end, points.get(c)!, points.get(d)!)) return false
      }
    return true
  }
  for (const [a, b] of cuts) {
    // Every marked point on a segment becomes a junction, including deliberate T junctions.
    const path = [...points]
      .flatMap(([id, p]) => {
        const t = knifeOnSegment(points.get(a)!, points.get(b)!, p)
        return t === null ? [] : [{ id, t }]
      })
      .sort((a, b) => a.t - b.t)
    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1]!.id,
        to = path[i]!.id
      requireScene(
        visible(from, to),
        'cut',
        'Esse traçado cruza uma linha ou passa por fora da face. Marque um ponto na borda ou corrija o último ponto.',
      )
      connect(graph, from, to)
    }
  }
  function bridge(labels: ReadonlyMap<string, number>) {
    let best: { a: string; b: string; distance: number } | null = null
    for (const [a, group] of labels)
      for (const [b, other] of labels) {
        if (a >= b || group === other) continue
        const p = points.get(a)!,
          q = points.get(b)!
        const distance = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2
        if ((!best || distance < best.distance) && visible(a, b)) best = { a, b, distance }
      }
    requireScene(
      best,
      'cut',
      'Não foi possível fechar as faces desse traçado. Ligue o corte às bordas da face.',
    )
    connect(graph, best.a, best.b)
  }
  // A biconnected planar graph has simple face cycles; no doubled bridges or holes masquerade as faces.
  for (let additions = 0; ; additions++) {
    requireScene(
      additions <= points.size * 3,
      'cut',
      'Esse traçado precisa de linhas demais. Faça um corte menor.',
    )
    const connected = groups(graph)
    if (connected.count > 1) {
      bridge(connected.labels)
      continue
    }
    const articulation = [...graph.keys()]
      .map((id) => groups(graph, id))
      .find((part) => part.count > 1)
    if (articulation) {
      bridge(articulation.labels)
      continue
    }
    break
  }
  const ordered = new Map(
    [...graph].map(([id, adjacent]) => {
      const origin = points.get(id)!
      return [
        id,
        [...adjacent].sort(
          (a, b) =>
            Math.atan2(points.get(a)![1] - origin[1], points.get(a)![0] - origin[0]) -
            Math.atan2(points.get(b)![1] - origin[1], points.get(b)![0] - origin[0]),
        ),
      ]
    }),
  )
  const visited = new Set<string>(),
    regions: string[][] = []
  for (const [start, adjacent] of ordered)
    for (const next of adjacent) {
      if (visited.has(JSON.stringify([start, next]))) continue
      const cycle: string[] = []
      let a = start,
        b = next
      do {
        const key = JSON.stringify([a, b])
        requireScene(!visited.has(key), 'cut', 'O contorno do corte ficou incompleto.')
        visited.add(key)
        cycle.push(a)
        const around = ordered.get(b)!
        const c = around[(around.indexOf(a) + around.length - 1) % around.length]!
        a = b
        b = c
      } while (a !== start || b !== next)
      if (knifeArea(cycle.map((id) => points.get(id)!)) > EPS) {
        requireScene(
          new Set(cycle).size === cycle.length,
          'cut',
          'O contorno do corte se encontra consigo mesmo.',
        )
        regions.push(cycle)
      }
    }
  requireScene(regions.length > 1, 'cut', 'Marque um traçado que divida a face em partes.')
  const area = regions.reduce(
    (sum, region) => sum + knifeArea(region.map((id) => points.get(id)!)),
    0,
  )
  requireScene(
    Math.abs(area - Math.abs(knifeArea(polygon))) < 1e-8,
    'cut',
    'Esse traçado não preserva toda a face. Corrija os pontos.',
  )
  const lines = [...graph].flatMap(([a, adjacent]) =>
    [...adjacent]
      .filter((b) => a < b && !boundaryEdges.has(meshEdgeKey(a, b)))
      .map((b) => [a, b] as const),
  )
  return {
    regions: knifeArea(polygon) < 0 ? regions.map((cycle) => [...cycle].reverse()) : regions,
    lines,
  }
}
