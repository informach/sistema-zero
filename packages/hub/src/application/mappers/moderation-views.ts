import type { Attachment } from '../../domain/attachment/attachment'
import type { MuteBan } from '../../domain/moderation/mute-ban'
import type {
  ModeratableTarget,
  ModerationContext,
  ModerationExcerpt,
  PendingItem,
  ReportRecord,
  ReportStatus,
} from '../../domain/ports/moderation-repository.port'
import { type AttachmentView, toAttachmentView } from './thread-views'

type AttachmentMap = Map<string, Attachment[]>

export interface ModerationExcerptView {
  id: string
  authorId: string
  authorAccountId: string | null
  authorDisplayName: string | null
  title: string | null
  body: string
  createdAt: string
  attachments: AttachmentView[]
}

export interface ModerationContextView {
  spaceName: string
  spaceAudience: 'adult' | 'kids'
  channelName: string
  thread: ModerationExcerptView | null
  replyTo: ModerationExcerptView | null
}

export interface PendingItemView {
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
  createdAt: string
  attachments: AttachmentView[]
  context: ModerationContextView
}

export interface ReportedContentView extends PendingItemView {
  status: string
}

export interface ReportView {
  id: string
  targetType: ModeratableTarget
  targetId: string
  spaceId: string
  spaceAudience: 'adult' | 'kids'
  reporterId: string
  reporterAccountId: string | null
  reporterDisplayName: string | null
  reason: string
  status: ReportStatus
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
  content: ReportedContentView | null
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

function attachmentsFor(map: AttachmentMap | undefined, id: string): AttachmentView[] {
  return (map?.get(id) ?? []).map(toAttachmentView)
}

/** Contexto é só orientação: normaliza espaços e limita o payload a 240 caracteres. */
function contextExcerpt(body: string): string {
  const compact = body.trim().replace(/\s+/g, ' ')
  return compact.length > 240 ? `${compact.slice(0, 240)}…` : compact
}

function toExcerptView(
  excerpt: ModerationExcerpt | null,
  kind: 'thread' | 'comment',
  threadAttachments?: AttachmentMap,
  commentAttachments?: AttachmentMap,
): ModerationExcerptView | null {
  if (!excerpt) return null
  return {
    ...excerpt,
    body: contextExcerpt(excerpt.body),
    createdAt: excerpt.createdAt.toISOString(),
    attachments: attachmentsFor(
      kind === 'thread' ? threadAttachments : commentAttachments,
      excerpt.id,
    ),
  }
}

function toContextView(
  context: ModerationContext,
  threadAttachments?: AttachmentMap,
  commentAttachments?: AttachmentMap,
): ModerationContextView {
  return {
    spaceName: context.spaceName,
    spaceAudience: context.spaceAudience,
    channelName: context.channelName,
    thread: toExcerptView(context.thread, 'thread', threadAttachments, commentAttachments),
    replyTo: toExcerptView(context.replyTo, 'comment', threadAttachments, commentAttachments),
  }
}

export const toPendingItemView = (
  p: PendingItem,
  threadAttachments?: AttachmentMap,
  commentAttachments?: AttachmentMap,
): PendingItemView => ({
  ...p,
  createdAt: p.createdAt.toISOString(),
  attachments: attachmentsFor(p.type === 'thread' ? threadAttachments : commentAttachments, p.id),
  context: toContextView(p.context, threadAttachments, commentAttachments),
})

export const toReportView = (
  r: ReportRecord,
  threadAttachments?: AttachmentMap,
  commentAttachments?: AttachmentMap,
): ReportView => ({
  id: r.id,
  targetType: r.targetType,
  targetId: r.targetId,
  spaceId: r.spaceId,
  spaceAudience: r.spaceAudience,
  reporterId: r.reporterId,
  reporterAccountId: r.reporterAccountId,
  reporterDisplayName: r.reporterDisplayName,
  reason: r.reason,
  status: r.status,
  resolvedBy: r.resolvedBy,
  resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  createdAt: r.createdAt.toISOString(),
  content: r.content
    ? {
        ...toPendingItemView(r.content, threadAttachments, commentAttachments),
        status: r.content.status,
      }
    : null,
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
