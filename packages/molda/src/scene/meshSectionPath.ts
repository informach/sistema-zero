import type { Vec3 } from '../core/model'

type Segment = readonly [Vec3, Vec3]

/** Follow the shortest connected surface arc between authorial points, never a solid chord. */
export function meshSectionPath(section: readonly Segment[], points: readonly Vec3[]): Segment[] {
  if (!section.length || points.length < 2) return []
  const origin: Vec3 = [Infinity, Infinity, Infinity],
    maximum: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const segment of section)
    for (const point of segment)
      for (let axis = 0; axis < 3; axis++) {
        origin[axis] = Math.min(origin[axis]!, point[axis]!)
        maximum[axis] = Math.max(maximum[axis]!, point[axis]!)
      }
  const tolerance = Math.hypot(...maximum.map((n, i) => n - origin[i]!)) * 1e-9
  if (!tolerance) return []
  const vertices: Vec3[] = [],
    adjacency: Array<Map<number, number>> = []
  const buckets = new Map<string, number[]>()
  const distance = (a: Vec3, b: Vec3) => Math.hypot(...a.map((n, i) => n - b[i]!))
  const vertex = (point: Vec3) => {
    const cell = point.map((n, i) => Math.floor((n - origin[i]!) / tolerance))
    for (const x of [-1, 0, 1])
      for (const y of [-1, 0, 1])
        for (const z of [-1, 0, 1]) {
          for (const id of buckets.get(`${cell[0]! + x},${cell[1]! + y},${cell[2]! + z}`) ?? [])
            if (distance(vertices[id]!, point) <= tolerance) return id
        }
    const id = vertices.length,
      key = cell.join(',')
    vertices.push(point)
    adjacency.push(new Map())
    const bucket = buckets.get(key) ?? []
    bucket.push(id)
    buckets.set(key, bucket)
    return id
  }
  // Split at every selected point, including points in the middle of a triangulated face edge.
  for (const [a, b] of section) {
    const delta = b.map((n, i) => n - a[i]!),
      length2 = delta.reduce((sum, n) => sum + n * n, 0)
    if (!length2) continue
    const splits = [
      { t: 0, id: vertex(a) },
      { t: 1, id: vertex(b) },
    ]
    for (const point of points) {
      const t = delta.reduce((sum, n, i) => sum + n * (point[i]! - a[i]!), 0) / length2
      if (t <= 0 || t >= 1) continue
      const projected = a.map((n, i) => n + t * delta[i]!) as Vec3
      if (distance(projected, point) <= tolerance) splits.push({ t, id: vertex(point) })
    }
    splits.sort((a, b) => a.t - b.t)
    for (let i = 1; i < splits.length; i++) {
      const u = splits[i - 1]!.id,
        v = splits[i]!.id
      if (u === v) continue
      const weight = distance(vertices[u]!, vertices[v]!)
      adjacency[u]!.set(v, weight)
      adjacency[v]!.set(u, weight)
    }
  }
  const targets = points.map(vertex),
    result: Segment[] = []
  for (let i = 1; i < targets.length; i++) {
    const start = targets[i - 1]!,
      end = targets[i]!
    const distances = new Map<number, number>([[start, 0]]),
      previous = new Map<number, number>()
    const heap: Array<[number, number]> = []
    const push = (entry: [number, number]) => {
      let at = heap.length
      heap.push(entry)
      while (at > 0) {
        const parent = (at - 1) >>> 1
        if (heap[parent]![1] <= entry[1]) break
        heap[at] = heap[parent]!
        at = parent
      }
      heap[at] = entry
    }
    const pop = () => {
      const first = heap[0]!,
        last = heap.pop()!
      if (heap.length) {
        let at = 0
        while (at * 2 + 1 < heap.length) {
          let child = at * 2 + 1
          if (child + 1 < heap.length && heap[child + 1]![1] < heap[child]![1]) child++
          if (last[1] <= heap[child]![1]) break
          heap[at] = heap[child]!
          at = child
        }
        heap[at] = last
      }
      return first
    }
    push([start, 0])
    while (heap.length) {
      const [current, travelled] = pop()
      if (travelled !== distances.get(current)) continue
      if (current === end) break
      for (const [next, weight] of adjacency[current]!) {
        const candidate = travelled + weight
        if (candidate >= (distances.get(next) ?? Infinity)) continue
        distances.set(next, candidate)
        previous.set(next, current)
        push([next, candidate])
      }
    }
    if (!previous.has(end)) continue // Disconnected sections never gain a bridge through empty space.
    const path: Segment[] = []
    for (let at = end; at !== start; ) {
      const before = previous.get(at)!
      path.push([vertices[before]!, vertices[at]!])
      at = before
    }
    result.push(...path.reverse())
  }
  return result
}
