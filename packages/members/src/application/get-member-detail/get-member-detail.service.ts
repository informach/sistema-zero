import type { Course } from '../../domain/course/course'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import {
  type MemberCourseProgressView,
  type MemberDetailView,
  type MemberProfileProgressView,
  toAdminEntitlementView,
} from '../mappers/admin-views'

/**
 * Detalhe admin do membro: TODAS as matrículas (qualquer status) + progresso por
 * curso. Diferente do aluno, inclui cursos `draft`/`archived` (admin vê tudo) —
 * por isso usa `findCoursesBySlugs` (sem filtro de status). Contagens em LOTE.
 * Os cursos são da CONTA (matrículas por `userId`); o progresso é por aprendiz —
 * o da conta (pré-perfis) e, se o painel passar `profileIds`, o de CADA perfil.
 */
export class GetMemberDetailService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
  ) {}

  async execute(userId: string, profileIds: string[] = []): Promise<MemberDetailView> {
    const ents = await this.entitlements.listByUserId(userId)

    const courseRefs = [
      ...new Set(ents.map((e) => e.courseRef).filter((c): c is string => c !== null)),
    ]
    const courses = await this.courses.findCoursesBySlugs(courseRefs)
    const bySlug = new Map(courses.map((c) => [c.slug, c]))
    const courseIds = courses.map((c) => c.id)

    // Totais por curso (denominador) são iguais p/ todos os aprendizes.
    const totals = await this.courses.countLessonsByCourseIds(courseIds)

    // Progresso de UM aprendiz (conta ou perfil) sobre os cursos da família.
    const progressFor = async (learnerId: string): Promise<MemberCourseProgressView[]> => {
      const completed = await this.progress.countCompletedByCourseIds(learnerId, courseIds)
      return courseRefs.map((ref) => buildCourseProgress(ref, bySlug.get(ref), totals, completed))
    }

    const accountProgress = await progressFor(userId)

    // Sem perfis (conta nunca criou) → comportamento de sempre (só `progress`).
    if (profileIds.length === 0) {
      return {
        userId,
        entitlements: ents.map((e) => toAdminEntitlementView(e)),
        progress: accountProgress,
      }
    }

    const profilesProgress: MemberProfileProgressView[] = await Promise.all(
      profileIds.map(async (pid) => ({ userId: pid, progress: await progressFor(pid) })),
    )
    return {
      userId,
      entitlements: ents.map((e) => toAdminEntitlementView(e)),
      progress: accountProgress,
      profilesProgress,
    }
  }
}

function buildCourseProgress(
  courseRef: string,
  course: Course | undefined,
  totals: Map<string, number>,
  completed: Map<string, number>,
): MemberCourseProgressView {
  const total = course ? (totals.get(course.id) ?? 0) : 0
  const done = course ? (completed.get(course.id) ?? 0) : 0
  const p = computeProgress(done, total)
  return {
    courseRef,
    title: course?.title ?? null,
    status: course?.status ?? null,
    completedLessons: p.completedLessons,
    totalLessons: p.totalLessons,
    percent: p.percent,
  }
}
