import { creationPartStorageKey } from '@sistemazero/core/creations'
import { ValidationError } from '@sistemazero/core/errors'
import {
  GALLERY_DRAWING_KINDS,
  type GalleryDeliveryInput,
  type GalleryDeliveryPlan,
  type GallerySubmission,
  isGalleryBlock,
  isGallerySubmission,
} from '@sistemazero/core/learning'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import { LearningConflictError } from '../../domain/learning/learning.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { CreationsRepository } from '../../domain/ports/creations-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import { stableJson } from '../../domain/shared/stable-json'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'
import type { SubmitStudioProjectService } from '../submit-studio-project/submit-studio-project.service'
import type { LearningActor } from './learning.service'
import type { SectionProgressionService } from './section-progression.service'

export class GalleryDeliveryService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly access: CheckAccessService,
    private readonly progress: ProgressRepository,
    private readonly sections: SectionProgressionService,
    private readonly creations: CreationsRepository,
    private readonly submissions: StudioSubmissionRepository,
    private readonly submit: SubmitStudioProjectService,
  ) {}

  async prepare(
    actor: LearningActor,
    lessonId: string,
    blockId: string,
    input: GalleryDeliveryInput,
  ): Promise<GalleryDeliveryPlan> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson?.isPublished || hasComingSoonBlock(lesson.blocks)) throw new LessonNotFoundError()
    const { course } = await this.access.requireById(
      actor.accountId,
      lesson.courseId,
      actor.privileged,
      actor.userId,
    )
    await assertLessonUnlocked(
      this.courses,
      this.progress,
      course,
      lessonId,
      actor.userId,
      actor.privileged,
    )
    await this.sections.assertBlock(actor, lesson, blockId, actor.privileged, true)
    const block = lesson.blocks.find((b) => b.id === blockId)
    if (!block || !isGalleryBlock(block.content))
      throw new ValidationError('Esta atividade não recebe trabalhos da galeria.')
    if (block.contentRevision !== input.revision) throw new LearningConflictError()
    const config = block.content.gallery
    if (
      input.items.length < config.minItems ||
      input.items.length > config.maxItems ||
      new Set(input.items.map((i) => i.itemId)).size !== input.items.length
    )
      throw new ValidationError(
        `Selecione de ${config.minItems} a ${config.maxItems} trabalhos diferentes.`,
      )
    const previous = await this.submissions.getOne(actor.userId, blockId)
    if (
      previous &&
      isGallerySubmission(previous.project) &&
      previous.project.requestId === input.requestId
    ) {
      const selected = previous.project.items.map(({ itemId, revision }) => ({ itemId, revision }))
      if (stableJson(selected) !== stableJson(input.items)) throw new LearningConflictError()
      return {
        completed: true,
        result: {
          submittedAt: previous.submittedAt.toISOString(),
          ...(previous.score === null || previous.score === undefined
            ? {}
            : { score: previous.score }),
          ...(previous.passedAt ? { passed: true } : {}),
        },
      }
    }
    const snapshot: GallerySubmission = {
      kind: 'gallery-delivery',
      version: 1,
      requestId: input.requestId,
      tool: block.content.kind,
      items: [],
    }
    const copies: { source: string; destination: string }[] = []
    for (const selection of input.items) {
      const creation = await this.creations.get(actor.userId, block.content.kind, selection.itemId)
      if (
        !creation ||
        creation.accountId !== actor.accountId ||
        creation.deletedAt ||
        !creation.storageRef ||
        creation.revision !== selection.revision
      )
        throw new ValidationError(
          'Um trabalho mudou ou ainda não foi guardado na conta. Atualize a galeria e selecione novamente.',
        )
      if (creation.tool === 'pinta' && !GALLERY_DRAWING_KINDS.includes(creation.kind))
        throw new ValidationError('Selecione desenhos, personagens, cenários ou peças do Pinta.')
      const prefix = `creations/${actor.userId}/lesson-submissions/${blockId}/${input.requestId}/${creation.itemId}-${creation.revision}`
      const item = {
        itemId: creation.itemId,
        revision: creation.revision,
        name: creation.name,
        kind: creation.kind,
        storageKey: `${prefix}/project.gz`,
        parts: creation.parts.map((part) => ({
          hash: part.hash,
          storageKey: `${prefix}/parts/${part.hash}.gz`,
        })),
      }
      copies.push({ source: creation.storageRef, destination: item.storageKey })
      for (const part of creation.parts)
        copies.push({
          source: creationPartStorageKey(
            actor.userId,
            creation.tool,
            creation.itemId,
            part.hash,
            part.rev,
          ),
          destination: `${prefix}/parts/${part.hash}.gz`,
        })
      snapshot.items.push(item)
    }
    return { completed: false, snapshot, copies }
  }

  /** Only exposed to the BFF with a signed body, after all storage copies succeed. */
  async commit(
    actor: LearningActor,
    lessonId: string,
    blockId: string,
    input: GalleryDeliveryInput,
    projectForChecks: unknown,
  ) {
    const plan = await this.prepare(actor, lessonId, blockId, input)
    if (plan.completed) return plan.result
    return this.submit.execute(
      actor.userId,
      lessonId,
      blockId,
      plan.snapshot,
      [],
      input.message ?? null,
      actor.privileged,
      actor.accountId,
      null,
      plan.snapshot.tool,
      { snapshot: plan.snapshot, projectForChecks, revision: input.revision },
    )
  }
}
