import 'server-only'
import type { AdultCreatorCapability } from '@sistemazero/core/journey'
import { learnerIdentity } from '../lib/learner-identity'
import type { SessionUser } from '../lib/types'
import type { MembersClient } from './clients'
export async function hasAdultCapability(
  members: Pick<MembersClient, 'getGamification'>,
  user: SessionUser,
  capability: AdultCreatorCapability,
) {
  if (!learnerIdentity(user, 'adult')) return false
  const progress = await members.getGamification().catch(() => null)
  return (
    progress?.status === 200 && progress.body?.journey?.capabilities.includes(capability) === true
  )
}
