import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import { type CatalogCourseView, toCatalogCourseView } from '../mappers/views'

/**
 * Catálogo "Todos os cursos": todo curso `published` da plataforma + flag
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

  async execute(userId: string): Promise<CatalogCourseView[]> {
    const [published, active] = await Promise.all([
      this.courses.listPublishedCourses(),
      this.entitlements.listActiveByUser(userId, this.clock()),
    ])

    // Chave-mestra (`all_courses`) destrava o catálogo inteiro (atuais e futuros).
    const hasMaster = active.some((e) => e.accessType === 'all_courses')
    const owned = new Set<string>()
    for (const e of active) {
      if (e.accessType === 'course' && e.courseRef) owned.add(e.courseRef)
    }

    return published.map((course) =>
      toCatalogCourseView(course, hasMaster || owned.has(course.slug)),
    )
  }
}
