import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  applyLessonDraftChange,
  defaultLessonSection,
  type LessonDraft,
  type LessonDraftCommand,
  type LessonDraftDocument,
  type LessonDraftIssue,
  validateLessonSections,
} from '@sistemazero/core/learning'
import { studioSectionCompletionIssues } from '@sistemazero/studio/server-project-checks'
import {
  assertBlockCoherent,
  assertPintaChainTypeMatches,
  canonicalizeBlockContent,
} from '../../src/application/content-admin/content-admin.service'
import {
  LessonNotFoundError,
  NoPublishedLessonError,
  NoShowcaseBlockError,
} from '../../src/domain/course/course.errors'
import { isCompletionGatingBlock } from '../../src/domain/course/lesson-block'
import { LessonDraftConflictError } from '../../src/domain/learning/lesson-draft.errors'
import type { LessonDraftRepository } from '../../src/domain/ports/lesson-draft-repository.port'
import { stableJson } from '../../src/domain/shared/stable-json'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import type { InMemoryCourseRepository } from './in-memory'
import type { InMemoryLearningRepository } from './learning-in-memory'

/** HTTP/auth fixtures use this store; publication atomicity is tested against PostgreSQL. */
export class InMemoryLessonDraftRepository implements LessonDraftRepository {
  readonly drafts = new Map<string, LessonDraft>()
  constructor(
    private readonly courses: InMemoryCourseRepository,
    private readonly learning: InMemoryLearningRepository,
  ) {}
  async read(lessonId: string) {
    const saved = this.drafts.get(lessonId)
    if (saved) return structuredClone(saved)
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    const structure = await this.learning.getStructure(lessonId)
    const draft: LessonDraft = {
      lessonId,
      revision: randomUUID(),
      publishedRevision: randomUUID(),
      isPublished: lesson.isPublished,
      updatedBy: null,
      updatedAt: new Date().toISOString(),
      document: {
        title: lesson.title,
        slug: lesson.slug,
        estimatedMinutes: lesson.estimatedMinutes,
        blocks: lesson.blocks.map((b) => ({ id: b.id, content: { ...b.content } })),
        sections: structure?.sections ?? [
          defaultLessonSection(
            lessonId,
            lesson.title,
            lesson.blocks.map((b) => b.id),
          ),
        ],
        supportBlockIds: structure?.supportBlockIds ?? [],
        attachments: lesson.attachments,
        plannedVideos: [],
      },
    }
    this.drafts.set(lessonId, structuredClone(draft))
    return draft
  }
  async replace(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    _operationId: string,
    document: LessonDraftDocument,
  ) {
    const draft = await this.read(lessonId)
    if (draft.revision !== expectedRevision) throw new LessonDraftConflictError()
    const next = {
      ...draft,
      document,
      revision: randomUUID(),
      updatedBy: authorId,
      updatedAt: new Date().toISOString(),
    }
    this.drafts.set(lessonId, structuredClone(next))
    return next
  }
  async change(lessonId: string, authorId: string, command: LessonDraftCommand) {
    const draft = await this.read(lessonId)
    return this.replace(
      lessonId,
      authorId,
      command.expectedRevision,
      command.operationId,
      applyLessonDraftChange(draft.document, command.change),
    )
  }
  async validate(lessonId: string, expectedRevision: string, readyVideoIds: string[]) {
    const draft = await this.read(lessonId)
    if (draft.revision !== expectedRevision) throw new LessonDraftConflictError()
    const issues: LessonDraftIssue[] = []
    const invalid = validateLessonSections(
      draft.document.sections,
      draft.document.blocks.map((b) => ({ id: b.id, kind: b.content.kind })),
      draft.document.supportBlockIds,
    )
    if (invalid) issues.push({ message: invalid })
    for (const block of draft.document.blocks) {
      try {
        assertBlockCoherent(parsePublishedLessonBlock(block.content))
      } catch (error) {
        issues.push({
          blockId: block.id,
          message: error instanceof Error ? error.message : 'Bloco inválido',
        })
      }
    }
    for (const attachment of draft.document.attachments)
      if (!/^(https?:\/\/|r2priv:)./.test(attachment.url))
        issues.push({ message: 'URL de anexo inválida' })
    for (const video of draft.document.plannedVideos)
      if (!video.videoId || !readyVideoIds.includes(video.videoId))
        issues.push({ blockId: video.blockId, message: 'Vídeo pendente' })
    issues.push(...studioSectionCompletionIssues(draft.document.sections, draft.document.blocks))
    return issues
  }
  async publish(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
    readyVideoIds: string[],
  ) {
    const issues = await this.validate(lessonId, expectedRevision, readyVideoIds)
    if (issues.length) throw new ValidationError(issues.map((i) => i.message).join('\n'))
    const draft = await this.read(lessonId)
    const lesson = this.courses.lessons.find((l) => l.id === lessonId)
    if (!lesson) throw new LessonNotFoundError()
    const previous = [...this.courses.blocks]
    const hadShowcase =
      (await this.courses.listCourseIdsWithShowcaseBlock([lesson.courseId])).length > 0
    const blocks = draft.document.blocks.map((b, sortOrder) => {
      const content = canonicalizeBlockContent(parsePublishedLessonBlock(b.content))
      const old = previous.find((p) => p.id === b.id)
      return {
        id: b.id,
        lessonId,
        kind: content.kind,
        content,
        sortOrder,
        contentRevision:
          old && stableJson(old.content) === stableJson(content)
            ? old.contentRevision
            : randomUUID().replaceAll('-', ''),
      }
    })
    this.courses.blocks = [...previous.filter((b) => b.lessonId !== lessonId), ...blocks]
    try {
      if ((await this.courses.countCertificateBlocks(lesson.courseId)) > 1)
        throw new ValidationError('O curso já possui um bloco de certificado.')
      if (
        blocks.some((b) => b.kind === 'certificate') &&
        blocks.some((b) => isCompletionGatingBlock(b.content))
      )
        throw new ValidationError('A aula de certificado não pode conter atividades obrigatórias.')
      for (const block of blocks)
        if (block.content.kind === 'pinta' && block.content.chain)
          await assertPintaChainTypeMatches(this.courses, lesson.courseId, block.content, block.id)
      const course = await this.courses.findCourseById(lesson.courseId)
      if (
        hadShowcase &&
        course?.status === 'published' &&
        course.audience === 'kids' &&
        course.careerSlot !== null &&
        !(await this.courses.listCourseIdsWithShowcaseBlock([lesson.courseId])).length
      )
        throw new NoShowcaseBlockError()
    } catch (error) {
      this.courses.blocks = previous
      throw error
    }
    // Exercise the existing invalidation callbacks for changed assessments only.
    this.courses.blocks = previous
    for (const block of blocks) {
      const old = previous.find((p) => p.id === block.id)
      if (old && stableJson(old.content) !== stableJson(block.content))
        await this.courses.updateBlock(block.id, block.kind, block.content)
    }
    this.courses.blocks = [...previous.filter((b) => b.lessonId !== lessonId), ...blocks]
    Object.assign(lesson, {
      title: draft.document.title,
      slug: draft.document.slug,
      estimatedMinutes: draft.document.estimatedMinutes,
      isPublished: true,
    })
    this.learning.structures.set(lessonId, {
      revision: randomUUID(),
      sections: draft.document.sections,
      supportBlockIds: draft.document.supportBlockIds,
    })
    const next = await this.replace(lessonId, authorId, expectedRevision, operationId, {
      ...draft.document,
      blocks: blocks.map((b) => ({ id: b.id, content: { ...b.content } })),
    })
    next.isPublished = true
    this.drafts.set(lessonId, structuredClone(next))
    return next
  }
  async unpublish(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
  ) {
    const draft = await this.read(lessonId)
    const existing = await this.courses.findLessonById(lessonId)
    if (!existing) throw new LessonNotFoundError()
    const course = await this.courses.findCourseById(existing.courseId)
    if (
      course?.status === 'published' &&
      (await this.courses.countPublishedLessons(existing.courseId, {
        excludeLessonId: lessonId,
      })) === 0
    )
      throw new NoPublishedLessonError()
    await this.courses.updateLesson(lessonId, {
      title: existing.title,
      slug: existing.slug,
      estimatedMinutes: existing.estimatedMinutes,
      isPublished: false,
    })
    const next = await this.replace(
      lessonId,
      authorId,
      expectedRevision,
      operationId,
      draft.document,
    )
    next.isPublished = false
    const lesson = this.courses.lessons.find((l) => l.id === lessonId)
    if (lesson) lesson.isPublished = false
    this.drafts.set(lessonId, structuredClone(next))
    return next
  }
}
