/** Entrega do projeto do Estúdio (1 linha por aluno+bloco, upsert — último vence). */
export interface StudioSubmissionRecord {
  id: string
  userId: string
  blockId: string
  lessonId: string
  courseId: string
  /** Snapshot `Project` do Estúdio (JSON opaco — o front sanitiza). */
  project: unknown
  submittedAt: Date
}

/** Resumo de uma entrega para o painel do professor (sem o projeto inteiro). */
export interface StudioSubmissionSummary {
  userId: string
  submittedAt: Date
}

export interface StudioSubmissionRepository {
  /** Insere/atualiza a entrega do aluno no bloco (UNIQUE user+block). */
  upsert(submission: StudioSubmissionRecord): Promise<void>
  /**
   * Quais dos `blockIds` o aluno JÁ entregou — usado pelo gate da conclusão da aula
   * (espelha `quizAttempts.summarizeByBlockIds`). Lote por aula.
   */
  listSubmittedBlockIds(userId: string, blockIds: string[]): Promise<Set<string>>
  /** Entregas de um bloco (painel do professor): quem entregou + quando. */
  listByBlock(blockId: string): Promise<StudioSubmissionSummary[]>
  /** Entrega de um aluno num bloco (abrir no Estúdio do professor). */
  getOne(userId: string, blockId: string): Promise<{ project: unknown; submittedAt: Date } | null>
}
