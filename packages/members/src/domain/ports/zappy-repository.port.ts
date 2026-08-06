export type ZappyScope =
  | 'block'
  | 'mechanic'
  | 'error'
  | 'concept'
  | 'lesson'
  | 'needs-context'
  | 'redirect-pensa'
  | 'redirect-pinta'
  | 'unsupported'
  | 'project-review'

export interface ZappyStoredResponse {
  id: string
  text: string
  scope: ZappyScope
  blockReferences: Array<{
    blockId?: string
    blockType: string
    name: string
    category: string
    subcategory?: string
    area: string
  }>
  lessonReferences?: Array<{
    courseId: string
    courseSlug?: string
    lessonId: string
    title: string
  }>
  /** Continuações prováveis da criança (chips que preenchem o campo, ≤3). */
  suggestions?: string[]
  createdAt: string
}

export interface ZappyHistoryMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  response?: ZappyStoredResponse
}

export interface ZappyHistoryPage {
  messages: ZappyHistoryMessage[]
  nextCursor: string | null
}

export interface ReserveZappyQuestionInput {
  userId: string
  accountId: string
  projectId: string
  clientMessageId: string
  question: string
  now: Date
  expiresAt: Date
  processingUntil: Date
}

export interface ReserveZappyQuestionResult {
  created: boolean
  questionId?: string
  response?: ZappyStoredResponse
  /** Limite distribuído de 10 novas perguntas/minuto por perfil. */
  rateLimited?: boolean
  /**
   * Últimos turnos da conversa (cronológico, ≤6) — memória do tutor no prompt.
   * Só no caminho de pergunta NOVA (reclaim de lease fica sem, aceito).
   */
  recentMessages?: Array<{ role: 'user' | 'assistant'; text: string }>
}

export interface CompleteZappyQuestionInput {
  userId: string
  projectId: string
  questionId: string
  response: ZappyStoredResponse
  latencyMs: number
  now: Date
  expiresAt: Date
  outcome?: 'normal' | 'refusal' | 'needs-context' | 'quota' | 'error' | 'rejected'
  /** Motivo da reprova da validação (auditoria; nunca volta à criança). */
  rejection?: string
}

export interface ZappyMetrics {
  questions: number
  useful: number
  notUseful: number
  refusals: number
  needsContext: number
  quota: number
  errors: number
  rejected: number
  averageLatencyMs: number
}

export type ZappyFailureFilter = 'all' | 'rejected' | 'error' | 'not-useful'

/** Pergunta que falhou (reprovada/erro/👎) — SEM userId/projectId de propósito:
 *  a listagem do admin mostra o texto (já PII-redigido na gravação), nunca quem. */
export interface ZappyFailedQuestion {
  question: string
  answerText: string
  rejection?: string
  outcome: string
  useful: boolean | null
  createdAt: string
}

export interface ZappyFailedQuestionsPage {
  items: ZappyFailedQuestion[]
  total: number
}

export interface ZappyRepository {
  history(
    userId: string,
    projectId: string,
    now: Date,
    expiresAt: Date,
    before?: string,
  ): Promise<ZappyHistoryPage>
  reserveQuestion(input: ReserveZappyQuestionInput): Promise<ReserveZappyQuestionResult>
  completeQuestion(input: CompleteZappyQuestionInput): Promise<ZappyStoredResponse>
  deleteHistory(userId: string, projectId: string): Promise<void>
  setFeedback(
    userId: string,
    projectId: string,
    responseId: string,
    useful: boolean,
    now: Date,
  ): Promise<boolean>
  metrics(from: Date, to: Date): Promise<ZappyMetrics>
  listFailedQuestions(
    from: Date,
    to: Date,
    filter: ZappyFailureFilter,
    limit: number,
    offset: number,
  ): Promise<ZappyFailedQuestionsPage>
  pruneExpired(now: Date): Promise<number>
}
