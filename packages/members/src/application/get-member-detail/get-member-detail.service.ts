import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import {
  type MemberCourseProgressView,
  type MemberDetailView,
  toAdminEntitlementView,
} from '../mappers/admin-views'

/**
 * Detalhe admin do membro: TODAS as matrículas (qualquer status) + progresso por
 * curso. Diferente do aluno, inclui cursos `draft`/`archived` (admin vê tudo) —
 * por isso usa `findCoursesBySlugs` (sem filtro de status). Contagens em LOTE.
 */
export class GetMemberDetailService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
  ) {}

  async execute(userId: string): Promise<MemberDetailView> {
    const ents = await this.entitlements.listByUserId(userId)

    const courseRefs = [
      ...new Set(ents.map((e) => e.courseRef).filter((c): c is string => c !== null)),
    ]
    const courses = await this.courses.findCoursesBySlugs(courseRefs)
    const bySlug = new Map(courses.map((c) => [c.slug, c]))
    const courseIds = courses.map((c) => c.id)

    const [totals, completed] = await Promise.all([
      this.courses.countLessonsByCourseIds(courseIds),
      this.progress.countCompletedByCourseIds(userId, courseIds),
    ])

    const progress: MemberCourseProgressView[] = courseRefs.map((ref) => {
      const course = bySlug.get(ref)
      const total = course ? (totals.get(course.id) ?? 0) : 0
      const done = course ? (completed.get(course.id) ?? 0) : 0
      const p = computeProgress(done, total)
      return {
        courseRef: ref,
        title: course?.title ?? null,
        status: course?.status ?? null,
        completedLessons: p.completedLessons,
        totalLessons: p.totalLessons,
        percent: p.percent,
      }
    })

    return { userId, entitlements: ents.map(toAdminEntitlementView), progress }
  }
}
