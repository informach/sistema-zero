import type { SceneMeshGeometry, Vec2 } from './document'
import { meshUvBounds } from './meshUv'
import { pointInSelection } from './regionSelection'

/** Derived normalized view; even out-of-tile UVs remain visible without changing authorial values. */
export function meshUvLayout(mesh: SceneMeshGeometry, aspect = 1, ids = Object.keys(mesh.faces)) {
  const bounds = meshUvBounds(mesh, ids)
  const magnitude = Math.max(1, ...bounds.min.map(Math.abs), ...bounds.max.map(Math.abs))
  const min: Vec2 = [Math.min(0, bounds.min[0]) / magnitude, Math.min(0, bounds.min[1]) / magnitude]
  const max: Vec2 = [Math.max(1, bounds.max[0]) / magnitude, Math.max(1, bounds.max[1]) / magnitude]
  const span = Math.max((max[0] - min[0]) * aspect, max[1] - min[1])
  const map = (uv: Vec2): Vec2 => [
    0.05 + (((uv[0] / magnitude - min[0]) * aspect) / span) * 0.9,
    0.95 - ((uv[1] / magnitude - min[1]) / span) * 0.9,
  ]
  const faces = ids.map((id) => ({
    id,
    points: mesh.faces[id]!.corners.map((c) => map(c.uv)),
  }))
  return {
    faces,
    map,
    translate(uv: Vec2, delta: Vec2): Vec2 | null {
      const result: Vec2 = [
        delta[0] === 0 ? uv[0] : uv[0] + (delta[0] / 0.9 / aspect) * span * magnitude,
        delta[1] === 0 ? uv[1] : uv[1] - (delta[1] / 0.9) * span * magnitude,
      ]
      return result.every(Number.isFinite) ? result : null
    },
    unmap(point: Vec2): Vec2 | null {
      const uv: Vec2 = [
        (((point[0] - 0.05) / 0.9 / aspect) * span + min[0]) * magnitude,
        (((0.95 - point[1]) / 0.9) * span + min[1]) * magnitude,
      ]
      return uv.every(Number.isFinite) ? uv : null
    },
    tile: { min: map([0, 1]), max: map([1, 0]) },
    pick: (point: Vec2, after: string | undefined) => {
      const hits = faces.filter((f) => pointInSelection(point, { kind: 'lasso', points: f.points }))
      const index = hits.findIndex((f) => f.id === after)
      return hits.length ? hits[(index + 1) % hits.length]!.id : null
    },
  }
}

/** A stable texture frame: editing UVs never silently re-enframes the user's camera. */
export function meshUvTextureLayout(mesh: SceneMeshGeometry, ids = Object.keys(mesh.faces)) {
  const map = (uv: Vec2): Vec2 => [uv[0], 1 - uv[1]]
  const faces = ids.map((id) => ({
    id,
    points: mesh.faces[id]!.corners.map((corner) => map(corner.uv)),
  }))
  return {
    faces,
    map,
    unmap: map,
    tile: { min: [0, 0] as Vec2, max: [1, 1] as Vec2 },
    translate(uv: Vec2, delta: Vec2): Vec2 | null {
      const result: Vec2 = [uv[0] + delta[0], uv[1] - delta[1]]
      return result.every(Number.isFinite) ? result : null
    },
    pick(point: Vec2, after: string | undefined) {
      const hits = faces.filter((face) =>
        pointInSelection(point, { kind: 'lasso', points: face.points }),
      )
      const index = hits.findIndex((face) => face.id === after)
      return hits.length ? hits[(index + 1) % hits.length]!.id : null
    },
  }
}
