import type { MuteBan, MuteBanKind } from '../moderation/mute-ban'

export type ModeratableTarget = 'thread' | 'comment'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'
export type ModerationKind =
  | 'approve'
  | 'reject'
  | 'hide'
  | 'delete'
  | 'pin'
  | 'unpin'
  | 'lock'
  | 'unlock'
  | 'mute'
  | 'ban'
  | 'unmute'
  | 'unban'

/** Item da fila de aprovação (tópico ou comentário pendente), com contexto. */
export interface PendingItem {
  type: ModeratableTarget
  id: string
  spaceId: string
  channelId: string
  threadId: string | null
  authorId: string
  title: string | null
  body: string
  createdAt: Date
}

export interface ReportRecord {
  id: string
  targetType: ModeratableTarget
  targetId: string
  spaceId: string
  reporterId: string
  reason: string
  status: ReportStatus
  resolvedBy: string | null
  resolvedAt: Date | null
  createdAt: Date
}

export interface CreateReportInput {
  targetType: ModeratableTarget
  targetId: string
  spaceId: string
  reporterId: string
  reason: string
  now: Date
}

export interface CreateMuteBanInput {
  userId: string
  spaceId: string
  channelId: string | null
  kind: MuteBanKind
  expiresAt: Date | null
  reason: string | null
  createdBy: string
  now: Date
}

export interface ModerationActionInput {
  kind: ModerationKind
  spaceId: string | null
  channelId: string | null
  targetUserId: string | null
  targetId: string | null
  moderatorId: string
  reason: string | null
  expiresAt: Date | null
  now: Date
}

export interface ModerationRepository {
  // ── Fila de aprovação ──
  listPending(opts: { spaceId?: string; limit: number; offset: number }): Promise<{
    items: PendingItem[]
    total: number
  }>

  // ── Denúncias ──
  createReport(input: CreateReportInput): Promise<void>
  listReports(opts: {
    spaceId?: string
    status?: ReportStatus
    limit: number
    offset: number
  }): Promise<{
    items: ReportRecord[]
    total: number
  }>
  findReportById(id: string): Promise<ReportRecord | null>
  resolveReport(id: string, status: ReportStatus, resolvedBy: string, now: Date): Promise<boolean>

  // ── Silenciar/banir ──
  createMuteBan(input: CreateMuteBanInput): Promise<MuteBan>
  /** Remove (expira agora) os mute/ban ATIVOS do usuário no servidor para o tipo. */
  removeMuteBan(userId: string, spaceId: string, kind: MuteBanKind, now: Date): Promise<boolean>
  /**
   * Mute/ban ATIVO do usuário aplicável ao canal dado — usado no enforcement.
   * Considera os de servidor inteiro (`channelId IS NULL`) E os do próprio canal
   * (`channelId = :channelId`); ignora os de OUTROS canais. Ban tem precedência.
   */
  findActiveForUser(
    userId: string,
    spaceId: string,
    channelId: string,
    now: Date,
  ): Promise<MuteBan | null>
  listMutesBans(spaceId: string): Promise<MuteBan[]>

  // ── Auditoria ──
  logAction(input: ModerationActionInput): Promise<void>
}
