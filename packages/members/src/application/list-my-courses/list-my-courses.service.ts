import type { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import { type MyCourseView, toMyCourseView } from '../mappers/views'

/** "Meus cursos": matrículas ATIVAS de curso → cursos publicados + progresso. */
export class ListMyCoursesService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string): Promise<MyCourseView[]> {
    const active = await this.entitlements.listActiveByUser(userId, this.clock())

    // Só matrículas de CURSO com courseRef; escolhe a "mais forte" por curso
    // (vitalícia > validade mais distante) se houver duplicidade.
    const byCourseRef = new Map<string, EntitlementAggregate>()
    for (const e of active) {
      if (e.accessType !== 'course' || !e.courseRef) continue
      const current = byCourseRef.get(e.courseRef)
      if (!current || isStronger(e, current)) byCourseRef.set(e.courseRef, e)
    }
    if (byCourseRef.size === 0) return []

    const courses = await this.courses.findAccessibleCoursesBySlugs([...byCourseRef.keys()])
    // Contagens em LOTE (2 queries) em vez de 2 por curso (evita N+1).
    const courseIds = courses.map((c) => c.id)
    const [totals, completed] = await Promise.all([
      this.courses.countLessonsByCourseIds(courseIds),
      this.progress.countCompletedByCourseIds(userId, courseIds),
    ])

    const views: MyCourseView[] = []
    for (const course of courses) {
      const entitlement = byCourseRef.get(course.slug)
      if (!entitlement) continue
      const progress = computeProgress(completed.get(course.id) ?? 0, totals.get(course.id) ?? 0)
      views.push(toMyCourseView(course, entitlement, progress))
    }
    return views
  }
}

function isStronger(a: EntitlementAggregate, b: EntitlementAggregate): boolean {
  if (a.expiresAt === null) return true
  if (b.expiresAt === null) return false
  return a.expiresAt.getTime() > b.expiresAt.getTime()
}
