import 'server-only'
import type { KidsCreatorCapability } from '@sistemazero/core/journey'
import { hasKidsCapability, kidsJourneyAccess } from '../lib/kids-journey-access'
import type { MembersClient } from './clients'

export type KidsCapabilityDecision = 'allowed' | 'locked' | 'unavailable'

/** Product ownership and contextual curriculum remain separate gates. Never infer rights from role/rank. */
export async function readKidsCapabilities(
  members: Pick<MembersClient, 'getGamification'>,
  capabilities: readonly KidsCreatorCapability[],
): Promise<KidsCapabilityDecision> {
  const required = [...capabilities]
  try {
    const result = await members.getGamification()
    if (result.status !== 200) return 'unavailable'
    const journey = kidsJourneyAccess(result.body)
    if (!journey) return 'unavailable'
    return required.every((capability) => hasKidsCapability(journey, capability))
      ? 'allowed'
      : 'locked'
  } catch {
    return 'unavailable'
  }
}
