import type { MuteBan, MuteBanKind } from '../moderation/mute-ban'
import type { ContentStatus } from '../thread/thread'

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

export interface ModerationExcerpt {
  id: string
  authorId: string
  authorAccountId: string | null
  authorDisplayName: string | null
  title: string | null
  body: string
  createdAt: Date
}

export interface ModerationContext {
  spaceName: string
  spaceAudience: 'adult' | 'kids'
  channelName: string
  /** Tópico pai quando o alvo é um comentário. */
  thread: ModerationExcerpt | null
  /** Comentário ao qual o alvo responde, quando houver. */
  replyTo: ModerationExcerpt | null
}

/** Item da fila de aprovação (tópico ou comentário pendente), com contexto. */
export interface PendingItem {
  type: ModeratableTarget
  id: string
  spaceId: string
  channelId: string
  threadId: string | null
  authorId: string
  authorAccountId: string | null
  authorDisplayName: string | null
  title: string | null
  body: string
  createdAt: Date
  context: ModerationContext
}

export interface ReportedContent extends PendingItem {
  status: ContentStatus
}

export interface ReportRecord {
  id: string
  targetType: ModeratableTarget
  targetId: string
  spaceId: string
  reporterId: string
  reporterAccountId: string | null
  reporterDisplayName: string | null
  reason: string
  status: ReportStatus
  resolvedBy: string | null
  resolvedAt: Date | null
  createdAt: Date
  /** O alvo pode ter sido removido depois da denúncia. */
  content: ReportedContent | null
}

export interface CreateReportInput {
  targetType: ModeratableTarget
  targetId: string
  spaceId: string
  reporterId: string
  reporterAccountId: string | null
  reporterDisplayName: string | null
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
