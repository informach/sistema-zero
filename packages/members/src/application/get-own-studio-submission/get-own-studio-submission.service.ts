import { LessonNotFoundError, StudioBlockNotFoundError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { CheckAccessService } from '../access/check-access.service'

/** Projeto que o PRÓPRIO aluno/perfil ENVIOU neste bloco. `null` se nunca enviou. */
export interface OwnStudioSubmissionView {
  /** Snapshot `Project` da última entrega do aluno NESTE bloco (último-vence). */
  project: unknown | null
}

/**
 * Carrega o projeto que o aluno (PERFIL) enviou NESTE bloco — o "save na nuvem". O front usa como
 * 2ª prioridade ao abrir a aula (depois do rascunho LOCAL, antes do carryover/initialProject): num
 * navegador NOVO, sem rascunho local, a criança retoma o trabalho que já tinha enviado em vez de
 * cair no template. Lazy de propósito: o projeto pode ser pesado (até 1.5 MB) e o GET da aula não o
 * carrega. Acesso pela CONTA (sessão de perfil); o projeto é do PERFIL (`userId`).
 */
export class GetOwnStudioSubmissionService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly submissions: StudioSubmissionRepository,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    blockId: string,
    privileged = false,
    accountId?: string,
  ): Promise<OwnStudioSubmissionView> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno (mesmo por URL direta) → 404.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    await this.checkAccess.requireById(accountId ?? userId, lesson.courseId, privileged)

    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'studio') throw new StudioBlockNotFoundError()

    // Última entrega do PRÓPRIO aluno/perfil neste bloco. Nunca enviou → null.
    const sub = await this.submissions.getOne(userId, blockId)
    return { project: sub?.project ?? null }
  }
}
