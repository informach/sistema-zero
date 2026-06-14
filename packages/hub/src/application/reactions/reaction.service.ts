import {
  AccessDeniedError,
  ChannelNotFoundError,
  EmojiNotAllowedError,
  ThreadNotFoundError,
  UserBannedError,
} from '../../domain/hub-errors'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type { ModerationRepository } from '../../domain/ports/moderation-repository.port'
import type {
  ReactionRepository,
  ReactionTarget,
} from '../../domain/ports/reaction-repository.port'
import type { ThreadRepository } from '../../domain/ports/thread-repository.port'
import { isAllowedEmoji } from '../../domain/reactions/emoji'
import type { Space } from '../../domain/space/space'
import type { AccessResolutionService, Actor } from '../access/access-resolution.service'

/**
 * Reações (emoji) em tópicos e comentários. SEM moderação (reagir é livre, inclusive
 * para crianças — mas a vitrine kids limita os emojis à allowlist). Toggle idempotente.
 */
export class ReactionService {
  constructor(
    private readonly read: CommunityReadRepository,
    private readonly access: AccessResolutionService,
    private readonly threads: ThreadRepository,
    private readonly reactions: ReactionRepository,
    private readonly moderation: ModerationRepository,
    private readonly clock: () => Date,
  ) {}

  async react(
    actor: Actor,
    target: ReactionTarget,
    targetId: string,
    emoji: string,
  ): Promise<{ ok: true }> {
    const { space, channelId } = await this.requireTargetVisible(actor, target, targetId)
    // Banido não participa (silenciado ainda pode reagir). Escopo: este canal.
    if (!actor.privileged) {
      const mb = await this.moderation.findActiveForUser(
        actor.userId,
        space.id,
        channelId,
        this.clock(),
      )
      if (mb?.kind === 'ban') throw new UserBannedError()
    }
    if (!isAllowedEmoji(emoji, space.audience)) throw new EmojiNotAllowedError()
    await this.reactions.add(target, targetId, actor.userId, emoji.trim(), this.clock())
    return { ok: true }
  }

  async unreact(
    actor: Actor,
    target: ReactionTarget,
    targetId: string,
    emoji: string,
  ): Promise<{ ok: true }> {
    await this.requireTargetVisible(actor, target, targetId)
    await this.reactions.remove(target, targetId, actor.userId, emoji.trim())
    return { ok: true }
  }

  /** Resolve o servidor/canal do alvo, garante acesso e que o ator VÊ o alvo. */
  private async requireTargetVisible(
    actor: Actor,
    target: ReactionTarget,
    targetId: string,
  ): Promise<{ space: Space; channelId: string }> {
    if (target === 'thread') {
      const thread = await this.threads.findThreadById(targetId)
      if (!thread) throw new ThreadNotFoundError()
      const space = await this.requireChannelAccess(actor, thread.channelId)
      this.assertContentVisible(actor, thread.status, thread.authorId)
      return { space, channelId: thread.channelId }
    }
    const comment = await this.threads.findCommentById(targetId)
    if (!comment) throw new ThreadNotFoundError()
    const thread = await this.threads.findThreadById(comment.threadId)
    if (!thread) throw new ThreadNotFoundError()
    const space = await this.requireChannelAccess(actor, thread.channelId)
    this.assertContentVisible(actor, comment.status, comment.authorId)
    return { space, channelId: thread.channelId }
  }

  private async requireChannelAccess(actor: Actor, channelId: string): Promise<Space> {
    const channel = await this.read.findActiveChannelById(channelId)
    if (!channel) throw new ChannelNotFoundError()
    const space = await this.read.findActiveSpaceById(channel.spaceId)
    if (!space) throw new ChannelNotFoundError()
    if (!(await this.access.canAccessChannel(actor, space, channel))) throw new AccessDeniedError()
    return space
  }

  private assertContentVisible(actor: Actor, status: string, authorId: string): void {
    const visible =
      status === 'visible' ||
      (status === 'pending' && (authorId === actor.userId || actor.privileged))
    if (!visible) throw new ThreadNotFoundError()
  }
}
