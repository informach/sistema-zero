import 'server-only'
import { hasKidsCapability, type KidsJourneyAccess } from '../lib/kids-journey-access'
import type { MembersClient } from './clients'
import { readKidsCapabilities, type KidsCapabilityDecision } from './creative-apps-access'

interface ZappySession { role: string }

export function isStudioZappyAllowed(
  session: ZappySession | null | undefined,
  journey: KidsJourneyAccess | null,
): boolean {
  return Boolean(session && journey && hasKidsCapability(journey, 'ai'))
}

export async function getStudioZappyAccessForRequest(
  members: Pick<MembersClient, 'getGamification'>,
  session: ZappySession | null | undefined,
): Promise<KidsCapabilityDecision> {
  return session ? readKidsCapabilities(members, ['ai']) : 'locked'
}
