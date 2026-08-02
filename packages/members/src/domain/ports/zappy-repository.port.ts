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

export interface ZappyStoredResponse {
  id: string
  text: string
  scope: ZappyScope
  blockReferences: Array<{
    blockId?: string
    blockType: string
    name: string
    category: string
    area: string
  }>
  lessonReferences?: Array<{
    courseId: string
    courseSlug?: string
    lessonId: string
    title: string
  }>
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
}

export interface CompleteZappyQuestionInput {
  userId: string
  projectId: string
  questionId: string
  response: ZappyStoredResponse
  latencyMs: number
  now: Date
  expiresAt: Date
  outcome?: 'normal' | 'refusal' | 'needs-context' | 'quota' | 'error'
}

export interface ZappyMetrics {
  questions: number
  useful: number
  notUseful: number
  refusals: number
  needsContext: number
  quota: number
  errors: number
  averageLatencyMs: number
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
  pruneExpired(now: Date): Promise<number>
}
