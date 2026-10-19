import type {
  StudioReservationCleanupGateway,
  StudioReservationCleanupRepository,
} from '../../domain/ports/studio-reservation-cleanup.port'

export class DeliverStudioReservationCleanupsService {
  constructor(
    private readonly repository: StudioReservationCleanupRepository,
    private readonly gateway: StudioReservationCleanupGateway,
    private readonly clock: () => Date,
  ) {}
  async execute(audience?: 'kids' | 'adult'): Promise<boolean> {
    const payload = await this.repository.claim(this.clock(), audience)
    if (!payload) return false
    if (await this.gateway.cleanupReservation(payload))
      await this.repository.acknowledge(payload.reservationId, this.clock())
    return true
  }
  async drain(audience?: 'kids' | 'adult'): Promise<{ attempted: number }> {
    let attempted = 0
    while (attempted < 4 && (await this.execute(audience))) attempted++
    return { attempted }
  }
}
