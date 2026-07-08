import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, type SQL, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type {
  AdminThreadsFilter,
  AppendMessageInput,
  EnsureThreadInput,
  TeacherMessageRecord,
  TeacherMessageRole,
  TeacherThreadContext,
  TeacherThreadRecord,
  TeacherThreadRepository,
  TeacherThreadSummary,
} from '../../../domain/ports/teacher-thread-repository.port'
import type { Database } from './db'
import { teacherMessages, teacherThreads } from './schema'

/** Prévia da última mensagem na caixa de entrada (corta no servidor). */
const PREVIEW_MAX = 140

export class DrizzleTeacherThreadRepository implements TeacherThreadRepository {
  constructor(private readonly db: Database) {}

  async ensureThread(input: EnsureThreadInput): Promise<string> {
    const values = {
      userId: input.userId,
      accountId: input.accountId ?? null,
      audience: input.audience,
      contextType: input.contextType,
      contextRef: input.contextRef ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
      title: input.title ?? null,
      lastMessageAt: input.now,
      createdAt: input.now,
    }

    // Recado GERAL: cada um é sua própria conversa (fora do UNIQUE) → sempre INSERT.
    if (input.contextType === 'general' || values.contextRef === null) {
      const id = randomUUID()
      await this.db.insert(teacherThreads).values({ id, ...values })
      return id
    }
    const contextRef = values.contextRef

    // Entrega/Mural: 1 conversa por (aluno, contexto, ref). Serializa a criação
    // concorrente por advisory lock (padrão do submit do Estúdio) — o índice único
    // parcial é o backstop. Reusa a existente sem sobrescrever os denormalizados.
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`tt:${values.userId}:${values.contextType}:${contextRef}`}, 0))`,
      )
      const existing = await tx
        .select({ id: teacherThreads.id })
        .from(teacherThreads)
        .where(
          and(
            eq(teacherThreads.userId, values.userId),
            eq(teacherThreads.contextType, values.contextType),
            eq(teacherThreads.contextRef, contextRef),
          ),
        )
        .limit(1)
      if (existing[0]) return existing[0].id
      const id = randomUUID()
      await tx.insert(teacherThreads).values({ id, ...values })
      return id
    })
  }

  async appendMessage(input: AppendMessageInput): Promise<TeacherMessageRecord> {
    return this.db.transaction(async (tx) => {
      const record: TeacherMessageRecord = {
        id: input.messageId ?? randomUUID(),
        threadId: input.threadId,
        authorRole: input.authorRole,
        authorId: input.authorId ?? null,
        authorName: input.authorName ?? null,
        body: input.body,
        createdAt: input.now,
      }
      // `onConflictDoNothing`: id determinístico (webhook do Mural) → retry não duplica.
      await tx.insert(teacherMessages).values(record).onConflictDoNothing()
      // Toca `last_message_at` + marca o lado do AUTOR como lido (não fica "não-lido"
      // p/ quem acabou de escrever) — na MESMA transação (ordenação da caixa não desliza).
      const set: {
        lastMessageAt: Date
        teacherLastReadAt?: Date
        studentLastReadAt?: Date
      } = { lastMessageAt: input.now }
      if (input.authorRole === 'teacher') set.teacherLastReadAt = input.now
      else set.studentLastReadAt = input.now
      await tx.update(teacherThreads).set(set).where(eq(teacherThreads.id, input.threadId))
      return record
    })
  }

  async findById(id: string): Promise<TeacherThreadRecord | null> {
    const rows = await this.db
      .select()
      .from(teacherThreads)
      .where(eq(teacherThreads.id, id))
      .limit(1)
    const row = rows[0]
    return row ? this.toRecord(row) : null
  }

  async findByContext(
    userId: string,
    contextType: TeacherThreadContext,
    contextRef: string,
  ): Promise<TeacherThreadRecord | null> {
    const rows = await this.db
      .select()
      .from(teacherThreads)
      .where(
        and(
          eq(teacherThreads.userId, userId),
          eq(teacherThreads.contextType, contextType),
          eq(teacherThreads.contextRef, contextRef),
        ),
      )
      .limit(1)
    const row = rows[0]
    return row ? this.toRecord(row) : null
  }

  async listMessages(threadId: string): Promise<TeacherMessageRecord[]> {
    const rows = await this.db
      .select()
      .from(teacherMessages)
      .where(eq(teacherMessages.threadId, threadId))
      .orderBy(asc(teacherMessages.createdAt))
    return rows.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      authorRole: r.authorRole as TeacherMessageRole,
      authorId: r.authorId ?? null,
      authorName: r.authorName ?? null,
      body: r.body,
      createdAt: r.createdAt,
    }))
  }

  async listForStudent(
    userId: string,
    audience: CourseAudience,
    limit: number,
    offset: number,
  ): Promise<TeacherThreadSummary[]> {
    const where = and(eq(teacherThreads.userId, userId), eq(teacherThreads.audience, audience))
    return this.selectSummaries(where, 'student', limit, offset)
  }

  async listForAdmin(filter: AdminThreadsFilter): Promise<TeacherThreadSummary[]> {
    const where = and(
      filter.audience ? eq(teacherThreads.audience, filter.audience) : undefined,
      filter.contextType ? eq(teacherThreads.contextType, filter.contextType) : undefined,
      filter.courseId ? eq(teacherThreads.courseId, filter.courseId) : undefined,
      // Não-lido do PROFESSOR = há mensagem do ALUNO depois do watermark do professor.
      filter.unreadOnly
        ? sql`exists(select 1 from ${teacherMessages} m where m.thread_id = ${teacherThreads.id} and m.author_role = 'student' and m.created_at > coalesce(${teacherThreads.teacherLastReadAt}, 'epoch'::timestamptz))`
        : undefined,
    )
    return this.selectSummaries(where, 'teacher', filter.limit, filter.offset)
  }

  async countUnreadForStudent(userId: string, audience: CourseAudience): Promise<number> {
    const [row] = await this.db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(teacherThreads)
      .where(
        and(
          eq(teacherThreads.userId, userId),
          eq(teacherThreads.audience, audience),
          sql`exists(select 1 from ${teacherMessages} m where m.thread_id = ${teacherThreads.id} and m.author_role = 'teacher' and m.created_at > coalesce(${teacherThreads.studentLastReadAt}, 'epoch'::timestamptz))`,
        ),
      )
    return row?.value ?? 0
  }

  async markReadByStudent(threadId: string, userId: string, now: Date): Promise<void> {
    await this.db
      .update(teacherThreads)
      .set({ studentLastReadAt: now })
      .where(and(eq(teacherThreads.id, threadId), eq(teacherThreads.userId, userId)))
  }

  async markReadByTeacher(threadId: string, now: Date): Promise<void> {
    await this.db
      .update(teacherThreads)
      .set({ teacherLastReadAt: now })
      .where(eq(teacherThreads.id, threadId))
  }

  // ── Interno ──────────────────────────────────────────────────────────────────
  // Duas queries + merge em JS (o `side` decide o não-lido pelo watermark): mais
  // robusto que subquery-correlata-no-SELECT (que não correlaciona confiavelmente).
  private async selectSummaries(
    where: SQL<unknown> | undefined,
    side: 'student' | 'teacher',
    limit: number,
    offset: number,
  ): Promise<TeacherThreadSummary[]> {
    const threads = await this.db
      .select()
      .from(teacherThreads)
      .where(where)
      .orderBy(desc(teacherThreads.lastMessageAt))
      .limit(limit)
      .offset(offset)
    if (threads.length === 0) return []

    const ids = threads.map((t) => t.id)
    const msgs = await this.db
      .select({
        threadId: teacherMessages.threadId,
        authorRole: teacherMessages.authorRole,
        body: teacherMessages.body,
        createdAt: teacherMessages.createdAt,
      })
      .from(teacherMessages)
      .where(inArray(teacherMessages.threadId, ids))
      .orderBy(asc(teacherMessages.createdAt))
    const byThread = new Map<
      string,
      { authorRole: TeacherMessageRole; body: string; createdAt: Date }[]
    >()
    for (const m of msgs) {
      const arr = byThread.get(m.threadId) ?? []
      arr.push({
        authorRole: m.authorRole as TeacherMessageRole,
        body: m.body,
        createdAt: m.createdAt,
      })
      byThread.set(m.threadId, arr)
    }

    const fromRole: TeacherMessageRole = side === 'student' ? 'teacher' : 'student'
    return threads.map((t) => {
      const list = byThread.get(t.id) ?? []
      const last = list[list.length - 1]
      const watermark = side === 'student' ? t.studentLastReadAt : t.teacherLastReadAt
      const unread = list.some(
        (m) => m.authorRole === fromRole && (!watermark || m.createdAt > watermark),
      )
      return {
        id: t.id,
        userId: t.userId,
        accountId: t.accountId ?? null,
        audience: t.audience as CourseAudience,
        contextType: t.contextType as TeacherThreadContext,
        contextRef: t.contextRef ?? null,
        courseId: t.courseId ?? null,
        lessonId: t.lessonId ?? null,
        title: t.title ?? null,
        lastMessageAt: t.lastMessageAt,
        createdAt: t.createdAt,
        lastMessagePreview: last ? last.body.slice(0, PREVIEW_MAX) : null,
        lastMessageRole: last ? last.authorRole : null,
        messageCount: list.length,
        unread,
      }
    })
  }

  private toRecord(row: typeof teacherThreads.$inferSelect): TeacherThreadRecord {
    return {
      id: row.id,
      userId: row.userId,
      accountId: row.accountId ?? null,
      audience: row.audience as CourseAudience,
      contextType: row.contextType as TeacherThreadContext,
      contextRef: row.contextRef ?? null,
      courseId: row.courseId ?? null,
      lessonId: row.lessonId ?? null,
      title: row.title ?? null,
      lastMessageAt: row.lastMessageAt,
      studentLastReadAt: row.studentLastReadAt ?? null,
      teacherLastReadAt: row.teacherLastReadAt ?? null,
      createdAt: row.createdAt,
    }
  }
}
