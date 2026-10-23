import type {
  JourneyLevelSlug,
  KidsCreatorCapability,
  KidsJourneyStaffPreview,
  KidsJourneyView,
} from '@sistemazero/core/journey'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'

export function kidsView(
  capabilities: KidsCreatorCapability[],
  level: JourneyLevelSlug = 'noob',
): KidsJourneyView {
  return {
    audience: 'kids',
    policyVersion: 2,
    mode: 'active',
    tierAccess: initialKidsJourneyPolicy().tierAccess,
    earned: { level, capabilities, courseAccess: { entry: [], expanded: [], reward: [] } },
    nextLevel: null,
    missing: [],
    advances: [],
    readiness: { status: 'incomplete', horizon: 'noob', issues: [] },
  }
}

export const kidsStaffPreview: KidsJourneyStaffPreview = {
  audience: 'kids',
  kind: 'staff-preview',
  policyVersion: 2,
  mode: 'active',
  tierAccess: initialKidsJourneyPolicy().tierAccess,
  capabilities: ['studio', 'bridge', 'pro', 'ai', 'pensa', 'pinta', 'molda'],
  readiness: { status: 'incomplete', horizon: 'noob', issues: [] },
}
