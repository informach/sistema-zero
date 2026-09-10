import { MOLDA_LIMITS } from '../core/limits'
import type { encodeSceneGlb } from './sceneGlb'

/** Shared mesh limits plus the advanced runtime's skeleton ceiling; tested against source. */
export const SCENE_STUDIO_LIMITS = {
  meshes: 48,
  bones: 256,
  triangles: 500_000,
  materials: 64,
  drawCalls: 96,
} as const

type SceneGlbCosts = Pick<ReturnType<typeof encodeSceneGlb>, 'stats'> & { byteLength: number }
export type SceneStudioLimit = 'bytes' | keyof typeof SCENE_STUDIO_LIMITS

/**
 * One exported copy, not the whole game's GPU budget. Only for our native GLB:
 * GLTFLoader creates one Mesh per primitive per instance, not per mesh definition.
 * No parsing, base64 allocation, pixel scan, simplification or source retention.
 */
export function inspectSceneStudioCompatibility({ stats, byteLength }: SceneGlbCosts) {
  const prefixLength = 'data:model/gltf-binary;base64,'.length
  const dataUrlChars = prefixLength + 4 * Math.ceil(byteLength / 3)
  const costs = {
    meshes: stats.drawCalls,
    bones: stats.bones,
    triangles: stats.triangles,
    materials: stats.materials,
    drawCalls: stats.drawCalls,
  }
  const exceeded: Array<{ limit: SceneStudioLimit; actual: number; maximum: number }> = []
  if (dataUrlChars > MOLDA_LIMITS.studioMax3DChars)
    exceeded.push({
      limit: 'bytes',
      actual: byteLength,
      maximum: Math.floor((MOLDA_LIMITS.studioMax3DChars - prefixLength) / 4) * 3,
    })
  for (const limit of Object.keys(SCENE_STUDIO_LIMITS) as Array<keyof typeof SCENE_STUDIO_LIMITS>)
    if (costs[limit] > SCENE_STUDIO_LIMITS[limit])
      exceeded.push({ limit, actual: costs[limit], maximum: SCENE_STUDIO_LIMITS[limit] })
  const empty = stats.drawCalls === 0
  return {
    fitsSingleCopy: !empty && exceeded.length === 0,
    empty,
    exceeded,
    costs,
    // Pintura animada É movimento, e é movimento que só o Jogo 3D Avançado toca. Contar
    // só os clipes dizia "esta cópia não contém movimentos" para uma cópia cuja tinta anda,
    // dois parágrafos depois de o destino ter dito o contrário.
    animated: stats.clips > 0 || stats.animatedPaints > 0,
    skinned: stats.bones > 0,
  }
}
