import type { Vec3 } from '../core/model'
import { dot, normalize, sub } from '../model/vec'
import type { ScenePathGeometry } from './document'
import { boolean, id, list, number, record, requireScene, tuple, uniqueById } from './validation'

export const PATH_LIMITS = { points: 128, around: { min: 3, max: 64 } } as const

export function readPathParameters(raw: {
  points: unknown
  radius: unknown
  around: unknown
  endCaps: unknown
}) {
  const points = list(raw.points, 'points', PATH_LIMITS.points).map((p, i) => {
    const point = record(p, `points.${i}`, ['id', 'position'])
    return {
      id: id(point.id, `points.${i}.id`),
      position: tuple(point.position, 3, `points.${i}.position`) as Vec3,
    }
  })
  uniqueById(points, 'points')
  requireScene(points.length >= 2, 'points', 'O caminho precisa de pelo menos dois pontos.')
  const radius = number(raw.radius, 'radius', Number.MIN_VALUE)
  const around = number(raw.around, 'around', PATH_LIMITS.around.min, PATH_LIMITS.around.max, true)
  const endCaps = boolean(raw.endCaps, 'endCaps')
  pathTangents(pathDirections(points.map((p) => p.position)))
  requireScene(
    points[0]!.position.some((v, axis) => v !== points.at(-1)!.position[axis]),
    'points',
    'Use um caminho aberto, com começo e fim separados.',
  )
  return { points, radius, around, endCaps }
}

/** Stable unit vectors even when segment lengths are below Float32 range. */
export function pathDirections(points: readonly Vec3[]) {
  return points.slice(1).map((p, i) => {
    const delta = sub(p, points[i]!)
    const extent = Math.max(...delta.map(Math.abs))
    requireScene(
      Number.isFinite(extent) && extent > 0,
      'points',
      'Separe os pontos vizinhos do caminho e mantenha suas medidas dentro da precisão.',
    )
    const unit = delta.map((v) => v / extent) as Vec3
    const length = Math.hypot(...unit)
    return unit.map((v) => v / length) as Vec3
  })
}

export function pathTriangleCount(
  pointCount: number,
  source: Pick<ScenePathGeometry, 'around' | 'endCaps'>,
) {
  return (pointCount - 1) * source.around * 2 + (source.endCaps ? source.around * 2 : 0)
}

export function pathTangents(directions: readonly Vec3[]) {
  return Array.from({ length: directions.length + 1 }, (_, i) => {
    if (i === 0) return directions[0]!
    if (i === directions.length) return directions.at(-1)!
    const a = directions[i - 1]!,
      b = directions[i]!
    requireScene(
      dot(a, b) > -1 + 1e-10,
      'points',
      'O caminho está voltando sobre si mesmo. Abra um pouco essa curva.',
    )
    return normalize(a.map((v, axis) => v + b[axis]!) as Vec3)
  })
}
