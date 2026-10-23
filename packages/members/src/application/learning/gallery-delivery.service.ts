import { randomUUID } from 'node:crypto'
import { creationPartStorageKey } from '@sistemazero/core/creations'
import { DomainError, ValidationError } from '@sistemazero/core/errors'
import { awaitWithSignal } from '@sistemazero/core/http'
import {
  GALLERY_DRAWING_KINDS,
  GalleryCopyGenerationSchema,
  type GalleryDeliveryInput,
  type GalleryDeliveryPlan,
  type GallerySubmission,
  isGalleryBlock,
  isGallerySubmission,
} from '@sistemazero/core/learning'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import { gallerySubmissionReceipt } from '../../domain/learning/gallery-receipt'
import { GallerySourceUnavailableError } from '../../domain/learning/gallery-source.errors'
import { LearningConflictError } from '../../domain/learning/learning.errors'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { CreationsRepository } from '../../domain/ports/creations-repository.port'
import type { GalleryCopyRepository } from '../../domain/ports/gallery-copy-repository.port'
import type { ProgressRepository } from '../../domain/ports/progress-repository.port'
import type { StudioSubmissionRepository } from '../../domain/ports/studio-submission-repository.port'
import { stableJson } from '../../domain/shared/stable-json'
import type { CheckAccessService } from '../access/check-access.service'
import { assertLessonUnlocked } from '../lesson-locking/lesson-locking'
import type { SubmitStudioProjectService } from '../submit-studio-project/submit-studio-project.service'
import type { LearningActor } from './learning.service'
import type { SectionProgressionService } from './section-progression.service'
import type { StudioGallerySourceService } from './studio-gallery-source.service'

/**
 * O pedido da galeria como a borda o recebe: o contrato do core + a marca da voz para texto
 * (14/10/2026). `messageSpoken` acompanha o recado até a entrega; ausente = digitado.
 */
export type GalleryDeliveryRequest = GalleryDeliveryInput & { messageSpoken?: boolean }

type CompletedGalleryResult = Extract<GalleryDeliveryPlan, { completed: true }>['result']
/** Internal control flow: stop an obsolete inspection when another attempt already won. */
class GalleryAlreadyCommitted extends DomainError {
  readonly code = 'GALLERY_ALREADY_COMMITTED'
  constructor(readonly result: CompletedGalleryResult) {
    super('This gallery request is already committed.')
  }
}

export class GalleryDeliveryService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly access: CheckAccessService,
    private readonly progress: ProgressRepository,
    private readonly sections: SectionProgressionService,
    private readonly creations: CreationsRepository,
    private readonly submissions: StudioSubmissionRepository,
    private readonly submit: SubmitStudioProjectService,
    private readonly copies: Pick<GalleryCopyRepository, 'reserve' | 'assertActive'>,
    private readonly studioSource?: Pick<StudioGallerySourceService, 'load'>,
  ) {}

  async prepare(
    actor: LearningActor,
    lessonId: string,
    blockId: string,
    input: GalleryDeliveryRequest,
    options: { signal?: AbortSignal; copyGeneration?: string } = {},
  ): Promise<GalleryDeliveryPlan> {
    const requestedGeneration = options.copyGeneration
    const signal = AbortSignal.any([
      AbortSignal.timeout(50_000),
      ...(options.signal ? [options.signal] : []),
    ])
    const owned = <Value>(operation: () => Promise<Value>) => awaitWithSignal(operation, signal)
    const lesson = await owned(() => this.courses.findLessonWithContent(lessonId))
    if (!lesson?.isPublished || hasComingSoonBlock(lesson.blocks)) throw new LessonNotFoundError()
    const { course } = await owned(() =>
      this.access.requireById(actor.accountId, lesson.courseId, actor.privileged, actor.userId, {
        lessonId,
      }),
    )
    await owned(() =>
      assertLessonUnlocked(
        this.courses,
        this.progress,
        course,
        lessonId,
        actor.userId,
        actor.privileged,
      ),
    )
    await owned(() =>
      this.sections.assertBlock(actor, lesson, blockId, actor.privileged, true, { signal }),
    )
    const block = lesson.blocks.find((b) => b.id === blockId)
    if (!block || !isGalleryBlock(block.content))
      throw new ValidationError('Esta atividade não recebe trabalhos da galeria.')
    if (block.contentRevision !== input.revision) throw new LearningConflictError()
    const config = block.content.gallery
    const tool = block.content.kind
    if (
      input.items.length < config.minItems ||
      input.items.length > config.maxItems ||
      new Set(input.items.map((i) => i.itemId)).size !== input.items.length
    )
      throw new ValidationError(
        `Selecione de ${config.minItems} a ${config.maxItems} trabalhos diferentes.`,
      )
    const previous = await owned(() => this.submissions.getOne(actor.userId, blockId))
    if (
      previous &&
      isGallerySubmission(previous.project) &&
      previous.project.requestId === input.requestId
    ) {
      const selected = previous.project.items.map(({ itemId, revision }) => ({ itemId, revision }))
      if (stableJson(selected) !== stableJson(input.items)) throw new LearningConflictError()
      return {
        completed: true,
        result: gallerySubmissionReceipt(previous),
      }
    }
    const generation = requestedGeneration ?? randomUUID()
    if (!GalleryCopyGenerationSchema.safeParse(generation).success)
      throw new ValidationError('A tentativa de cópia da galeria é inválida.')
    const snapshot: GallerySubmission = {
      kind: 'gallery-delivery',
      version: 1,
      requestId: input.requestId,
      copyGeneration: generation,
      tool: block.content.kind,
      items: [],
    }
    const copies: { source: string; destination: string }[] = []
    for (const selection of input.items) {
      const creation = await owned(() =>
        this.creations.get(actor.userId, tool, selection.itemId, course.audience),
      )
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
      const prefix = `creations/${actor.userId}/lesson-submissions/${blockId}/${input.requestId}/${generation}/${creation.itemId}-${creation.revision}`
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
            course.audience,
          ),
          destination: `${prefix}/parts/${part.hash}.gz`,
        })
      snapshot.items.push(item)
    }
    const attempt = { ...actor, generation, blockId, snapshot }
    await owned(() =>
      requestedGeneration
        ? this.copies.assertActive(attempt, new Date())
        : this.copies.reserve(attempt, new Date()),
    )
    return { completed: false, copyGeneration: generation, snapshot, copies }
  }

  /** Only exposed to the BFF with a signed body, after all storage copies succeed. */
  async commit(
    actor: LearningActor,
    lessonId: string,
    blockId: string,
    input: GalleryDeliveryRequest,
    projectForChecks: unknown,
    options: { signal?: AbortSignal; copyGeneration: string },
  ) {
    options.signal?.throwIfAborted()
    const owner = { ...actor }
    const delivery = structuredClone(input)
    const capturedProject = copyStudioProjectJson(projectForChecks)
    const copyGeneration = GalleryCopyGenerationSchema.safeParse(options.copyGeneration)
    if (!copyGeneration.success)
      throw new ValidationError('A tentativa de cópia da galeria é inválida.')
    const generation = copyGeneration.data
    const signal = AbortSignal.any([
      AbortSignal.timeout(50_000),
      ...(options.signal ? [options.signal] : []),
    ])
    const plan = await awaitWithSignal(
      () =>
        this.prepare(owner, lessonId, blockId, delivery, { signal, copyGeneration: generation }),
      signal,
    )
    if (plan.completed) return plan.result
    let inspectedProject = capturedProject
    if (
      capturedProject &&
      typeof capturedProject === 'object' &&
      'format' in capturedProject &&
      capturedProject.format === 'sz-studio-gallery-source'
    ) {
      if (plan.snapshot.tool !== 'studio' || plan.snapshot.items.length !== 1)
        throw new ValidationError('A referência precisa corresponder a um projeto do Estúdio.')
      if (!this.studioSource) throw new GallerySourceUnavailableError()
      inspectedProject = await awaitWithSignal(
        () => this.studioSource!.load(capturedProject, plan.snapshot.items[0]!, signal),
        signal,
      )
      const current = await awaitWithSignal(
        () =>
          this.prepare(owner, lessonId, blockId, delivery, { signal, copyGeneration: generation }),
        signal,
      )
      if (current.completed) return current.result
      if (stableJson(current.snapshot) !== stableJson(plan.snapshot))
        throw new LearningConflictError()
    } else if (
      capturedProject &&
      typeof capturedProject === 'object' &&
      'programmingLanguage' in capturedProject &&
      capturedProject.programmingLanguage === 'python'
    )
      throw new ValidationError('Envie a referência da cópia completa do projeto Python.')
    try {
      const result = await this.submit.execute(owner.userId, lessonId, blockId, plan.snapshot, {
        signal,
        message: delivery.message ?? null,
        messageSpoken: delivery.messageSpoken,
        privileged: owner.privileged,
        accountId: owner.accountId,
        kind: plan.snapshot.tool,
        gallery: {
          snapshot: plan.snapshot,
          projectForChecks: inspectedProject,
          revision: delivery.revision,
          authorize: async (signal) => {
            signal.throwIfAborted()
            const current = await this.prepare(owner, lessonId, blockId, delivery, {
              signal,
              copyGeneration: generation,
            })
            signal.throwIfAborted()
            if (current.completed) throw new GalleryAlreadyCommitted(current.result)
          },
        },
      })
      // A winner can also commit between the last authorization and the atomic SQL
      // idempotency guard. Return that persisted receipt, never this losing attempt.
      const persisted = await awaitWithSignal(
        () => this.submissions.getOne(owner.userId, blockId),
        signal,
      )
      if (
        persisted &&
        isGallerySubmission(persisted.project) &&
        persisted.project.requestId === delivery.requestId &&
        persisted.project.copyGeneration !== generation
      ) {
        return gallerySubmissionReceipt(persisted)
      }
      return result
    } catch (error) {
      signal.throwIfAborted()
      if (error instanceof GalleryAlreadyCommitted) return error.result
      throw error
    }
  }
}
