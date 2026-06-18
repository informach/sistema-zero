import type { CourseAudience } from '../../domain/course/course'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import { computeProgress } from '../../domain/progress/progress'
import { type MyCourseView, toMyCourseView } from '../mappers/views'

/**
 * "Meus cursos": matrículas ATIVAS de curso → cursos publicados + progresso.
 * A vitrine é por AUDIÊNCIA (`adult` = community, `kids` = community-kids): só
 * cursos da audiência pedida aparecem. Chave-mestra (`all_courses`) inclui TODOS
 * os cursos publicados ADULTOS (atuais e futuros) — em vitrine `kids` ela é
 * ignorada (curso kids exige matrícula específica); a chave-mestra VIRTUAL da
 * equipe interna vale nas duas. Por curso vale o acesso "mais forte" entre a
 * matrícula específica e a chave-mestra (vitalícia > validade mais distante).
 */
export class ListMyCoursesService {
  constructor(
    private readonly entitlements: EntitlementRepository,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly positions: VideoPositionRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    privileged = false,
    audience: CourseAudience = 'adult',
    accountId?: string,
  ): Promise<MyCourseView[]> {
    // Acesso (matrícula) pela CONTA do responsável (sessão de perfil → accountId);
    // progresso/última-aula pelo userId (o perfil). Equipe interna (`privileged`) =
    // chave-mestra VIRTUAL: lista todos os publicados sem consultar matrículas.
    const active = privileged
      ? []
      : await this.entitlements.listActiveByUser(accountId ?? userId, this.clock())

    // Matrículas de CURSO com courseRef ("mais forte" por curso se duplicada) +
    // a chave-mestra mais forte (se houver). A chave-mestra REAL é POR AUDIÊNCIA
    // (`all_courses` na adulta, `all_kids_courses` na kids) — a do outro tipo é
    // ignorada nesta vitrine; a VIRTUAL (equipe) vale sempre.
    const masterType = audience === 'adult' ? 'all_courses' : 'all_kids_courses'
    const byCourseRef = new Map<string, EntitlementAggregate>()
    let master: EntitlementAggregate | null = privileged
      ? EntitlementAggregate.virtualAllCourses(userId, this.clock())
      : null
    for (const e of active) {
      if (e.accessType === masterType) {
        if (!master || isStronger(e, master)) master = e
        continue
      }
      if (e.accessType !== 'course' || !e.courseRef) continue
      const current = byCourseRef.get(e.courseRef)
      if (!current || isStronger(e, current)) byCourseRef.set(e.courseRef, e)
    }
    if (byCourseRef.size === 0 && !master) return []

    // Chave-mestra → todos os PUBLICADOS da audiência; matrículas específicas
    // ainda incluem cursos `archived` (quem matriculou mantém acesso). Dedupe por id.
    const courses = master
      ? await this.courses.listPublishedCourses(audience)
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
      // Vitrine por audiência: matrícula específica de curso da OUTRA plataforma
      // não aparece aqui (o acesso segue válido — só não é desta vitrine).
      if (course.audience !== audience) continue
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
