/**
 * Contratos compartilhados entre o BFF e os componentes do app. Espelham as
 * views do @sistemazero/marketing (`application/mappers/views.ts`) e as claims
 * de sessão do @sistemazero/auth (type-only — seguro p/ Client Components).
 */

import type { PublicationFormat, SocialNetwork } from './networks'
import type { ContentStage, ContentType } from './pipeline'

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
}

/** Papéis com acesso à ferramenta de marketing (equipe interna). */
export const TEAM_ROLES = ['superadmin', 'admin', 'staff'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

export function isTeamRole(role: string): role is TeamRole {
  return (TEAM_ROLES as readonly string[]).includes(role)
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

/** Página das listagens do marketing (`GET /marketing/{ideas,contents,media}`). */
export interface MarketingPage<T> {
  items: T[]
  total: number
  /** Há mais itens além desta página (offset + items < total). */
  hasMore: boolean
}

/** Membro da equipe p/ selects de responsável (`GET /api/team`). */
export interface TeamMember {
  id: string
  name: string
  role: string
}

// ── Ideias (banco de ideias → promove p/ o pipeline) ──

export const IDEA_STATUSES = ['inbox', 'accepted', 'discarded'] as const
export type IdeaStatus = (typeof IDEA_STATUSES)[number]

export interface IdeaView {
  id: string
  title: string
  notes: string | null
  source: string | null
  status: IdeaStatus
  /** Potencial 1..3 (estrelas do banco de ideias). */
  potential: number | null
  complexity: string | null
  createdBy: string | null
  createdByName: string | null
  /** Preenchido quando a ideia foi promovida a conteúdo. */
  promotedContentId: string | null
  createdAt: string
  updatedAt: string
}

// ── Conteúdos (cartões do pipeline) ──

export interface ContentSummaryView {
  id: string
  version: number
  title: string
  contentType: ContentType
  stage: ContentStage
  ownerUserId: string | null
  ownerName: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  checklistDone: number
  checklistTotal: number
  commentCount: number
  /** Formatos das publicações ativas (chips das redes-alvo no card do kanban). */
  publicationFormats: string[]
}

/** Contagens por etapa (`GET /marketing/contents/stage-counts` — painel). */
export interface StageCountsView {
  counts: Record<ContentStage, number>
}

export interface ChecklistItemView {
  id: string
  label: string
  done: boolean
  doneBy: string | null
  doneByName: string | null
  doneAt: string | null
  position: number
  origin: string
}

export interface CommentView {
  id: string
  authorUserId: string | null
  authorName: string | null
  body: string
  createdAt: string
}

export interface StageEventView {
  id: string
  fromStage: ContentStage | null
  toStage: ContentStage
  actorUserId: string | null
  actorName: string | null
  createdAt: string
}

export interface ContentDetailView {
  id: string
  version: number
  title: string
  contentType: ContentType
  stage: ContentStage
  brief: string | null
  script: string | null
  ownerUserId: string | null
  ownerName: string | null
  dueDate: string | null
  ideaId: string | null
  createdAt: string
  updatedAt: string
  checklist: ChecklistItemView[]
  comments: CommentView[]
  publications: PublicationView[]
  stageEvents: StageEventView[]
}

// ── Publicações (cross-post por rede/formato) ──

export const PUBLISH_MODES = ['auto', 'manual'] as const
export type PublishMode = (typeof PUBLISH_MODES)[number]

export interface PublicationView {
  id: string
  version: number
  contentId: string
  socialAccountId: string | null
  network: SocialNetwork
  format: PublicationFormat
  caption: string
  title: string | null
  tags: string[]
  coverAssetId: string | null
  scheduledAt: string | null
  publishMode: PublishMode
  status: string
  attempts: number
  lastError: string | null
  externalPostId: string | null
  externalUrl: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Mídia (biblioteca de assets no R2) ──

export const ASSET_KINDS = ['raw', 'final', 'cover', 'other'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

export interface AssetView {
  id: string
  version: number
  contentId: string | null
  kind: AssetKind
  filename: string
  contentType: string
  sizeBytes: number
  status: string
  archivedAt: string | null
  createdBy: string | null
  createdAt: string
}
