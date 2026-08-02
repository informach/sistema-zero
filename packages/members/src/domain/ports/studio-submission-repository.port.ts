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
  /** Recado OPCIONAL do aluno ao professor (modal de envio). `null` = sem recado. */
  message?: string | null
  /**
   * Carimbo "já conferi" do professor. ⚠️ NÃO é escrito pelo `upsert` (o set do
   * reenvio não o lista, de propósito): quem mexe aqui é só o `markReviewed`. O
   * reenvio invalida o carimbo pela COMPARAÇÃO com `submittedAt`, não apagando.
   */
  reviewedAt?: Date | null
  /** Qual staff carimbou (auditoria). Mesma regra do `reviewedAt`. */
  reviewedBy?: string | null
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
  /** Recado OPCIONAL do aluno ao professor. `null` = sem recado. */
  message: string | null
}

/** Estado por bloco para o ALUNO (gate da conclusão + UI). */
export interface StudioSubmissionState {
  submittedAt: Date
  score: number | null
  /** `passed_at` presente (sticky) — usado pelo gate de atividade com nota. */
  passed: boolean
  /**
   * Quando o professor carimbou "já conferi". NÃO é sticky: comparar com
   * `submittedAt` diz se o carimbo vale para a entrega ATUAL (reenvio reabre).
   */
  reviewedAt: Date | null
}

/** Entrega completa de um aluno num bloco (admin detalhe + stickiness do submit). */
export interface StudioSubmissionDetail {
  project: unknown
  submittedAt: Date
  score: number | null
  results: StudioCheckResult[] | null
  checkedAt: Date | null
  passedAt: Date | null
  /** Recado OPCIONAL do aluno ao professor. `null` = sem recado. */
  message: string | null
  /** Carimbo de "já conferi" (o botão do professor). `null` = nunca conferida. */
  reviewedAt: Date | null
}

/**
 * Uma entrega do Estúdio para o painel POR CURSO (aba "Entregas" do curso): o
 * mesmo resumo do `listByBlock` + a aula/módulo resolvidos e o `blockId` (o BFF
 * abre a entrega pelo endpoint por-bloco já existente). Sem o projeto inteiro.
 */
export interface StudioSubmissionCourseRow {
  userId: string
  accountId: string | null
  blockId: string
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  submittedAt: Date
  score: number | null
  checkedAt: Date | null
  passed: boolean
  message: string | null
}

/** Filtro da fila GLOBAL de entregas (página "Entregas" da Sala do Professor). */
export interface StudioSubmissionGlobalFilter {
  courseId?: string
  audience?: CourseAudience
  /**
   * `pending` = o professor ainda não fechou a entrega APÓS o último envio (um
   * reenvio reabre a pendência); `answered` = ele respondeu um recado;
   * `reviewed` = ele carimbou "já conferi" sem escrever nada. Ausente = todas.
   * ⚠️ FECHADA = respondida OU conferida; `pending` é a negação das duas.
   */
  status?: 'pending' | 'answered' | 'reviewed'
  /**
   * Filtro por ALUNO (24/07): casa `user_id` OU `account_id` — o accountId pega a
   * família toda; o profileId (kids) estreita p/ uma criança.
   */
  userIds?: string[]
  limit: number
  offset: number
}

/** Linha da fila global: a linha por-curso + o curso resolvido e o estado de resposta. */
export interface StudioSubmissionGlobalRow extends StudioSubmissionCourseRow {
  courseId: string
  courseTitle: string
  audience: CourseAudience
  /** Há mensagem do PROFESSOR na conversa da entrega após o último envio. */
  answered: boolean
  /**
   * O professor carimbou "já conferi" após o último envio. É o caminho para a
   * entrega SEM recado, que não tinha como sair da fila (só respondendo).
   */
  reviewed: boolean
}

/** Uma entrega recente do Estúdio (ficha admin), com a aula/curso resolvidos. */
export interface RecentStudioSubmission {
  blockId: string
  lessonId: string
  lessonTitle: string | null
  courseTitle: string | null
  score: number | null
  passed: boolean
  submittedAt: Date
  message: string | null
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
  /**
   * Entregas de TODAS as aulas/blocos de um curso (aba "Entregas" por curso no
   * admin) — centraliza o acompanhamento sem drilar aula→bloco. Ordenado pela
   * ordem do curso (módulo → aula) e depois pela data de envio.
   */
  listByCourse(courseId: string): Promise<StudioSubmissionCourseRow[]>
  /**
   * Fila GLOBAL de entregas (todos os cursos) — página "Entregas" da Sala do
   * Professor. PENDENTES primeiro, depois mais recentes; paginada com total.
   */
  listAll(
    filter: StudioSubmissionGlobalFilter,
  ): Promise<{ items: StudioSubmissionGlobalRow[]; total: number }>
  /** Entrega de um aluno num bloco (abrir no Estúdio do professor + correção). */
  getOne(userId: string, blockId: string): Promise<StudioSubmissionDetail | null>
  /**
   * Carimba (ou tira) o "já conferi" do professor. `reviewed: false` limpa o
   * carimbo — desfazer um clique errado. Devolve `false` se a entrega não existe.
   */
  markReviewed(input: {
    userId: string
    blockId: string
    reviewed: boolean
    staffId: string | null
    now: Date
  }): Promise<boolean>
  /**
   * Quantos projetos o aluno ENTREGOU NA AUDIÊNCIA (linhas de `studio_submissions`
   * do usuário cujo curso é da vitrine pedida) — resumo do progresso na área dos pais
   * (kids). Escopado por audiência p/ paridade com xp/badges/cursos do dashboard.
   */
  countByUserAndAudience(userId: string, audience: CourseAudience): Promise<number>
  /** Entregas do aluno na audiência com `submitted_at` em `[from, to)` — report semanal. */
  countSubmittedInPeriodByAudience(
    userId: string,
    audience: CourseAudience,
    from: Date,
    to: Date,
  ): Promise<number>
  /**
   * CONTAS (account_id) com entrega do Estúdio na audiência dentro da janela —
   * fecha o buraco da enumeração do report (atividade sem XP novo). Distinct.
   */
  listAccountsSubmittedInPeriod(audience: CourseAudience, from: Date, to: Date): Promise<string[]>
  /**
   * Entregas mais recentes do aluno (ficha admin — linha do tempo), com aula/curso
   * resolvidos por join. Limitado a `limit` (mais recentes primeiro). Sem o projeto.
   */
  listRecentByUser(userId: string, limit: number): Promise<RecentStudioSubmission[]>
}
