import { dot, sub } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import { measureMeshFace } from './meshFaceFrame'
import { indexMeshEdges } from './meshTopology'

/** Connected faces on the seed's plane. Selection never changes geometry or paint. */
export function meshCoplanarFaces(mesh: SceneMeshGeometry, seeds: readonly string[]): string[] {
  return prepareMeshCoplanarSelection(mesh).faces(seeds)
}

/** Reuse one incidence index and measured planes while partitioning a selection. */
export function prepareMeshCoplanarSelection(mesh: SceneMeshGeometry) {
  const topology = indexMeshEdges(mesh)
  const frames = new Map<string, ReturnType<typeof measureMeshFace>>()
  const measure = (id: string) => {
    let result = frames.get(id)
    if (!result) {
      result = measureMeshFace(mesh, id)
      frames.set(id, result)
    }
    return result
  }
  function faces(seeds: readonly string[], allowed?: ReadonlySet<string>) {
    const chosen = new Set<string>()
    for (const seed of seeds) {
      if (!topology.byFace.has(seed) || chosen.has(seed) || (allowed && !allowed.has(seed)))
        continue
      chosen.add(seed)
      const plane = measure(seed)
      if (plane.status !== 'ok') continue
      const queue = [seed]
      const visited = new Set(queue)
      for (let i = 0; i < queue.length; i++) {
        for (const key of topology.byFace.get(queue[i]!) ?? []) {
          const incident = topology.edges.get(key)!
          // A junction with three or more faces is not a continuous surface.
          if (incident.length !== 2) continue
          for (const { faceId } of incident) {
            if (visited.has(faceId) || (allowed && !allowed.has(faceId))) continue
            visited.add(faceId)
            const candidate = measure(faceId)
            if (candidate.status !== 'ok') continue
            const frame = candidate.frame
            if (dot(frame.normal, plane.frame.normal) < 1 - 1e-10) continue
            const extent = Math.max(plane.frame.extent, frame.extent)
            if (
              !frame.points.every(
                (point) =>
                  Math.abs(dot(sub(point, plane.frame.origin), plane.frame.normal)) / extent <=
                  1e-10,
              )
            )
              continue
            chosen.add(faceId)
            queue.push(faceId)
          }
        }
      }
    }
    return [...chosen]
  }
  return { faces }
}
