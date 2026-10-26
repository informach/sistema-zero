import {
  creatorJourneyCoursePlacement,
  projectCreatorJourney,
  resolveCreatorJourneyCourseLock,
} from '@sistemazero/core/journey'
import {
  buildCreatorJourneySeed,
  type CreatorEditorialSpec,
} from '../../members/src/application/creator-journey/creator-journey-seed'
import spec from '../../members/src/infrastructure/config/creator-journey-curriculum.json'
import type { CatalogCourseView, MyCourseView } from '../src/lib/types'

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
  const second = curriculum.stages[1]!
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
  // A trilha do Construtor(a) em andamento, como nas telas aprovadas: a Faísca inteira, os
  // dois cursos da trilha nova feitos e a missão começada.
  if (state === 'coder')
    completedCourseIds.push(
      first.base3dCourseId,
      first.missionCourseId,
      first.powers[0]!.courseIds[0]!,
      second.base2dCourseId,
      second.base3dCourseId,
      second.powers[0]!.courseIds[0]!,
    )
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
        subtitle: previewSubtitle(course.description),
        coverImageUrl: PREVIEW_COVERS[course.slug.replace(/-adulto$/, '')] ?? null,
        track: course.track,
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
  // "Meus cursos": o progresso de quem já tem o curso, para a barra e o "N de M aulas".
  const inProgress = new Set(
    state === 'coder' ? [second.missionCourseId, first.extras[0]?.courseId] : [],
  )
  const mine: MyCourseView[] = catalog
    .filter((course) => course.hasAccess && course.careerLock?.locked !== true)
    .map((course) => {
      const total = Math.max(
        1,
        courses.find((item) => item.id === course.courseId)?.outline.length ?? 1,
      )
      const done = completedCourseIds.includes(course.courseId)
        ? total
        : inProgress.has(course.courseId)
          ? 1
          : 0
      return {
        courseId: course.courseId,
        courseSlug: course.courseSlug,
        title: course.title,
        subtitle: course.subtitle,
        coverImageUrl: course.coverImageUrl,
        track: course.track,
        curriculum: course.curriculum,
        careerLock: course.careerLock,
        milestones: course.milestones,
        access: { accessType: 'subscription', expiresAt: null },
        progress: {
          completedLessons: done,
          totalLessons: total,
          percent: Math.round((done / total) * 100),
        },
        continueLessonId: null,
      }
    })
  return { view, catalog, mine, curriculum, audience, state }
}

/** As capas dos jogos que já existem, servidas pela prévia (dados fictícios). */
const PREVIEW_COVERS: Record<string, string> = {
  'desafio-primeiro-jogo': '/preview-covers/jogo-farol.webp',
  'nave-contra-asteroides': '/preview-covers/jogo-nave.webp',
  'corre-dino': '/preview-covers/jogo-dino.webp',
  'cade-todo-mundo': '/preview-covers/jogo-cade.webp',
}

/** A primeira frase da descrição editorial, curta, para o cartão. */
function previewSubtitle(description: string): string | null {
  const line = description
    .split('\n')[0]
    ?.replace(/^(Mecânica|Objetivo):\s*/, '')
    .trim()
  if (!line) return null
  const sentence = line.split(/(?<=[.!?])\s/)[0] ?? line
  return sentence.length > 110 ? `${sentence.slice(0, 107).replace(/\s+\S*$/, '')}…` : sentence
}

/**
 * A grade da Jornada em Cursos (Admin): a política editorial e os cursos como o painel os lista.
 * Para a prévia mostrar os estados, a missão do Inventor(a) fica em rascunho e dois Poderes do
 * Construtor(a) também (ninguém sobe dele), e um extra do Explorador(a) aponta para fora da lista.
 */
export function creatorGridFixture(audience: 'kids' | 'adult' = 'kids') {
  const curriculum = plan.curricula[audience]
  const [, coder, inventor, explorer] = curriculum.stages
  const drafts = new Set<string>(
    [
      inventor?.missionCourseId,
      ...(coder?.powers
        .slice(0, Math.max(0, (coder?.powers.length ?? 0) - 1))
        .flatMap((power) => power.courseIds) ?? []),
    ].filter((id): id is string => Boolean(id)),
  )
  const missing = explorer?.extras[0]?.courseId
  const courses = plan.courses
    .filter((course) => course.audience === audience && course.id !== missing)
    .map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      status: drafts.has(course.id) ? 'draft' : 'published',
      audience,
      modality: 'recorded' as const,
      track: course.track,
    }))
  return { curriculum, courses, audience }
}
