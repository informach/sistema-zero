import {
  eligibleForCertificate,
  precedingPublishedLessonIds,
} from '../../domain/certificate/certificate'
import {
  CertificateBlockNotFoundError,
  LessonNotFoundError,
} from '../../domain/course/course.errors'
import type { CertificateRepository } from '../../domain/ports/certificate-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlockedFromState } from '../lesson-locking/lesson-locking'
import type { CertificateStateView } from '../mappers/views'

export interface GetCertificateInput {
  userId: string
  accountId: string
  lessonId: string
  blockId: string
  privileged: boolean
}

/**
 * Estado do bloco certificado p/ a UI do aluno: `eligible` (todas as aulas ANTERIORES
 * concluídas) e `issued` (+ serial/data se já emitido). Espelha o `studio-carryover`/
 * `showcase-payload` (rota dedicada de estado de bloco). Aula rascunho / bloco inexistente → 404.
 */
export class GetCertificateService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly certificates: CertificateRepository,
  ) {}

  async execute(input: GetCertificateInput): Promise<CertificateStateView> {
    const lesson = await this.courses.findLessonWithContent(input.lessonId)
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    const block = lesson.blocks.find(
      (b) => b.id === input.blockId && b.content.kind === 'certificate',
    )
    if (!block) throw new CertificateBlockNotFoundError()

    const { course } = await this.checkAccess.requireById(
      input.accountId,
      lesson.courseId,
      input.privileged,
    )

    const existing = await this.certificates.findByUserAndCourse(input.userId, course.id)
    if (existing) {
      return {
        eligible: true,
        issued: true,
        revoked: existing.revokedAt !== null,
        serial: existing.serial,
        issuedAt: existing.issuedAt.toISOString(),
        revokedAt: existing.revokedAt ? existing.revokedAt.toISOString() : null,
      }
    }

    const [completedIds, outline] = await Promise.all([
      this.progress.listCompletedLessonIds(input.userId, course.id),
      this.courses.findOutline(course.id, { publishedOnly: true }),
    ])
    const orderedLessonIds = outline.flatMap((m) => m.lessons.map((l) => l.id))
    assertLessonUnlockedFromState(
      course,
      input.lessonId,
      { completedLessonIds: completedIds, orderedPublishedLessonIds: orderedLessonIds },
      input.privileged,
    )
    const preceding = precedingPublishedLessonIds(orderedLessonIds, input.lessonId)
    return {
      eligible: eligibleForCertificate(preceding, completedIds),
      issued: false,
      revoked: false,
      serial: null,
      issuedAt: null,
      revokedAt: null,
    }
  }
}
