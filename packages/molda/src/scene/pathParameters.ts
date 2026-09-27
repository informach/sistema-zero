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
  closed?: unknown
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
  const closed = raw.closed === undefined ? false : boolean(raw.closed, 'closed')
  requireScene(
    !closed || points.length >= 3,
    'points',
    'Um laço precisa de pelo menos três pontos.',
  )
  requireScene(!closed || !endCaps, 'endCaps', 'Um laço fechado não tem pontas para tampar.')
  pathTangents(
    pathDirections(
      points.map((p) => p.position),
      closed,
    ),
    closed,
  )
  requireScene(
    points[0]!.position.some((v, axis) => v !== points.at(-1)!.position[axis]),
    'points',
    'Não repita o primeiro ponto no fim do caminho. Para unir as pontas, marque Caminho fechado.',
  )
  return { points, radius, around, endCaps, ...(raw.closed === undefined ? {} : { closed }) }
}

/** Stable unit vectors even when segment lengths are below Float32 range. */
export function pathDirections(points: readonly Vec3[], closed = false) {
  return (closed ? [...points.slice(1), points[0]!] : points.slice(1)).map((p, i) => {
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
  source: Pick<ScenePathGeometry, 'around' | 'endCaps' | 'closed'>,
) {
  return (
    (pointCount - (source.closed ? 0 : 1)) * source.around * 2 +
    (!source.closed && source.endCaps ? source.around * 2 : 0)
  )
}

export function pathTangents(directions: readonly Vec3[], closed = false) {
  return Array.from({ length: directions.length + (closed ? 0 : 1) }, (_, i) => {
    if (!closed && i === 0) return directions[0]!
    if (!closed && i === directions.length) return directions.at(-1)!
    const a = directions[(i - 1 + directions.length) % directions.length]!,
      b = directions[i]!
    requireScene(
      dot(a, b) > -1 + 1e-10,
      'points',
      'O caminho está voltando sobre si mesmo. Abra um pouco essa curva.',
    )
    return normalize(a.map((v, axis) => v + b[axis]!) as Vec3)
  })
}
