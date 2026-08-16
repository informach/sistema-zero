import type { CourseAudience } from '../../domain/course/course'
import { emptyQualifyingByTier } from '../../domain/gamification/levels'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import { careerLocksForCourses } from '../career-course-locking/career-course-locking'
import { type CatalogCourseView, toCatalogCourseView } from '../mappers/views'

/**
 * Catálogo "Todos os cursos": todo curso `published` da AUDIÊNCIA pedida + flag
 * `hasAccess` do aluno (matrícula ativa de curso). Quem NÃO tem acesso vê o
 * card bloqueado e o front usa `salesPageUrl` para levar à página de vendas.
 * 3 queries (cursos + matrículas + snapshot do ledger Kids) — sem N+1.
 */
export class ListCatalogService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly entitlements: EntitlementRepository,
    private readonly gamification: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    privileged = false,
    audience: CourseAudience = 'adult',
    accountId?: string,
  ): Promise<CatalogCourseView[]> {
    // `hasAccess` resolve a matrícula pela CONTA (sessão de perfil → accountId).
    // ⚠️ Os MARCOS não seguem o `!privileged` do `qualified`: aquele é uma TRAVA
    // (equipe passa por cima), estes são o histórico do próprio ator — esconder
    // deles só apagaria o selo de quem testa a vitrine. Kids porque o Mural é kids.
    const [published, active, careerState] = await Promise.all([
      this.courses.listPublishedCourses(audience),
      this.entitlements.listActiveByUser(accountId ?? userId, this.clock()),
      audience === 'kids'
        ? this.gamification.listCareerCourseState(userId, audience)
        : Promise.resolve(null),
    ])
    const qualified = careerState && !privileged ? careerState.qualified : emptyQualifyingByTier()
    const milestones = careerState?.milestones ?? new Map()

    // Chave-mestra POR AUDIÊNCIA destrava a vitrine inteira (atuais e futuros):
    // `all_courses` na adulta, `all_kids_courses` na kids (cada uma só na sua).
    // Equipe interna (`privileged`) destrava as duas — chave-mestra virtual.
    const masterType = audience === 'adult' ? 'all_courses' : 'all_kids_courses'
    const hasMaster = privileged || active.some((e) => e.accessType === masterType)
    const owned = new Set<string>()
    for (const e of active) {
      if (e.accessType === 'course' && e.courseRef) owned.add(e.courseRef)
    }

    const careerLocks = careerLocksForCourses(
      published,
      qualified,
      audience === 'kids' && !privileged,
    )
    return published.map((course) =>
      toCatalogCourseView(
        course,
        hasMaster || owned.has(course.slug),
        careerLocks.get(course.id),
        milestones.get(course.id),
      ),
    )
  }
}
