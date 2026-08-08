import { EbookBlockNotFoundError, LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'
import type { EbookDownloadView } from '../mappers/views'

/**
 * Resolve a localização REAL do PDF de um bloco e-book (`storageRef`) para o BFF
 * do community servir o livro 3D com marca d'água. Mesma régua de acesso do GET
 * da aula: matrícula ativa + aula publicada do curso. A resposta NUNCA deve ser
 * repassada ao browser — só o servidor do community a consome.
 */
export class GetEbookDownloadService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
  ) {}

  async execute(
    userId: string,
    courseSlug: string,
    lessonId: string,
    blockId: string,
    privileged = false,
    accountId?: string,
  ): Promise<EbookDownloadView> {
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

    // Aula EM PRODUÇÃO ("em breve"): o bloco não vai mais no GET da aula, mas o id
    // visto antes sobrevive (aba aberta, histórico, HAR) e resolveria o PDF privado.
    // O portão vale em TODA porta, não só na projeção.
    if (!privileged && hasComingSoonBlock(lesson.blocks)) throw new EbookBlockNotFoundError()

    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'ebook') throw new EbookBlockNotFoundError()

    return {
      title: block.content.title ?? null,
      storageRef: block.content.url,
    }
  }
}
