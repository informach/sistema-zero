import type { CourseAudience } from '../../domain/course/course'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import { type CatalogCourseView, toCatalogCourseView } from '../mappers/views'

/**
 * Catálogo "Todos os cursos": todo curso `published` da AUDIÊNCIA pedida + flag
 * `hasAccess` do aluno (matrícula ativa de curso). Quem NÃO tem acesso vê o
 * card bloqueado e o front usa `salesPageUrl` para levar à página de vendas.
 * 2 queries (cursos + matrículas) — sem N+1.
 */
export class ListCatalogService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    privileged = false,
    audience: CourseAudience = 'adult',
    accountId?: string,
  ): Promise<CatalogCourseView[]> {
    // `hasAccess` resolve a matrícula pela CONTA (sessão de perfil → accountId).
    const [published, active] = await Promise.all([
      this.courses.listPublishedCourses(audience),
      this.entitlements.listActiveByUser(accountId ?? userId, this.clock()),
    ])

    // Chave-mestra POR AUDIÊNCIA destrava a vitrine inteira (atuais e futuros):
    // `all_courses` na adulta, `all_kids_courses` na kids (cada uma só na sua).
    // Equipe interna (`privileged`) destrava as duas — chave-mestra virtual.
    const masterType = audience === 'adult' ? 'all_courses' : 'all_kids_courses'
    const hasMaster = privileged || active.some((e) => e.accessType === masterType)
    const owned = new Set<string>()
    for (const e of active) {
      if (e.accessType === 'course' && e.courseRef) owned.add(e.courseRef)
    }

    return published.map((course) =>
      toCatalogCourseView(course, hasMaster || owned.has(course.slug)),
    )
  }
}
