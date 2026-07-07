import type {
  ChecklistItem,
  Content,
  ContentComment,
  StageEvent,
} from '../../domain/content/content'
import type { Idea } from '../../domain/idea/idea'
import type { MediaAsset } from '../../domain/media/media-asset'
import type { Publication } from '../../domain/publication/publication-record'

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
    createdAt: pub.createdAt.toISOString(),
    updatedAt: pub.updatedAt.toISOString(),
  }
}
export type PublicationView = ReturnType<typeof toPublicationView>

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
