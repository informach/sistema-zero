import { and, eq, inArray } from 'drizzle-orm'
import type { Attachment } from '../../../domain/attachment/attachment'
import type {
  AttachmentRepository,
  CreateAttachmentInput,
} from '../../../domain/ports/attachment-repository.port'
import type { Database } from './db'
import { type AttachmentRow, attachments } from './schema'

function toDomain(r: AttachmentRow): Attachment {
  return {
    id: r.id,
    ownerId: r.ownerId,
    threadId: r.threadId,
    commentId: r.commentId,
    kind: r.kind,
    storageRef: r.storageRef,
    mime: r.mime,
    sizeBytes: Number(r.sizeBytes),
    width: r.width,
    height: r.height,
    durationSeconds: r.durationSeconds,
    originalName: r.originalName,
    status: r.status,
    createdAt: r.createdAt,
  }
}

export class DrizzleAttachmentRepository implements AttachmentRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateAttachmentInput): Promise<Attachment> {
    const [row] = await this.db
      .insert(attachments)
      .values({
        id: input.id,
        ownerId: input.ownerId,
        threadId: null,
        commentId: null,
        kind: input.kind,
        storageRef: input.storageRef,
        mime: input.mime,
        sizeBytes: input.sizeBytes,
        originalName: input.originalName,
        status: 'pending_upload',
        createdAt: input.now,
      })
      .returning()
    if (!row) throw new Error('Falha ao registrar anexo')
    return toDomain(row)
  }

  async findById(id: string): Promise<Attachment | null> {
    const [row] = await this.db.select().from(attachments).where(eq(attachments.id, id)).limit(1)
    return row ? toDomain(row) : null
  }

  async findOwnedPending(ownerId: string, ids: string[]): Promise<Attachment[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.ownerId, ownerId),
          eq(attachments.status, 'pending_upload'),
          inArray(attachments.id, ids),
        ),
      )
    return rows.map(toDomain)
  }

  async listByThreadIds(threadIds: string[]): Promise<Map<string, Attachment[]>> {
    const result = new Map<string, Attachment[]>()
    if (threadIds.length === 0) return result
    const rows = await this.db
      .select()
      .from(attachments)
      .where(and(inArray(attachments.threadId, threadIds), eq(attachments.status, 'ready')))
      .orderBy(attachments.createdAt)
    for (const r of rows) {
      if (!r.threadId) continue
      const list = result.get(r.threadId) ?? []
      list.push(toDomain(r))
      result.set(r.threadId, list)
    }
    return result
  }

  async listByCommentIds(commentIds: string[]): Promise<Map<string, Attachment[]>> {
    const result = new Map<string, Attachment[]>()
    if (commentIds.length === 0) return result
    const rows = await this.db
      .select()
      .from(attachments)
      .where(and(inArray(attachments.commentId, commentIds), eq(attachments.status, 'ready')))
      .orderBy(attachments.createdAt)
    for (const r of rows) {
      if (!r.commentId) continue
      const list = result.get(r.commentId) ?? []
      list.push(toDomain(r))
      result.set(r.commentId, list)
    }
    return result
  }
}
