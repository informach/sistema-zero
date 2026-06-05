import type { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import { type MyCourseView, toMyCourseView } from '../mappers/views'

/**
 * "Meus cursos": matrículas ATIVAS de curso → cursos publicados + progresso.
 * Chave-mestra (`all_courses`) inclui TODOS os cursos publicados (atuais e
 * futuros); por curso vale o acesso "mais forte" entre a matrícula específica e a
 * chave-mestra (vitalícia > validade mais distante).
 */
export class ListMyCoursesService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly positions: VideoPositionRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string): Promise<MyCourseView[]> {
    const active = await this.entitlements.listActiveByUser(userId, this.clock())

    // Matrículas de CURSO com courseRef ("mais forte" por curso se duplicada) +
    // a chave-mestra mais forte (se houver).
    const byCourseRef = new Map<string, EntitlementAggregate>()
    let master: EntitlementAggregate | null = null
    for (const e of active) {
      if (e.accessType === 'all_courses') {
        if (!master || isStronger(e, master)) master = e
        continue
      }
      if (e.accessType !== 'course' || !e.courseRef) continue
      const current = byCourseRef.get(e.courseRef)
      if (!current || isStronger(e, current)) byCourseRef.set(e.courseRef, e)
    }
    if (byCourseRef.size === 0 && !master) return []

    // Chave-mestra → todos os PUBLICADOS; matrículas específicas ainda incluem
    // cursos `archived` (quem matriculou mantém acesso). Dedupe por id.
    const courses = master
      ? await this.courses.listPublishedCourses()
      : await this.courses.findAccessibleCoursesBySlugs([...byCourseRef.keys()])
    if (master && byCourseRef.size > 0) {
      const have = new Set(courses.map((c) => c.slug))
      const missing = [...byCourseRef.keys()].filter((slug) => !have.has(slug))
      if (missing.length > 0) {
        courses.push(...(await this.courses.findAccessibleCoursesBySlugs(missing)))
      }
    }

    // Contagens em LOTE (3 queries) em vez de 3 por curso (evita N+1). Numerador
    // e denominador sobre o MESMO conjunto (aulas publicadas) — sem inflar.
    const courseIds = courses.map((c) => c.id)
    const [totals, completed, lastAccessed] = await Promise.all([
      this.courses.countPublishedLessonsByCourseIds(courseIds),
      this.progress.countCompletedPublishedByCourseIds(userId, courseIds),
      this.positions.lastAccessedByCourseIds(userId, courseIds),
    ])

    const views: MyCourseView[] = []
    for (const course of courses) {
      const specific = byCourseRef.get(course.slug)
      const entitlement = pickStronger(specific ?? null, master)
      if (!entitlement) continue
      const progress = computeProgress(completed.get(course.id) ?? 0, totals.get(course.id) ?? 0)
      views.push(toMyCourseView(course, entitlement, progress, lastAccessed.get(course.id) ?? null))
    }
    return views
  }
}

function pickStronger(
  a: EntitlementAggregate | null,
  b: EntitlementAggregate | null,
): EntitlementAggregate | null {
  if (!a) return b
  if (!b) return a
  return isStronger(a, b) ? a : b
}

function isStronger(a: EntitlementAggregate, b: EntitlementAggregate): boolean {
  if (a.expiresAt === null) return true
  if (b.expiresAt === null) return false
  return a.expiresAt.getTime() > b.expiresAt.getTime()
}
