import { JOURNEY_COURSE_TIERS, type KidsJourneyView } from '@sistemazero/core/journey'
import type { LevelRemaining, StudentLevel } from '../../domain/gamification/levels'

/** Presentation only: requirements, next rank and earned floor come from the canonical view. */
export function kidsStudentLevel(view: KidsJourneyView): StudentLevel {
  const remaining =
    view.nextLevel === null
      ? null
      : (Object.fromEntries([
          ['any', view.missing.filter((requirement) => requirement.kind === 'course').length],
          ...JOURNEY_COURSE_TIERS.map((tier) => [
            tier,
            view.missing.filter(
              (requirement) => requirement.kind === 'slot' && requirement.tier === tier,
            ).length,
          ]),
        ]) as LevelRemaining)
  return { slug: view.earned.level, next: view.nextLevel, remaining }
}
