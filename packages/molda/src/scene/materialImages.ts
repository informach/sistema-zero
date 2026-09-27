import { type SceneRgba, sceneBaseColor } from './composite'
import type { SceneMaterial } from './document'

export const SCENE_MATERIAL_IMAGE_FIELDS = {
  color: 'colorImageId',
  normal: 'normalImageId',
  roughness: 'roughnessImageId',
  metalness: 'metalnessImageId',
} as const
export type SceneMaterialImageKind = keyof typeof SCENE_MATERIAL_IMAGE_FIELDS
export type SceneMaterialImageField = (typeof SCENE_MATERIAL_IMAGE_FIELDS)[SceneMaterialImageKind]
export const SCENE_MATERIAL_IMAGE_KINDS = Object.keys(
  SCENE_MATERIAL_IMAGE_FIELDS,
) as SceneMaterialImageKind[]
export const SCENE_MATERIAL_IMAGE_KEYS = Object.values(SCENE_MATERIAL_IMAGE_FIELDS)

export function sceneMaterialImageIds(material: SceneMaterial): Set<string> {
  return new Set(
    SCENE_MATERIAL_IMAGE_KEYS.flatMap((field) =>
      material[field] === undefined ? [] : [material[field]],
    ),
  )
}

/** Neutral background beneath transparent map layers; scalar maps use glTF green/blue channels. */
export function sceneMaterialImageBase(
  material: SceneMaterial,
  palette: readonly SceneRgba[],
  kind: SceneMaterialImageKind,
): SceneRgba {
  if (kind === 'color') return sceneBaseColor(material, palette)
  return kind === 'normal' ? [128 / 255, 128 / 255, 1, 1] : [1, 1, 1, 1]
}
