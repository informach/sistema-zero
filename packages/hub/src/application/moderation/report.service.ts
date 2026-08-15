import {
  AccessDeniedError,
  ChannelNotFoundError,
  ThreadNotFoundError,
} from '../../domain/hub-errors'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type {
  ModeratableTarget,
  ModerationRepository,
} from '../../domain/ports/moderation-repository.port'
import type { ThreadRepository } from '../../domain/ports/thread-repository.port'
import type { AccessResolutionService, Actor } from '../access/access-resolution.service'

/** Denúncia de conteúdo pelo aluno (alimenta a fila de denúncias do admin). */
export class ReportService {
  constructor(
    private readonly read: CommunityReadRepository,
    private readonly access: AccessResolutionService,
    private readonly threads: ThreadRepository,
    private readonly mod: ModerationRepository,
    private readonly clock: () => Date,
  ) {}

  async report(
    actor: Actor,
    target: ModeratableTarget,
    targetId: string,
    reason: string,
  ): Promise<{ ok: true }> {
    const spaceId = await this.resolveSpaceWithAccess(actor, target, targetId)
    await this.mod.createReport({
      targetType: target,
      targetId,
      spaceId,
      reporterId: actor.userId,
      reporterAccountId: actor.accountId,
      reporterDisplayName: actor.displayName,
      reason,
      now: this.clock(),
    })
    return { ok: true }
  }

  /** Resolve o servidor do alvo, garantindo acesso ao canal e visibilidade do alvo. */
  private async resolveSpaceWithAccess(
    actor: Actor,
    target: ModeratableTarget,
    targetId: string,
  ): Promise<string> {
    const channelId =
      target === 'thread'
        ? (await this.requireThread(targetId)).channelId
        : await this.channelOfComment(targetId)
    const channel = await this.read.findActiveChannelById(channelId)
    if (!channel) throw new ChannelNotFoundError()
    const space = await this.read.findActiveSpaceById(channel.spaceId)
    if (!space) throw new ChannelNotFoundError()
    if (!(await this.access.canAccessChannel(actor, space, channel))) throw new AccessDeniedError()
    return space.id
  }

  private async requireThread(id: string) {
    const thread = await this.threads.findThreadById(id)
    if (!thread) throw new ThreadNotFoundError()
    return thread
  }

  private async channelOfComment(commentId: string): Promise<string> {
    const comment = await this.threads.findCommentById(commentId)
    if (!comment) throw new ThreadNotFoundError()
    const thread = await this.requireThread(comment.threadId)
    return thread.channelId
  }
}
