import type { SceneUvTransform } from '../scene/document'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from './fixtures'

/** Two genuinely used paint sources on one parametric part; the second is shared with another part. */
export function makeSceneAtlasDocument() {
  const document = migrateLegacyModel(makeModel()).document
  const geometry = document.geometries[0]!
  if (geometry.kind !== 'box') throw new Error('Expected box fixture')
  const second = document.materials.find((m) => m.colorImageId === document.images[1]!.id)!
  const uv: SceneUvTransform = { origin: [0, 0], u: [1, 0], v: [0, 1] }
  return {
    ...document,
    geometries: [
      { ...geometry, surfaces: { ...geometry.surfaces, px: { materialId: second.id, uv } } },
      ...document.geometries.slice(1),
    ],
  }
}
