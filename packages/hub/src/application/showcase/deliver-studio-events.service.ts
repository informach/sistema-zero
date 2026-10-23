import type { MembersGateway } from '../../domain/ports/members-gateway.port'
import type { StudioEventRepository } from '../../domain/ports/studio-event-repository.port'

export class DeliverStudioEventsService {
  constructor(
    private readonly repository: StudioEventRepository,
    private readonly members: Pick<
      MembersGateway,
      'notifyStandaloneShowcase' | 'notifyChallengeEntry'
    >,
    private readonly clock: () => Date,
  ) {}
  async execute(): Promise<boolean> {
    const job = await this.repository.claim(this.clock())
    if (!job) return false
    const ok =
      job.event.kind === 'standalone'
        ? await this.members.notifyStandaloneShowcase(job.event.payload, job.eventId)
        : await this.members.notifyChallengeEntry(job.event.payload, job.eventId)
    if (ok) await this.repository.acknowledge(job.eventId, this.clock())
    return true
  }
}
