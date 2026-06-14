import type { CursorPos } from '../../application/cursor'
import type { Comment, ContentStatus, Thread } from '../thread/thread'

export interface CreateThreadInput {
  id: string
  channelId: string
  authorId: string
  title: string
  slug: string
  body: string
  status: ContentStatus
  /** Anexos `pending_upload` a vincular NA MESMA transação (atomicidade). */
  attachmentIds: string[]
  now: Date
}

export interface CreateCommentInput {
  id: string
  threadId: string
  authorId: string
  body: string
  status: ContentStatus
  replyToId: string | null
  /** Anexos `pending_upload` a vincular NA MESMA transação (atomicidade). */
  attachmentIds: string[]
  now: Date
}

export interface ListThreadsOpts {
  /** Vê os pendentes DESTE autor além dos visíveis (o autor vê o próprio aguardando). */
  viewerId: string
  /** Vê TODOS os pendentes (staff). */
  includeAllPending: boolean
  cursor: CursorPos | null
  limit: number
}

export interface ListCommentsOpts {
  viewerId: string
  includeAllPending: boolean
  after: CursorPos | null
  limit: number
}

export interface ThreadRepository {
  createThread(input: CreateThreadInput): Promise<Thread>
  findThreadById(id: string): Promise<Thread | null>
  /** Página de tópicos (pinned primeiro, depois lastActivityAt desc). `hasMore` se veio `limit+1`. */
  listThreads(
    channelId: string,
    opts: ListThreadsOpts,
  ): Promise<{ items: Thread[]; hasMore: boolean }>
  /** Maior `lastActivityAt` (tópicos visíveis) por canal — alimenta o badge de novidades. */
  latestActivityByChannel(channelIds: string[]): Promise<Map<string, Date>>
  /** Edição do tópico (concorrência otimista por `version`). `false` se conflito. */
  updateThread(thread: Thread): Promise<boolean>

  // ── Moderação (status/flags) ──
  /** Muda o status do tópico. `bumpActivity` (aprovação) atualiza `lastActivityAt`. */
  setThreadStatus(
    id: string,
    status: ContentStatus,
    now: Date,
    bumpActivity?: boolean,
  ): Promise<boolean>
  /** Fixar/desafixar tópico. */
  setThreadPinned(id: string, pinned: boolean): Promise<boolean>
  /** Trancar/destrancar comentários do tópico. */
  setThreadLocked(id: string, locked: boolean): Promise<boolean>
  /**
   * Muda o status do comentário. Ao APROVAR (→ visible) incrementa commentCount +
   * lastActivityAt do tópico-pai na MESMA transação (espelha o createComment).
   */
  setCommentStatus(id: string, status: ContentStatus, now: Date): Promise<boolean>

  /** Cria o comentário E (mesma transação) incrementa commentCount + lastActivityAt do tópico. */
  createComment(input: CreateCommentInput): Promise<Comment>
  findCommentById(id: string): Promise<Comment | null>
  listComments(
    threadId: string,
    opts: ListCommentsOpts,
  ): Promise<{ items: Comment[]; hasMore: boolean }>
  updateComment(comment: Comment): Promise<boolean>
}
