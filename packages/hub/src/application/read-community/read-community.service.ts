import {
  AccessDeniedError,
  AccessUnavailableError,
  SpaceNotFoundError,
} from '../../domain/hub-errors'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type { ReadStateRepository } from '../../domain/ports/read-state-repository.port'
import type { ThreadRepository } from '../../domain/ports/thread-repository.port'
import type { Audience } from '../../domain/space/space'
import type { AccessResolutionService, Actor } from '../access/access-resolution.service'
import {
  type ChannelPublicView,
  type SpacePublicView,
  toChannelPublicView,
  toSpacePublicView,
} from '../mappers/views'

/**
 * Leitura da estrutura da comunidade pelo aluno, já FILTRADA por acesso. Servidor
 * que o aluno não enxerga: na listagem some; no acesso direto → 404 (não revela a
 * existência) exceto quando existe mas falta acesso → 403.
 */
export class ReadCommunityService {
  constructor(
    private readonly read: CommunityReadRepository,
    private readonly access: AccessResolutionService,
    private readonly readState: ReadStateRepository,
    private readonly threads: ThreadRepository,
  ) {}

  async listSpaces(actor: Actor, audience: Audience): Promise<{ items: SpacePublicView[] }> {
    const spaces = await this.read.listActiveSpaces(audience)
    const annotated = await this.access.resolveSpaceVisibility(actor, spaces)
    // Inacessível só aparece (como "bloqueado") quando o space opta por teaser; os
    // demais somem (comportamento clássico — zero regressão na vitrine adulta).
    const items = annotated
      .filter((a) => a.accessible || a.space.teaserWhenLocked)
      .map((a) => toSpacePublicView(a.space, !a.accessible))
    return { items }
  }

  async getSpace(actor: Actor, slug: string): Promise<SpacePublicView> {
    const space = await this.read.findActiveSpaceBySlug(slug)
    if (!space) throw new SpaceNotFoundError()
    const decision = await this.access.decideSpaceAccess(actor, space)
    if (!decision.accessible) {
      if (decision.unavailable && space.teaserWhenLocked) throw new AccessUnavailableError()
      // Sem acesso: teaser → devolve só os metadados com `locked:true`; senão 403.
      if (space.teaserWhenLocked) return toSpacePublicView(space, true)
      throw new AccessDeniedError()
    }
    return toSpacePublicView(space, false)
  }

  async listChannels(actor: Actor, slug: string): Promise<{ items: ChannelPublicView[] }> {
    const space = await this.read.findActiveSpaceBySlug(slug)
    if (!space) throw new SpaceNotFoundError()
    const decision = await this.access.decideSpaceAccess(actor, space)
    if (!decision.accessible) {
      if (decision.unavailable && space.teaserWhenLocked) throw new AccessUnavailableError()
      throw new AccessDeniedError()
    }
    const channels = await this.read.listActiveChannels(space.id)
    const visible = await this.access.filterVisibleChannels(actor, space, channels)
    const ids = visible.map((c) => c.id)
    // Badge de novidade: atividade do canal (maior lastActivityAt visível) vs última visita.
    const [seen, activity] = await Promise.all([
      this.readState.lastSeen(actor.userId, ids),
      this.threads.latestActivityByChannel(ids),
    ])
    return {
      items: visible.map((c) => {
        const act = activity.get(c.id)
        const last = seen.get(c.id)
        const hasUnread = act !== undefined && (last === undefined || act > last)
        return toChannelPublicView(space, c, hasUnread)
      }),
    }
  }
}
