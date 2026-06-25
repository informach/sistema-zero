import type { CourseAudience } from '../course/course'
import type { StudioCheckResult } from '../course/studio-activity'

/** Entrega do projeto do Estúdio (1 linha por aluno+bloco, upsert — último vence). */
export interface StudioSubmissionRecord {
  id: string
  /** Quem entregou (perfil da criança no kids; a conta no adulto). */
  userId: string
  /** Conta responsável (kids: o pai; adulto: = userId). `null` = linha legada. */
  accountId?: string | null
  blockId: string
  lessonId: string
  courseId: string
  /** Snapshot `Project` do Estúdio (JSON opaco — o front sanitiza). */
  project: unknown
  submittedAt: Date
  // ── Auto-correção (fase 2; null quando o bloco não tem atividade) ────────────
  /** Nota 0–100 da última entrega. */
  score?: number | null
  /** Resultado por checagem (server + client). */
  results?: StudioCheckResult[] | null
  /** Quando a correção rodou. */
  checkedAt?: Date | null
  /** STICKY: 1ª vez que passou (gate "aprovou uma vez = destrava"). */
  passedAt?: Date | null
}

/** Resumo de uma entrega para o painel do professor (sem o projeto inteiro). */
export interface StudioSubmissionSummary {
  userId: string
  /** Conta responsável (p/ o BFF hidratar o responsável + o nome do perfil). `null` = legado. */
  accountId: string | null
  submittedAt: Date
  score: number | null
  checkedAt: Date | null
  passed: boolean
}

/** Estado por bloco para o ALUNO (gate da conclusão + UI). */
export interface StudioSubmissionState {
  submittedAt: Date
  score: number | null
  /** `passed_at` presente (sticky) — usado pelo gate de atividade com nota. */
  passed: boolean
}

/** Entrega completa de um aluno num bloco (admin detalhe + stickiness do submit). */
export interface StudioSubmissionDetail {
  project: unknown
  submittedAt: Date
  score: number | null
  results: StudioCheckResult[] | null
  checkedAt: Date | null
  passedAt: Date | null
}

export interface StudioSubmissionRepository {
  /** Insere/atualiza a entrega do aluno no bloco (UNIQUE user+block). */
  upsert(
    submission: StudioSubmissionRecord,
    options?: {
      /** Mantém `passedAt` existente (STICKY) se já houver, sem sobrescrever por `null`. */
      preservePassedAt?: boolean
    },
  ): Promise<void>
  /**
   * Estado das entregas do aluno nos `blockIds` — usado pelo gate da conclusão
   * (submitted = tem entrada; passed = `passed_at`). Lote por aula.
   */
  summarizeByBlockIds(
    userId: string,
    blockIds: string[],
  ): Promise<Map<string, StudioSubmissionState>>
  /** Entregas de um bloco (painel do professor): quem entregou + quando + nota. */
  listByBlock(blockId: string): Promise<StudioSubmissionSummary[]>
  /** Entrega de um aluno num bloco (abrir no Estúdio do professor + correção). */
  getOne(userId: string, blockId: string): Promise<StudioSubmissionDetail | null>
  /**
   * Quantos projetos o aluno ENTREGOU NA AUDIÊNCIA (linhas de `studio_submissions`
   * do usuário cujo curso é da vitrine pedida) — resumo do progresso na área dos pais
   * (kids). Escopado por audiência p/ paridade com xp/badges/cursos do dashboard.
   */
  countByUserAndAudience(userId: string, audience: CourseAudience): Promise<number>
}
