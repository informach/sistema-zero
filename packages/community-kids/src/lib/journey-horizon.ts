import { LEVEL_ORDER } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'

/** Presentation copy and geometry only. Readiness comes exclusively from the persisted policy view. */
export const BEYOND_HORIZON_PHRASE = 'E tem muito mais pela frente'
export function hasHorizonNode(visible: readonly StudentLevelSlug[]): boolean {
  return visible.length < LEVEL_ORDER.length
}
export function levelsBeyondHorizon(visible: readonly StudentLevelSlug[]): StudentLevelSlug[] {
  return LEVEL_ORDER.slice(visible.length)
}
