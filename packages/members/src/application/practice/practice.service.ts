import { creatorWorkshopEnabled } from '@sistemazero/core/career'
import type { PracticeSessionView, PracticeTopicView } from '@sistemazero/core/practice'
import { InvalidContentCommandError } from '../../domain/course/course.errors'
import { gradeQuizAttempt, type QuizAnswers } from '../../domain/course/quiz'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { PracticeRepository } from '../../domain/ports/practice-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { QuizAttemptRepository } from '../../domain/ports/quiz-attempt-repository.port'
import {
  PracticeNotFoundError,
  PracticeNotReadyError,
  type PracticeSession,
} from '../../domain/practice/practice'
import type { CheckAccessService } from '../access/check-access.service'

export function practiceView(session: PracticeSession): PracticeSessionView {
  const grade = session.answers ? gradeQuizAttempt(session.quiz, session.answers) : null
  return {
    id: session.id,
    title: session.title,
    courseSlug: session.courseSlug,
    lessonId: session.lessonId,
    createdAt: session.createdAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    questions: session.quiz.questions.map(({ id, prompt, choices, correctChoiceIds }) => ({
      id,
      prompt,
      choices,
      multiple: correctChoiceIds.length > 1,
    })),
    answers: session.answers,
    review: grade ? { score: grade.score, questions: grade.questions } : null,
  }
}

export class PracticeService {
  constructor(
    private readonly repository: PracticeRepository,
    private readonly access: CheckAccessService,
    private readonly courses: CourseRepository,
    private readonly progress: ProgressRepository,
    private readonly attempts: QuizAttemptRepository,
    private readonly clock: () => Date,
    private readonly pilotAccounts: string | undefined,
  ) {}

  private assertPilot(accountId: string) {
    if (!this.available(accountId))
      throw new AccessDeniedError('A prática ainda não está disponível para esta conta.')
  }

  available(accountId: string) {
    return creatorWorkshopEnabled(accountId, this.pilotAccounts)
  }

  async topics(
    userId: string,
    accountId: string,
    courseSlug: string,
    privileged = false,
  ): Promise<PracticeTopicView[]> {
    this.assertPilot(accountId)
    const { course } = await this.access.requireBySlug(accountId, courseSlug, privileged, userId)
    if (course.audience !== 'kids') throw new PracticeNotFoundError()
    const completed = new Set(await this.progress.listCompletedLessonIds(userId, course.id))
    const outline = await this.courses.findOutline(course.id, { publishedOnly: true })
    const result: PracticeTopicView[] = []
    // Bounded to one selected course; inspect only completed lessons.
    for (const entry of outline
      .flatMap((module) => module.lessons)
      .filter((lesson) => completed.has(lesson.id))) {
      const lesson = await this.courses.findLessonWithContent(entry.id)
      if (!lesson?.isPublished || lesson.blocks.some((block) => block.kind === 'coming_soon'))
        continue
      const quizzes = lesson.blocks.filter((block) => block.content.kind === 'quiz')
      const states = await this.attempts.summarizeByBlockIds(
        userId,
        quizzes.map((block) => block.id),
      )
      for (const block of quizzes)
        if (
          block.content.kind === 'quiz' &&
          block.content.questions.length &&
          states.get(block.id)?.everPassed
        ) {
          result.push({
            courseSlug,
            lessonId: lesson.id,
            blockId: block.id,
            title: lesson.title,
            questionCount: Math.min(5, block.content.questions.length),
          })
        }
    }
    return result
  }

  async start(
    userId: string,
    accountId: string,
    input: { id: string; courseSlug: string; lessonId: string; blockId: string },
    privileged = false,
  ): Promise<PracticeSessionView> {
    this.assertPilot(accountId)
    const existing = await this.repository.get(input.id, userId, accountId)
    if (existing) return practiceView(existing)
    const { course } = await this.access.requireBySlug(
      accountId,
      input.courseSlug,
      privileged,
      userId,
    )
    const lesson = await this.courses.findLessonWithContent(input.lessonId)
    if (
      course.audience !== 'kids' ||
      !lesson?.isPublished ||
      lesson.courseId !== course.id ||
      lesson.blocks.some((block) => block.kind === 'coming_soon')
    )
      throw new PracticeNotFoundError()
    const block = lesson.blocks.find((block) => block.id === input.blockId)
    if (block?.content.kind !== 'quiz' || !block.content.questions.length)
      throw new PracticeNotFoundError()
    const [completed, states] = await Promise.all([
      this.progress.listCompletedLessonIds(userId, course.id),
      this.attempts.summarizeByBlockIds(userId, [block.id]),
    ])
    if (!completed.includes(lesson.id) || !states.get(block.id)?.everPassed)
      throw new PracticeNotReadyError()
    return practiceView(
      await this.repository.create({
        id: input.id,
        userId,
        accountId,
        courseId: course.id,
        courseSlug: course.slug,
        lessonId: lesson.id,
        blockId: block.id,
        title: lesson.title,
        quiz: { ...block.content, questions: block.content.questions.slice(0, 5) },
        answers: null,
        createdAt: this.clock(),
        completedAt: null,
      }),
    )
  }

  /** History stays readable after leaving the pilot; immutable snapshots survive course edits. */
  async history(userId: string, accountId: string) {
    return (await this.repository.list(userId, accountId)).map(practiceView)
  }
  async get(userId: string, accountId: string, id: string) {
    const session = await this.repository.get(id, userId, accountId)
    if (!session) throw new PracticeNotFoundError()
    return practiceView(session)
  }
  async complete(userId: string, accountId: string, id: string, answers: QuizAnswers) {
    const session = await this.repository.get(id, userId, accountId)
    if (!session) throw new PracticeNotFoundError()
    if (session.completedAt) return practiceView(session)
    const questions = session.quiz.questions
    if (
      Object.keys(answers).length !== questions.length ||
      questions.some((question) => {
        const selected = answers[question.id]
        return (
          !selected?.length ||
          new Set(selected).size !== selected.length ||
          selected.some((id) => !question.choices.some((choice) => choice.id === id))
        )
      })
    )
      throw new InvalidContentCommandError('Responda todas as perguntas antes de conferir.')
    const saved = await this.repository.complete(id, userId, accountId, answers, this.clock())
    if (!saved) throw new PracticeNotFoundError()
    return practiceView(saved)
  }
}
