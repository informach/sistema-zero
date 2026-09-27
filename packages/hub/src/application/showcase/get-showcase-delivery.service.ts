import type { ShowcaseDeliveryRepository } from '../../domain/ports/showcase-delivery-repository.port'
import type { Actor } from '../access/access-resolution.service'

export class GetShowcaseDeliveryService {
  constructor(private readonly repository: Pick<ShowcaseDeliveryRepository, 'findStatus'>) {}
  async execute(actor: Actor, courseId: string) {
    return { state: await this.repository.findStatus(actor.userId, actor.accountId, courseId) }
  }
}
