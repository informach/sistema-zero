import {
  CommentNotFoundError,
  ReportNotFoundError,
  ThreadNotFoundError,
} from '../../domain/hub-errors'
import type { MuteBanKind } from '../../domain/moderation/mute-ban'
import type {
  ModerationActionInput,
  ModerationRepository,
  ReportStatus,
} from '../../domain/ports/moderation-repository.port'
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
  ) {}

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
    if (!(await this.threads.setThreadStatus(id, 'deleted', this.clock()))) {
      throw new ThreadNotFoundError()
    }
    await this.log('delete', moderatorId, id)
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
