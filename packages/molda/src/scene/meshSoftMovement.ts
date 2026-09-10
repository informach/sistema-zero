import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from './document'
import type { AffineMatrix } from './matrix'
import { prepareMeshDistanceField, smoothMeshReach } from './meshDistanceField'
import { number, requireScene } from './validation'

/** Multi-source shortest edge paths in world units; disconnected or out-of-reach points are excluded. */
export function meshMovementWeights(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  world: Readonly<AffineMatrix>,
  radius: number,
): ReadonlyMap<string, number> {
  const field = prepareMeshDistanceField(mesh, world, radius),
    distance = field.query(ids.map((id) => ({ id, distance: 0 })))
  return new Map([...distance].map(([id, reached]) => [id, smoothMeshReach(reached, radius)]))
}

export function moveMeshWithWeights(
  mesh: SceneMeshGeometry,
  weights: ReadonlyMap<string, number>,
  delta: Vec3,
): SceneMeshGeometry {
  for (const value of delta) number(value, 'distance')
  if (delta.every((value) => value === 0)) return mesh
  const changed: Record<string, Vec3> = Object.create(null)
  for (const [id, weight] of weights) {
    const point = mesh.vertices[id]
    requireScene(
      Object.hasOwn(mesh.vertices, id) && point,
      'vertices',
      'Esse ponto não existe mais.',
    )
    number(weight, 'weight', 0, 1)
    if (!weight) continue
    const moved: Vec3 = [
      number(point[0] + delta[0] * weight, 'vertices'),
      number(point[1] + delta[1] * weight, 'vertices'),
      number(point[2] + delta[2] * weight, 'vertices'),
    ]
    if (moved.some((value, axis) => value !== point[axis])) changed[id] = moved
  }
  return Object.keys(changed).length
    ? { ...mesh, vertices: { ...mesh.vertices, ...changed } }
    : mesh
}
