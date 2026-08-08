import { AttachmentNotFoundError, LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'
import type { AttachmentDownloadView } from '../mappers/views'

/**
 * Resolve a localização REAL de um anexo (`storageRef`) para o BFF do community
 * servir o download com marca d'água. Mesma régua de acesso do GET da aula:
 * matrícula ativa + aula publicada do curso. A resposta NUNCA deve ser
 * repassada ao browser — só o servidor do community a consome.
 */
export class GetAttachmentDownloadService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    lessonId: string,
    attachmentId: string,
    privileged = false,
    accountId?: string,
  ): Promise<AttachmentDownloadView> {
    const { course } = await this.checkAccess.requireBySlug(
      accountId ?? userId,
      courseSlug,
      privileged,
      userId,
    )
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno (mesmo por URL direta) → 404.
    if (!lesson || lesson.courseId !== course.id || !lesson.isPublished) {
      throw new LessonNotFoundError()
    }
    await assertLessonUnlocked(this.courses, this.progress, course, lessonId, userId, privileged)

    // Aula EM PRODUÇÃO ("em breve"): o GET da aula devolve `attachments: []`, mas o id
    // de um anexo visto ANTES do bloco entrar sobrevive (aba aberta, histórico, HAR) e
    // esta rota o resolveria normalmente. O portão precisa valer em TODA porta, não só
    // na projeção — para o aluno o anexo simplesmente não existe agora.
    if (!privileged && hasComingSoonBlock(lesson.blocks)) throw new AttachmentNotFoundError()

    const attachment = lesson.attachments.find((a) => a.id === attachmentId)
    if (!attachment) throw new AttachmentNotFoundError()

    return {
      label: attachment.label,
      fileType: attachment.fileType,
      sizeBytes: attachment.sizeBytes,
      storageRef: attachment.url,
    }
  }
}
