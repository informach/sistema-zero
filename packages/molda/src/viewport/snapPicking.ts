import type { Intersection, Object3D, Raycaster } from 'three'
import type { MoldaModelAsset } from '../core/model'

/**
 * Raycast dos possíveis destinos do Grudar. A lista já nasce sem escondidas,
 * sem as fontes móveis e sem os gêmeos delas; trancadas continuam presentes.
 */
export function raycastSnapTarget(
  raycaster: Raycaster,
  model: Pick<MoldaModelAsset, 'parts'>,
  movingIds: readonly string[],
  objectOf: (partId: string) => Object3D | undefined,
): Intersection | null {
  const moving = new Set(movingIds)
  const objects = model.parts
    .filter(
      (part) =>
        !part.hidden && !moving.has(part.id) && !(part.mirrorOf && moving.has(part.mirrorOf)),
    )
    .map((part) => objectOf(part.id))
    .filter((object): object is Object3D => Boolean(object))
  return raycaster.intersectObjects(objects, false)[0] ?? null
}
