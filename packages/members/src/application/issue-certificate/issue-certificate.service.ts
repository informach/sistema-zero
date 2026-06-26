import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  eligibleForCertificate,
  generateSerial,
  precedingPublishedLessonIds,
} from '../../domain/certificate/certificate'
import type { Course, LessonWithContent } from '../../domain/course/course'
import {
  CertificateBlockNotFoundError,
  CertificateNotEligibleError,
  CertificateRevokedError,
  LessonNotFoundError,
} from '../../domain/course/course.errors'
import type { CertificateBlock } from '../../domain/course/lesson-block'
import type { CertificateRepository } from '../../domain/ports/certificate-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import { type CertificateView, toCertificateView } from '../mappers/views'

export interface IssueCertificateInput {
  /** Perfil/aluno (dados). */
  userId: string
  /** Conta do responsável (acesso). Default → userId no caller. */
  accountId: string
  lessonId: string
  blockId: string
  /** Nome de EXIBIÇÃO do aluno — vem dos headers confiáveis do gateway (NÃO do corpo). */
  studentName: string
  privileged: boolean
}

export interface IssueCertificateResult {
  certificate: CertificateView
  /** Config de autoria do bloco — o BFF usa p/ montar o PDF da marca. */
  config: CertificateBlock
}

const SERIAL_INSERT_ATTEMPTS = 3

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/**
 * Emite o certificado de conclusão (idempotente por aluno+curso). A 1ª emissão congela
 * um registro imutável (nº de série + nome + título do curso) e conclui a aula do
 * certificado — se ela for a última pendente, isso fecha o curso (100% + badge
 * `course-complete`); havendo aulas DEPOIS do certificado, o curso segue incompleto.
 * Reemissão devolve o MESMO registro (o BFF rebaixa o mesmo PDF). GATE: aulas publicadas
 * ANTERIORES concluídas (`CERTIFICATE_NOT_ELIGIBLE` → 409). Aula rascunho / bloco inexistente → 404.
 */
export class IssueCertificateService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly certificates: CertificateRepository,
    private readonly gamification: AwardGamificationService,
    private readonly clock: () => Date,
  ) {}

  async execute(input: IssueCertificateInput): Promise<IssueCertificateResult> {
    const lesson = await this.courses.findLessonWithContent(input.lessonId)
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    const block = lesson.blocks.find(
      (b) => b.id === input.blockId && b.content.kind === 'certificate',
    )
    if (block?.content.kind !== 'certificate') throw new CertificateBlockNotFoundError()
    const config = block.content

    const { course } = await this.checkAccess.requireById(
      input.accountId,
      lesson.courseId,
      input.privileged,
    )

    // Idempotente: já emitido → replay da conclusão/award (auto-cura falha pós-insert)
    // e devolve o vigente, sem reavaliar elegibilidade histórica.
    const existing = await this.certificates.findByUserAndCourse(input.userId, course.id)
    if (existing) {
      if (existing.revokedAt) throw new CertificateRevokedError()
      await this.completeCertificateLesson(input, lesson, course)
      return { certificate: toCertificateView(existing), config }
    }

    const studentName = input.studentName.trim()
    if (studentName.length === 0) {
      throw new ValidationError('Nome do aluno ausente para o certificado')
    }

    // Elegibilidade: todas as aulas publicadas ANTES da do certificado concluídas
    // (aulas depois não entram no gate — o certificado não precisa ser a última aula).
    const [completedIds, outline] = await Promise.all([
      this.progress.listCompletedLessonIds(input.userId, course.id),
      this.courses.findOutline(course.id, { publishedOnly: true }),
    ])
    const orderedLessonIds = outline.flatMap((m) => m.lessons.map((l) => l.id))
    const preceding = precedingPublishedLessonIds(orderedLessonIds, input.lessonId)
    if (!eligibleForCertificate(preceding, completedIds)) {
      throw new CertificateNotEligibleError()
    }

    const now = this.clock()
    const record = await this.insertCertificate(input, course, studentName, now)
    if (record.revokedAt) throw new CertificateRevokedError()

    await this.completeCertificateLesson(input, lesson, course, completedIds, now)

    return { certificate: toCertificateView(record), config }
  }

  private async insertCertificate(
    input: IssueCertificateInput,
    course: Course,
    studentName: string,
    now: Date,
  ) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.certificates.insertIfAbsent({
          id: randomUUID(),
          userId: input.userId,
          accountId: input.accountId,
          courseId: course.id,
          courseRef: course.slug,
          serial: generateSerial(now),
          studentName,
          courseTitle: course.title,
          completedAt: now,
          issuedAt: now,
          revokedAt: null,
        })
      } catch (error) {
        if (attempt < SERIAL_INSERT_ATTEMPTS - 1 && isUniqueViolation(error)) continue
        throw error
      }
    }
  }

  private async completeCertificateLesson(
    input: IssueCertificateInput,
    lesson: LessonWithContent,
    course: Course,
    completedIdsBefore?: string[],
    now = this.clock(),
  ): Promise<void> {
    const completedIds =
      completedIdsBefore ?? (await this.progress.listCompletedLessonIds(input.userId, course.id))

    // Conclui a aula do certificado. Se ela for a última pendente, o curso fecha (100% +
    // badge course-complete); havendo aulas DEPOIS do certificado, o curso segue incompleto
    // (courseCompleted é calculado abaixo pela contagem real). `markComplete` é idempotente;
    // o award é FAIL-OPEN (nunca derruba a emissão).
    await this.progress.markComplete(input.userId, input.lessonId, course.id, now)
    const [total, completed, moduleLessonIds] = await Promise.all([
      this.courses.countPublishedLessons(course.id),
      this.progress.countCompletedPublished(input.userId, course.id),
      this.courses.listPublishedLessonIds(lesson.moduleId),
    ])
    const completedSet = new Set([...completedIds, input.lessonId])
    const unitCompleted =
      moduleLessonIds.length > 0 && moduleLessonIds.every((id) => completedSet.has(id))
    await this.gamification.awardLessonCompletion({
      userId: input.userId,
      accountId: input.accountId,
      lessonId: input.lessonId,
      moduleId: lesson.moduleId,
      courseId: course.id,
      audience: course.audience,
      unitCompleted,
      courseCompleted: total > 0 && completed === total,
      privileged: input.privileged,
    })
  }
}
