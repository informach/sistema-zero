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
    const uniqueProfileIds = [...new Set(profileIds)].filter((profileId) => profileId !== userId)
    const learnerIds = [userId, ...uniqueProfileIds]
    const [ents, lastCompletedByLearner, lastAccessedByLearner] = await Promise.all([
      this.entitlements.listByUserId(userId),
      this.progress.lastCompletionByUsers(learnerIds),
      this.videoPositions.lastAccessByUsers(learnerIds),
    ])

    // Matrícula específica de curso — o filtro por accessType É o fix (ver JSDoc).
    const enrolledRefs = [
      ...new Set(
        ents
          .filter((e) => e.accessType === 'course' && e.courseRef !== null)
          .map((e) => e.courseRef as string),
      ),
    ]
    const activityByLearner = new Map<string, Map<string, Date>>()
    const allActivityCourseIds = new Set<string>()
    for (const learnerId of learnerIds) {
      const lastActivity = new Map(lastCompletedByLearner.get(learnerId) ?? [])
      for (const [courseId, at] of lastAccessedByLearner.get(learnerId) ?? []) {
        const previous = lastActivity.get(courseId)
        if (!previous || at.getTime() > previous.getTime()) lastActivity.set(courseId, at)
      }
      activityByLearner.set(learnerId, lastActivity)
      for (const courseId of lastActivity.keys()) allActivityCourseIds.add(courseId)
    }

    const [enrolledCourses, activityCourses] = await Promise.all([
      this.courses.findCoursesBySlugs(enrolledRefs),
      this.courses.findCoursesByIds([...allActivityCourseIds]),
    ])
    const enrolledSlugs = new Set(enrolledCourses.map((c) => c.slug))
    // Matrícula cuja ref não resolve mais um curso: linha degradada VISÍVEL (não
    // dá pra saber a plataforma dela — entra para todos os aprendizes).
    const orphanRefs = enrolledRefs.filter((ref) => !enrolledSlugs.has(ref))

    const activityCourseById = new Map(activityCourses.map((course) => [course.id, course]))
    const coursesByLearner = new Map<string, Map<string, Course>>()
    const allCourseIds = new Set<string>()
    for (const learnerId of learnerIds) {
      const learnerAudience: CourseAudience = learnerId === userId ? 'adult' : 'kids'
      const union = new Map<string, Course>()
      for (const course of enrolledCourses) {
        if (course.audience === learnerAudience) union.set(course.id, course)
      }
      for (const courseId of activityByLearner.get(learnerId)?.keys() ?? []) {
        const course = activityCourseById.get(courseId)
        if (course) union.set(course.id, course)
      }
      coursesByLearner.set(learnerId, union)
      for (const courseId of union.keys()) allCourseIds.add(courseId)
    }

    // Denominadores e numeradores de TODA a família: duas queries, sem fan-out
    // por perfil. O teto HTTP é 50 perfis, então isso remove centenas de awaits.
    const [totals, completedByLearner] = await Promise.all([
      this.courses.countLessonsByCourseIds([...allCourseIds]),
      this.progress.countCompletedByUsersAndCourseIds(learnerIds, [...allCourseIds]),
    ])

    const progressFor = (learnerId: string): MemberCourseProgressView[] => {
      const lastActivity = activityByLearner.get(learnerId) ?? new Map()
      const completed = completedByLearner.get(learnerId) ?? new Map()
      const views = [...(coursesByLearner.get(learnerId)?.values() ?? [])].map((course) =>
        buildCourseProgress(course, totals, completed, lastActivity.get(course.id) ?? null),
      )
      views.sort(byActivityThenTitle)
      for (const ref of orphanRefs) views.push(orphanCourseProgress(ref))
      return views
    }

    const entitlementViews = ents.map((e) => toAdminEntitlementView(e))
    const accountProgress = progressFor(userId)

    // Sem perfis (conta nunca criou) → comportamento de sempre (só `progress`).
    if (uniqueProfileIds.length === 0) {
      return { userId, entitlements: entitlementViews, progress: accountProgress }
    }

    const profilesProgress: MemberProfileProgressView[] = uniqueProfileIds.map((profileId) => ({
      userId: profileId,
      progress: progressFor(profileId),
    }))
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
