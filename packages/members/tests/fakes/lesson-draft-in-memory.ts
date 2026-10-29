import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import {
  applyLessonDraftChange,
  defaultLessonSection,
  type LessonDraft,
  type LessonDraftCommand,
  type LessonDraftDocument,
  type LessonDraftIssue,
  lessonStudioExampleTransportIssues,
  lessonStudioProjectExampleIssues,
  restoreFromPublished,
  validateLessonSections,
} from '@sistemazero/core/learning'
import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import { studioSectionCompletionIssues } from '@sistemazero/studio/server-project-checks'
import {
  assertBlockCoherent,
  assertPintaChainTypeMatches,
  canonicalizeBlockContent,
  startArtSlotGuard,
} from '../../src/application/content-admin/content-admin.service'
import { draftArtSlotIssues, hasArtSlots } from '../../src/domain/course/art-slot-course'
import { blockRevisionFingerprint } from '../../src/domain/course/block-revision'
import { certificateLessonIssues } from '../../src/domain/course/certificate-lesson'
import {
  ContentNotFoundError,
  LessonNotFoundError,
  NoPublishedLessonError,
  NoShowcaseBlockError,
} from '../../src/domain/course/course.errors'
import { quizGateFingerprint } from '../../src/domain/course/quiz'
import { LessonDraftConflictError } from '../../src/domain/learning/lesson-draft.errors'
import type { LessonDraftRepository } from '../../src/domain/ports/lesson-draft-repository.port'
import type { StudioAuthoringPolicy } from '../../src/domain/studio/authoring-policy'
import { studioChainCandidate } from '../../src/domain/studio/chain-environment'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import type { InMemoryCourseRepository } from './in-memory'
import type { InMemoryLearningRepository } from './learning-in-memory'

/** HTTP/auth fixtures use this store; publication atomicity is tested against PostgreSQL. */
export class InMemoryLessonDraftRepository implements LessonDraftRepository {
  readonly drafts = new Map<string, LessonDraft>()
  /** O rascunho de antes da ultima restauracao (as colunas `previous_*` do Postgres). */
  private readonly anteriores = new Map<string, LessonDraftDocument>()
  constructor(
    private readonly courses: InMemoryCourseRepository,
    private readonly learning: InMemoryLearningRepository,
    private readonly studioPolicy?: StudioAuthoringPolicy,
  ) {
    // As partes da aula publicada decidem a ordem do desenho e do jogo dentro dela.
    courses.lessonSections = (lessonId) => learning.structures.get(lessonId)?.sections
  }
  async readStudioRuntimeContext(lessonId: string, blockId: string | null) {
    const draft = this.drafts.get(lessonId)
    if (!draft) return null
    const content = draft.document.blocks.find((item) => item.id === blockId)?.content
    const curation =
      content?.kind === 'studio'
        ? {
            level: content.level,
            pythonLevel: content.pythonLevel,
            allowedModes: content.allowedModes,
            allowBlocks: content.allowBlocks,
            allowCategories: content.allowCategories,
            allowLevelReveal: content.allowLevelReveal,
          }
        : {}
    return {
      revision: draft.revision,
      block: content
        ? {
            kind: content.kind,
            environment:
              content.kind === 'studio'
                ? studioProjectContinuityReference(content.initialProject)
                : null,
            curation,
          }
        : null,
    }
  }

  async read(lessonId: string) {
    const saved = this.drafts.get(lessonId)
    if (saved) return structuredClone(saved)
    const lesson = await this.courses.findLessonWithContent(lessonId, {
      includePrivateStudioAuthoring: true,
    })
    if (!lesson) throw new LessonNotFoundError()
    const structure = await this.learning.getStructure(lessonId)
    const draft: LessonDraft = {
      lessonId,
      revision: randomUUID(),
      publishedRevision: randomUUID(),
      isPublished: lesson.isPublished,
      canUndoRestore: false,
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
    const [exampleIssue] = lessonStudioProjectExampleIssues(document.sections, document.blocks)
    if (exampleIssue) throw new ValidationError(exampleIssue.message)
    const lesson = await this.courses.findLesson(lessonId)
    const course = lesson ? await this.courses.findCourseById(lesson.courseId) : null
    if (!course) throw new LessonNotFoundError()
    const [transportIssue] = lessonStudioExampleTransportIssues(document, course.slug)
    if (transportIssue) throw new ValidationError(transportIssue.message)
    // O desfazer vale so ate a proxima alteracao (espelha o `write` do Drizzle).
    this.anteriores.delete(lessonId)
    const next = {
      ...draft,
      document,
      canUndoRestore: false,
      revision: randomUUID(),
      updatedBy: authorId,
      updatedAt: new Date().toISOString(),
    }
    this.drafts.set(lessonId, structuredClone(next))
    return next
  }

  /** O publicado no formato do rascunho — a MESMA conversao do rascunho recem-nascido. */
  async readPublished(lessonId: string) {
    const lesson = await this.courses.findLessonWithContent(lessonId, {
      includePrivateStudioAuthoring: true,
    })
    if (!lesson) throw new LessonNotFoundError()
    const structure = await this.learning.getStructure(lessonId)
    return {
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
        attachments: lesson.attachments,
        plannedVideos: [],
      } satisfies LessonDraftDocument,
      revision: structure?.revision ?? randomUUID(),
    }
  }

  async restorePublished(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    _operationId: string,
    ids: string[] | 'all',
  ) {
    const draft = await this.read(lessonId)
    if (draft.revision !== expectedRevision) throw new LessonDraftConflictError()
    const { document: publicado } = await this.readPublished(lessonId)
    const anterior = structuredClone(draft.document)
    const next = {
      ...draft,
      document: restoreFromPublished(draft.document, publicado, ids),
      canUndoRestore: true,
      revision: randomUUID(),
      updatedBy: authorId,
      updatedAt: new Date().toISOString(),
    }
    this.drafts.set(lessonId, structuredClone(next))
    this.anteriores.set(lessonId, anterior)
    return next
  }

  async undoRestore(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
  ) {
    const draft = await this.read(lessonId)
    if (draft.revision !== expectedRevision) throw new LessonDraftConflictError()
    const anterior = this.anteriores.get(lessonId)
    if (!anterior) throw new ContentNotFoundError('Não há restauração para desfazer.')
    return this.replace(lessonId, authorId, expectedRevision, operationId, anterior)
  }
  async change(lessonId: string, authorId: string, command: LessonDraftCommand) {
    const draft = await this.read(lessonId)
    if (draft.revision !== command.expectedRevision) throw new LessonDraftConflictError()
    return this.replace(
      lessonId,
      authorId,
      command.expectedRevision,
      command.operationId,
      applyLessonDraftChange(draft.document, command.change),
    )
  }
  async validate(lessonId: string, expectedRevision: string, readyVideoIds: string[]) {
    const issues = await this.publishIssues(lessonId, expectedRevision, readyVideoIds)
    // Espelha o `artSlotIssues` do Drizzle: só o "Conferir" simula as vagas; a publicação
    // confere de verdade, sob a trava do curso (`startArtSlotGuard`).
    const draft = await this.read(lessonId)
    const lesson = this.courses.lessons.find((l) => l.id === lessonId)
    if (lesson)
      issues.push(
        ...draftArtSlotIssues(
          await this.courses.listArtSlotBlocks(lesson.courseId),
          {
            lessonId,
            lessonTitle: draft.document.title.trim(),
            moduleOrder: this.courses.modules.find((m) => m.id === lesson.moduleId)?.sortOrder ?? 0,
            lessonOrder: lesson.sortOrder,
          },
          draft.document.blocks,
          draft.document.sections,
        ).map((issue) => ({ message: issue.message })),
      )
    return issues
  }

  private async publishIssues(lessonId: string, expectedRevision: string, readyVideoIds: string[]) {
    const draft = await this.read(lessonId)
    if (draft.revision !== expectedRevision) throw new LessonDraftConflictError()
    const issues: LessonDraftIssue[] = []
    const invalid = validateLessonSections(
      draft.document.sections,
      draft.document.blocks.map((b) => ({ id: b.id, kind: b.content.kind })),
    )
    if (invalid) issues.push({ message: invalid })
    for (const block of draft.document.blocks) {
      try {
        assertBlockCoherent(parsePublishedLessonBlock(block.content), this.studioPolicy)
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
    const lesson = this.courses.lessons.find((item) => item.id === lessonId)
    if (!lesson) throw new LessonNotFoundError()
    return this.courses.withStudioAuthoringLock(lesson.courseId, () =>
      this.publishInTransaction(lessonId, authorId, expectedRevision, operationId, readyVideoIds),
    )
  }

  private async publishInTransaction(
    lessonId: string,
    authorId: string,
    expectedRevision: string,
    operationId: string,
    readyVideoIds: string[],
  ) {
    const issues = await this.publishIssues(lessonId, expectedRevision, readyVideoIds)
    if (issues.length) throw new ValidationError(issues.map((i) => i.message).join('\n'))
    const draft = await this.read(lessonId)
    const lesson = this.courses.lessons.find((l) => l.id === lessonId)
    if (!lesson) throw new LessonNotFoundError()
    const previous = [...this.courses.blocks]
    const confirmArtSlots =
      draft.document.blocks.some((block) => hasArtSlots(block.content)) ||
      previous.some((block) => block.lessonId === lessonId && hasArtSlots(block.content))
        ? await startArtSlotGuard(this.courses, lesson.courseId)
        : null
    const previousSections = this.learning.structures.get(lessonId)
    const hadShowcase =
      (await this.courses.listCourseIdsWithShowcaseBlock([lesson.courseId])).length > 0
    const blocks = draft.document.blocks.map((b, sortOrder) => {
      const content = canonicalizeBlockContent(
        parsePublishedLessonBlock(b.content),
        this.studioPolicy,
      )
      const old = previous.find((p) => p.id === b.id)
      return {
        id: b.id,
        lessonId,
        kind: content.kind,
        content,
        sortOrder,
        contentRevision:
          old && blockRevisionFingerprint(old.content) === blockRevisionFingerprint(content)
            ? old.contentRevision
            : randomUUID().replaceAll('-', ''),
      }
    })
    await this.courses.claimStudioChains(
      lesson.courseId,
      blocks.flatMap((block) => studioChainCandidate(block.content)),
      previous
        .filter((block) => block.lessonId === lessonId)
        .flatMap((block) => studioChainCandidate(block.content)),
    )
    this.courses.blocks = [...previous.filter((b) => b.lessonId !== lessonId), ...blocks]
    try {
      if ((await this.courses.countCertificateBlocks(lesson.courseId)) > 1)
        throw new ValidationError('O curso já possui um bloco de certificado.')
      const certificateIssues = certificateLessonIssues(draft.document.sections, blocks)
      if (certificateIssues.length) throw new ValidationError(certificateIssues.join('\n'))
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
    for (const block of blocks) {
      const old = previous.find((p) => p.id === block.id)
      if (old && quizGateFingerprint(old.content) !== quizGateFingerprint(block.content))
        this.courses.onQuizGateChanged?.(block.id)
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
    })
    try {
      await confirmArtSlots?.()
    } catch (error) {
      // `withStudioAuthoringLock` desfaz aulas e blocos; as partes moram no falso da aprendizagem.
      if (previousSections) this.learning.structures.set(lessonId, previousSections)
      else this.learning.structures.delete(lessonId)
      throw error
    }
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
