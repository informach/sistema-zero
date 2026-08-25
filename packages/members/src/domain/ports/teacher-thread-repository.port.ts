import type { CourseAudience } from '../course/course'

/** Contexto que ANCORA a conversa (a origem do retorno). */
export type TeacherThreadContext = 'studio_submission' | 'mural_publication' | 'general'
/** Quem escreveu o turno. */
export type TeacherMessageRole = 'teacher' | 'student'

/** Uma conversa professor↔aluno (cabeçalho). */
export interface TeacherThreadRecord {
  id: string
  userId: string
  accountId: string | null
  audience: CourseAudience
  contextType: TeacherThreadContext
  /** Snapshot SEM FK: blockId (entrega) | threadId do hub (Mural) | null (geral). */
  contextRef: string | null
  courseId: string | null
  lessonId: string | null
  title: string | null
  lastMessageAt: Date
  studentLastReadAt: Date | null
  teacherLastReadAt: Date | null
  createdAt: Date
}

/** Um turno da conversa. */
export interface TeacherMessageRecord {
  id: string
  threadId: string
  authorRole: TeacherMessageRole
  authorId: string | null
  authorName: string | null
  body: string
  createdAt: Date
}

/** Cursor estável: página anterior a esta mensagem, por `(created_at, id)`. */
export interface TeacherMessageCursor {
  createdAt: Date
  id: string
}

/** Janela cronológica do histórico; o banco busca do fim para o começo e a devolve em ASC. */
export interface TeacherMessagePage {
  messages: TeacherMessageRecord[]
  nextCursor: TeacherMessageCursor | null
}

/**
 * Resumo de conversa para uma CAIXA DE ENTRADA. `unread` é relativo ao lado que
 * pediu a lista (aluno: há mensagem do professor não lida; professor: há mensagem
 * do aluno não lida) — o repo calcula pelo watermark do lado.
 */
export interface TeacherThreadSummary {
  id: string
  userId: string
  accountId: string | null
  audience: CourseAudience
  contextType: TeacherThreadContext
  contextRef: string | null
  courseId: string | null
  lessonId: string | null
  title: string | null
  lastMessageAt: Date
  createdAt: Date
  /** Prévia + papel do autor da ÚLTIMA mensagem (para a linha da caixa de entrada). */
  lastMessagePreview: string | null
  lastMessageRole: TeacherMessageRole | null
  messageCount: number
  unread: boolean
}

/** Conversa aberta (cabeçalho + turnos em ordem cronológica). */
export interface TeacherThreadDetail {
  thread: TeacherThreadRecord
  messages: TeacherMessageRecord[]
}

/** Dados para CRIAR (ou reusar, em entrega/Mural) a conversa de um contexto. */
export interface EnsureThreadInput {
  userId: string
  accountId: string | null
  audience: CourseAudience
  contextType: TeacherThreadContext
  contextRef: string | null
  courseId?: string | null
  lessonId?: string | null
  title?: string | null
  now: Date
}

/** Dados de um turno novo. Ao inserir, o lado do AUTOR é marcado como já-lido. */
export interface AppendMessageInput {
  threadId: string
  authorRole: TeacherMessageRole
  authorId: string | null
  authorName: string | null
  body: string
  now: Date
  /**
   * Id DETERMINÍSTICO opcional (idempotência). Quando presente, a inserção é
   * `onConflictDoNothing` no id — usado pelo webhook do Mural (retry da MESMA
   * entrega não duplica o recado). Ausente → id aleatório (resposta = turno novo).
   */
  messageId?: string
}

/** Filtros da caixa de entrada do PROFESSOR. */
export interface AdminThreadsFilter {
  /** Identidade do professor para calcular não-lidas individualmente. */
  staffUserId: string
  audience?: CourseAudience
  contextType?: TeacherThreadContext
  courseId?: string
  unreadOnly?: boolean
  /**
   * Filtro por ALUNO (24/07): casa `user_id` OU `account_id` — passar o accountId
   * pega a família toda; o profileId (kids) estreita p/ uma criança.
   */
  userIds?: string[]
  limit: number
  offset: number
}

/** Escopo opcional do "marcar todas como lidas" (espelha os filtros da caixa). */
export interface MarkAllReadFilter {
  audience?: CourseAudience
  contextType?: TeacherThreadContext
  courseId?: string
}

export interface TeacherThreadRepository {
  /**
   * Cria (ou, em entrega/Mural, REUSA) a conversa do contexto e devolve o id.
   * `general` sempre cria uma nova (cada recado geral é sua própria conversa).
   */
  ensureThread(input: EnsureThreadInput): Promise<string>
  /** Anexa um turno + toca `last_message_at` na MESMA transação; marca lido p/ o autor. */
  appendMessage(input: AppendMessageInput): Promise<TeacherMessageRecord>
  /** Conversa (cabeçalho) por id — sem restrição de posse (uso admin/sistema). */
  findById(id: string): Promise<TeacherThreadRecord | null>
  /**
   * Conversa por CONTEXTO (aluno + entrega/Mural) — o admin abre o histórico da
   * conversa direto da Entrega. Só entrega/Mural (o `general` não tem chave estável).
   */
  findByContext(
    userId: string,
    contextType: TeacherThreadContext,
    contextRef: string,
  ): Promise<TeacherThreadRecord | null>
  /** Últimos turnos da conversa, paginados por cursor e devolvidos em ordem cronológica. */
  listMessages(threadId: string, before?: TeacherMessageCursor): Promise<TeacherMessagePage>
  /** Caixa do ALUNO: as próprias conversas da vitrine, mais recente primeiro. */
  listForStudent(
    userId: string,
    audience: CourseAudience,
    limit: number,
    offset: number,
  ): Promise<TeacherThreadSummary[]>
  /** Caixa do PROFESSOR: todas as conversas (filtros), mais recente primeiro. */
  listForAdmin(filter: AdminThreadsFilter): Promise<TeacherThreadSummary[]>
  /** Nº de conversas com mensagem do professor NÃO lida pelo aluno (badge do sino). */
  countUnreadForStudent(userId: string, audience: CourseAudience): Promise<number>
  /**
   * Nº de conversas com mensagem do ALUNO não lida por ESTE professor (Sala do
   * Professor). `audience` opcional escopa o badge à plataforma ativa do painel.
   */
  countUnreadForTeacher(staffUserId: string, audience?: CourseAudience): Promise<number>
  /** Marca a conversa lida pelo aluno até a última mensagem PERSISTIDA. No-op fora da vitrine dele. */
  markReadByStudent(threadId: string, userId: string, audience: CourseAudience): Promise<void>
  /** Marca a conversa lida por UM professor até a última mensagem PERSISTIDA. */
  markReadByTeacher(threadId: string, staffUserId: string): Promise<void>
  /** Marca TODAS as conversas não-lidas (do escopo) lidas por UM professor. Devolve o nº. */
  markAllReadByTeacher(staffUserId: string, filter?: MarkAllReadFilter): Promise<number>
}
