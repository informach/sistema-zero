import {
  CoursePublicationMediaResultSchema,
  CoursePublicationMediaTaskSchema,
  CourseTransferContextSchema,
  CourseTransferPendingError,
  CourseTransferResultSchema,
  CourseTransferTaskSchema,
} from '@sistemazero/core/course/publication'
import { z } from 'zod'
import { hash, type Snapshot, sourceHash } from '../../domain/course-publication/course-sync'
import type { CoursePromotionSourcePort } from '../../domain/course-publication/peer'
import { promotedCourseSource } from '../../domain/course-publication/promotion'
import { courseTransferProof, courseTransferTasks } from '../../domain/course-publication/transfer'
import type {
  CoursePublicationMediaPort,
  CoursePublicationTransferPort,
  CoursePublicationWorkRepository,
  PublicationClaim,
} from '../../domain/ports/course-publication.port'
import { preparePublicationMedia, publicationMediaProof } from './publication-media'

const progressSchema = z.object({
  phase: z.enum(['transfers', 'media']),
  context: CourseTransferContextSchema,
  taskKeys: z.array(z.string()).max(5000),
  mediaTaskKeys: z.array(z.string()).max(5000).optional(),
})
/** The production worker owns both phases and publishes once, after both environment seals agree. */
export class CoursePromotionProcessor {
  constructor(
    private readonly repo: CoursePublicationWorkRepository,
    private readonly media: CoursePublicationMediaPort,
    private readonly transfer: CoursePublicationTransferPort,
    private readonly source: CoursePromotionSourcePort,
  ) {}
  private async checkSource(claim: PublicationClaim, snapshot: Snapshot, signal: AbortSignal) {
    const current = await this.source.read(claim.id, signal)
    if (
      current.sourceHash !== sourceHash(snapshot) ||
      hash({ environment: 'staging', source: current.source }) !== current.sourceHash
    )
      throw new Error('O curso de staging mudou. Prepare outra prévia')
    return { sourceHash: current.sourceHash, checkedAt: new Date() }
  }
  async run(claim: PublicationClaim, snapshot: Snapshot, signal: AbortSignal) {
    if (
      snapshot.environment !== 'production' ||
      snapshot.sourceEnvironment !== 'staging' ||
      snapshot.operation !== 'promote-kids'
    )
      throw new Error('Captura da promoção fora dos ambientes esperados')
    await this.checkSource(claim, snapshot, signal)
    await this.repo.initializeTasks(claim, [{ id: 'plan', kind: 'media-plan', input: {} }])
    for (;;) {
      signal.throwIfAborted()
      const task = await this.repo.nextTask(claim)
      if (!task) break
      const root = await this.repo.planTask(claim)
      if (task.kind === 'media-plan' && !root.result) {
        const salesPage = snapshot.source.course.metadata?.salesPageUrl
        if (salesPage !== undefined && typeof salesPage !== 'string')
          throw new Error('Página de vendas inválida')
        const context = await this.transfer.context(salesPage, signal)
        const tasks = courseTransferTasks(snapshot.source, context)
        await this.repo.initializeTasks(claim, tasks, {
          taskId: task.id,
          result: {
            phase: 'transfers',
            context,
            taskKeys: tasks.map((task) => task.id),
          },
        })
        continue
      }
      const progress = progressSchema.parse(root.result)
      if (task.kind === 'media-plan') {
        const tasks = await this.repo.completedTasks(claim)
        const proof = courseTransferProof(progress.context, tasks)
        if (progress.phase === 'transfers') {
          const source = promotedCourseSource(snapshot.source, proof)
          const plan = await preparePublicationMedia(this.media, source, signal)
          const newTasks = plan.tasks.map((entry) => ({
            id: entry.id,
            kind: entry.input.kind,
            input: entry.input,
          }))
          if (progress.taskKeys.length + newTasks.length > 5000)
            throw new Error('O curso excede o teto de recursos')
          await this.repo.initializeTasks(claim, newTasks, {
            taskId: root.id,
            result: {
              phase: 'media',
              context: progress.context,
              taskKeys: [...progress.taskKeys, ...newTasks.map((task) => task.id)],
              mediaTaskKeys: newTasks.map((task) => task.id),
              voices: plan.voices,
              profileHash: plan.profileHash,
            },
          })
        } else {
          await this.repo.finishTask(claim, root.id, root.result!)
        }
      } else if (task.kind === 'r2-copy' || task.kind === 'vimeo-copy') {
        try {
          const result = await this.transfer.execute(
            CourseTransferTaskSchema.parse(task.input),
            progress.context,
            signal,
          )
          signal.throwIfAborted()
          await this.repo.finishTask(claim, task.id, CourseTransferResultSchema.parse(result))
        } catch (error) {
          if (!(error instanceof CourseTransferPendingError)) throw error
          await this.repo.deferTask(claim, task.id)
        }
      } else {
        const profileHash = z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .parse(root.result?.profileHash)
        const result = await this.media.execute(
          CoursePublicationMediaTaskSchema.parse(task.input),
          signal,
          profileHash,
        )
        signal.throwIfAborted()
        await this.repo.finishTask(claim, task.id, CoursePublicationMediaResultSchema.parse(result))
      }
    }
    const tasks = await this.repo.completedTasks(claim)
    const root = tasks.find((task) => task.kind === 'media-plan')
    if (
      root?.status === 'pending' &&
      tasks.some((task) => task.kind !== 'media-plan' && task.status === 'pending')
    )
      throw new CourseTransferPendingError('Aguardando os recursos em processamento')
    const progress = progressSchema.parse(root?.result)
    if (!root || progress.phase !== 'media' || !progress.mediaTaskKeys)
      throw new Error('A preparação da promoção está incompleta')
    const copied = tasks.filter((task) => task.kind === 'r2-copy' || task.kind === 'vimeo-copy')
    const promotion = courseTransferProof(progress.context, copied)
    const currentContext = await this.transfer.context(
      typeof snapshot.source.course.metadata?.salesPageUrl === 'string'
        ? snapshot.source.course.metadata.salesPageUrl
        : undefined,
      signal,
    )
    if (hash(currentContext) !== hash(progress.context))
      throw new Error('A configuração da transferência mudou desde a preparação')
    // Recheck objects and videos, including versions, before accepting their saved task results.
    for (const task of copied)
      await this.transfer.verify(
        CourseTransferTaskSchema.parse(task.input),
        CourseTransferResultSchema.parse(task.result),
        progress.context,
        signal,
      )
    const media = publicationMediaProof(
      snapshot,
      [
        { ...root, result: { ...root.result, taskKeys: progress.mediaTaskKeys } },
        ...tasks.filter((task) => progress.mediaTaskKeys!.includes(task.taskKey)),
      ],
      new Date(),
    )
    const currentMediaProfile = await this.media.plan([], signal)
    if (currentMediaProfile.profileHash !== root.result?.profileHash)
      throw new Error('A configuração das mídias mudou antes da publicação')
    const sourceSeal = await this.checkSource(claim, snapshot, signal)
    signal.throwIfAborted()
    await this.repo.publishPromotion(claim, { ...media, promotion }, sourceSeal)
  }
}
