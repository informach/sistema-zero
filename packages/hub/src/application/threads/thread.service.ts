import type { Attachment, AttachmentLimits } from '../../domain/attachment/attachment'
import {
  AccessDeniedError,
  AttachmentNotFoundError,
  ChannelNotFoundError,
  CommentNotFoundError,
  ConcurrencyConflictError,
  PostingNotAllowedError,
  ThreadNotFoundError,
  TooManyAttachmentsError,
  UserBannedError,
  UserMutedError,
} from '../../domain/hub-errors'
import type { AttachmentRepository } from '../../domain/ports/attachment-repository.port'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type { ModerationRepository } from '../../domain/ports/moderation-repository.port'
import type { ReactionRepository } from '../../domain/ports/reaction-repository.port'
import type { ThreadRepository } from '../../domain/ports/thread-repository.port'
import { type Channel, effectiveRequiresApproval, type Space } from '../../domain/space/space'
import type { Comment, Thread } from '../../domain/thread/thread'
import type { AccessResolutionService, Actor } from '../access/access-resolution.service'
import type { CursorPos } from '../cursor'
import {
  type CommentView,
  type Page,
  type ThreadView,
  toAttachmentView,
  toCommentPage,
  toCommentView,
  toThreadPage,
  toThreadView,
} from '../mappers/thread-views'
import { threadSlug } from '../slug'

const MAX_TITLE = 300
const MAX_BODY = 50_000

export interface CreateThreadCommand {
  title: string
  body: string
  /** Referência opcional a um jogo do Mural (`play_id`) — o card "Jogar" na conversa do Clube. */
  playId?: string | null
  attachmentIds?: string[]
}

/** Item leve dos tópicos do próprio autor (sino "novas respostas nas suas conversas"). */
export interface MyThreadView {
  id: string
  title: string
  slug: string
  channelId: string
  commentCount: number
  lastActivityAt: string
  /** Referência a um jogo do Mural, se a conversa apontar p/ um `/jogar/<id>`. */
  playId: string | null
}
export interface CreateCommentCommand {
  body: string
  replyToId?: string | null
  attachmentIds?: string[]
}

export class ThreadService {
  constructor(
    private readonly read: CommunityReadRepository,
    private readonly access: AccessResolutionService,
    private readonly threads: ThreadRepository,
    private readonly reactions: ReactionRepository,
    private readonly moderation: ModerationRepository,
    private readonly attachments: AttachmentRepository,
    private readonly attachmentLimits: AttachmentLimits,
    private readonly clock: () => Date,
    private readonly newId: () => string,
  ) {}

  /**
   * Bloqueia escrita de quem está silenciado/banido NESTE canal (staff passa).
   * Considera mute/ban de servidor inteiro E os do próprio canal — os de outro
   * canal não bloqueiam aqui.
   */
  private async assertNotMutedOrBanned(
    actor: Actor,
    spaceId: string,
    channelId: string,
  ): Promise<void> {
    if (actor.privileged) return
    const mb = await this.moderation.findActiveForUser(
      actor.userId,
      spaceId,
      channelId,
      this.clock(),
    )
    if (!mb) return
    throw mb.kind === 'ban' ? new UserBannedError() : new UserMutedError()
  }

  /**
   * Valida os anexos a vincular ANTES de criar o conteúdo: nº ≤ limite e todos
   * `pending_upload` do próprio ator (não confiamos no cliente). Devolve os
   * metadados (para montar a view sem novo round-trip).
   */
  private async validateOwnedPending(actor: Actor, ids: string[]): Promise<Attachment[]> {
    const unique = [...new Set(ids)]
    if (unique.length === 0) return []
    if (unique.length > this.attachmentLimits.maxPerPost) throw new TooManyAttachmentsError()
    const owned = await this.attachments.findOwnedPending(actor.userId, unique)
    if (owned.length !== unique.length) throw new AttachmentNotFoundError()
    return owned
  }

  // ── Tópicos ────────────────────────────────────────────────────────────────
  async createThread(
    actor: Actor,
    channelId: string,
    cmd: CreateThreadCommand,
  ): Promise<ThreadView> {
    const { space, channel } = await this.requireChannelAccess(actor, channelId)
    await this.assertNotMutedOrBanned(actor, space.id, channelId)
    // Canal "somente avisos": só staff abre tópico.
    if (channel.postingPolicy === 'staff_only' && !actor.privileged) {
      throw new PostingNotAllowedError('Apenas a equipe pode publicar neste canal')
    }
    const title = cmd.title.trim()
    const body = cmd.body.trim()
    if (!title || title.length > MAX_TITLE || body.length > MAX_BODY) {
      throw new PostingNotAllowedError('Título ou conteúdo inválido')
    }
    const owned = await this.validateOwnedPending(actor, cmd.attachmentIds ?? [])
    // Referência a um jogo do Mural ("Mostrar meu jogo no Clube"): VALIDA que é um post
    // de vitrine ainda visível — a criança só liga um /jogar público de verdade, nunca
    // um id arbitrário. Fronteira de segurança no hub (a autoria é só filtro de UX no app).
    let playId: string | null = null
    if (cmd.playId) {
      if (!(await this.threads.hasVisibleShowcasePlayId(cmd.playId))) {
        throw new PostingNotAllowedError('Jogo indisponível')
      }
      playId = cmd.playId
    }
    const status =
      !actor.privileged && effectiveRequiresApproval(space, channel) ? 'pending' : 'visible'
    const id = this.newId()
    const now = this.clock()
    // O vínculo dos anexos acontece NA MESMA transação da criação (atomicidade).
    const thread = await this.threads.createThread({
      id,
      channelId,
      authorId: actor.userId,
      // Conta do responsável (snapshot) — chave de coorte p/ a recompensa dada na aprovação.
      authorAccountId: actor.accountId,
      // Snapshot do nome + flag pública do AUTOR (confiáveis, do gateway) — o nome vira
      // link p/ o perfil público quando os pais liberaram (`profilePublic`).
      authorDisplayName: actor.displayName,
      authorPublic: actor.profilePublic,
      title,
      slug: threadSlug(title, id),
      body,
      status,
      playId,
      attachmentIds: owned.map((a) => a.id),
      now,
    })
    return toThreadView(thread, [], owned.map(toAttachmentView))
  }

  async listThreads(
    actor: Actor,
    channelId: string,
    cursor: CursorPos | null,
    limit: number,
    /** Prateleira do desafio mensal (`m:YYYY-MM`) — filtra por `challenge_key`. */
    challengeKey: string | null = null,
  ): Promise<Page<ThreadView>> {
    await this.requireChannelAccess(actor, channelId)
    const { items, hasMore } = await this.threads.listThreads(channelId, {
      viewerId: actor.userId,
      includeAllPending: actor.privileged,
      cursor,
      limit,
      challengeKey,
    })
    const ids = items.map((t) => t.id)
    const [reactions, attachments] = await Promise.all([
      this.reactions.summarize('thread', ids, actor.userId),
      this.attachments.listByThreadIds(ids),
    ])
    return toThreadPage(items, hasMore, reactions, attachments)
  }

  /**
   * Tópicos VISÍVEIS do PRÓPRIO ator (mais recentes) — sino "novas respostas nas suas
   * conversas". Só os próprios (por `authorId`) → nunca vaza autor de terceiro; o app
   * compara `commentCount` com um baseline local p/ acender o pontinho.
   */
  async listMyThreads(actor: Actor, limit = 30): Promise<{ items: MyThreadView[] }> {
    const rows = await this.threads.listByAuthor(actor.userId, limit)
    return {
      items: rows.map((t) => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        channelId: t.channelId,
        commentCount: t.commentCount,
        lastActivityAt: t.lastActivityAt.toISOString(),
        playId: t.playId,
      })),
    }
  }

  async getThread(actor: Actor, threadId: string): Promise<ThreadView> {
    const { thread } = await this.requireThreadView(actor, threadId)
    const [reactions, attachments] = await Promise.all([
      this.reactions.summarize('thread', [thread.id], actor.userId),
      this.attachments.listByThreadIds([thread.id]),
    ])
    return toThreadView(
      thread,
      reactions.get(thread.id) ?? [],
      (attachments.get(thread.id) ?? []).map(toAttachmentView),
    )
  }

  async editThread(
    actor: Actor,
    threadId: string,
    body: string,
    expectedVersion: number,
  ): Promise<ThreadView> {
    const { thread } = await this.requireThreadView(actor, threadId)
    if (thread.authorId !== actor.userId && !actor.privileged) {
      throw new AccessDeniedError('Só o autor pode editar')
    }
    const trimmed = body.trim()
    if (!trimmed || trimmed.length > MAX_BODY) throw new PostingNotAllowedError('Conteúdo inválido')
    const updated: Thread = {
      ...thread,
      version: expectedVersion,
      body: trimmed,
      editedAt: this.clock(),
    }
    // O tópico foi carregado acima; falha aqui = conflito de versão (409), não 404.
    if (!(await this.threads.updateThread(updated))) throw new ConcurrencyConflictError()
    updated.version = expectedVersion + 1
    const attachments = await this.attachments.listByThreadIds([thread.id])
    return toThreadView(updated, [], (attachments.get(thread.id) ?? []).map(toAttachmentView))
  }

  // ── Comentários ──────────────────────────────────────────────────────────
  async createComment(
    actor: Actor,
    threadId: string,
    cmd: CreateCommentCommand,
  ): Promise<CommentView> {
    const { thread, space, channel } = await this.requireThreadView(actor, threadId)
    await this.assertNotMutedOrBanned(actor, space.id, thread.channelId)
    // Só se comenta em tópico VISÍVEL (pendente/oculto não recebe resposta).
    if (thread.status !== 'visible') throw new PostingNotAllowedError('Tópico indisponível')
    if (thread.isLocked && !actor.privileged) {
      throw new PostingNotAllowedError('Tópico trancado para novos comentários')
    }
    const body = cmd.body.trim()
    if (!body || body.length > MAX_BODY) throw new PostingNotAllowedError('Conteúdo inválido')
    const owned = await this.validateOwnedPending(actor, cmd.attachmentIds ?? [])
    const status =
      !actor.privileged && effectiveRequiresApproval(space, channel) ? 'pending' : 'visible'
    // O vínculo dos anexos acontece NA MESMA transação da criação (atomicidade).
    const comment = await this.threads.createComment({
      id: this.newId(),
      threadId,
      authorId: actor.userId,
      authorAccountId: actor.accountId,
      authorDisplayName: actor.displayName,
      authorPublic: actor.profilePublic,
      body,
      status,
      replyToId: cmd.replyToId ?? null,
      attachmentIds: owned.map((a) => a.id),
      now: this.clock(),
    })
    return toCommentView(comment, [], owned.map(toAttachmentView))
  }

  async listComments(
    actor: Actor,
    threadId: string,
    after: CursorPos | null,
    limit: number,
  ): Promise<Page<CommentView>> {
    await this.requireThreadView(actor, threadId)
    const { items, hasMore } = await this.threads.listComments(threadId, {
      viewerId: actor.userId,
      includeAllPending: actor.privileged,
      after,
      limit,
    })
    const ids = items.map((c) => c.id)
    const [reactions, attachments] = await Promise.all([
      this.reactions.summarize('comment', ids, actor.userId),
      this.attachments.listByCommentIds(ids),
    ])
    return toCommentPage(items, hasMore, reactions, attachments)
  }

  async editComment(
    actor: Actor,
    commentId: string,
    body: string,
    expectedVersion: number,
  ): Promise<CommentView> {
    const comment = await this.threads.findCommentById(commentId)
    if (!comment) throw new CommentNotFoundError()
    // Garante acesso ao tópico-pai (e que o tópico existe/é visível ao ator).
    await this.requireThreadView(actor, comment.threadId)
    if (comment.authorId !== actor.userId && !actor.privileged) {
      throw new AccessDeniedError('Só o autor pode editar')
    }
    const trimmed = body.trim()
    if (!trimmed || trimmed.length > MAX_BODY) throw new PostingNotAllowedError('Conteúdo inválido')
    const updated: Comment = {
      ...comment,
      version: expectedVersion,
      body: trimmed,
      editedAt: this.clock(),
    }
    // O comentário foi carregado acima; falha aqui = conflito de versão (409), não 404.
    if (!(await this.threads.updateComment(updated))) throw new ConcurrencyConflictError()
    updated.version = expectedVersion + 1
    const attachments = await this.attachments.listByCommentIds([commentId])
    return toCommentView(updated, [], (attachments.get(commentId) ?? []).map(toAttachmentView))
  }

  // ── Guards ──────────────────────────────────────────────────────────────────
  private async requireChannelAccess(
    actor: Actor,
    channelId: string,
  ): Promise<{ space: Space; channel: Channel }> {
    const channel = await this.read.findActiveChannelById(channelId)
    if (!channel) throw new ChannelNotFoundError()
    const space = await this.read.findActiveSpaceById(channel.spaceId)
    if (!space) throw new ChannelNotFoundError()
    if (!(await this.access.canAccessChannel(actor, space, channel))) throw new AccessDeniedError()
    return { space, channel }
  }

  /** Carrega o tópico e garante que o ator pode VÊ-LO (acesso + visibilidade). */
  private async requireThreadView(
    actor: Actor,
    threadId: string,
  ): Promise<{ thread: Thread; space: Space; channel: Channel }> {
    const thread = await this.threads.findThreadById(threadId)
    if (!thread) throw new ThreadNotFoundError()
    const { space, channel } = await this.requireChannelAccess(actor, thread.channelId)
    const visible =
      thread.status === 'visible' ||
      (thread.status === 'pending' && (thread.authorId === actor.userId || actor.privileged))
    if (!visible) throw new ThreadNotFoundError()
    return { thread, space, channel }
  }
}
