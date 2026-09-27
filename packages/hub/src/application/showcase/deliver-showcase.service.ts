import type { MembersGateway } from '../../domain/ports/members-gateway.port'
import type { ShowcaseDeliveryRepository } from '../../domain/ports/showcase-delivery-repository.port'

export class DeliverShowcaseService {
  constructor(
    private readonly deliveries: ShowcaseDeliveryRepository,
    private readonly members: Pick<MembersGateway, 'notifyShowcasePublished'>,
    private readonly clock: () => Date,
  ) {}

  async execute(): Promise<boolean> {
    const delivery = await this.deliveries.claim(this.clock())
    if (!delivery) return false
    const delivered = await this.members.notifyShowcasePublished(
      delivery.payload,
      `showcase:${delivery.threadId}`,
    )
    if (delivered) await this.deliveries.acknowledge(delivery.threadId, this.clock())
    return true
  }
}
