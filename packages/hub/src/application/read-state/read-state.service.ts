import { AccessDeniedError, ChannelNotFoundError } from '../../domain/hub-errors'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type { ReadStateRepository } from '../../domain/ports/read-state-repository.port'
import type { AccessResolutionService, Actor } from '../access/access-resolution.service'

/** Marca canais como vistos (alimenta o badge de novidade na próxima carga). */
export class ReadStateService {
  constructor(
    private readonly read: CommunityReadRepository,
    private readonly access: AccessResolutionService,
    private readonly readState: ReadStateRepository,
    private readonly clock: () => Date,
  ) {}

  async markSeen(actor: Actor, channelId: string): Promise<{ ok: true }> {
    const channel = await this.read.findActiveChannelById(channelId)
    if (!channel) throw new ChannelNotFoundError()
    const space = await this.read.findActiveSpaceById(channel.spaceId)
    if (!space) throw new ChannelNotFoundError()
    if (!(await this.access.canAccessChannel(actor, space, channel))) throw new AccessDeniedError()
    await this.readState.markSeen(actor.userId, channelId, this.clock())
    return { ok: true }
  }
}
