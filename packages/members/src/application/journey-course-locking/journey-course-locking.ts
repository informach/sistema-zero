import type { JourneyCourseLock } from '@sistemazero/core/journey'
import type { Course } from '../../domain/course/course'
import { courseTier } from '../../domain/gamification/levels'
import { KidsJourneyUnavailableError } from '../../domain/kids-journey/kids-journey.errors'
import type { JourneyCourseLockView } from '../mappers/views'

/** Presentation only. Authorization comes from the canonical policy/earned snapshot. */
export function journeyLockViews(
  courses: readonly Course[],
  locks: ReadonlyMap<string, JourneyCourseLock> | null,
): Map<string, JourneyCourseLockView> {
  if (locks === null) return new Map() // Explicit Adult/team bypass at the caller.
  const foundationByTier = new Map<string, string>()
  for (const course of courses) {
    if (course.audience === 'kids' && course.status === 'published' && course.careerSlot === 1) {
      const tier = course.level === 'lenda' ? null : courseTier(course.level, course.track)
      if (tier) foundationByTier.set(tier, course.slug)
    }
  }
  return new Map(courses.map((course): [string, JourneyCourseLockView] => {
    const lock = locks.get(course.id)
    if (!lock) throw new KidsJourneyUnavailableError()
    const tier = course.level === 'lenda' ? null : courseTier(course.level, course.track)
    return [course.id, {
      locked: lock.locked,
      ...(lock.reason ? { reason: lock.reason } : {}),
      ...(lock.requiredLevel ? { requiredLevel: lock.requiredLevel } : {}),
      ...(lock.locked && lock.reason === 'foundation-first' && tier && foundationByTier.has(tier)
        ? { foundationCourseSlug: foundationByTier.get(tier) } : {}),
    }]
  }))
}
