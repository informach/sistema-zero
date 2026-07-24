import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, lt, or, type SQL, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type {
  AdminThreadsFilter,
  AppendMessageInput,
  EnsureThreadInput,
  TeacherMessageCursor,
  TeacherMessagePage,
  TeacherMessageRecord,
  TeacherMessageRole,
  TeacherThreadContext,
  TeacherThreadRecord,
  TeacherThreadRepository,
  TeacherThreadSummary,
} from '../../../domain/ports/teacher-thread-repository.port'
import type { Database } from './db'
import { teacherMessages, teacherThreadStaffReads, teacherThreads } from './schema'

/** Prévia da última mensagem na caixa de entrada (corta no servidor). */
const PREVIEW_MAX = 140
const MESSAGE_PAGE_SIZE = 50

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
      // `onConflictDoNothing`: retry idempotente não pode tocar watermarks/ordem.
      const [inserted] = await tx
        .insert(teacherMessages)
        .values(record)
        .onConflictDoNothing()
        .returning({ id: teacherMessages.id })
      if (!inserted) {
        const [existing] = await tx
          .select()
          .from(teacherMessages)
          .where(eq(teacherMessages.id, record.id))
          .limit(1)
        return existing ? this.toMessageRecord(existing) : record
      }
      // Toca `last_message_at` + marca o lado do AUTOR como lido (não fica "não-lido"
      // p/ quem acabou de escrever) — na MESMA transação. `greatest` preserva a ordem
      // quando transações capturam o relógio em instantes diferentes e aguardam lock.
      const set: {
        lastMessageAt: SQL
        studentLastReadAt?: Date
      } = {
        lastMessageAt: sql`greatest(${teacherThreads.lastMessageAt}, ${input.now.toISOString()}::timestamptz)`,
      }
      if (input.authorRole === 'student') set.studentLastReadAt = input.now
      await tx.update(teacherThreads).set(set).where(eq(teacherThreads.id, input.threadId))
      if (input.authorRole === 'teacher' && input.authorId) {
        await tx
          .insert(teacherThreadStaffReads)
          .values({ threadId: input.threadId, staffUserId: input.authorId, readAt: input.now })
          .onConflictDoUpdate({
            target: [teacherThreadStaffReads.threadId, teacherThreadStaffReads.staffUserId],
            set: { readAt: input.now },
          })
      }
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

  async listMessages(threadId: string, before?: TeacherMessageCursor): Promise<TeacherMessagePage> {
    const rows = await this.db
      .select()
      .from(teacherMessages)
      .where(
        and(
          eq(teacherMessages.threadId, threadId),
          before
            ? or(
                lt(teacherMessages.createdAt, before.createdAt),
                and(
                  eq(teacherMessages.createdAt, before.createdAt),
                  lt(teacherMessages.id, before.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(teacherMessages.createdAt), desc(teacherMessages.id))
      .limit(MESSAGE_PAGE_SIZE + 1)
    const hasMore = rows.length > MESSAGE_PAGE_SIZE
    const page = rows.slice(0, MESSAGE_PAGE_SIZE)
    const oldest = page[page.length - 1]
    return {
      messages: page.reverse().map((row) => this.toMessageRecord(row)),
      nextCursor: hasMore && oldest ? { createdAt: oldest.createdAt, id: oldest.id } : null,
    }
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
    const staffReadAt = sql`(select ${teacherThreadStaffReads.readAt} from ${teacherThreadStaffReads} where ${teacherThreadStaffReads.threadId} = ${teacherThreads.id} and ${teacherThreadStaffReads.staffUserId} = ${filter.staffUserId}::uuid)`
    const unreadForStaff = sql`exists(select 1 from ${teacherMessages} m where m.thread_id = ${teacherThreads.id} and m.author_role = 'student' and m.created_at > coalesce(${staffReadAt}, 'epoch'::timestamptz))`
    const where = and(
      filter.audience ? eq(teacherThreads.audience, filter.audience) : undefined,
      filter.contextType ? eq(teacherThreads.contextType, filter.contextType) : undefined,
      filter.courseId ? eq(teacherThreads.courseId, filter.courseId) : undefined,
      // Não-lido do PROFESSOR = há mensagem do ALUNO depois do watermark do professor.
      filter.unreadOnly ? unreadForStaff : undefined,
    )
    return this.selectSummaries(where, 'teacher', filter.limit, filter.offset, filter.staffUserId)
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

  async markReadByStudent(
    threadId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<void> {
    await this.db
      .update(teacherThreads)
      // O UPDATE bloqueia a linha: mensagens que entrarem DEPOIS ficam não-lidas;
      // as que já entraram ficam lidas. Nunca usar o relógio da aplicação aqui.
      .set({ studentLastReadAt: teacherThreads.lastMessageAt })
      .where(
        and(
          eq(teacherThreads.id, threadId),
          eq(teacherThreads.userId, userId),
          eq(teacherThreads.audience, audience),
        ),
      )
  }

  async markReadByTeacher(threadId: string, staffUserId: string): Promise<void> {
    await this.db.execute(sql`
      insert into ${teacherThreadStaffReads} (${teacherThreadStaffReads.threadId}, ${teacherThreadStaffReads.staffUserId}, ${teacherThreadStaffReads.readAt})
      select ${teacherThreads.id}, ${staffUserId}::uuid, ${teacherThreads.lastMessageAt}
      from ${teacherThreads}
      where ${teacherThreads.id} = ${threadId}::uuid
      on conflict (${teacherThreadStaffReads.threadId}, ${teacherThreadStaffReads.staffUserId})
      do update set ${teacherThreadStaffReads.readAt} = excluded.read_at
    `)
  }

  // ── Interno ──────────────────────────────────────────────────────────────────
  // Quatro queries LIMITADAS por página: cabeçalhos + contagem + última mensagem +
  // última recebida. Nunca carregamos todos os corpos para montar a caixa.
  private async selectSummaries(
    where: SQL<unknown> | undefined,
    side: 'student' | 'teacher',
    limit: number,
    offset: number,
    staffUserId?: string,
  ): Promise<TeacherThreadSummary[]> {
    const fromRole: TeacherMessageRole = side === 'student' ? 'teacher' : 'student'
    const watermark =
      side === 'student'
        ? teacherThreads.studentLastReadAt
        : sql`(select ${teacherThreadStaffReads.readAt} from ${teacherThreadStaffReads} where ${teacherThreadStaffReads.threadId} = ${teacherThreads.id} and ${teacherThreadStaffReads.staffUserId} = ${staffUserId}::uuid)`
    const unreadOrder = sql`exists(select 1 from ${teacherMessages} m where m.thread_id = ${teacherThreads.id} and m.author_role = ${fromRole} and m.created_at > coalesce(${watermark}, 'epoch'::timestamptz))`
    const threads = await this.db
      .select()
      .from(teacherThreads)
      .where(where)
      .orderBy(
        ...(side === 'teacher' ? [desc(unreadOrder)] : []),
        desc(teacherThreads.lastMessageAt),
      )
      .limit(limit)
      .offset(offset)
    if (threads.length === 0) return []

    const ids = threads.map((t) => t.id)
    const [counts, latest, latestIncoming, staffReads] = await Promise.all([
      this.db
        .select({ threadId: teacherMessages.threadId, count: sql<number>`count(*)::int` })
        .from(teacherMessages)
        .where(inArray(teacherMessages.threadId, ids))
        .groupBy(teacherMessages.threadId),
      this.db
        .selectDistinctOn([teacherMessages.threadId], {
          threadId: teacherMessages.threadId,
          authorRole: teacherMessages.authorRole,
          body: teacherMessages.body,
          createdAt: teacherMessages.createdAt,
        })
        .from(teacherMessages)
        .where(inArray(teacherMessages.threadId, ids))
        .orderBy(
          teacherMessages.threadId,
          desc(teacherMessages.createdAt),
          desc(teacherMessages.id),
        ),
      this.db
        .selectDistinctOn([teacherMessages.threadId], {
          threadId: teacherMessages.threadId,
          createdAt: teacherMessages.createdAt,
        })
        .from(teacherMessages)
        .where(
          and(inArray(teacherMessages.threadId, ids), eq(teacherMessages.authorRole, fromRole)),
        )
        .orderBy(
          teacherMessages.threadId,
          desc(teacherMessages.createdAt),
          desc(teacherMessages.id),
        ),
      side === 'teacher' && staffUserId
        ? this.db
            .select({
              threadId: teacherThreadStaffReads.threadId,
              readAt: teacherThreadStaffReads.readAt,
            })
            .from(teacherThreadStaffReads)
            .where(
              and(
                inArray(teacherThreadStaffReads.threadId, ids),
                eq(teacherThreadStaffReads.staffUserId, staffUserId),
              ),
            )
        : Promise.resolve([]),
    ])
    const countByThread = new Map(counts.map((row) => [row.threadId, row.count]))
    const latestByThread = new Map(latest.map((row) => [row.threadId, row]))
    const incomingByThread = new Map(latestIncoming.map((row) => [row.threadId, row.createdAt]))
    const staffReadByThread = new Map(staffReads.map((row) => [row.threadId, row.readAt]))
    return threads.map((t) => {
      const last = latestByThread.get(t.id)
      const readAt = side === 'student' ? t.studentLastReadAt : staffReadByThread.get(t.id)
      const lastIncomingAt = incomingByThread.get(t.id)
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
        lastMessageRole: last ? (last.authorRole as TeacherMessageRole) : null,
        messageCount: countByThread.get(t.id) ?? 0,
        unread: !!lastIncomingAt && (!readAt || lastIncomingAt > readAt),
      }
    })
  }

  private toMessageRecord(row: typeof teacherMessages.$inferSelect): TeacherMessageRecord {
    return {
      id: row.id,
      threadId: row.threadId,
      authorRole: row.authorRole as TeacherMessageRole,
      authorId: row.authorId ?? null,
      authorName: row.authorName ?? null,
      body: row.body,
      createdAt: row.createdAt,
    }
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
