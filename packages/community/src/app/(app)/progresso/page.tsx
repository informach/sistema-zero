import type { AdultJourneyView } from '@sistemazero/core/journey'
import { isReadonlyImpersonation } from '@sistemazero/member-shell/lib/act'
import type { CatalogCourseView, MyCourseView } from '@sistemazero/member-shell/lib/types'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { ProgressClient } from './progress-client'

export const dynamic = 'force-dynamic'

/** Teto de detalhes de curso lidos para dar nome às pendências (só num members sem `courseId`). */
const MAX_COURSE_LOOKUPS = 12

/**
 * Os nomes dos cursos que a etapa em andamento ainda pede. A jornada fala em `courseId`, que o
 * catálogo traz desde 19/10/2026: uma leitura só dá nome a todos. Num members anterior (sem o id
 * no catálogo), o detalhe de cada curso de Meus cursos traz o id, com teto, e os que ainda têm um
 * marco a cumprir vêm primeiro. Best-effort: sem nome, a frase conta os cursos.
 */
async function pendingCourseTitles(journey: AdultJourneyView | undefined) {
  const pending = new Set(
    journey?.configured
      ? journey.stages
          .filter((stage) => stage.available && !stage.completed)
          .flatMap((stage) => stage.missing.map((item) => item.courseId))
      : [],
  )
  if (!pending.size) return {}
  const titles: Record<string, string> = {}
  const catalog = await shell.members.listCatalog().catch(() => null)
  const courses = catalog?.status === 200 ? (catalog.body?.courses ?? []) : []
  for (const course of courses)
    if (course.courseId && pending.has(course.courseId)) titles[course.courseId] = course.title
  if (courses.some((course) => course.courseId)) return titles
  const mine = await shell.members.listMyCourses().catch(() => null)
  const weight = (course: MyCourseView) =>
    (course.milestones?.completed && course.milestones.showcased ? 2 : 0) +
    (course.careerSlot == null ? 1 : 0)
  const slugs = (mine?.status === 200 ? (mine.body?.courses ?? []) : [])
    .slice()
    .sort((a, b) => weight(a) - weight(b))
    .slice(0, MAX_COURSE_LOOKUPS)
    .map((course) => course.courseSlug)
  const details = await Promise.all(
    slugs.map((slug) => shell.members.getMyCourseReadonly(slug).catch(() => null)),
  )
  for (const detail of details) {
    const course = detail?.status === 200 ? detail.body : null
    if (course?.id && pending.has(course.id)) titles[course.id] = course.title
  }
  return titles
}

export default async function ProgressPage() {
  const [session, missions, gamification] = await Promise.all([
    getSession(),
    shell.members.getMissionsReadonly().catch(() => null),
    // O mesmo pedido do layout (com a colocação), deduplicado pelo cache da requisição: a
    // atualização do cliente (`/api/members/gamification/me`) não traz o ranking.
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  const progress = gamification?.status === 200 ? gamification.body : null
  // No currículo o cartão da etapa atual mostra o próximo curso: ele precisa do catálogo e de Meus
  // cursos. A jornada histórica só precisa dos nomes do que falta.
  const curriculum = Boolean(progress?.journey?.curriculum)
  const [courseTitles, catalog, mine] = await Promise.all([
    curriculum ? {} : pendingCourseTitles(progress?.journey),
    curriculum ? shell.members.listCatalog().catch(() => null) : null,
    curriculum ? shell.members.listMyCourses().catch(() => null) : null,
  ])
  return (
    <ProgressClient
      readOnly={Boolean(session && isReadonlyImpersonation(session))}
      missions={
        missions?.status === 200 && missions.body?.audience === 'adult'
          ? (missions.body ?? null)
          : null
      }
      ranking={progress?.ranking ?? null}
      courseTitles={courseTitles}
      catalog={
        catalog?.status === 200 ? (catalog.body?.courses ?? []) : ([] as CatalogCourseView[])
      }
      mine={mine?.status === 200 ? (mine.body?.courses ?? []) : ([] as MyCourseView[])}
    />
  )
}
