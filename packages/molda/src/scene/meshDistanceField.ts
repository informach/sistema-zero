import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from './document'
import { type AffineMatrix, composeTransform, transformPoint } from './matrix'
import { meshComponentEdges } from './meshComponents'
import { indexMeshEdges } from './meshTopology'
import { choice, number, requireScene } from './validation'

interface DistanceEntry {
  id: string
  distance: number
}

/** Bounded by graph relaxations, not a repeated scan of every authorial point. */
class DistanceQueue {
  private readonly entries: DistanceEntry[] = []
  push(entry: DistanceEntry) {
    const entries = this.entries
    let at = entries.length
    entries.push(entry)
    while (at > 0) {
      const parent = (at - 1) >>> 1
      if (entries[parent]!.distance <= entry.distance) break
      entries[at] = entries[parent]!
      at = parent
    }
    entries[at] = entry
  }
  pop() {
    const entries = this.entries,
      first = entries[0],
      last = entries.pop()
    if (!entries.length || !last) return first
    let at = 0
    while (at * 2 + 1 < entries.length) {
      let child = at * 2 + 1
      if (child + 1 < entries.length && entries[child + 1]!.distance < entries[child]!.distance)
        child++
      if (entries[child]!.distance >= last.distance) break
      entries[at] = entries[child]!
      at = child
    }
    entries[at] = last
    return first
  }
}

export function smoothMeshReach(distance: number, radius: number) {
  const t = 1 - distance / radius
  return t * t * (3 - 2 * t)
}

/** Immutable-geometry scope. World positions/adjacency are prepared once, lazily on first query. */
export function prepareMeshDistanceField(
  mesh: SceneMeshGeometry,
  world: Readonly<AffineMatrix>,
  radius: number,
  edgeMode: 'all' | 'surface' = 'all',
) {
  number(radius, 'radius', Number.MIN_VALUE)
  choice(edgeMode, ['all', 'surface'], 'edgeMode')
  const matrix = composeTransform({ kind: 'affine', matrix: [...world] }),
    positions = new Map<string, Vec3>()
  let neighbors: Map<string, Array<{ id: string; length: number }>> | null = null
  const point = (id: string) => {
    requireScene(Object.hasOwn(mesh.vertices, id), 'vertices', 'Esse ponto não existe mais.')
    let value = positions.get(id)
    if (!value) {
      value = transformPoint(matrix, mesh.vertices[id]!)
      for (const coordinate of value) number(coordinate, 'vertices')
      positions.set(id, value)
    }
    return value
  }
  function graph() {
    if (neighbors) return neighbors
    const result = new Map<string, Array<{ id: string; length: number }>>()
    const edges =
      edgeMode === 'all'
        ? meshComponentEdges(mesh).values()
        : Array.from(
            indexMeshEdges(mesh).edges.values(),
            (incidence) => [incidence[0]!.a, incidence[0]!.b] as const,
          )
    for (const [a, b] of edges) {
      const pa = point(a),
        pb = point(b),
        length = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2])
      if (length >= radius) continue
      const from = result.get(a) ?? []
      from.push({ id: b, length })
      result.set(a, from)
      const to = result.get(b) ?? []
      to.push({ id: a, length })
      result.set(b, to)
    }
    neighbors = result
    return result
  }
  return {
    point: (id: string): Vec3 => [...point(id)],
    /** Seed distances let a surface hit start inside a face, not only at an existing vertex. */
    query(seeds: readonly DistanceEntry[]): ReadonlyMap<string, number> {
      const distance = new Map<string, number>(),
        queue = new DistanceQueue()
      for (const seed of seeds) {
        requireScene(
          Object.hasOwn(mesh.vertices, seed.id),
          'vertices',
          'Esse ponto não existe mais.',
        )
        number(seed.distance, 'distance', 0)
        if (seed.distance >= radius || seed.distance >= (distance.get(seed.id) ?? Infinity))
          continue
        distance.set(seed.id, seed.distance)
        queue.push({ id: seed.id, distance: seed.distance })
      }
      if (!distance.size) return distance
      const adjacency = graph()
      for (let current = queue.pop(); current; current = queue.pop()) {
        if (distance.get(current.id) !== current.distance) continue
        for (const next of adjacency.get(current.id) ?? []) {
          const reached = current.distance + next.length
          if (reached >= radius || reached >= (distance.get(next.id) ?? Infinity)) continue
          distance.set(next.id, reached)
          queue.push({ id: next.id, distance: reached })
        }
      }
      return distance
    },
  }
}
