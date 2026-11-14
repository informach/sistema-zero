import type { useRapier } from '@react-three/rapier'
import {
  AVATAR_CATALOG,
  bodyMeasures,
  physicalBody,
} from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import type { MoradaHouse, MoradaVector } from '@sistemazero/avatar-quarto/morada/catalog'

export const MORADA_BODY = physicalBody(bodyMeasures(AVATAR_CATALOG.base.skeleton, 1))
type Physics = ReturnType<typeof useRapier>

/** Consulta a cápsula real contra caixas e malhas, sem incluir o próprio corpo. */
export function moradaCapsuleFree(
  world: Physics['world'],
  rapier: Physics['rapier'],
  point: MoradaVector,
  ignoreBody?: number,
) {
  let free = true
  world.intersectionsWithShape(
    { x: point[0], y: point[1], z: point[2] },
    { x: 0, y: 0, z: 0, w: 1 },
    new rapier.Capsule(MORADA_BODY.halfHeight, MORADA_BODY.radius),
    (collider) => {
      if (collider.parent()?.handle !== ignoreBody || ignoreBody === undefined) {
        free = false
        return false
      }
      return true
    },
    rapier.QueryFilterFlags.EXCLUDE_SENSORS,
  )
  return free
}

/** Varre o lote inteiro, começando pela chegada habitual, em anéis de meio metro. */
export function findMoradaSpawn(
  house: MoradaHouse,
  free: (point: MoradaVector) => boolean,
): MoradaVector | null {
  const halfX = house.lot.size[0] / 2 - 0.5,
    halfZ = house.lot.size[1] / 2 - 0.5
  const originZ = Math.max(-halfZ, Math.min(4, halfZ))
  const test = (x: number, z: number): MoradaVector | null => {
    if (Math.abs(x) > halfX || Math.abs(z) > halfZ) return null
    const point: MoradaVector = [x, MORADA_BODY.centerToFoot + 0.06, z]
    return free(point) ? point : null
  }
  const first = test(0, originZ)
  if (first) return first
  const extent = Math.ceil(Math.max(house.lot.size[0], house.lot.size[1] + 8) * 2)
  for (let ring = 1; ring <= extent; ring++) {
    const d = ring * 0.5
    for (let n = -ring; n <= ring; n++) {
      for (const [x, z] of [
        [n * 0.5, originZ - d],
        [n * 0.5, originZ + d],
        [-d, originZ + n * 0.5],
        [d, originZ + n * 0.5],
      ]) {
        const point = test(x!, z!)
        if (point) return point
      }
    }
  }
  return null
}
