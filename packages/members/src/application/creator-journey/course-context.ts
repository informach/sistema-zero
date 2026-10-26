import {
  type CreatorJourneyCurriculum,
  creatorJourneyCourseIds,
  creatorJourneyCoursePlacement,
} from '@sistemazero/core/journey'
import type { CourseCurriculumView } from '../mappers/views'

/** The core placement resolver preserves the main post when a course also grants mastery credit. */
export function creatorCourseContexts(
  curriculum?: CreatorJourneyCurriculum,
): Map<string, CourseCurriculumView> {
  const contexts = new Map<string, CourseCurriculumView>()
  if (!curriculum) return contexts
  for (const courseId of creatorJourneyCourseIds(curriculum)) {
    const placement = creatorJourneyCoursePlacement(curriculum, courseId)
    if (placement) contexts.set(courseId, placement)
  }
  return contexts
}
