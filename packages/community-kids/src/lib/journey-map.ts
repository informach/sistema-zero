import {
  journeySlotsForTier,
  type KidsJourneyStaffPreview,
  type KidsJourneyView,
} from '@sistemazero/core/journey'
import { type CourseTierSlug, courseTierOf } from '@sistemazero/member-shell/lib/course-tier'
import { courseIsDone } from '@/lib/course-badge'
import { LEVEL_ORDER } from '@/lib/level-info'
import type { CatalogCourseView, StudentLevelSlug } from '@/lib/types'

/** Presentation of the same persisted policy; access itself remains authoritative in Members. */
export type JourneyCoursePolicy = Pick<KidsJourneyView | KidsJourneyStaffPreview, 'tierAccess'>
export type JourneyNodeState = 'done' | 'current' | 'locked'

export function journeyNodeState(
  current: StudentLevelSlug,
  node: StudentLevelSlug,
): JourneyNodeState {
  const currentIndex = LEVEL_ORDER.indexOf(current)
  const nodeIndex = LEVEL_ORDER.indexOf(node)
  if (currentIndex < 0) return 'locked'
  if (nodeIndex === currentIndex) return 'current'
  return nodeIndex < currentIndex ? 'done' : 'locked'
}

/** No default rank: an absent policy never invents a destination. */
export function levelForTier(
  tier: CourseTierSlug,
  journey: JourneyCoursePolicy,
): StudentLevelSlug | null {
  return journey.tierAccess.find((rule) => rule.tier === tier)?.opensAt ?? null
}

function journeyGroup(course: CatalogCourseView): number {
  if (course.journeyRole === 'extra') return 0
  return typeof course.careerSlot === 'number' ? 1 : 2
}
function compareJourneyCourses(a: CatalogCourseView, b: CatalogCourseView): number {
  return (
    journeyGroup(a) - journeyGroup(b) ||
    (typeof a.careerSlot === 'number' && typeof b.careerSlot === 'number'
      ? a.careerSlot - b.careerSlot
      : 0) ||
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
    a.courseSlug.localeCompare(b.courseSlug)
  )
}

export function coursesForLevel(
  level: StudentLevelSlug,
  courses: readonly CatalogCourseView[],
  journey: JourneyCoursePolicy,
): CatalogCourseView[] {
  return courses
    .filter((course) => {
      // Graduation is curriculum metadata, outside promotion requirements; no new access gate.
      if (course.level === 'lenda') return level === 'god'
      const tier = courseTierOf(course.level, course.track)
      if (!tier || levelForTier(tier, journey) !== level) return false
      return (
        course.careerSlot == null ||
        (Number.isInteger(course.careerSlot) &&
          course.careerSlot >= 1 &&
          course.careerSlot <= journeySlotsForTier(tier))
      )
    })
    .sort(compareJourneyCourses)
}

/** Counts curricular milestones, including extras/rewards; never used to award a rank. */
export interface TierCompletion {
  done: number
  total: number
}
export function tierCompletion(
  level: StudentLevelSlug,
  courses: readonly CatalogCourseView[],
  journey: JourneyCoursePolicy,
): TierCompletion {
  const group = coursesForLevel(level, courses, journey)
  return { done: group.filter(courseIsDone).length, total: group.length }
}
export function tierCompletionByLevel(
  courses: readonly CatalogCourseView[],
  journey: JourneyCoursePolicy,
): Record<StudentLevelSlug, TierCompletion> {
  return Object.fromEntries(
    LEVEL_ORDER.map((level) => [level, tierCompletion(level, courses, journey)]),
  ) as Record<StudentLevelSlug, TierCompletion>
}
export function nodeShowsCheck(
  state: JourneyNodeState,
  _completion: TierCompletion | null | undefined,
): boolean {
  return state === 'done'
}

/** A retained course right can open a later trail without awarding its rank. */
export function trilhaLocked(
  journey: KidsJourneyView | KidsJourneyStaffPreview | null | undefined,
  level: StudentLevelSlug,
  courses: readonly CatalogCourseView[],
): boolean {
  if (!journey) return true
  // Own-account staff preview was authorized by Members; it has no learner rank to simulate.
  if ('kind' in journey && journey.kind === 'staff-preview') return false
  if (
    'earned' in journey &&
    LEVEL_ORDER.indexOf(journey.earned.level) >= LEVEL_ORDER.indexOf(level)
  )
    return false
  return !coursesForLevel(level, courses, journey).some(
    (course) => course.hasAccess && course.careerLock?.locked !== true,
  )
}
export function accessibleJourneyLevels(
  journey: KidsJourneyView,
  courses: readonly CatalogCourseView[],
): StudentLevelSlug[] {
  return LEVEL_ORDER.filter((level) => !trilhaLocked(journey, level, courses))
}
