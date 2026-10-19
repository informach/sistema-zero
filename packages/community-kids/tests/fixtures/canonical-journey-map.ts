import {
  initialKidsJourneyPolicy,
  JOURNEY_COURSE_TIERS,
  journeySlotsForTier,
  type KidsJourneyCourseFact,
  type KidsJourneyPolicy,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import type { CatalogCourseView } from '../../src/lib/types'

const bonusId = 'ffffffff-ffff-4fff-8fff-fffffffffff0'
export const facts: KidsJourneyCourseFact[] = JOURNEY_COURSE_TIERS.flatMap((tier, tierIndex) =>
  Array.from({ length: journeySlotsForTier(tier) }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(tierIndex * 10 + index + 1).padStart(12, '0')}`,
    tier,
    slot: index + 1,
    audience: 'kids',
    modality: 'recorded',
    status: 'published',
    graduationOnly: false,
    journeyRole: 'positioned',
    hasShowcaseBlock: true,
  })),
)
facts.push({
  id: bonusId,
  tier: null,
  slot: null,
  audience: 'kids',
  modality: 'recorded',
  status: 'published',
  graduationOnly: false,
  journeyRole: 'extra',
  hasShowcaseBlock: false,
})
export const course = {
  courseId: facts.find((fact) => fact.tier === 'iniciante-2d' && fact.slot === 1)!.id,
  courseSlug: 'base-canonical',
  title: 'Base canônica',
  subtitle: null,
  coverImageUrl: null,
  salesPageUrl: null,
  level: 'iniciante',
  track: '2d',
  careerSlot: 1,
  journeyRole: 'positioned',
  hasAccess: true,
  careerLock: { locked: false },
} satisfies CatalogCourseView

export function policy(): KidsJourneyPolicy {
  const seed = initialKidsJourneyPolicy()
  return {
    ...seed,
    tierAccess: seed.tierAccess.map((rule) =>
      rule.tier === 'iniciante-2d' ? { ...rule, opensAt: 'god', completedAt: 'god' } : rule,
    ),
    steps: seed.steps.map((step) =>
      step.level === 'hacker'
        ? { ...step, requirements: [{ kind: 'course', courseId: bonusId, milestone: 'complete' }] }
        : step,
    ),
  }
}
export function view(configured = policy()) {
  return projectKidsJourney({
    policy: configured,
    policyVersion: 2,
    catalog: facts,
    milestones: [],
    earned: {
      level: 'coder',
      capabilities: ['studio', 'pinta'],
      courseAccess: { entry: ['iniciante-2d'], expanded: [], reward: [] },
    },
  })
}
