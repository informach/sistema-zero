import { ValidationError } from '@sistemazero/core/errors'
import {
  defaultLessonSection,
  evaluateLearning,
  isLearningAnswers,
  type LearningAnswers,
  type LessonLearningReport,
  type LessonSection,
  publicInteractiveBlock,
  validateLessonSections,
} from '@sistemazero/core/learning'
import type { LessonWithContent } from '../../domain/course/course'
import { LessonComingSoonError, LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import { LearningConflictError, LearningGateError } from '../../domain/learning/learning.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { LearningOwner, LearningRepository } from '../../domain/ports/learning-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlockedFromState } from '../lesson-locking/lesson-locking'
import type { TeacherThreadsService } from '../teacher-threads/teacher-threads.service'
import type { SectionProgressionService } from './section-progression.service'

export interface LearningActor extends LearningOwner {
  privileged: boolean
}
export interface LearningProgressInput {
  revision: string
  answers: LearningAnswers
  hintsUsed: number
  positionSeconds: number | null
}

export class LearningService {
  constructor(
    private readonly repository: LearningRepository,
    private readonly courses: CourseRepository,
    private readonly access: CheckAccessService,
    private readonly progress: ProgressRepository,
    private readonly clock: () => Date,
    private readonly teacherThreads: TeacherThreadsService,
    readonly sections: SectionProgressionService,
  ) {}

  private async requireLesson(actor: LearningActor, lessonId: string) {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson?.isPublished) throw new LessonNotFoundError()
    const { course } = await this.access.requireById(
      actor.accountId,
      lesson.courseId,
      actor.privileged,
      actor.userId,
    )
    if (hasComingSoonBlock(lesson.blocks)) throw new LessonComingSoonError()
    const [completedLessonIds, outline] = await Promise.all([
      this.progress.listCompletedLessonIds(actor.userId, course.id),
      this.courses.findOutline(course.id, { publishedOnly: true }),
    ])
    assertLessonUnlockedFromState(
      course,
      lessonId,
      {
        completedLessonIds,
        orderedPublishedLessonIds: outline.flatMap((m) => m.lessons.map((l) => l.id)),
      },
      actor.privileged,
    )
    return lesson
  }

  async structure(lesson: LessonWithContent) {
    const structure = await this.repository.getStructure(lesson.id)
    return (
      structure ?? {
        revision: null,
        supportBlockIds: [],
        sections: [
          defaultLessonSection(
            lesson.id,
            lesson.title,
            lesson.blocks.map((b) => b.id),
          ),
        ],
      }
    )
  }
  async read(owner: LearningOwner, lesson: LessonWithContent) {
    const [structure, saved] = await Promise.all([
      this.structure(lesson),
      this.repository.getProgress(owner, lesson.id),
    ])
    return {
      ...structure,
      progress: {
        sectionId: structure.sections.some((s) => s.id === saved.sectionId)
          ? saved.sectionId
          : null,
        blocks: saved.blocks.filter((p) =>
          lesson.blocks.some((b) => b.id === p.blockId && b.contentRevision === p.revision),
        ),
      },
    }
  }
  async navigation(actor: LearningActor, lessonId: string, sectionId: string) {
    const lesson = await this.requireLesson(actor, lessonId)
    await this.sections.assertSection(actor, lesson, sectionId, actor.privileged)
    const structure = await this.structure(lesson)
    if (!structure.sections.some((s) => s.id === sectionId))
      throw new LessonNotFoundError('Seção não encontrada')
    await this.repository.saveNavigation(actor, lessonId, sectionId)
    return { ok: true }
  }
  async help(actor: LearningActor, lessonId: string, sectionId: string, body: string) {
    const lesson = await this.requireLesson(actor, lessonId)
    await this.sections.assertSection(actor, lesson, sectionId, actor.privileged)
    const section = (await this.structure(lesson)).sections.find((s) => s.id === sectionId)
    if (!section) throw new LessonNotFoundError('Seção não encontrada')
    const course = await this.courses.findCourseById(lesson.courseId)
    if (!course) throw new LessonNotFoundError()
    const threadId = await this.teacherThreads.studentPostByContext({
      ...actor,
      audience: course.audience,
      contextType: 'lesson_section',
      contextRef: `${lessonId}:${sectionId}`,
      lessonId,
      courseId: lesson.courseId,
      title: `${lesson.title} · ${section.title}`.slice(0, 300),
      authorName: null,
      body,
    })
    return { threadId }
  }
  async save(
    actor: LearningActor,
    lessonId: string,
    blockId: string,
    input: LearningProgressInput,
  ) {
    const lesson = await this.requireLesson(actor, lessonId)
    await this.sections.assertBlock(actor, lesson, blockId, actor.privileged)
    const block = lesson.blocks.find((b) => b.id === blockId)
    if (!block || (block.content.kind !== 'interactive' && block.content.kind !== 'video'))
      throw new LessonNotFoundError()
    if (block.contentRevision !== input.revision) throw new LearningConflictError()
    if (!isLearningAnswers(input.answers)) throw new ValidationError('Respostas inválidas.')
    if (
      input.positionSeconds !== null &&
      (!Number.isInteger(input.positionSeconds) ||
        input.positionSeconds < 0 ||
        input.positionSeconds > 86_400)
    )
      throw new ValidationError('Posição de vídeo inválida.')
    const hintLimit = block.content.kind === 'interactive' ? block.content.hints.length : 0
    if (!Number.isInteger(input.hintsUsed) || input.hintsUsed < 0 || input.hintsUsed > hintLimit)
      throw new ValidationError('Quantidade de pistas inválida.')
    return this.repository.saveProgress({
      ...actor,
      lessonId,
      progress: {
        blockId,
        revision: input.revision,
        answers: input.answers,
        hintsUsed: input.hintsUsed,
        positionSeconds: input.positionSeconds,
        attemptsCount: 0,
        result: null,
        updatedAt: this.clock().toISOString(),
      },
    })
  }
  async attempt(
    actor: LearningActor,
    lessonId: string,
    blockId: string,
    input: Omit<LearningProgressInput, 'positionSeconds'> & { id: string },
  ) {
    const lesson = await this.requireLesson(actor, lessonId)
    await this.sections.assertBlock(actor, lesson, blockId, actor.privileged)
    const block = lesson.blocks.find((b) => b.id === blockId)
    if (block?.content.kind !== 'interactive') throw new LessonNotFoundError()
    if (block.contentRevision !== input.revision) throw new LearningConflictError()
    if (
      !isLearningAnswers(input.answers) ||
      !Number.isInteger(input.hintsUsed) ||
      input.hintsUsed < 0 ||
      input.hintsUsed > block.content.hints.length
    )
      throw new ValidationError('Respostas inválidas.')
    const existing = await this.repository.findAttempt(actor, input.id)
    if (existing && (existing.blockId !== blockId || existing.revision !== input.revision))
      throw new LearningConflictError()
    const attempt = existing ?? {
      id: input.id,
      blockId,
      revision: input.revision,
      answers: input.answers,
      hintsUsed: input.hintsUsed,
      result: evaluateLearning(block.content, input.answers),
      createdAt: this.clock().toISOString(),
    }
    const progress = await this.repository.recordAttempt(actor, lessonId, attempt)
    const recorded = await this.repository.findAttempt(actor, input.id)
    if (!recorded) throw new LearningConflictError()
    return { attempt: recorded, progress, sectionProgress: await this.sections.read(actor, lesson) }
  }
  async checkProject(
    actor: LearningActor,
    lessonId: string,
    sectionId: string,
    revision: string,
    project: unknown,
  ) {
    const lesson = await this.requireLesson(actor, lessonId)
    return this.sections.checkProject(actor, lesson, sectionId, revision, project)
  }
  async assertComplete(owner: LearningOwner, lesson: LessonWithContent) {
    const required = lesson.blocks.filter(
      (b) => b.content.kind === 'interactive' && b.content.required,
    )
    if (required.length === 0) return
    const progress = await this.repository.getProgress(owner, lesson.id)
    if (
      required.some(
        (b) =>
          !progress.blocks.some(
            (p) => p.blockId === b.id && p.revision === b.contentRevision && p.result?.passed,
          ),
      )
    )
      throw new LearningGateError()
  }
  async adminStructure(lessonId: string) {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    return this.structure(lesson)
  }
  async saveStructure(
    lessonId: string,
    expectedRevision: string | null,
    sections: LessonSection[],
  ) {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    const invalid = validateLessonSections(sections, lesson.blocks)
    if (invalid) throw new ValidationError(invalid)
    if (lesson.isPublished && sections.some((s) => s.pendingMedia.length))
      throw new ValidationError('Despublique a aula antes de marcar mídias pendentes.')
    const saved = await this.repository.saveStructure(lessonId, expectedRevision, sections)
    if (!saved) throw new LearningConflictError()
    return saved
  }
  async report(owner: LearningOwner, lessonId: string): Promise<LessonLearningReport> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    const [current, attempts] = await Promise.all([
      this.read(owner, lesson),
      this.repository.listAttempts(owner, lessonId),
    ])
    return {
      ...current.progress,
      lessonId,
      lessonTitle: lesson.title,
      userId: owner.userId,
      attempts,
      sections: current.sections,
      activities: lesson.blocks.flatMap((block) =>
        block.content.kind === 'interactive' && block.contentRevision
          ? [
              {
                id: block.id,
                revision: block.contentRevision,
                content: publicInteractiveBlock(block.content),
              },
            ]
          : [],
      ),
    }
  }
  async assertPublishable(lessonId: string) {
    const structure = await this.repository.getStructure(lessonId)
    if (structure?.sections.some((s) => s.pendingMedia.length))
      throw new ValidationError('Produza e vincule as mídias pendentes antes de publicar a aula.')
  }
}
