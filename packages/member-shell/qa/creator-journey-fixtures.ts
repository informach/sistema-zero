import {
  creatorJourneyCoursePlacement,
  projectCreatorJourney,
  resolveCreatorJourneyCourseLock,
} from '@sistemazero/core/journey'
import spec from '../../../docs/design/jornada-criador-curriculo-2026-10-25.json'
import {
  buildCreatorJourneySeed,
  type CreatorEditorialSpec,
} from '../../members/src/application/creator-journey/creator-journey-seed'
import type { CatalogCourseView } from '../src/lib/types'

/** Isolated preview data: editorial seed, no gateway, secrets, learner records or database. */
const editorial: CreatorEditorialSpec = {
  ...spec,
  masteries: spec.masteries.map((area) => ({
    ...area,
    levels: area.levels.map((level) => ({
      ...level,
      workshops: level.workshops.map(([title, description, ...extra]): [string, string] => {
        if (!title || !description || extra.length)
          throw new Error('Cada oficina editorial precisa de título e descrição.')
        return [title, description]
      }),
    })),
  })),
}
const plan = buildCreatorJourneySeed(editorial, [])
export function creatorSceneFixture(audience: 'kids' | 'adult' = 'adult', state = 'pair') {
  const curriculum = plan.curricula[audience]
  const first = curriculum.stages[0]!
  const completedCourseIds: string[] =
    state === 'fresh' ||
    state === 'direct' ||
    state === 'expired' ||
    state === 'planned' ||
    state === 'retained'
      ? []
      : [first.base2dCourseId]
  if (['pair', 'mission', 'power', 'legend', 'mastery', 'paused'].includes(state))
    completedCourseIds.push(first.base3dCourseId)
  if (['mission', 'power', 'legend', 'mastery'].includes(state))
    completedCourseIds.push(first.missionCourseId)
  if (state === 'power') completedCourseIds.push(first.powers[0]!.courseIds[0]!)
  if (state === 'legend' || state === 'mastery')
    for (const stage of curriculum.stages)
      completedCourseIds.push(
        stage.base2dCourseId,
        stage.base3dCourseId,
        stage.missionCourseId,
        ...stage.powers.slice(0, stage.minimumPowers).map((power) => power.courseIds[0]!),
      )
  const courses = plan.courses.filter((course) => course.audience === audience)
  const facts = courses.map((course) => ({
    id: course.id,
    title: course.title,
    audience,
    modality: 'recorded' as const,
    status: state === 'planned' ? ('draft' as const) : ('published' as const),
  }))
  const view = projectCreatorJourney({
    curriculum,
    completedCourseIds,
    audience,
    catalog: facts,
    paused: state === 'paused',
    ...(state === 'retained'
      ? { earnedLevel: 'elite' as const, earnedCapabilities: ['studio' as const] }
      : {}),
  })
  const catalog: CatalogCourseView[] = courses
    .filter(() => state !== 'planned')
    .map((course) => {
      const direct = state === 'direct' && course.id === first.extras[0]?.courseId
      return {
        courseId: course.id,
        courseSlug: course.slug,
        title: course.title,
        subtitle: null,
        coverImageUrl: null,
        hasAccess: state !== 'expired',
        salesPageUrl: null,
        milestones: { completed: completedCourseIds.includes(course.id), showcased: false },
        curriculum: creatorJourneyCoursePlacement(curriculum, course.id) ?? undefined,
        careerLock: direct
          ? { locked: false }
          : resolveCreatorJourneyCourseLock({ curriculum, view, courseId: course.id }),
        ...(direct ? { accessReason: 'direct-purchase' as const } : {}),
      }
    })
  return { view, catalog, curriculum, audience, state }
}
