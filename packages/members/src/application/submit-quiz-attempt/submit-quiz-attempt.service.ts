import {
  LessonNotFoundError,
  QuizBlockNotFoundError,
  QuizCooldownError,
} from '../../domain/course/course.errors'
import {
  computeRetryAvailableAt,
  gradeQuizAttempt,
  QUIZ_RETRY_COOLDOWN_MS,
  type QuizAnswers,
  type QuizQuestionResult,
} from '../../domain/course/quiz'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import type { CheckAccessService } from '../access/check-access.service'

export interface QuizAttemptResultView {
  score: number
  passed: boolean
  passingScore: number
  attemptsCount: number
  /** ISO; só não-nulo quando reprovou (cooldown de retry). */
  retryAvailableAt: string | null
  /** Correções por questão — o gabarito SÓ trafega aqui. */
  questions: QuizQuestionResult[]
}

/**
 * Corrige a tentativa NO SERVIDOR e persiste no histórico. Reprovou → cooldown
 * de retry (429 antes da janela). Aprovou uma vez → gate da aula destravado para
 * sempre (re-submissões seguem permitidas, sem regredir o gate).
 */
export class SubmitQuizAttemptService {
  constructor(
    private readonly checkAccess: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly attempts: QuizAttemptRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    blockId: string,
    answers: QuizAnswers,
  ): Promise<QuizAttemptResultView> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    // Aula rascunho é invisível ao aluno → também não aceita tentativas de quiz.
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    await this.checkAccess.requireById(userId, lesson.courseId)

    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'quiz') throw new QuizBlockNotFoundError()

    const now = this.clock()
    const summary = (await this.attempts.summarizeByBlockIds(userId, [blockId])).get(blockId)
    const blockedUntil = computeRetryAvailableAt(summary ?? null, now)
    if (blockedUntil) throw new QuizCooldownError(blockedUntil)

    const grade = gradeQuizAttempt(block.content, answers)
    // O `guard` re-checa o cooldown ATOMICAMENTE no repositório (serializado por
    // aluno+bloco) — a pré-checagem acima é só o caminho rápido; sob dois submits
    // simultâneos, um deles perde aqui e leva o mesmo 429.
    const saved = await this.attempts.save(
      {
        id: this.newId(),
        userId,
        lessonId,
        blockId,
        courseId: lesson.courseId,
        score: grade.score,
        passed: grade.passed,
        answers,
        createdAt: now,
      },
      { cooldownMs: QUIZ_RETRY_COOLDOWN_MS },
    )
    if (!saved) {
      const fresh = (await this.attempts.summarizeByBlockIds(userId, [blockId])).get(blockId)
      throw new QuizCooldownError(
        computeRetryAvailableAt(fresh ?? null, now) ??
          new Date(now.getTime() + QUIZ_RETRY_COOLDOWN_MS),
      )
    }

    return {
      score: grade.score,
      passed: grade.passed,
      passingScore: grade.passingScore,
      attemptsCount: (summary?.attemptsCount ?? 0) + 1,
      retryAvailableAt: grade.passed
        ? null
        : new Date(now.getTime() + QUIZ_RETRY_COOLDOWN_MS).toISOString(),
      questions: grade.questions,
    }
  }
}
