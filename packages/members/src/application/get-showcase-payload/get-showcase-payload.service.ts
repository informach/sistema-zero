import type { CourseAudience } from '../../domain/course/course'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'

/**
 * Conteúdo AUTORITATIVO para auto-publicar o projeto no Mural (consumido pelo BFF no
 * clique de "Publicar no Mural"). `eligible:false` quando o bloco não é vitrine, está
 * desabilitado, ou o aluno ainda não enviou a entrega. Título/resumo são autorados
 * pelo admin (a criança NÃO escreve); a capa real (print do jogo) é capturada no
 * cliente — aqui só vai a `defaultCoverUrl` (projetos web/fallback).
 */
export interface ShowcasePayloadView {
  eligible: boolean
  title: string
  summary: string
  defaultCoverUrl: string | null
  chain: string | null
  courseId: string
  audience: CourseAudience
}

export class GetShowcasePayloadService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly submissions: StudioSubmissionRepository,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    blockId: string,
    privileged = false,
    accountId?: string,
  ): Promise<ShowcasePayloadView> {
    // Só usa os blocos (estúdio) — pula a query de anexos.
    const lesson = await this.courses.findLessonWithContent(lessonId, { includeAttachments: false })
    // Aula rascunho é invisível ao aluno (mesmo por URL direta) → 404.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    // Acesso pela CONTA (sessão de perfil); a entrega é do PERFIL (userId).
    const { course } = await this.checkAccess.requireById(
      accountId ?? userId,
      lesson.courseId,
      privileged,
    )
    await assertLessonUnlocked(this.courses, this.progress, course, lessonId, userId, privileged)

    const base = {
      title: '',
      summary: '',
      defaultCoverUrl: null,
      chain: null,
      courseId: course.id,
      audience: course.audience,
    } as const

    const block = lesson.blocks.find((b) => b.id === blockId)
    const showcase = block?.content.kind === 'studio' ? block.content.showcase : undefined
    // Bloco não é estúdio, ou não é ponto de vitrine → não elegível (sem vazar motivo).
    if (block?.content.kind !== 'studio' || !showcase?.enabled) {
      return { ...base, eligible: false }
    }

    // Publicar exige ter ENVIADO a entrega (o projeto a mostrar). Não enviou → não elegível.
    const submitted = await this.submissions.getOne(userId, blockId)
    if (!submitted) return { ...base, eligible: false }

    const title = showcase.title?.trim() || lesson.title
    const summary = showcase.summary?.trim() || `Concluí o projeto "${title}"! 🎉`
    return {
      eligible: true,
      title,
      summary,
      defaultCoverUrl: showcase.defaultCoverUrl ?? null,
      chain: block.content.chain?.trim() || null,
      courseId: course.id,
      audience: course.audience,
    }
  }
}
