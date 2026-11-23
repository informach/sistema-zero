import { randomUUID } from 'node:crypto'
import type { PintaCausalEntry, PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import { resolveCreationPartKey } from '@sistemazero/core/creations/studio-sealed-storage'
import { DomainError, ValidationError } from '@sistemazero/core/errors'
import { awaitWithSignal } from '@sistemazero/core/http'
import {
  GALLERY_DRAWING_KINDS,
  GalleryCopyGenerationSchema,
  type GalleryDeliveryInput,
  type GalleryDeliveryPlan,
  type GallerySelection,
  type GallerySubmission,
  type GallerySubmissionItem,
  isGalleryBlock,
  isGallerySubmission,
} from '@sistemazero/core/learning'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { CourseAudience } from '../../domain/course/course'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { hasComingSoonBlock } from '../../domain/course/lesson-block'
import type { CreationPartRef } from '../../domain/creations/creation'
import { StudioStorageProtocolError } from '../../domain/creations/creation.errors'
import { PintaCausalError } from '../../domain/creations/pinta-causal-graph'
import { gallerySubmissionReceipt } from '../../domain/learning/gallery-receipt'
import {
  GalleryCausalDrawingsUnsupportedError,
  GalleryPintaDrawingChangedError,
  GalleryPintaDrawingUncertifiedError,
  GallerySourceUnavailableError,
} from '../../domain/learning/gallery-source.errors'
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

/**
 * A cabeça confirmada de um desenho no inventário causal do Pinta, pela MESMA leitura das rotas
 * causais (`DrizzlePintaGraphRepository.galleryItem`): escopo conta + perfil + público.
 */
export interface PintaCausalGalleryHeads {
  galleryItem(
    viewer: PintaCausalViewer,
    item: { itemId: string; revision: number },
  ): Promise<{ entry: PintaCausalEntry; storageRef: string }>
}

/** A leitura causal da galeria: a mesma das rotas causais, para todo perfil (23/11/2026, sem flag). */
export interface PintaCausalGallery {
  heads: PintaCausalGalleryHeads
}

/** O que a entrega copia de um trabalho escolhido, venha da leitura antiga ou da causal. */
interface GallerySource {
  itemId: string
  revision: number
  name: string
  kind: string
  storageRef: string
  parts: CreationPartRef[]
  causalSha256?: string
}

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
    private readonly pintaCausal?: PintaCausalGallery,
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
      // A seleção inclui o hash causal que a criança viu: repetir o mesmo pedido é a mesma entrega.
      const selection = ({ itemId, revision, causalSha256 }: GallerySelection) => ({
        itemId,
        revision,
        ...(causalSha256 === undefined ? {} : { causalSha256 }),
      })
      if (
        stableJson(previous.project.items.map(selection)) !== stableJson(input.items.map(selection))
      )
        throw new LearningConflictError()
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
      const { causalSha256 } = selection
      const source = await owned(() =>
        causalSha256 === undefined
          ? this.readSelection(actor, tool, selection, course.audience)
          : this.readCausalHead(actor, tool, selection, causalSha256, course.audience),
      )
      const prefix = `creations/${actor.userId}/lesson-submissions/${blockId}/${input.requestId}/${generation}/${source.itemId}-${source.revision}`
      const item: GallerySubmissionItem = {
        itemId: source.itemId,
        revision: source.revision,
        name: source.name,
        kind: source.kind,
        storageKey: `${prefix}/project.gz`,
        parts: source.parts.map((part) => ({
          hash: part.hash,
          storageKey: `${prefix}/parts/${part.hash}.gz`,
        })),
        ...(source.causalSha256 ? { causalSha256: source.causalSha256 } : {}),
      }
      copies.push({ source: source.storageRef, destination: item.storageKey })
      for (const part of source.parts)
        copies.push({
          source: resolveCreationPartKey(
            { userId: actor.userId, tool, itemId: source.itemId, audience: course.audience },
            part,
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

  /**
   * A leitura antiga, a mesma de sempre nos perfis antigos. Num perfil causal o repositório cerca
   * os desenhos pessoais (`protocol-required`): a lista que a criança viu veio da leitura antiga
   * e o perfil virou causal depois. Com a leitura causal disponível, ela escolhe de novo (a lista
   * nova traz os hashes); sem ela, nada pode ser enviado.
   */
  private async readSelection(
    actor: LearningActor,
    tool: 'studio' | 'pinta',
    selection: GallerySelection,
    audience: CourseAudience,
  ): Promise<GallerySource> {
    let creation: Awaited<ReturnType<CreationsRepository['get']>>
    try {
      creation = await this.creations.get(actor.userId, tool, selection.itemId, audience)
    } catch (error) {
      if (
        tool === 'pinta' &&
        error instanceof PintaCausalError &&
        error.reason === 'protocol-required'
      )
        throw this.causalHeads(actor, audience)
          ? new GalleryPintaDrawingChangedError()
          : new GalleryCausalDrawingsUnsupportedError()
      throw error
    }
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
    if (creation.studioSealReceipt) throw new StudioStorageProtocolError()
    return {
      itemId: creation.itemId,
      revision: creation.revision,
      name: creation.name,
      kind: creation.kind,
      storageRef: creation.storageRef,
      parts: creation.parts,
    }
  }

  /**
   * Perfil com o Pinta causal (23/11/2026): a cabeça CONFIRMADA no inventário causal do dono (a
   * mesma leitura das rotas causais, escopo conta + perfil), conferida pela revisão e pelo hash que
   * o seletor mostrou. O selo é imutável e o hash cobre o arquivo inteiro: a cópia leva só ele.
   */
  private async readCausalHead(
    actor: LearningActor,
    tool: 'studio' | 'pinta',
    selection: GallerySelection,
    causalSha256: string,
    audience: CourseAudience,
  ): Promise<GallerySource> {
    if (tool !== 'pinta')
      throw new ValidationError('Só os desenhos do Pinta são conferidos por este caminho.')
    const heads = this.causalHeads(actor, audience)
    if (!heads) throw new GalleryCausalDrawingsUnsupportedError()
    let head: Awaited<ReturnType<PintaCausalGalleryHeads['galleryItem']>>
    try {
      head = await heads.galleryItem(
        { userId: actor.userId, accountId: actor.accountId, audience },
        { itemId: selection.itemId, revision: selection.revision },
      )
    } catch (error) {
      // Outra revisão, apagado ou um id que não é deste perfil: a mesma recusa, sem revelar qual.
      if (
        error instanceof PintaCausalError &&
        (error.reason === 'stale-base' || error.reason === 'not-found')
      )
        throw new GalleryPintaDrawingChangedError()
      throw error
    }
    const { entry, storageRef } = head
    if (entry.itemId !== selection.itemId || entry.revision !== selection.revision)
      throw new GalleryPintaDrawingChangedError()
    if (entry.coverage !== 'certified' || !entry.sha256)
      throw new GalleryPintaDrawingUncertifiedError()
    if (entry.sha256 !== causalSha256) throw new GalleryPintaDrawingChangedError()
    if (!GALLERY_DRAWING_KINDS.includes(entry.kind))
      throw new ValidationError('Selecione desenhos, personagens, cenários ou peças do Pinta.')
    return {
      itemId: entry.itemId,
      revision: entry.revision,
      name: entry.name,
      kind: entry.kind,
      storageRef,
      parts: [],
      causalSha256: entry.sha256,
    }
  }

  /** A leitura causal da galeria segue a mesma cerca das rotas causais (conta + perfil dono; adulto = a conta). */
  private causalHeads(actor: LearningActor, audience: CourseAudience) {
    const causal = this.pintaCausal
    if (!causal || (audience === 'adult' && actor.userId !== actor.accountId)) return null
    return causal.heads
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
