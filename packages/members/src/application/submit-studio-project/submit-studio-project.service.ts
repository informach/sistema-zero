import { PayloadTooLargeError } from '@sistemazero/core/http'
import { LessonNotFoundError, StudioBlockNotFoundError } from '../../domain/course/course.errors'
import { MAX_STUDIO_PROJECT_CHARS } from '../../domain/course/lesson-block'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { CheckAccessService } from '../access/check-access.service'

export interface StudioSubmissionResultView {
  submittedAt: string
}

/**
 * Recebe a ENTREGA do projeto do Estúdio (mesmo JSON do "Exportar projeto"). Upsert
 * por aluno+bloco — reenvio permitido, último vence. A existência da entrega é o que
 * destrava a conclusão da aula (gate em mark-lesson-complete). Sem nota.
 */
export class SubmitStudioProjectService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly submissions: StudioSubmissionRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    blockId: string,
    project: unknown,
    privileged = false,
    accountId?: string,
  ): Promise<StudioSubmissionResultView> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno → não aceita entregas.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    // Acesso pela CONTA (sessão de perfil); a entrega fica no userId (o perfil).
    await this.checkAccess.requireById(accountId ?? userId, lesson.courseId, privileged)

    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'studio') throw new StudioBlockNotFoundError()

    // Teto de tamanho do jsonb (anti-DoS) — o front sanitiza o shape; aqui só o peso.
    if (JSON.stringify(project).length > MAX_STUDIO_PROJECT_CHARS) {
      throw new PayloadTooLargeError('Projeto excede o tamanho máximo permitido')
    }

    const submittedAt = this.clock()
    await this.submissions.upsert({
      id: this.newId(),
      userId,
      blockId,
      lessonId,
      courseId: lesson.courseId,
      project,
      submittedAt,
    })
    return { submittedAt: submittedAt.toISOString() }
  }
}
