import { resolveJourneyCourseLock } from '@sistemazero/core/journey'
import { type Course, isCourseAccessible } from '../../domain/course/course'
import {
  CourseJourneyLockedError,
  CourseNotFoundError,
  LiveLessonClosedError,
} from '../../domain/course/course.errors'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { courseTier } from '../../domain/gamification/levels'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { LiveLessonAccessPort } from '../../domain/ports/live-lesson-access.port'

export interface CourseAccess {
  course: Course
  entitlement: EntitlementAggregate
  /**
   * Curso AO VIVO visto por quem NÃO é equipe: as aulas que a vaga abre agora. Ausente = sem
   * restrição por aula (curso gravado, ou a equipe num curso ao vivo).
   */
  liveLessonIds?: ReadonlySet<string>
}

/**
 * O alcance da checagem. Toda rota que mexe numa AULA passa o `lessonId`: no curso ao vivo o
 * acesso é POR AULA (o grant é da sessão daquela aula), e sem ele uma vaga aberta na aula 1
 * abriria a aula 2 por essa rota. `'course'` é só para o que é do curso inteiro (detalhe,
 * progresso, classificação, baú da unidade, público de um recado).
 */
export type AccessScope = { lessonId: string } | 'course'

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
 *
 * Curso AO VIVO (14/10/2026) tem régua própria (`assertLive`): matrícula e chave-mestra NÃO
 * abrem nada; a aula abre pela vaga na turma (grant ativo da sessão DAQUELA aula) e a equipe
 * vê tudo, inclusive o curso ainda em rascunho. A professora atribuída à turma é equipe (o
 * `LiveService` exige `staff` para conduzir), então entra pelo mesmo passe. A trava
 * sequencial e a da Jornada não se aplicam: o grant já é por aula e por data.
 */
export class CheckAccessService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly entitlements: EntitlementRepository,
    private readonly gamification: GamificationRepository,
    private readonly clock: () => Date,
    private readonly live: LiveLessonAccessPort,
  ) {}

  async requireBySlug(
    userId: string,
    courseSlug: string,
    privileged: boolean,
    learnerId: string | undefined,
    scope: AccessScope,
  ): Promise<CourseAccess> {
    const course = await this.courses.findCourseBySlug(courseSlug)
    return this.assert(userId, course, privileged, learnerId, scope)
  }

  async requireById(
    userId: string,
    courseId: string,
    privileged: boolean,
    learnerId: string | undefined,
    scope: AccessScope,
  ): Promise<CourseAccess> {
    const course = await this.courses.findCourseById(courseId)
    return this.assert(userId, course, privileged, learnerId, scope)
  }

  private async assert(
    userId: string,
    course: Course | null,
    privileged: boolean,
    learnerId: string | undefined,
    scope: AccessScope,
  ): Promise<CourseAccess> {
    // Adult courses belong to the account itself, including live courses and staff previews.
    // A Kids profile must never inherit its parent's adult enrollment as a learner.
    if (course?.audience === 'adult' && learnerId !== undefined && learnerId !== userId)
      throw new AccessDeniedError()
    if (course?.modality === 'live') {
      return this.assertLive(userId, course, privileged, learnerId ?? userId, scope)
    }
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
    // Curso `lenda` é FORA da jornada → sem gate pedagógico (acesso = matrícula; o
    // portão de "ver" é o nó da Lenda no mapa).
    if (course.audience === 'kids' && course.level !== 'lenda') {
      const qualified = await this.gamification.listQualifyingJourneySlots(
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
      // Par que não é degrau da jornada (ex.: `primeiros-passos` + `3d`) não trava.
      const tier = courseTier(course.level, course.track)
      const lock = tier
        ? resolveJourneyCourseLock(
            qualified,
            tier,
            course.careerSlot,
            foundationAvailable,
            course.journeyRole,
          )
        : { locked: false as const }
      if (lock.locked && lock.reason) {
        throw new CourseJourneyLockedError(lock.reason, lock.requiredLevel)
      }
    }
    return { course, entitlement }
  }

  /**
   * Curso AO VIVO. A equipe passa (o rascunho incluído: é ela que prepara a turma); quem não é
   * equipe precisa de vaga com grant ativo. No alcance de AULA, a aula precisa estar entre as
   * abertas pela vaga; no do curso, basta uma aberta.
   */
  private async assertLive(
    accountId: string,
    course: Course,
    privileged: boolean,
    learnerId: string,
    scope: AccessScope,
  ): Promise<CourseAccess> {
    const now = this.clock()
    if (privileged) {
      return { course, entitlement: EntitlementAggregate.virtualAllCourses(accountId, now) }
    }
    if (!isCourseAccessible(course.status)) throw new CourseNotFoundError()
    const open = await this.live.openLessons({
      accountId,
      learnerId,
      courseId: course.id,
      now,
    })
    if (open.length === 0) throw new LiveLessonClosedError()
    const target =
      scope === 'course' ? null : open.find((lesson) => lesson.lessonId === scope.lessonId)
    if (scope !== 'course' && !target) throw new LiveLessonClosedError()
    // O prazo que vale: o da aula pedida, ou o mais longo entre as abertas (alcance do curso).
    const endsAt =
      target?.endsAt ??
      open.reduce((latest, lesson) => (lesson.endsAt > latest ? lesson.endsAt : latest), now)
    return {
      course,
      entitlement: EntitlementAggregate.virtualLiveSeat(accountId, course.slug, now, endsAt),
      liveLessonIds: new Set(open.map((lesson) => lesson.lessonId)),
    }
  }
}
