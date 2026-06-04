import { AttachmentNotFoundError, LessonNotFoundError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
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
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    lessonId: string,
    attachmentId: string,
  ): Promise<AttachmentDownloadView> {
    const { course } = await this.checkAccess.requireBySlug(userId, courseSlug)
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno (mesmo por URL direta) → 404.
    if (!lesson || lesson.courseId !== course.id || !lesson.isPublished) {
      throw new LessonNotFoundError()
    }

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
