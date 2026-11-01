import { randomUUID } from 'node:crypto'
import type { CoursePublicationJobView } from '@sistemazero/core/course/publication'
import { ContentNotFoundError } from '../../domain/course/course.errors'
import { hash, planCourseSync } from '../../domain/course-publication/course-sync'
import {
  CoursePublicationConflictError,
  coursePublicationPreview,
} from '../../domain/course-publication/jobs'
import {
  CoursePromotionBindingSchema,
  type CoursePromotionPeerPort,
  type PromotionPreviewInput,
} from '../../domain/course-publication/peer'
import type { CoursePublicationAdminRepository } from '../../domain/ports/course-publication.port'

/** Production owns promotion state and transactions. Staging only forwards authenticated team actions. */
export class CoursePromotionService {
  constructor(private readonly repository: CoursePublicationAdminRepository) {}
  async prepare(input: PromotionPreviewInput) {
    if (hash({ environment: 'staging', source: input.source }) !== input.sourceHash)
      throw new CoursePublicationConflictError(
        'A captura de staging não confere com a impressão recebida',
      )
    const snapshot = await this.repository.snapshotForPromotion(input.source, input.targetSlug)
    const plan = planCourseSync(snapshot)
    const id = await this.repository.create({
      id: randomUUID(),
      requestKey: input.requestKey,
      actorId: input.actorId,
      operation: 'promote-kids',
      snapshot,
      snapshotHash: hash(snapshot),
      planHash: plan.planHash,
      preview: coursePublicationPreview(snapshot, plan),
    })
    return this.view(id)
  }
  async binding(id: string) {
    const row = await this.repository.promotionBinding(id)
    if (
      row?.operation !== 'promote-kids' ||
      row.sourceEnvironment !== 'staging' ||
      row.environment !== 'production' ||
      !row.sourceHash
    )
      throw new ContentNotFoundError('Trabalho de promoção não encontrado')
    return CoursePromotionBindingSchema.parse({
      version: 1,
      jobId: row.id,
      sourceCourseId: row.sourceCourseId,
      sourceHash: row.sourceHash,
      sourceEnvironment: 'staging',
      targetEnvironment: 'production',
      status: row.status,
    })
  }
  async view(id: string): Promise<CoursePublicationJobView> {
    await this.binding(id)
    const view = await this.repository.view(id)
    if (!view) throw new ContentNotFoundError('Trabalho de promoção não encontrado')
    return view
  }
  async latest(sourceCourseId: string) {
    return (await this.repository.latest(sourceCourseId)).filter(
      (view): view is CoursePublicationJobView => view?.operation === 'promote-kids',
    )
  }
  async command(
    id: string,
    command: 'approve' | 'cancel' | 'resume',
    version: number,
    planHash: string,
  ) {
    const current = await this.view(id)
    if (current.planHash !== planHash) throw new CoursePublicationConflictError('A prévia mudou')
    if (command === 'cancel') await this.repository.cancel(id, version)
    else await this.repository[command](id, version, planHash)
    return this.view(id)
  }
}

/** Export teaching content only for a production job which was explicitly approved. */
export class CoursePromotionSourceService {
  constructor(
    private readonly repository: CoursePublicationAdminRepository,
    private readonly production: CoursePromotionPeerPort,
  ) {}
  async read(jobId: string) {
    const binding = await this.production.binding(jobId)
    if (!['queued', 'preparing', 'publishing', 'failed', 'completed'].includes(binding.status))
      throw new CoursePublicationConflictError('A promoção ainda não foi aprovada ou foi cancelada')
    const source = await this.repository.sourceForPromotion(binding.sourceCourseId)
    const sourceHash = hash({ environment: 'staging', source })
    if (sourceHash !== binding.sourceHash)
      throw new CoursePublicationConflictError('O curso de staging mudou. Prepare outra prévia')
    return { version: 1 as const, source, sourceHash }
  }
}
