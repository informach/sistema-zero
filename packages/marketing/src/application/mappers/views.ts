import type {
  ChecklistItem,
  Content,
  ContentComment,
  StageEvent,
} from '../../domain/content/content'
import type { Idea } from '../../domain/idea/idea'
import type { MediaAsset } from '../../domain/media/media-asset'
import type { DriveFile } from '../../domain/ports/drive-client.port'
import type { Publication } from '../../domain/publication/publication-record'
import type { SocialAccount } from '../../domain/social-account/social-account'

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null)

export function toIdeaView(idea: Idea) {
  return {
    id: idea.id,
    title: idea.title,
    notes: idea.notes,
    source: idea.source,
    status: idea.status,
    potential: idea.potential,
    complexity: idea.complexity,
    createdBy: idea.createdBy,
    createdByName: idea.createdByName,
    promotedContentId: idea.promotedContentId,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  }
}
export type IdeaView = ReturnType<typeof toIdeaView>

export interface ContentBadges {
  checklistDone: number
  checklistTotal: number
  commentCount: number
  /** Formatos das publicações ativas (chips das redes-alvo no card do kanban). */
  publicationFormats: string[]
}

export function toContentSummaryView(content: Content, badges: ContentBadges) {
  return {
    id: content.id,
    version: content.version,
    title: content.title,
    contentType: content.contentType,
    stage: content.stage,
    ownerUserId: content.ownerUserId,
    ownerName: content.ownerName,
    dueDate: iso(content.dueDate),
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
    ...badges,
  }
}
export type ContentSummaryView = ReturnType<typeof toContentSummaryView>

export function toChecklistItemView(item: ChecklistItem) {
  return {
    id: item.id,
    label: item.label,
    done: item.done,
    doneBy: item.doneBy,
    doneByName: item.doneByName,
    doneAt: iso(item.doneAt),
    position: item.position,
    origin: item.origin,
  }
}
export type ChecklistItemView = ReturnType<typeof toChecklistItemView>

export function toCommentView(comment: ContentComment) {
  return {
    id: comment.id,
    authorUserId: comment.authorUserId,
    authorName: comment.authorName,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  }
}
export type CommentView = ReturnType<typeof toCommentView>

export function toStageEventView(event: StageEvent) {
  return {
    id: event.id,
    fromStage: event.fromStage,
    toStage: event.toStage,
    actorUserId: event.actorUserId,
    actorName: event.actorName,
    createdAt: event.createdAt.toISOString(),
  }
}
export type StageEventView = ReturnType<typeof toStageEventView>

export function toContentDetailView(input: {
  content: Content
  checklist: ChecklistItem[]
  comments: ContentComment[]
  publications: Publication[]
  stageEvents: StageEvent[]
}) {
  const { content } = input
  return {
    id: content.id,
    version: content.version,
    title: content.title,
    contentType: content.contentType,
    stage: content.stage,
    brief: content.brief,
    script: content.script,
    ownerUserId: content.ownerUserId,
    ownerName: content.ownerName,
    dueDate: iso(content.dueDate),
    ideaId: content.ideaId,
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
    checklist: input.checklist.map(toChecklistItemView),
    comments: input.comments.map(toCommentView),
    publications: input.publications.map(toPublicationView),
    stageEvents: input.stageEvents.map(toStageEventView),
  }
}
export type ContentDetailView = ReturnType<typeof toContentDetailView>

export function toPublicationView(pub: Publication) {
  return {
    id: pub.id,
    version: pub.version,
    contentId: pub.contentId,
    socialAccountId: pub.socialAccountId,
    network: pub.network,
    format: pub.format,
    caption: pub.caption,
    title: pub.title,
    tags: pub.tags,
    coverAssetId: pub.coverAssetId,
    scheduledAt: iso(pub.scheduledAt),
    publishMode: pub.publishMode,
    status: pub.status,
    attempts: pub.attempts,
    lastError: pub.lastError,
    externalPostId: pub.externalPostId,
    externalUrl: pub.externalUrl,
    publishedAt: iso(pub.publishedAt),
    // O vídeo já subiu ao provedor (metadados congelados; reagendar é resync).
    hasRemoteVideo: typeof pub.providerSession.videoId === 'string',
    createdAt: pub.createdAt.toISOString(),
    updatedAt: pub.updatedAt.toISOString(),
  }
}
export type PublicationView = ReturnType<typeof toPublicationView>

/** Publicação + título/tipo do conteúdo (listagem do Calendário/Painel). */
export function toPublicationListItemView(input: {
  publication: Publication
  contentTitle: string
  contentType: string
}) {
  return {
    ...toPublicationView(input.publication),
    contentTitle: input.contentTitle,
    contentType: input.contentType,
  }
}
export type PublicationListItemView = ReturnType<typeof toPublicationListItemView>

/**
 * Conta social SEM material de token: `access_token_enc`/`refresh_token_enc`
 * NUNCA saem daqui (invariante de segurança — teste de integração garante).
 */
export function toSocialAccountView(account: SocialAccount, canAutoPublish: boolean) {
  const metadata = account.metadata as {
    email?: unknown
    channelId?: unknown
    channelTitle?: unknown
  }
  return {
    id: account.id,
    version: account.version,
    network: account.network,
    externalId: account.externalId,
    displayName: account.displayName,
    username: account.username,
    status: account.status,
    scopes: account.scopes,
    tokenExpiresAt: iso(account.tokenExpiresAt),
    refreshExpiresAt: iso(account.refreshExpiresAt),
    lastRefreshAt: iso(account.lastRefreshAt),
    lastRefreshError: account.lastRefreshError,
    metadata: {
      email: typeof metadata.email === 'string' ? metadata.email : null,
      channelId: typeof metadata.channelId === 'string' ? metadata.channelId : null,
      channelTitle: typeof metadata.channelTitle === 'string' ? metadata.channelTitle : null,
    },
    connectedBy: account.connectedBy,
    canAutoPublish,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  }
}
export type SocialAccountView = ReturnType<typeof toSocialAccountView>

export function toDriveFileView(file: DriveFile) {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    modifiedTime: file.modifiedTime,
  }
}
export type DriveFileView = ReturnType<typeof toDriveFileView>

export function toAssetView(asset: MediaAsset) {
  return {
    id: asset.id,
    version: asset.version,
    contentId: asset.contentId,
    kind: asset.kind,
    filename: asset.filename,
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes,
    status: asset.status,
    archivedAt: iso(asset.archivedAt),
    createdBy: asset.createdBy,
    createdAt: asset.createdAt.toISOString(),
  }
}
export type AssetView = ReturnType<typeof toAssetView>
