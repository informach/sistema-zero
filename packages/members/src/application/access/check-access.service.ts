import { resolveCareerCourseLock } from '@sistemazero/core/career'
import { type Course, isCourseAccessible } from '../../domain/course/course'
import { CourseCareerLockedError, CourseNotFoundError } from '../../domain/course/course.errors'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { courseTier } from '../../domain/gamification/levels'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'

export interface CourseAccess {
  course: Course
  entitlement: EntitlementAggregate
}

/**
 * Centraliza a trinca repetida nos endpoints de conteúdo: resolve o curso →
 * exige publicado (senão 404) → exige matrícula ATIVA do aluno (senão 403).
 * A checagem de acesso é leitura LOCAL (status + validade), sem chamar ninguém.
 * Acesso = matrícula específica (`entitlement.courseRef === course.slug`) OU a
 * chave-mestra da AUDIÊNCIA do curso (`all_courses` p/ adult, `all_kids_courses`
 * p/ kids — cada uma cobre só a sua vitrine, via `masterType`).
 * `privileged=true` (equipe interna — `isPrivilegedActor` na rota) dispensa a
 * matrícula com uma chave-mestra VIRTUAL que cobre as DUAS audiências (suporte);
 * o 404 de curso draft fica ANTES do bypass — equipe vê só conteúdo acessível,
 * igual ao aluno com chave-mestra real.
 */
export class CheckAccessService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly entitlements: EntitlementRepository,
    private readonly gamification: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async requireBySlug(
    userId: string,
    courseSlug: string,
    privileged = false,
    learnerId?: string,
  ): Promise<CourseAccess> {
    const course = await this.courses.findCourseBySlug(courseSlug)
    return this.assert(userId, course, privileged, learnerId)
  }

  async requireById(
    userId: string,
    courseId: string,
    privileged = false,
    learnerId?: string,
  ): Promise<CourseAccess> {
    const course = await this.courses.findCourseById(courseId)
    return this.assert(userId, course, privileged, learnerId)
  }

  private async assert(
    userId: string,
    course: Course | null,
    privileged: boolean,
    learnerId?: string,
  ): Promise<CourseAccess> {
    // `published` ou `archived` concedem acesso a quem já tem matrícula; `draft`
    // (ou inexistente) → 404 (não vaza a existência de curso não publicado).
    if (!course || !isCourseAccessible(course.status)) throw new CourseNotFoundError()
    if (privileged) {
      return { course, entitlement: EntitlementAggregate.virtualAllCourses(userId, this.clock()) }
    }
    // Chave-mestra da AUDIÊNCIA do curso: `all_courses` cobre só `adult`,
    // `all_kids_courses` só `kids`. A do outro tipo não entra no OR.
    const entitlement = await this.entitlements.findActiveForCourse(
      userId,
      course.slug,
      this.clock(),
      { masterType: course.audience === 'adult' ? 'all_courses' : 'all_kids_courses' },
    )
    if (!entitlement) throw new AccessDeniedError()
    // Trava pedagógica de TODO curso kids: posições seguem a trilha
    // (future-tier/foundation-first) e o bônus é recompensa da etapa
    // (tier-reward — abre quando ela completa).
    if (course.audience === 'kids') {
      const qualified = await this.gamification.listQualifyingCareerSlots(
        learnerId ?? userId,
        course.audience,
      )
      // A base (slot 1) nunca depende de si mesma; nos demais (posições 2+ E
      // bônus), sem um curso-base PUBLICADO a trava falha aberta (senão a etapa
      // inteira ficaria presa) — mesma regra do projetor da listagem.
      const foundationAvailable =
        course.careerSlot === 1 ||
        (await this.courses.hasPublishedFoundationCourse(
          course.audience,
          course.level,
          course.track,
        ))
      const lock = resolveCareerCourseLock(
        qualified,
        courseTier(course.level, course.track),
        course.careerSlot,
        foundationAvailable,
      )
      if (lock.locked && lock.reason) {
        throw new CourseCareerLockedError(lock.reason, lock.requiredLevel)
      }
    }
    return { course, entitlement }
  }
}
