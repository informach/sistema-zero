import { JOURNEY_COURSE_TIERS, JOURNEY_LEVEL_SLUGS, journeySlotsForTier } from './catalog'
import {
  type KidsCreatorCapability,
  type KidsJourneyPolicy,
  KidsJourneyPolicySchema,
} from './kids-policy'

/** Provisioning artifact only. Normal readers require the persisted published policy. */
export function initialKidsJourneyPolicy(): KidsJourneyPolicy {
  const capabilities: readonly (readonly KidsCreatorCapability[])[] = [
    ['studio', 'pinta'],
    ['ai', 'pensa'],
    ['molda'],
    [],
    ['molda-intermediate'],
    ['bridge'],
    ['pro', 'molda-professional'],
  ]
  return KidsJourneyPolicySchema.parse({
    schemaVersion: 1,
    mode: 'active',
    steps: JOURNEY_COURSE_TIERS.map((tier, index) => ({
      level: JOURNEY_LEVEL_SLUGS[index + 1],
      requirements: Array.from({ length: journeySlotsForTier(tier) }, (_, slot) => ({
        kind: 'slot',
        tier,
        slot: slot + 1,
        milestone: 'showcase',
      })),
      capabilities: capabilities[index],
    })),
    tierAccess: JOURNEY_COURSE_TIERS.map((tier, index) => ({
      tier,
      opensAt: JOURNEY_LEVEL_SLUGS[index],
      completedAt: JOURNEY_LEVEL_SLUGS[index + 1],
      foundation: { slot: 1, milestone: 'showcase', whenMissing: 'open' },
    })),
  })
}
