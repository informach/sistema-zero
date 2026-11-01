import { randomUUID } from 'node:crypto'
import type {
  CoursePublicationJobView,
  CoursePublicationOperation,
} from '@sistemazero/core/course/publication'
import { ValidationError } from '@sistemazero/core/errors'
import { ContentNotFoundError } from '../../domain/course/course.errors'
import { type Environment, hash, planCourseSync } from '../../domain/course-publication/course-sync'
import { coursePublicationPreview } from '../../domain/course-publication/jobs'
import type { CoursePromotionPeerPort } from '../../domain/course-publication/peer'
import type { CoursePublicationAdminRepository } from '../../domain/ports/course-publication.port'

export class CoursePublicationService {
  constructor(
    private readonly repository: CoursePublicationAdminRepository,
    private readonly environment: Environment,
    private readonly production?: CoursePromotionPeerPort,
  ) {}
  async capabilities() {
    let promoteKids = false
    if (this.environment === 'staging' && this.production) {
      try {
        promoteKids = await this.production.available()
      } catch {
        /* Local copies remain available during a peer outage. */
      }
    }
    return { copyAdult: true, promoteKids }
  }
  async prepare(input: {
    operation: CoursePublicationOperation
    sourceCourseId: string
    targetSlug: string
    actorId: string
    requestKey: string
  }) {
    if (input.operation === 'copy-adult') return this.prepareMirror(input)
    if (this.environment !== 'staging' || !this.production || !(await this.production.available()))
      throw new ValidationError('A promoção para produção ainda não está disponível')
    const source = await this.repository.sourceForPromotion(input.sourceCourseId)
    return this.production.prepare({
      source,
      sourceHash: hash({ environment: 'staging', source }),
      targetSlug: input.targetSlug,
      actorId: input.actorId,
      requestKey: input.requestKey,
    })
  }
  async prepareMirror(input: {
    sourceCourseId: string
    targetSlug: string
    actorId: string
    requestKey: string
  }) {
    const snapshot = await this.repository.snapshotForMirror(
      this.environment,
      input.sourceCourseId,
      input.targetSlug,
    )
    const plan = planCourseSync(snapshot)
    const id = await this.repository.create({
      id: randomUUID(),
      actorId: input.actorId,
      requestKey: input.requestKey,
      operation: 'copy-adult',
      snapshot,
      snapshotHash: hash(snapshot),
      planHash: plan.planHash,
      preview: coursePublicationPreview(snapshot, plan),
    })
    return this.view(id)
  }
  async view(id: string): Promise<CoursePublicationJobView> {
    const view = await this.repository.view(id)
    if (!view && this.production) return this.production.view(id)
    if (!view) throw new ContentNotFoundError('Trabalho de publicação não encontrado')
    return view
  }
  async latest(courseId: string, operation: CoursePublicationOperation = 'copy-adult') {
    if (operation === 'promote-kids' && this.environment === 'staging')
      return this.production ? this.production.latest(courseId) : []
    return (await this.repository.latest(courseId)).filter((view) => view?.operation === operation)
  }
  async command(
    id: string,
    operation: 'approve' | 'resume' | 'cancel',
    version: number,
    planHash: string,
  ) {
    const local = await this.repository.view(id)
    if (!local && this.production) return this.production.command(id, operation, version, planHash)
    if (!local) throw new ContentNotFoundError('Trabalho de publicação não encontrado')
    if (operation === 'cancel') {
      const current = await this.view(id)
      if (current.planHash !== planHash)
        throw new ContentNotFoundError('Prévia da publicação não encontrada')
      await this.repository.cancel(id, version)
    } else await this.repository[operation](id, version, planHash)
    return this.view(id)
  }
}
