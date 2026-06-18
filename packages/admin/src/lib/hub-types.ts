/**
 * Views da COMUNIDADE (fórum — @sistemazero/hub) consumidas pelo painel. Espelham
 * as views admin do hub (`application/mappers/{admin-views,moderation-views}.ts`).
 */

export type HubAudience = 'adult' | 'kids'
export type HubSpaceStatus = 'active' | 'archived'
export type HubVisibility = 'public' | 'course_gated' | 'role_gated'
export type HubPostingPolicy = 'members' | 'staff_only'
export type HubModeratableTarget = 'thread' | 'comment'
export type HubReportStatus = 'open' | 'resolved' | 'dismissed'
export type HubMuteBanKind = 'mute' | 'ban'

export interface HubAccessConfig {
  visibility: HubVisibility
  courses: string[]
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
  title: string | null
  body: string
  createdAt: string
}

export interface HubReportView {
  id: string
  targetType: HubModeratableTarget
  targetId: string
  spaceId: string
  reporterId: string
  reason: string
  status: HubReportStatus
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
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
