import { isJourneyCourseTier, type KidsCourseMilestone } from '@sistemazero/core/journey'
import type { CourseLevel, CourseTrack } from '../../../domain/course/course'
import type { KidsJourneyCatalogCourse } from '../../../domain/ports/kids-journey-repository.port'

export interface KidsJourneyEventFact {
  userId: string
  courseId: string
  sourceType: 'course_complete' | 'course_showcased'
  sourceLevel: CourseLevel | null
  sourceTrack: CourseTrack | null
  sourceCareerSlot: number | null
}

/** Snapshot precedence is field-by-field, including complete-only policies. */
export function kidsMilestonesFromEvents(
  events: readonly KidsJourneyEventFact[],
  catalog: readonly KidsJourneyCatalogCourse[],
): Map<string, KidsCourseMilestone[]> {
  const courses = new Map(catalog.map((course) => [course.id, course]))
  const byProfile = new Map<
    string,
    Map<string, { complete?: KidsJourneyEventFact; showcase?: KidsJourneyEventFact }>
  >()
  for (const event of events) {
    const profile = byProfile.get(event.userId) ?? new Map()
    const course = profile.get(event.courseId) ?? {}
    if (event.sourceType === 'course_complete') course.complete = event
    else course.showcase = event
    profile.set(event.courseId, course)
    byProfile.set(event.userId, profile)
  }
  return new Map(
    [...byProfile].map(([userId, milestones]) => [
      userId,
      [...milestones].map(([courseId, { complete, showcase }]) => {
        const course = courses.get(courseId)
        const level = showcase?.sourceLevel ?? complete?.sourceLevel ?? course?.level
        const track = showcase?.sourceTrack ?? complete?.sourceTrack ?? course?.track ?? '2d'
        const slot =
          showcase?.sourceCareerSlot ?? complete?.sourceCareerSlot ?? course?.slot ?? null
        const tier = `${level}-${track}`
        return {
          courseId,
          completed: complete !== undefined,
          showcased: showcase !== undefined,
          qualifiedTier: isJourneyCourseTier(tier) ? tier : null,
          qualifiedSlot: isJourneyCourseTier(tier) ? slot : null,
        }
      }),
    ]),
  )
}
