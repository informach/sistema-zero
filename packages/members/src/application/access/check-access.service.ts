import type { Course } from '../../domain/course/course'
import { CourseNotFoundError } from '../../domain/course/course.errors'
import type { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
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
 * Convenção: `entitlement.courseRef === course.slug`.
 */
export class CheckAccessService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly entitlements: EntitlementRepository,
    private readonly clock: () => Date,
  ) {}

  async requireBySlug(userId: string, courseSlug: string): Promise<CourseAccess> {
    const course = await this.courses.findCourseBySlug(courseSlug)
    return this.assert(userId, course)
  }

  async requireById(userId: string, courseId: string): Promise<CourseAccess> {
    const course = await this.courses.findCourseById(courseId)
    return this.assert(userId, course)
  }

  private async assert(userId: string, course: Course | null): Promise<CourseAccess> {
    if (course?.status !== 'published') throw new CourseNotFoundError()
    const entitlement = await this.entitlements.findActiveByUserAndCourseRef(
      userId,
      course.slug,
      this.clock(),
    )
    if (!entitlement) throw new AccessDeniedError()
    return { course, entitlement }
  }
}
