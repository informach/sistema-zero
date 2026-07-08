import type { CourseAudience } from '../../domain/course/course'
import { ContentNotFoundError } from '../../domain/course/course.errors'
import type {
  AdminThreadsFilter,
  TeacherMessageRecord,
  TeacherMessageRole,
  TeacherThreadContext,
  TeacherThreadRecord,
  TeacherThreadRepository,
  TeacherThreadSummary,
} from '../../domain/ports/teacher-thread-repository.port'
import { ValidationError } from '../../domain/shared/errors'

const MAX_BODY = 1000

// ── Views (Date→ISO; o front sanitiza o texto na renderização) ──────────────
export interface TeacherMessageView {
  id: string
  authorRole: TeacherMessageRole
  authorId: string | null
  /** Nome de EXIBIÇÃO no envio (professor); null no aluno (a UI mostra "Você"). */
  authorName: string | null
  body: string
  createdAt: string
}

export interface TeacherThreadView {
  id: string
  userId: string
  accountId: string | null
  audience: CourseAudience
  contextType: TeacherThreadContext
  contextRef: string | null
  courseId: string | null
  lessonId: string | null
  title: string | null
  lastMessageAt: string
  createdAt: string
  messages: TeacherMessageView[]
}

export interface TeacherThreadSummaryView {
  id: string
  userId: string
  accountId: string | null
  audience: CourseAudience
  contextType: TeacherThreadContext
  contextRef: string | null
  courseId: string | null
  lessonId: string | null
  title: string | null
  lastMessageAt: string
  createdAt: string
  lastMessagePreview: string | null
  lastMessageRole: TeacherMessageRole | null
  messageCount: number
  /** Relativo ao lado que pediu a lista (aluno: prof não lido; admin: aluno não lido). */
  unread: boolean
}

function toMessageView(m: TeacherMessageRecord): TeacherMessageView {
  return {
    id: m.id,
    authorRole: m.authorRole,
    authorId: m.authorId,
    authorName: m.authorName,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }
}

function toThreadView(
  thread: TeacherThreadRecord,
  messages: TeacherMessageRecord[],
): TeacherThreadView {
  return {
    id: thread.id,
    userId: thread.userId,
    accountId: thread.accountId,
    audience: thread.audience,
    contextType: thread.contextType,
    contextRef: thread.contextRef,
    courseId: thread.courseId,
    lessonId: thread.lessonId,
    title: thread.title,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    createdAt: thread.createdAt.toISOString(),
    messages: messages.map(toMessageView),
  }
}

function toSummaryView(s: TeacherThreadSummary): TeacherThreadSummaryView {
  return {
    id: s.id,
    userId: s.userId,
    accountId: s.accountId,
    audience: s.audience,
    contextType: s.contextType,
    contextRef: s.contextRef,
    courseId: s.courseId,
    lessonId: s.lessonId,
    title: s.title,
    lastMessageAt: s.lastMessageAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    lastMessagePreview: s.lastMessagePreview,
    lastMessageRole: s.lastMessageRole,
    messageCount: s.messageCount,
    unread: s.unread,
  }
}

/** Trim + valida o corpo (vazio → 400; teto espelha a coluna). */
function cleanBody(raw: string): string {
  const body = raw.trim()
  if (body.length === 0) throw new ValidationError('A mensagem não pode ser vazia')
  if (body.length > MAX_BODY) throw new ValidationError(`A mensagem excede ${MAX_BODY} caracteres`)
  return body
}

/** Dados para o professor/sistema postar POR CONTEXTO (cria a conversa se preciso). */
export interface TeacherPostByContextInput {
  userId: string
  accountId: string | null
  audience: CourseAudience
  contextType: TeacherThreadContext
  contextRef: string | null
  courseId?: string | null
  lessonId?: string | null
  title?: string | null
  authorId: string | null
  authorName: string | null
  body: string
  /** Id determinístico do turno (idempotência do webhook do Mural). Ausente → aleatório. */
  dedupeId?: string
}

/**
 * Canal de retorno professor↔aluno. UMA conversa (thread) por contexto (entrega/
 * Mural = deduplicada; recado geral = uma por vez), turnos `teacher`/`student`. O
 * members guarda o TEXTO CRU (o BFF/front sanitiza com `renderUgcMarkdown`); o
 * não-lido é por WATERMARK. As rotas do aluno checam posse (404 sem vazar); o admin
 * vê tudo. Reusa o mesmo repo p/ o aluno, o professor e o webhook do Mural (M3).
 */
export class TeacherThreadsService {
  constructor(
    private readonly repo: TeacherThreadRepository,
    private readonly now: () => Date,
  ) {}

  // ── Aluno ─────────────────────────────────────────────────────────────────
  async listForStudent(
    userId: string,
    audience: CourseAudience,
    limit: number,
    offset: number,
  ): Promise<TeacherThreadSummaryView[]> {
    const rows = await this.repo.listForStudent(userId, audience, limit, offset)
    return rows.map(toSummaryView)
  }

  async getForStudent(
    userId: string,
    audience: CourseAudience,
    threadId: string,
  ): Promise<TeacherThreadView> {
    const thread = await this.ownedThread(threadId, userId, audience)
    const messages = await this.repo.listMessages(threadId)
    return toThreadView(thread, messages)
  }

  /** Aluno responde a uma conversa SUA existente (não pode iniciar do zero). */
  async studentReply(
    userId: string,
    audience: CourseAudience,
    threadId: string,
    rawBody: string,
  ): Promise<TeacherThreadView> {
    const thread = await this.ownedThread(threadId, userId, audience)
    await this.repo.appendMessage({
      threadId: thread.id,
      authorRole: 'student',
      authorId: userId,
      authorName: null,
      body: cleanBody(rawBody),
      now: this.now(),
    })
    const messages = await this.repo.listMessages(thread.id)
    const fresh = (await this.repo.findById(thread.id)) ?? thread
    return toThreadView(fresh, messages)
  }

  async markReadByStudent(userId: string, threadId: string): Promise<{ ok: true }> {
    await this.repo.markReadByStudent(threadId, userId, this.now())
    return { ok: true }
  }

  async unreadCountForStudent(
    userId: string,
    audience: CourseAudience,
  ): Promise<{ count: number }> {
    return { count: await this.repo.countUnreadForStudent(userId, audience) }
  }

  // ── Professor (admin) ───────────────────────────────────────────────────────
  async listForAdmin(filter: AdminThreadsFilter): Promise<TeacherThreadSummaryView[]> {
    const rows = await this.repo.listForAdmin(filter)
    return rows.map(toSummaryView)
  }

  async getForAdmin(threadId: string): Promise<TeacherThreadView> {
    const thread = await this.repo.findById(threadId)
    if (!thread) throw new ContentNotFoundError('Conversa não encontrada')
    const messages = await this.repo.listMessages(threadId)
    return toThreadView(thread, messages)
  }

  /** Conversa por CONTEXTO (Entrega/Mural) p/ o professor abrir direto da Entrega. */
  async getForAdminByContext(
    userId: string,
    contextType: TeacherThreadContext,
    contextRef: string,
  ): Promise<{ thread: TeacherThreadView | null }> {
    const thread = await this.repo.findByContext(userId, contextType, contextRef)
    if (!thread) return { thread: null }
    const messages = await this.repo.listMessages(thread.id)
    return { thread: toThreadView(thread, messages) }
  }

  async adminReplyToThread(
    threadId: string,
    authorId: string | null,
    authorName: string | null,
    rawBody: string,
  ): Promise<TeacherThreadView> {
    const thread = await this.repo.findById(threadId)
    if (!thread) throw new ContentNotFoundError('Conversa não encontrada')
    await this.repo.appendMessage({
      threadId,
      authorRole: 'teacher',
      authorId,
      authorName,
      body: cleanBody(rawBody),
      now: this.now(),
    })
    const messages = await this.repo.listMessages(threadId)
    const fresh = (await this.repo.findById(threadId)) ?? thread
    return toThreadView(fresh, messages)
  }

  /** Professor posta por CONTEXTO (Entregas/geral): cria a conversa se preciso. */
  async adminPostByContext(input: TeacherPostByContextInput): Promise<TeacherThreadView> {
    const threadId = await this.postByContext(input)
    return this.getForAdmin(threadId)
  }

  async markReadByTeacher(threadId: string): Promise<{ ok: true }> {
    await this.repo.markReadByTeacher(threadId, this.now())
    return { ok: true }
  }

  // ── Sistema (Mural — webhook do hub, M3) ────────────────────────────────────
  /** Cria/append de mensagem `teacher` por contexto, sem devolver a conversa (webhook). */
  async systemPostByContext(input: TeacherPostByContextInput): Promise<void> {
    await this.postByContext(input)
  }

  // ── Interno ──────────────────────────────────────────────────────────────────
  private async postByContext(input: TeacherPostByContextInput): Promise<string> {
    const body = cleanBody(input.body)
    // Entrega/Mural DEVEM ter a âncora (blockId/threadId) — senão a conversa vira
    // "geral" no ensureThread (NULL fora do UNIQUE) e nunca deduplicaria.
    if (input.contextType !== 'general' && !input.contextRef) {
      throw new ValidationError('Conversa de contexto exige a referência (contextRef)')
    }
    const now = this.now()
    const threadId = await this.repo.ensureThread({
      userId: input.userId,
      accountId: input.accountId,
      audience: input.audience,
      contextType: input.contextType,
      contextRef: input.contextRef,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
      title: input.title ?? null,
      now,
    })
    await this.repo.appendMessage({
      threadId,
      authorRole: 'teacher',
      authorId: input.authorId,
      authorName: input.authorName,
      body,
      now,
      messageId: input.dedupeId,
    })
    return threadId
  }

  /** Conversa do aluno (posse + vitrine) ou 404 sem vazar existência (régua do Pensa). */
  private async ownedThread(
    threadId: string,
    userId: string,
    audience: CourseAudience,
  ): Promise<TeacherThreadRecord> {
    const thread = await this.repo.findById(threadId)
    if (!thread || thread.userId !== userId || thread.audience !== audience) {
      throw new ContentNotFoundError('Conversa não encontrada')
    }
    return thread
  }
}
