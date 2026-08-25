import type { Course, CourseAudience } from '../../domain/course/course'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import {
  type MemberCourseProgressView,
  type MemberDetailView,
  type MemberProfileProgressView,
  toAdminEntitlementView,
} from '../mappers/admin-views'

/**
 * Detalhe admin do membro: TODAS as matrículas (qualquer status) + progresso por
 * curso POR APRENDIZ — o da conta e, quando o painel passa `profileIds`, o de
 * CADA perfil (kids).
 *
 * O progresso de um aprendiz é a UNIÃO de duas origens:
 * 1. matrículas ESPECÍFICAS de curso (`accessType === 'course'`) cujo curso é da
 *    PLATAFORMA do aprendiz (conta → `adult`, perfil → `kids`) — inclui curso
 *    nunca aberto (barra 0%, `lastActivityAt: null`);
 * 2. cursos com ATIVIDADE real do aprendiz (conclusão de aula OU acesso a vídeo,
 *    sem filtro de plataforma — atividade é evidência) — é o que faz a
 *    chave-mestra (`all_courses`/`all_kids_courses`, courseRef null) aparecer:
 *    ela não vira card por matrícula, e sim pelos cursos que o aprendiz tocou.
 *
 * ⚠️ Produto que NÃO é curso (Pensa/Pinta/Estúdio/Clube/Mural — accessType
 * `community`, courseRef = o próprio sku) fica FORA daqui DE PROPÓSITO: uso de
 * ferramenta tem cartão próprio (tool-usage), não barra de progresso. Era o bug
 * da ficha: esses produtos viravam "cursos 0%" com slug cru enquanto o assinante
 * do combo (só chave-mestra) não mostrava progresso nenhum.
 */
export class GetMemberDetailService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly videoPositions: VideoPositionRepository,
  ) {}

  async execute(userId: string, profileIds: string[] = []): Promise<MemberDetailView> {
    const ents = await this.entitlements.listByUserId(userId)

    // Matrícula específica de curso — o filtro por accessType É o fix (ver JSDoc).
    const enrolledRefs = [
      ...new Set(
        ents
          .filter((e) => e.accessType === 'course' && e.courseRef !== null)
          .map((e) => e.courseRef as string),
      ),
    ]
    const enrolledCourses = await this.courses.findCoursesBySlugs(enrolledRefs)
    const enrolledSlugs = new Set(enrolledCourses.map((c) => c.slug))
    // Matrícula cuja ref não resolve mais um curso: linha degradada VISÍVEL (não
    // dá pra saber a plataforma dela — entra para todos os aprendizes).
    const orphanRefs = enrolledRefs.filter((ref) => !enrolledSlugs.has(ref))

    // Totais de aulas por curso não variam por aprendiz — cache do execute.
    const totalsCache = new Map<string, number>()
    const totalsFor = async (courseIds: string[]): Promise<Map<string, number>> => {
      const missing = courseIds.filter((id) => !totalsCache.has(id))
      if (missing.length > 0) {
        const fetched = await this.courses.countLessonsByCourseIds(missing)
        for (const id of missing) totalsCache.set(id, fetched.get(id) ?? 0)
      }
      return totalsCache
    }

    const progressFor = async (
      learnerId: string,
      learnerAudience: CourseAudience,
    ): Promise<MemberCourseProgressView[]> => {
      const [lastCompleted, lastAccessed] = await Promise.all([
        this.progress.lastCompletionByCourse(learnerId),
        this.videoPositions.lastAccessByCourse(learnerId),
      ])
      // Última atividade por curso = max(última conclusão, último acesso a vídeo).
      const lastActivity = new Map<string, Date>(lastCompleted)
      for (const [courseId, at] of lastAccessed) {
        const prev = lastActivity.get(courseId)
        if (!prev || at.getTime() > prev.getTime()) lastActivity.set(courseId, at)
      }

      const activityCourses = await this.courses.findCoursesByIds([...lastActivity.keys()])
      const union = new Map<string, Course>()
      for (const c of enrolledCourses) {
        if (c.audience === learnerAudience) union.set(c.id, c)
      }
      for (const c of activityCourses) union.set(c.id, c)

      const courseIds = [...union.keys()]
      const [totals, completed] = await Promise.all([
        totalsFor(courseIds),
        this.progress.countCompletedByCourseIds(learnerId, courseIds),
      ])

      const views = [...union.values()].map((course) =>
        buildCourseProgress(course, totals, completed, lastActivity.get(course.id) ?? null),
      )
      views.sort(byActivityThenTitle)
      for (const ref of orphanRefs) views.push(orphanCourseProgress(ref))
      return views
    }

    const entitlementViews = ents.map((e) => toAdminEntitlementView(e))
    const accountProgress = await progressFor(userId, 'adult')

    // Sem perfis (conta nunca criou) → comportamento de sempre (só `progress`).
    if (profileIds.length === 0) {
      return { userId, entitlements: entitlementViews, progress: accountProgress }
    }

    const profilesProgress: MemberProfileProgressView[] = await Promise.all(
      profileIds.map(async (pid) => ({ userId: pid, progress: await progressFor(pid, 'kids') })),
    )
    return { userId, entitlements: entitlementViews, progress: accountProgress, profilesProgress }
  }
}

function buildCourseProgress(
  course: Course,
  totals: Map<string, number>,
  completed: Map<string, number>,
  lastActivityAt: Date | null,
): MemberCourseProgressView {
  const p = computeProgress(completed.get(course.id) ?? 0, totals.get(course.id) ?? 0)
  return {
    courseRef: course.slug,
    courseId: course.id,
    title: course.title,
    status: course.status,
    audience: course.audience,
    completedLessons: p.completedLessons,
    totalLessons: p.totalLessons,
    percent: p.percent,
    lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
  }
}

function orphanCourseProgress(courseRef: string): MemberCourseProgressView {
  const p = computeProgress(0, 0)
  return {
    courseRef,
    courseId: null,
    title: null,
    status: null,
    audience: null,
    completedLessons: p.completedLessons,
    totalLessons: p.totalLessons,
    percent: p.percent,
    lastActivityAt: null,
  }
}

/** Atividade mais recente primeiro; nunca-abertos por último, por título/slug. */
function byActivityThenTitle(a: MemberCourseProgressView, b: MemberCourseProgressView): number {
  if (a.lastActivityAt && b.lastActivityAt) return b.lastActivityAt.localeCompare(a.lastActivityAt)
  if (a.lastActivityAt) return -1
  if (b.lastActivityAt) return 1
  return (a.title ?? a.courseRef).localeCompare(b.title ?? b.courseRef)
}
