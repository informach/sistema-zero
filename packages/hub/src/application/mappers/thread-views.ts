import type { Attachment } from '../../domain/attachment/attachment'
import type { ReactionSummaryItem } from '../../domain/ports/reaction-repository.port'
import type { Comment, ContentStatus, Thread } from '../../domain/thread/thread'
import { encodeCursor } from '../cursor'

type ReactionMap = Map<string, ReactionSummaryItem[]>
const reactionsFor = (map: ReactionMap | undefined, id: string): ReactionSummaryItem[] =>
  map?.get(id) ?? []

/** Anexo na view (SEM storageRef — o download é pela rota BFF `/api/hub/attachments/:id`). */
export interface AttachmentView {
  id: string
  kind: Attachment['kind']
  mime: string
  sizeBytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  originalName: string
}

export function toAttachmentView(a: Attachment): AttachmentView {
  return {
    id: a.id,
    kind: a.kind,
    mime: a.mime,
    sizeBytes: a.sizeBytes,
    width: a.width,
    height: a.height,
    durationSeconds: a.durationSeconds,
    originalName: a.originalName,
  }
}

type AttachmentMap = Map<string, Attachment[]>
const attachmentsFor = (map: AttachmentMap | undefined, id: string): AttachmentView[] =>
  (map?.get(id) ?? []).map(toAttachmentView)

export interface ThreadView {
  id: string
  channelId: string
  authorId: string
  title: string
  slug: string
  body: string
  isPinned: boolean
  isLocked: boolean
  status: ContentStatus
  /** Conveniência p/ a UI: aguardando aprovação (só o autor/staff enxerga). */
  pending: boolean
  commentCount: number
  /** Post de projeto da vitrine (Mural) — a UI renderiza como card com capa/autor. */
  isShowcase: boolean
  /** Primeiro nome do autor (snapshot) — exibido/clicável; o BFF decide o link pela flag. */
  authorDisplayName: string | null
  /** Perfil do autor é público (opt-in dos pais) — o BFF expõe o link só quando true. */
  authorPublic: boolean
  /** Capa do projeto (URL pública) — só na vitrine. */
  coverImageUrl: string | null
  /** Id público do artefato jogável (UUID) — só na vitrine do Estúdio; o BFF deriva o link /jogar. */
  playId: string | null
  reactions: ReactionSummaryItem[]
  attachments: AttachmentView[]
  lastActivityAt: string
  createdAt: string
  editedAt: string | null
}

export interface CommentView {
  id: string
  threadId: string
  authorId: string
  /** Primeiro nome do autor (snapshot) — exibido/clicável; o BFF decide o link pela flag. */
  authorDisplayName: string | null
  /** Perfil do autor é público (opt-in dos pais) — o BFF expõe o link só quando true. */
  authorPublic: boolean
  body: string
  status: ContentStatus
  pending: boolean
  reactions: ReactionSummaryItem[]
  attachments: AttachmentView[]
  replyToId: string | null
  createdAt: string
  editedAt: string | null
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export function toThreadView(
  t: Thread,
  reactions: ReactionSummaryItem[] = [],
  attachments: AttachmentView[] = [],
): ThreadView {
  return {
    id: t.id,
    channelId: t.channelId,
    authorId: t.authorId,
    title: t.title,
    slug: t.slug,
    body: t.body,
    isPinned: t.isPinned,
    isLocked: t.isLocked,
    status: t.status,
    pending: t.status === 'pending',
    commentCount: t.commentCount,
    isShowcase: t.isShowcase,
    authorDisplayName: t.authorDisplayName,
    authorPublic: t.authorPublic,
    coverImageUrl: t.coverImageUrl,
    playId: t.playId,
    reactions,
    attachments,
    lastActivityAt: t.lastActivityAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    editedAt: t.editedAt ? t.editedAt.toISOString() : null,
  }
}

export function toCommentView(
  c: Comment,
  reactions: ReactionSummaryItem[] = [],
  attachments: AttachmentView[] = [],
): CommentView {
  return {
    id: c.id,
    threadId: c.threadId,
    authorId: c.authorId,
    authorDisplayName: c.authorDisplayName,
    authorPublic: c.authorPublic,
    body: c.body,
    status: c.status,
    pending: c.status === 'pending',
    reactions,
    attachments,
    replyToId: c.replyToId,
    createdAt: c.createdAt.toISOString(),
    editedAt: c.editedAt ? c.editedAt.toISOString() : null,
  }
}

export function toThreadPage(
  items: Thread[],
  hasMore: boolean,
  reactions?: ReactionMap,
  attachments?: AttachmentMap,
): Page<ThreadView> {
  const last = items[items.length - 1]
  return {
    items: items.map((t) =>
      toThreadView(t, reactionsFor(reactions, t.id), attachmentsFor(attachments, t.id)),
    ),
    nextCursor: hasMore && last ? encodeCursor({ t: last.lastActivityAt, id: last.id }) : null,
    hasMore,
  }
}

export function toCommentPage(
  items: Comment[],
  hasMore: boolean,
  reactions?: ReactionMap,
  attachments?: AttachmentMap,
): Page<CommentView> {
  const last = items[items.length - 1]
  return {
    items: items.map((c) =>
      toCommentView(c, reactionsFor(reactions, c.id), attachmentsFor(attachments, c.id)),
    ),
    nextCursor: hasMore && last ? encodeCursor({ t: last.createdAt, id: last.id }) : null,
    hasMore,
  }
}
