import { type Course, isCourseAccessible } from '../../domain/course/course'
import { CourseNotFoundError } from '../../domain/course/course.errors'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'

export interface CourseAccess {
  course: Course
  entitlement: EntitlementAggregate
}

/**
 * Centraliza a trinca repetida nos endpoints de conteúdo: resolve o curso →
 * exige publicado (senão 404) → exige matrícula ATIVA do aluno (senão 403).
 * A checagem de acesso é leitura LOCAL (status + validade), sem chamar ninguém.
 * Acesso = matrícula específica (`entitlement.courseRef === course.slug`) OU
 * chave-mestra (`accessType='all_courses'`, cobre todos os cursos — atuais e futuros).
 * `privileged=true` (equipe interna — `isPrivilegedActor` na rota) dispensa a
 * matrícula com uma chave-mestra VIRTUAL; o 404 de curso draft fica ANTES do
 * bypass — equipe vê só conteúdo acessível, igual ao aluno com chave-mestra real.
 */
export class CheckAccessService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
  ) {}

  async requireBySlug(
    userId: string,
    courseSlug: string,
    privileged = false,
  ): Promise<CourseAccess> {
    const course = await this.courses.findCourseBySlug(courseSlug)
    return this.assert(userId, course, privileged)
  }

  async requireById(userId: string, courseId: string, privileged = false): Promise<CourseAccess> {
    const course = await this.courses.findCourseById(courseId)
    return this.assert(userId, course, privileged)
  }

  private async assert(
    userId: string,
    course: Course | null,
    privileged: boolean,
  ): Promise<CourseAccess> {
    // `published` ou `archived` concedem acesso a quem já tem matrícula; `draft`
    // (ou inexistente) → 404 (não vaza a existência de curso não publicado).
    if (!course || !isCourseAccessible(course.status)) throw new CourseNotFoundError()
    if (privileged) {
      return { course, entitlement: EntitlementAggregate.virtualAllCourses(userId, this.clock()) }
    }
    const entitlement = await this.entitlements.findActiveForCourse(
      userId,
      course.slug,
      this.clock(),
    )
    if (!entitlement) throw new AccessDeniedError()
    return { course, entitlement }
  }
}
