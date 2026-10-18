import { JOURNEY_COURSE_TIERS, journeySlotsForTier } from '../../src/journey/catalog'
import type {
  KidsCourseMilestone,
  KidsJourneyCourseFact,
  KidsJourneyProjectionInput,
} from '../../src/journey/kids-policy'

export function kidsCourseId(index: number): string {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
}

export function kidsJourneyFacts(): KidsJourneyCourseFact[] {
  const facts: KidsJourneyCourseFact[] = []
  for (const tier of JOURNEY_COURSE_TIERS) {
    for (let slot = 1; slot <= journeySlotsForTier(tier); slot++) {
      facts.push({
        id: kidsCourseId(facts.length),
        audience: 'kids',
        modality: 'recorded',
        status: 'published',
        tier,
        slot,
        journeyRole: 'positioned',
        hasShowcaseBlock: true,
      })
    }
  }
  return facts
}

export function kidsMilestones(count = 49): KidsCourseMilestone[] {
  return kidsJourneyFacts()
    .slice(0, count)
    .map((course) => ({
      courseId: course.id,
      completed: true,
      showcased: true,
      qualifiedTier: course.tier,
      qualifiedSlot: course.slot,
    }))
}

export function kidsJourneyInput(
  patch: Partial<KidsJourneyProjectionInput> = {},
): KidsJourneyProjectionInput {
  return {
    policy: { schemaVersion: 1, mode: 'legacy' },
    policyVersion: 0,
    milestones: [],
    earned: { level: 'noob', capabilities: [] },
    catalog: kidsJourneyFacts(),
    ...patch,
  }
}
