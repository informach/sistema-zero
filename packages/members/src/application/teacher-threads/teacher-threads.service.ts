import type { CourseAudience } from '../../domain/course/course'
import { ContentNotFoundError } from '../../domain/course/course.errors'
import type {
  AdminThreadsFilter,
  TeacherMessagePage,
  TeacherMessageRecord,
  TeacherMessageRole,
  TeacherThreadContext,
  TeacherThreadRecord,
  TeacherThreadRepository,
  TeacherThreadSummary,
} from '../../domain/ports/teacher-thread-repository.port'
import { ValidationError } from '../../domain/shared/errors'

// Teto do corpo (espelha a coluna `teacher_messages.body`). Folgado o bastante p/ o
// professor escrever markdown com print (URL de imagem) + trecho de código; o recado
// CURTO do aluno no envio (≤1000 do DTO da entrega) cabe de sobra.
const MAX_BODY = 8000

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
  /** Cursor para a página anterior; null quando o histórico chegou ao início. */
  nextCursor: string | null
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

function toThreadView(thread: TeacherThreadRecord, page: TeacherMessagePage): TeacherThreadView {
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
    messages: page.messages.map(toMessageView),
    nextCursor: page.nextCursor
      ? encodeCursor(page.nextCursor.createdAt, page.nextCursor.id)
      : null,
  }
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url')
}

function decodeCursor(raw: string | undefined): { createdAt: Date; id: string } | undefined {
  if (!raw) return undefined
  try {
    const [iso, id, extra] = Buffer.from(raw, 'base64url').toString('utf8').split('|')
    const createdAt = new Date(iso ?? '')
    if (
      extra ||
      !id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
      Number.isNaN(createdAt.getTime())
    ) {
      throw new Error('invalid cursor')
    }
    return { createdAt, id }
  } catch {
    throw new ValidationError('Cursor de mensagens inválido')
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
    before?: string,
  ): Promise<TeacherThreadView> {
    const thread = await this.ownedThread(threadId, userId, audience)
    const page = await this.repo.listMessages(threadId, decodeCursor(before))
    return toThreadView(thread, page)
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
    const page = await this.repo.listMessages(thread.id)
    const fresh = (await this.repo.findById(thread.id)) ?? thread
    return toThreadView(fresh, page)
  }

  async markReadByStudent(
    userId: string,
    audience: CourseAudience,
    threadId: string,
  ): Promise<{ ok: true }> {
    await this.repo.markReadByStudent(threadId, userId, audience)
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

  async getForAdmin(threadId: string, before?: string): Promise<TeacherThreadView> {
    const thread = await this.repo.findById(threadId)
    if (!thread) throw new ContentNotFoundError('Conversa não encontrada')
    const page = await this.repo.listMessages(threadId, decodeCursor(before))
    return toThreadView(thread, page)
  }

  /** Conversa por CONTEXTO (Entrega/Mural) p/ o professor abrir direto da Entrega. */
  async getForAdminByContext(
    userId: string,
    contextType: TeacherThreadContext,
    contextRef: string,
    before?: string,
  ): Promise<{ thread: TeacherThreadView | null }> {
    const thread = await this.repo.findByContext(userId, contextType, contextRef)
    if (!thread) return { thread: null }
    const page = await this.repo.listMessages(thread.id, decodeCursor(before))
    return { thread: toThreadView(thread, page) }
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
    const page = await this.repo.listMessages(threadId)
    const fresh = (await this.repo.findById(threadId)) ?? thread
    return toThreadView(fresh, page)
  }

  /** Professor posta por CONTEXTO (Entregas/geral): cria a conversa se preciso. */
  async adminPostByContext(input: TeacherPostByContextInput): Promise<TeacherThreadView> {
    const threadId = await this.postByContext(input, 'teacher')
    return this.getForAdmin(threadId)
  }

  async markReadByTeacher(threadId: string, staffUserId: string): Promise<{ ok: true }> {
    await this.repo.markReadByTeacher(threadId, staffUserId)
    return { ok: true }
  }

  // ── Sistema (Mural — webhook do hub, M3) ────────────────────────────────────
  /** Cria/append de mensagem `teacher` por contexto, sem devolver a conversa (webhook). */
  async systemPostByContext(input: TeacherPostByContextInput): Promise<void> {
    await this.postByContext(input, 'teacher')
  }

  // ── Aluno (envio da atividade — M-Entregas) ─────────────────────────────────
  /**
   * O ALUNO anexa o recado do ENVIO da atividade à conversa (cria se preciso), para
   * o histórico SOBREVIVER ao reenvio — que sobrescreve a linha da entrega. Só o
   * fluxo de envio (server-side confiável) chama isto; pela BORDA o aluno só RESPONDE
   * (`studentReply`), nunca inicia. `authorId` = o próprio aluno.
   */
  async studentPostByContext(input: Omit<TeacherPostByContextInput, 'authorId'>): Promise<void> {
    await this.postByContext({ ...input, authorId: input.userId }, 'student')
  }

  // ── Interno ──────────────────────────────────────────────────────────────────
  private async postByContext(
    input: TeacherPostByContextInput,
    authorRole: TeacherMessageRole,
  ): Promise<string> {
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
      authorRole,
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
