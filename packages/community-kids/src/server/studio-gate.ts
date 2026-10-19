import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import type { KidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'
import { kidsStudioTier } from '@sistemazero/member-shell/server/studio-unlocks'
import type { StudioUnlocksResult } from '@/lib/studio-cta'

/** Distinguish the pedagogical capability from a missing curriculum palette. */
export type StudioLockReason = 'level' | 'no-blocks'

export type StudioGate =
  | { kind: 'unavailable' }
  | { kind: 'journey-locked'; reason: StudioLockReason }
  | { kind: 'open'; tier: StudioTier }

/** Policy absence is unavailable; an actual missing capability is a journey lock.
 * Staff preview ignores curriculum, while a learner needs a successful known-block palette.
 */
export function studioGate(
  journey: KidsJourneyAccess | null,
  unlocks: StudioUnlocksResult | null,
): StudioGate {
  if (!journey) return { kind: 'unavailable' }
  const semLista = kidsStudioTier(journey, [])
  if (!semLista.freeStudio) return { kind: 'journey-locked', reason: 'level' }
  if (!semLista.allowBlocks) return { kind: 'open', tier: semLista }
  if (unlocks?.status !== 200 || !unlocks.body) return { kind: 'unavailable' }
  const tier = kidsStudioTier(journey, unlocks.body.blocks)
  if (!tier.hasPalette) return { kind: 'journey-locked', reason: 'no-blocks' }
  return { kind: 'open', tier }
}
