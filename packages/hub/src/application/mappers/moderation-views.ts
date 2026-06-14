import type { MuteBan } from '../../domain/moderation/mute-ban'
import type {
  ModeratableTarget,
  PendingItem,
  ReportRecord,
  ReportStatus,
} from '../../domain/ports/moderation-repository.port'

export interface PendingItemView {
  type: ModeratableTarget
  id: string
  spaceId: string
  channelId: string
  threadId: string | null
  authorId: string
  title: string | null
  body: string
  createdAt: string
}

export interface ReportView {
  id: string
  targetType: ModeratableTarget
  targetId: string
  spaceId: string
  reporterId: string
  reason: string
  status: ReportStatus
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

export interface MuteBanView {
  id: string
  userId: string
  spaceId: string
  channelId: string | null
  kind: MuteBan['kind']
  expiresAt: string | null
  reason: string | null
  createdBy: string
  createdAt: string
}

export const toPendingItemView = (p: PendingItem): PendingItemView => ({
  ...p,
  createdAt: p.createdAt.toISOString(),
})

export const toReportView = (r: ReportRecord): ReportView => ({
  id: r.id,
  targetType: r.targetType,
  targetId: r.targetId,
  spaceId: r.spaceId,
  reporterId: r.reporterId,
  reason: r.reason,
  status: r.status,
  resolvedBy: r.resolvedBy,
  resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  createdAt: r.createdAt.toISOString(),
})

export const toMuteBanView = (m: MuteBan): MuteBanView => ({
  id: m.id,
  userId: m.userId,
  spaceId: m.spaceId,
  channelId: m.channelId,
  kind: m.kind,
  expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
  reason: m.reason,
  createdBy: m.createdBy,
  createdAt: m.createdAt.toISOString(),
})
