import {
  CommentNotFoundError,
  ReportNotFoundError,
  ThreadNotFoundError,
} from '../../domain/hub-errors'
import type { MuteBanKind } from '../../domain/moderation/mute-ban'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type { MembersGateway } from '../../domain/ports/members-gateway.port'
import type {
  ModerationActionInput,
  ModerationRepository,
  ReportStatus,
} from '../../domain/ports/moderation-repository.port'
import {
  noopStudioArtifactGateway,
  type StudioArtifactGateway,
} from '../../domain/ports/studio-artifact-gateway.port'
import type { ThreadRepository } from '../../domain/ports/thread-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import {
  type MuteBanView,
  type PendingItemView,
  type ReportView,
  toMuteBanView,
  toPendingItemView,
  toReportView,
} from '../mappers/moderation-views'

export interface MuteBanCommand {
  userId: string
  spaceId: string
  channelId?: string | null
  expiresAt?: string | null
  reason?: string | null
}

function parseExpiresAt(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const expiresAt = new Date(raw)
  if (Number.isNaN(expiresAt.getTime())) {
    throw new ValidationError('expiresAt inválido')
  }
  return expiresAt
}

/**
 * Operações de MODERAÇÃO (painel admin). O RBAC é do gateway + `requireAdmin` na
 * rota; aqui recebemos o `moderatorId` (ator) p/ a auditoria. Cada ação registra
 * um `moderation_action` (best-effort — auditoria não derruba a ação).
 */
export class ModerationService {
  constructor(
    private readonly threads: ThreadRepository,
    private readonly mod: ModerationRepository,
    private readonly clock: () => Date,
    /**
     * Limpeza de R2 ao APAGAR um post de vitrine (best-effort). Default no-op p/
     * dev/local/testes; o composition-root injeta o adapter HTTP quando há
     * `KIDS_BFF_BASE_URL`.
     */
    private readonly studioBff: StudioArtifactGateway = noopStudioArtifactGateway,
    /**
     * Leitura de canal/servidor + members — p/ RECOMPENSAR a criança quando o staff
     * APROVA o conteúdo do Clube (audiência kids). Opcionais: ausentes (testes que não
     * exercitam a recompensa) → o disparo é no-op. O composition-root injeta os dois.
     */
    private readonly community?: CommunityReadRepository,
    private readonly members?: MembersGateway,
  ) {}

  /** Audiência do servidor dono do canal (`kids`/`adult`) ou `null` se não achou. */
  private async audienceForChannel(channelId: string): Promise<'adult' | 'kids' | null> {
    if (!this.community) return null
    const channel = await this.community.findActiveChannelById(channelId)
    if (!channel) return null
    const space = await this.community.findActiveSpaceById(channel.spaceId)
    return space?.audience ?? null
  }

  /**
   * Recompensa a criança por um TÓPICO/COMENTÁRIO aprovado no Clube kids (XP + badge de
   * comunidade). Só na APROVAÇÃO (rejeitado não rende). Best-effort, fire-and-forget: um
   * erro aqui NUNCA derruba a moderação. Idempotente no members (ledger por `contentId`).
   */
  private async rewardOnApprove(kind: 'thread' | 'comment', contentId: string): Promise<void> {
    if (!this.community || !this.members) return
    try {
      const author =
        kind === 'thread'
          ? await this.threads.findThreadById(contentId)
          : await this.resolveCommentAuthor(contentId)
      // TÓPICO de vitrine não recompensa aqui (a publicação já rende `course_showcased`).
      if (!author?.authorAccountId) return
      if (kind === 'thread' && author.isShowcase) return
      if ((await this.audienceForChannel(author.channelId)) !== 'kids') return
      // COMENTÁRIO num post de vitrine = comentar no MURAL → marco `mural_comment`
      // (missão universal). Comentário no fórum do Clube (ou tópico) → `clube_*` (gated).
      if (kind === 'comment' && author.isShowcase) {
        void this.members.notifyMuralComment({
          userId: author.authorId,
          accountId: author.authorAccountId,
          audience: 'kids',
          commentId: contentId,
        })
        return
      }
      void this.members.notifyClubContribution({
        userId: author.authorId,
        accountId: author.authorAccountId,
        audience: 'kids',
        kind,
        contentId,
      })
    } catch {
      // best-effort: a decisão de moderação já foi aplicada; a recompensa é eventual.
    }
  }

  /** Autor + canal + se é MURAL de um comentário (via o tópico-pai) — p/ a recompensa. */
  private async resolveCommentAuthor(commentId: string): Promise<{
    authorId: string
    authorAccountId: string | null
    channelId: string
    isShowcase: boolean
  } | null> {
    const comment = await this.threads.findCommentById(commentId)
    if (!comment) return null
    const thread = await this.threads.findThreadById(comment.threadId)
    if (!thread) return null
    return {
      authorId: comment.authorId,
      authorAccountId: comment.authorAccountId,
      channelId: thread.channelId,
      // O comentário HERDA a natureza do tópico-pai: vitrine (Mural) → mural_comment;
      // fórum (Clube) → clube_comment. Antes era `false` fixo (tudo virava clube).
      isShowcase: thread.isShowcase,
    }
  }

  // ── Fila de aprovação ──────────────────────────────────────────────────────
  async listPending(opts: {
    spaceId?: string
    limit: number
    offset: number
  }): Promise<{ items: PendingItemView[]; total: number; limit: number; offset: number }> {
    const { items, total } = await this.mod.listPending(opts)
    return { items: items.map(toPendingItemView), total, limit: opts.limit, offset: opts.offset }
  }

  async approveThread(moderatorId: string, id: string): Promise<{ ok: true }> {
    if (!(await this.threads.setThreadStatus(id, 'visible', this.clock(), true))) {
      throw new ThreadNotFoundError()
    }
    await this.log('approve', moderatorId, id)
    await this.rewardOnApprove('thread', id)
    return { ok: true }
  }

  async rejectThread(moderatorId: string, id: string): Promise<{ ok: true }> {
    if (!(await this.threads.setThreadStatus(id, 'rejected', this.clock()))) {
      throw new ThreadNotFoundError()
    }
    await this.log('reject', moderatorId, id)
    return { ok: true }
  }

  async approveComment(moderatorId: string, id: string): Promise<{ ok: true }> {
    if (!(await this.threads.setCommentStatus(id, 'visible', this.clock()))) {
      throw new CommentNotFoundError()
    }
    await this.log('approve', moderatorId, id)
    await this.rewardOnApprove('comment', id)
    return { ok: true }
  }

  async rejectComment(moderatorId: string, id: string): Promise<{ ok: true }> {
    if (!(await this.threads.setCommentStatus(id, 'rejected', this.clock()))) {
      throw new CommentNotFoundError()
    }
    await this.log('reject', moderatorId, id)
    return { ok: true }
  }

  // ── Ocultar / apagar ───────────────────────────────────────────────────────
  async hideThread(moderatorId: string, id: string): Promise<{ ok: true }> {
    if (!(await this.threads.setThreadStatus(id, 'hidden', this.clock()))) {
      throw new ThreadNotFoundError()
    }
    await this.log('hide', moderatorId, id)
    return { ok: true }
  }

  async deleteThread(moderatorId: string, id: string): Promise<{ ok: true }> {
    // Captura os campos de vitrine ANTES de apagar (o delete é soft/status, a linha
    // permanece; mas ler antes deixa o fluxo explícito — hide, reversível, NÃO limpa).
    const thread = await this.threads.findThreadById(id)
    if (!(await this.threads.setThreadStatus(id, 'deleted', this.clock()))) {
      throw new ThreadNotFoundError()
    }
    await this.log('delete', moderatorId, id)
    // Post de vitrine apagado (terminal) → some com os artefatos R2 do jogo (snapshot
    // jogável no R2 privado + a capa no R2 público, que seguiria buscável pela URL).
    // FIRE-AND-FORGET best-effort: o gateway NUNCA lança e a moderação já foi aplicada.
    if (thread?.isShowcase && thread.playId) {
      void this.studioBff.cleanupShowcaseArtifacts({
        playId: thread.playId,
        coverUrl: thread.coverImageUrl,
      })
    }
    return { ok: true }
  }

  async hideComment(moderatorId: string, id: string): Promise<{ ok: true }> {
    if (!(await this.threads.setCommentStatus(id, 'hidden', this.clock()))) {
      throw new CommentNotFoundError()
    }
    await this.log('hide', moderatorId, id)
    return { ok: true }
  }

  async deleteComment(moderatorId: string, id: string): Promise<{ ok: true }> {
    if (!(await this.threads.setCommentStatus(id, 'deleted', this.clock()))) {
      throw new CommentNotFoundError()
    }
    await this.log('delete', moderatorId, id)
    return { ok: true }
  }

  // ── Fixar / trancar ────────────────────────────────────────────────────────
  async setPinned(moderatorId: string, id: string, pinned: boolean): Promise<{ ok: true }> {
    if (!(await this.threads.setThreadPinned(id, pinned))) throw new ThreadNotFoundError()
    await this.log(pinned ? 'pin' : 'unpin', moderatorId, id)
    return { ok: true }
  }

  async setLocked(moderatorId: string, id: string, locked: boolean): Promise<{ ok: true }> {
    if (!(await this.threads.setThreadLocked(id, locked))) throw new ThreadNotFoundError()
    await this.log(locked ? 'lock' : 'unlock', moderatorId, id)
    return { ok: true }
  }

  // ── Denúncias ──────────────────────────────────────────────────────────────
  async listReports(opts: {
    spaceId?: string
    status?: ReportStatus
    limit: number
    offset: number
  }): Promise<{ items: ReportView[]; total: number; limit: number; offset: number }> {
    const { items, total } = await this.mod.listReports(opts)
    return { items: items.map(toReportView), total, limit: opts.limit, offset: opts.offset }
  }

  async resolveReport(
    moderatorId: string,
    id: string,
    action: 'resolve' | 'dismiss',
  ): Promise<{ ok: true }> {
    const status: ReportStatus = action === 'resolve' ? 'resolved' : 'dismissed'
    if (!(await this.mod.resolveReport(id, status, moderatorId, this.clock()))) {
      throw new ReportNotFoundError()
    }
    return { ok: true }
  }

  // ── Silenciar / banir ──────────────────────────────────────────────────────
  async createMuteBan(
    moderatorId: string,
    kind: MuteBanKind,
    cmd: MuteBanCommand,
  ): Promise<MuteBanView> {
    const expiresAt = parseExpiresAt(cmd.expiresAt)
    const mb = await this.mod.createMuteBan({
      userId: cmd.userId,
      spaceId: cmd.spaceId,
      channelId: cmd.channelId ?? null,
      kind,
      expiresAt,
      reason: cmd.reason ?? null,
      createdBy: moderatorId,
      now: this.clock(),
    })
    await this.logActionBestEffort({
      kind,
      spaceId: cmd.spaceId,
      channelId: cmd.channelId ?? null,
      targetUserId: cmd.userId,
      targetId: null,
      moderatorId,
      reason: cmd.reason ?? null,
      expiresAt,
      now: this.clock(),
    })
    return toMuteBanView(mb)
  }

  async removeMuteBan(
    moderatorId: string,
    kind: MuteBanKind,
    userId: string,
    spaceId: string,
  ): Promise<{ ok: true }> {
    await this.mod.removeMuteBan(userId, spaceId, kind, this.clock())
    await this.logActionBestEffort({
      kind: kind === 'mute' ? 'unmute' : 'unban',
      spaceId,
      channelId: null,
      targetUserId: userId,
      targetId: null,
      moderatorId,
      reason: null,
      expiresAt: null,
      now: this.clock(),
    })
    return { ok: true }
  }

  async listMutesBans(spaceId: string): Promise<{ items: MuteBanView[] }> {
    const rows = await this.mod.listMutesBans(spaceId)
    return { items: rows.map(toMuteBanView) }
  }

  private async log(
    kind: 'approve' | 'reject' | 'hide' | 'delete' | 'pin' | 'unpin' | 'lock' | 'unlock',
    moderatorId: string,
    targetId: string,
  ): Promise<void> {
    await this.logActionBestEffort({
      kind,
      spaceId: null,
      channelId: null,
      targetUserId: null,
      targetId,
      moderatorId,
      reason: null,
      expiresAt: null,
      now: this.clock(),
    })
  }

  private async logActionBestEffort(input: ModerationActionInput): Promise<void> {
    try {
      await this.mod.logAction(input)
    } catch {
      // A decisão de moderação já foi aplicada. Auditoria é best-effort neste
      // serviço; não transforme sucesso operacional em 500 para o operador.
    }
  }
}
