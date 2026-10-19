import type { AdultJourneyView } from '@sistemazero/core/journey'
import { isReadonlyImpersonation } from '@sistemazero/member-shell/lib/act'
import type { MyCourseView } from '@sistemazero/member-shell/lib/types'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { ProgressClient } from './progress-client'

export const dynamic = 'force-dynamic'

/** Teto de detalhes de curso lidos para dar nome às pendências da jornada. */
const MAX_COURSE_LOOKUPS = 12

/**
 * Os nomes dos cursos que a etapa em andamento ainda pede. A jornada fala em `courseId`, e as
 * listas do aluno não trazem o id: o detalhe de cada curso traz. Só quando há pendência, com teto,
 * e best-effort (sem nome, a frase conta os cursos). Os candidatos vêm de Meus cursos, primeiro os
 * que ainda têm um marco a cumprir (concluir ou mostrar na Mostra) e, entre eles, os que têm lugar
 * na jornada: são esses que a etapa pode estar pedindo. Uma conta com muitos cursos (equipe, chave
 * de todos os cursos) não gasta o teto com cursos já fechados.
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
  const titles: Record<string, string> = {}
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
  const courseTitles = await pendingCourseTitles(progress?.journey)
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
    />
  )
}
