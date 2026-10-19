import type { StudioArtifactGateway } from '../../domain/ports/studio-artifact-gateway.port'
import type { StudioCleanupRepository } from '../../domain/ports/studio-cleanup-repository.port'

export class DeliverStudioCleanupsService {
  constructor(
    private readonly deliveries: StudioCleanupRepository,
    private readonly artifacts: StudioArtifactGateway,
    private readonly clock: () => Date,
  ) {}

  async execute(audience?: 'kids' | 'adult'): Promise<boolean> {
    const delivery = await this.deliveries.claim(this.clock(), audience)
    if (!delivery) return false
    if (await this.artifacts.cleanupShowcaseArtifacts(delivery.payload))
      await this.deliveries.acknowledge(delivery.threadId, this.clock())
    return true
  }

  async drain(audience?: 'kids' | 'adult'): Promise<{ attempted: number }> {
    let attempted = 0
    while (attempted < 4 && (await this.execute(audience))) attempted++
    return { attempted }
  }
}
