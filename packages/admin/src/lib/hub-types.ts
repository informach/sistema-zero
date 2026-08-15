/**
 * Views da COMUNIDADE (fórum — @sistemazero/hub) consumidas pelo painel. Espelham
 * as views admin do hub (`application/mappers/{admin-views,moderation-views}.ts`).
 */

export type HubAudience = 'adult' | 'kids'
export type HubSpaceStatus = 'active' | 'archived'
export type HubVisibility = 'public' | 'course_gated' | 'community_gated' | 'role_gated'
export type HubPostingPolicy = 'members' | 'staff_only'
export type HubModeratableTarget = 'thread' | 'comment'
export type HubReportStatus = 'open' | 'resolved' | 'dismissed'
export type HubMuteBanKind = 'mute' | 'ban'
export type HubContentStatus = 'pending' | 'visible' | 'hidden' | 'deleted' | 'rejected'
export type HubAttachmentKind = 'image' | 'pdf' | 'document' | 'audio' | 'video'

export interface HubAttachmentView {
  id: string
  kind: HubAttachmentKind
  mime: string
  sizeBytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  originalName: string
}

export interface HubResolvedAttachment {
  id: string
  storageRef: string
  mime: string
  kind: HubAttachmentKind
  originalName: string
  sizeBytes: number
}

export interface HubModerationIdentity {
  /** Nome da conta (responsável no kids; autor no adulto). */
  accountName: string | null
  accountEmail: string | null
  /** Nome atual do perfil da criança, quando houver. */
  childName: string | null
}

export interface HubModerationExcerptView {
  id: string
  authorId: string
  authorAccountId: string | null
  authorDisplayName: string | null
  title: string | null
  body: string
  createdAt: string
  attachments: HubAttachmentView[]
  authorIdentity?: HubModerationIdentity
}

export interface HubModerationContextView {
  spaceName: string
  spaceAudience: HubAudience
  channelName: string
  thread: HubModerationExcerptView | null
  replyTo: HubModerationExcerptView | null
}

export interface HubAccessConfig {
  visibility: HubVisibility
  courses: string[]
  /** Chaves de comunidade quando `visibility = 'community_gated'`. */
  communities?: string[]
  roles: string[]
}

export interface HubSpaceView {
  id: string
  version: number
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  audience: HubAudience
  accessConfig: HubAccessConfig
  requiresApproval: boolean
  /** Aparece BLOQUEADO no menu sem acesso (vitrine), em vez de sumir. */
  teaserWhenLocked: boolean
  sortOrder: number
  status: HubSpaceStatus
  createdAt: string
  updatedAt: string
}

export interface HubChannelView {
  id: string
  version: number
  spaceId: string
  slug: string
  name: string
  topic: string | null
  /** `null` = herda o accessConfig do servidor. */
  accessConfig: HubAccessConfig | null
  postingPolicy: HubPostingPolicy
  /** `null` = herda o requiresApproval do servidor. */
  requiresApproval: boolean | null
  sortOrder: number
  status: HubSpaceStatus
  createdAt: string
  updatedAt: string
}

export interface HubSpaceTreeView extends HubSpaceView {
  channels: HubChannelView[]
}

export interface HubPendingItemView {
  type: HubModeratableTarget
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
  attachments: HubAttachmentView[]
  context: HubModerationContextView
  authorIdentity?: HubModerationIdentity
}

export interface HubReportedContentView extends HubPendingItemView {
  status: HubContentStatus
}

export interface HubReportView {
  id: string
  targetType: HubModeratableTarget
  targetId: string
  spaceId: string
  reporterId: string
  reporterAccountId: string | null
  reporterDisplayName: string | null
  reason: string
  status: HubReportStatus
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
  content: HubReportedContentView | null
  reporterIdentity?: HubModerationIdentity
}

export interface HubMuteBanView {
  id: string
  userId: string
  spaceId: string
  channelId: string | null
  kind: HubMuteBanKind
  expiresAt: string | null
  reason: string | null
  createdBy: string
  createdAt: string
}
