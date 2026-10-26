import {
  type CreatorJourneyView,
  JOURNEY_COURSE_TIERS,
  type KidsJourneyView,
} from '@sistemazero/core/journey'
import type { LevelRemaining, StudentLevel } from '../../domain/gamification/levels'

/** Presentation only: requirements, next rank and earned floor come from the canonical view. */
export function kidsStudentLevel(view: KidsJourneyView): StudentLevel {
  if (view.curriculum) return creatorStudentLevel(view.curriculum)
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

export function creatorStudentLevel(view: CreatorJourneyView): StudentLevel {
  const stage = view.stages.find((stage) => stage.level === view.level)
  const missing = stage
    ? [stage.base2d, stage.base3d, stage.mission].filter((course) => course.state !== 'completed')
        .length + Math.max(0, stage.minimumPowers - stage.powersCompleted)
    : 0
  return {
    slug: view.level,
    next: view.nextLevel,
    remaining:
      view.nextLevel === null
        ? null
        : (Object.fromEntries([
            ['any', missing],
            ...JOURNEY_COURSE_TIERS.map((tier) => [tier, 0]),
          ]) as LevelRemaining),
  }
}
