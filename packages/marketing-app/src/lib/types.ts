/**
 * Contratos compartilhados entre o BFF e os componentes do app. Espelham as
 * views do @sistemazero/marketing (`application/mappers/views.ts`) e as claims
 * de sessão do @sistemazero/auth (type-only — seguro p/ Client Components).
 */

import type { PublicationFormat, SocialNetwork } from './networks'
import type { ContentStage, ContentType } from './pipeline'
import type { PublicationStatus } from './publications'

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
  status: PublicationStatus
  attempts: number
  lastError: string | null
  externalPostId: string | null
  externalUrl: string | null
  /** Ordem dos assets do carrossel (só na view de UMA publicação; listagens = []). */
  assetIds: string[]
  /** O vídeo já subiu ao provedor (metadados congelam; reagendar vira resync). */
  hasRemoteVideo: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Item de `GET /marketing/publications` (join com o conteúdo — Calendário/Painel). */
export interface PublicationListItemView extends PublicationView {
  contentTitle: string
  contentType: ContentType
}

// ── Contas sociais (Conexões + toggle auto/lembrete do composer) ──

export const ACCOUNT_STATUSES = ['connected', 'needs_reauth', 'revoked', 'disabled'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export interface SocialAccountView {
  id: string
  version: number
  network: SocialNetwork
  externalId: string
  displayName: string
  username: string | null
  status: AccountStatus
  scopes: string[]
  tokenExpiresAt: string | null
  refreshExpiresAt: string | null
  lastRefreshAt: string | null
  lastRefreshError: string | null
  metadata: { email: string | null; channelId: string | null; channelTitle: string | null }
  connectedBy: string
  /** Conta serve pro publisher automático da rede (conectada + escopos). */
  canAutoPublish: boolean
  createdAt: string
  updatedAt: string
}

/** Resposta de `GET /marketing/accounts` (lista + redes com publisher montado). */
export interface AccountsResponse {
  items: SocialAccountView[]
  autoCapableNetworks: SocialNetwork[]
}

// ── Métricas (dashboard F3 — CONTRATO fixo com o backend) ──

/** Resposta de `GET /marketing/metrics/summary`. */
export interface MetricsSummaryView {
  /** Card por conta CONECTADA com snapshot (followers = último coletado). */
  accounts: Array<{
    accountId: string
    network: SocialNetwork
    displayName: string
    followers: number
    capturedAt: string
  }>
  /** Totais dos últimos 28 dias por rede. */
  networkTotals: Array<{
    network: SocialNetwork
    posts: number
    views: number
    likes: number
    comments: number
  }>
  /** Top 10 por views na janela de 90 dias. */
  topPublications: Array<{
    publicationId: string
    contentId: string
    contentTitle: string
    network: SocialNetwork
    format: PublicationFormat
    publishedAt: string | null
    views: number
    likes: number
    comments: number
    capturedAt: string
  }>
}

/** Resposta de `GET /marketing/metrics/best-times?network=&days=` (heatmap). */
export interface BestTimesView {
  /** Só células COM posts. `dow` 0=domingo..6=sábado; `hour` 0..23 (SP). */
  cells: Array<{ dow: number; hour: number; posts: number; views: number; likes: number }>
  totalPosts: number
}

/** Resposta de `GET /marketing/metrics/followers-series?network=&days=`. */
export interface FollowersSeriesView {
  series: Array<{
    accountId: string
    network: SocialNetwork
    displayName: string
    /** 1 ponto por dia (SP) = último snapshot do dia. */
    points: Array<{ date: string; followers: number }>
  }>
}

/** Resposta de `GET /marketing/publications/:id/metrics` (histórico por publicação). */
export interface PublicationMetricsView {
  snapshots: Array<{ capturedAt: string; views: number; likes: number; comments: number }>
}

// ── Google Drive (importação → biblioteca) ──

export interface DriveFileView {
  id: string
  name: string
  mimeType: string
  sizeBytes: number | null
  modifiedTime: string | null
}

export interface DriveFilesResponse {
  files: DriveFileView[]
  nextPageToken: string | null
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
