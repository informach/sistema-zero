import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import type { VideoPositionRepository } from '../../domain/ports/video-position-repository.port'
import type { MemberActivityItemView } from '../mappers/admin-views'

/**
 * Linha do tempo de atividade do aluno (ficha admin): unifica as 4 fontes keyadas
 * por `userId` (aula acessada = `lesson_progress`, aula concluída =
 * `lesson_completions`, tentativa de quiz, entrega do Estúdio), ordena por data desc
 * e pagina. O `userId` é o APRENDIZ — a conta no adulto, o perfil no kids (o BFF
 * chama 1× por aprendiz). Cada fonte traz no máximo `offset+limit` linhas (teto do
 * merge), o serviço mescla e fatia — paginação estável e barata sobre poucas linhas.
 */
export class GetMemberActivityService {
  constructor(
    private readonly progress: ProgressRepository,
    private readonly positions: VideoPositionRepository,
    private readonly quizAttempts: QuizAttemptRepository,
    private readonly studioSubmissions: StudioSubmissionRepository,
  ) {}

  async execute(
    userId: string,
    opts: { limit: number; offset: number },
  ): Promise<{ items: MemberActivityItemView[]; hasMore: boolean }> {
    // Cada fonte só precisa cobrir até o fim da página pedida.
    const cap = opts.offset + opts.limit + 1
    const [accessed, completed, quizzes, submissions] = await Promise.all([
      this.positions.listRecentAccessed(userId, cap),
      this.progress.listRecentCompletions(userId, cap),
      this.quizAttempts.listRecentByUser(userId, cap),
      this.studioSubmissions.listRecentByUser(userId, cap),
    ])

    const merged: MemberActivityItemView[] = [
      ...accessed.map((a) => ({
        kind: 'lesson_accessed' as const,
        at: a.at.toISOString(),
        lessonId: a.lessonId,
        lessonTitle: a.lessonTitle,
        courseTitle: a.courseTitle,
      })),
      ...completed.map((c) => ({
        kind: 'lesson_completed' as const,
        at: c.at.toISOString(),
        lessonId: c.lessonId,
        lessonTitle: c.lessonTitle,
        courseTitle: c.courseTitle,
      })),
      ...quizzes.map((q) => ({
        kind: 'quiz_attempt' as const,
        at: q.createdAt.toISOString(),
        lessonId: q.lessonId,
        lessonTitle: q.lessonTitle,
        courseTitle: q.courseTitle,
        score: q.score,
        passed: q.passed,
      })),
      ...submissions.map((s) => ({
        kind: 'studio_submission' as const,
        at: s.submittedAt.toISOString(),
        lessonId: s.lessonId,
        lessonTitle: s.lessonTitle,
        courseTitle: s.courseTitle,
        score: s.score,
        passed: s.passed,
        message: s.message,
      })),
    ]

    // Mais recente primeiro (ISO-8601 ordena lexicograficamente == cronológico).
    merged.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    const page = merged.slice(opts.offset, opts.offset + opts.limit)
    const hasMore = merged.length > opts.offset + opts.limit
    return { items: page, hasMore }
  }
}
