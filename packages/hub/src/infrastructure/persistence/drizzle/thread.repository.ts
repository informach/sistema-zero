import { and, asc, desc, eq, inArray, max, or, type SQL, sql } from 'drizzle-orm'
import { DuplicateSlugError } from '../../../domain/hub-errors'
import type {
  CreateCommentInput,
  CreateThreadInput,
  ListCommentsOpts,
  ListThreadsOpts,
  ThreadRepository,
} from '../../../domain/ports/thread-repository.port'
import type { Comment, Thread } from '../../../domain/thread/thread'
import type { Database } from './db'
import { isUniqueViolation } from './pg-errors'
import { attachments, type CommentRow, comments, type ThreadRow, threads } from './schema'

const toThread = (r: ThreadRow): Thread => ({
  id: r.id,
  version: r.version,
  channelId: r.channelId,
  authorId: r.authorId,
  title: r.title,
  slug: r.slug,
  body: r.body,
  isPinned: r.isPinned,
  isLocked: r.isLocked,
  status: r.status,
  commentCount: r.commentCount,
  lastActivityAt: r.lastActivityAt,
  createdAt: r.createdAt,
  editedAt: r.editedAt,
})

const toComment = (r: CommentRow): Comment => ({
  id: r.id,
  version: r.version,
  threadId: r.threadId,
  authorId: r.authorId,
  body: r.body,
  status: r.status,
  replyToId: r.replyToId,
  createdAt: r.createdAt,
  editedAt: r.editedAt,
})

/** visível OU pendente do próprio viewer (ou TODOS pendentes p/ staff). */
function threadVisibility(opts: { viewerId: string; includeAllPending: boolean }): SQL {
  const pendingArm = opts.includeAllPending
    ? eq(threads.status, 'pending')
    : and(eq(threads.status, 'pending'), eq(threads.authorId, opts.viewerId))
  return or(eq(threads.status, 'visible'), pendingArm) as SQL
}

function commentVisibility(opts: { viewerId: string; includeAllPending: boolean }): SQL {
  const pendingArm = opts.includeAllPending
    ? eq(comments.status, 'pending')
    : and(eq(comments.status, 'pending'), eq(comments.authorId, opts.viewerId))
  return or(eq(comments.status, 'visible'), pendingArm) as SQL
}

export class DrizzleThreadRepository implements ThreadRepository {
  constructor(private readonly db: Database) {}

  async createThread(input: CreateThreadInput): Promise<Thread> {
    try {
      // Cria o tópico E vincula os anexos na MESMA transação — sem janela de
      // crash que deixe um post sem os próprios anexos (eles ficariam órfãos).
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(threads)
          .values({
            id: input.id,
            version: 0,
            channelId: input.channelId,
            authorId: input.authorId,
            title: input.title,
            slug: input.slug,
            body: input.body,
            isPinned: false,
            isLocked: false,
            status: input.status,
            commentCount: 0,
            lastActivityAt: input.now,
            createdAt: input.now,
            editedAt: null,
          })
          .returning()
        const thread = toThread(row as ThreadRow)
        if (input.attachmentIds.length > 0) {
          await tx
            .update(attachments)
            .set({ threadId: thread.id, status: 'ready' })
            .where(
              and(
                inArray(attachments.id, input.attachmentIds),
                eq(attachments.status, 'pending_upload'),
              ),
            )
        }
        return thread
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSlugError()
      throw error
    }
  }

  async findThreadById(id: string): Promise<Thread | null> {
    const [row] = await this.db.select().from(threads).where(eq(threads.id, id)).limit(1)
    return row ? toThread(row) : null
  }

  async listThreads(
    channelId: string,
    opts: ListThreadsOpts,
  ): Promise<{ items: Thread[]; hasMore: boolean }> {
    const vis = threadVisibility(opts)
    // Página 1 (sem cursor): os FIXADOS vêm primeiro (sempre visíveis).
    const pinned =
      opts.cursor === null
        ? await this.db
            .select()
            .from(threads)
            .where(and(eq(threads.channelId, channelId), eq(threads.isPinned, true), vis))
            .orderBy(desc(threads.lastActivityAt), desc(threads.id))
        : []

    const where: SQL[] = [eq(threads.channelId, channelId), eq(threads.isPinned, false), vis as SQL]
    if (opts.cursor) {
      // Row comparison: (last_activity_at, id) < (cursor) → próxima página (desc).
      where.push(
        sql`(${threads.lastActivityAt}, ${threads.id}) < (${opts.cursor.t}, ${opts.cursor.id})`,
      )
    }
    const rows = await this.db
      .select()
      .from(threads)
      .where(and(...where))
      .orderBy(desc(threads.lastActivityAt), desc(threads.id))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    const page = rows.slice(0, opts.limit)
    return { items: [...pinned, ...page].map(toThread), hasMore }
  }

  async latestActivityByChannel(channelIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>()
    if (channelIds.length === 0) return map
    const rows = await this.db
      .select({ channelId: threads.channelId, last: max(threads.lastActivityAt) })
      .from(threads)
      .where(and(inArray(threads.channelId, channelIds), eq(threads.status, 'visible')))
      .groupBy(threads.channelId)
    for (const r of rows) if (r.last) map.set(r.channelId, r.last)
    return map
  }

  async updateThread(thread: Thread): Promise<boolean> {
    // Edição do autor: só corpo + editedAt (moderação tem métodos próprios).
    const rows = await this.db
      .update(threads)
      .set({ body: thread.body, editedAt: thread.editedAt, version: thread.version + 1 })
      .where(and(eq(threads.id, thread.id), eq(threads.version, thread.version)))
      .returning({ id: threads.id })
    return rows.length > 0
  }

  async setThreadStatus(
    id: string,
    status: Thread['status'],
    now: Date,
    bumpActivity = false,
  ): Promise<boolean> {
    const set: Partial<typeof threads.$inferInsert> = { status }
    if (bumpActivity) set.lastActivityAt = now
    const rows = await this.db
      .update(threads)
      .set(set)
      .where(eq(threads.id, id))
      .returning({ id: threads.id })
    return rows.length > 0
  }

  async setThreadPinned(id: string, pinned: boolean): Promise<boolean> {
    const rows = await this.db
      .update(threads)
      .set({ isPinned: pinned })
      .where(eq(threads.id, id))
      .returning({ id: threads.id })
    return rows.length > 0
  }

  async setThreadLocked(id: string, locked: boolean): Promise<boolean> {
    const rows = await this.db
      .update(threads)
      .set({ isLocked: locked })
      .where(eq(threads.id, id))
      .returning({ id: threads.id })
    return rows.length > 0
  }

  async setCommentStatus(id: string, status: Comment['status'], now: Date): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // `FOR UPDATE` serializa aprovações concorrentes do MESMO comentário — sem o
      // lock, dois `approve` simultâneos leriam `pending` e somariam commentCount 2×.
      const [c] = await tx.select().from(comments).where(eq(comments.id, id)).limit(1).for('update')
      if (!c) return false
      await tx.update(comments).set({ status }).where(eq(comments.id, id))
      // Aprovar (→ visible) conta o comentário; ocultar/apagar um visível descontigura.
      if (status === 'visible' && c.status !== 'visible') {
        await tx
          .update(threads)
          .set({ commentCount: sql`${threads.commentCount} + 1`, lastActivityAt: now })
          .where(eq(threads.id, c.threadId))
      } else if (status !== 'visible' && c.status === 'visible') {
        await tx
          .update(threads)
          .set({ commentCount: sql`greatest(${threads.commentCount} - 1, 0)` })
          .where(eq(threads.id, c.threadId))
      }
      return true
    })
  }

  async createComment(input: CreateCommentInput): Promise<Comment> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(comments)
        .values({
          id: input.id,
          version: 0,
          threadId: input.threadId,
          authorId: input.authorId,
          body: input.body,
          status: input.status,
          replyToId: input.replyToId,
          createdAt: input.now,
          editedAt: null,
        })
        .returning()
      const comment = toComment(row as CommentRow)
      // Só comentário VISÍVEL move a atividade/contagem (pendente espera aprovação).
      if (input.status === 'visible') {
        await tx
          .update(threads)
          .set({
            commentCount: sql`${threads.commentCount} + 1`,
            lastActivityAt: input.now,
          })
          .where(eq(threads.id, input.threadId))
      }
      // Vincula os anexos na MESMA transação (atomicidade — ver createThread).
      if (input.attachmentIds.length > 0) {
        await tx
          .update(attachments)
          .set({ commentId: comment.id, status: 'ready' })
          .where(
            and(
              inArray(attachments.id, input.attachmentIds),
              eq(attachments.status, 'pending_upload'),
            ),
          )
      }
      return comment
    })
  }

  async findCommentById(id: string): Promise<Comment | null> {
    const [row] = await this.db.select().from(comments).where(eq(comments.id, id)).limit(1)
    return row ? toComment(row) : null
  }

  async listComments(
    threadId: string,
    opts: ListCommentsOpts,
  ): Promise<{ items: Comment[]; hasMore: boolean }> {
    const where: SQL[] = [eq(comments.threadId, threadId), commentVisibility(opts) as SQL]
    if (opts.after) {
      where.push(sql`(${comments.createdAt}, ${comments.id}) > (${opts.after.t}, ${opts.after.id})`)
    }
    const rows = await this.db
      .select()
      .from(comments)
      .where(and(...where))
      .orderBy(asc(comments.createdAt), asc(comments.id))
      .limit(opts.limit + 1)
    const hasMore = rows.length > opts.limit
    return { items: rows.slice(0, opts.limit).map(toComment), hasMore }
  }

  async updateComment(comment: Comment): Promise<boolean> {
    const rows = await this.db
      .update(comments)
      .set({ body: comment.body, editedAt: comment.editedAt, version: comment.version + 1 })
      .where(and(eq(comments.id, comment.id), eq(comments.version, comment.version)))
      .returning({ id: comments.id })
    return rows.length > 0
  }
}
