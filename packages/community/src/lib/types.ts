/**
 * Tipos compartilhados client/server do app do aluno. SEM lógica e SEM imports de
 * `server/*` — Client Components importam daqui com segurança. Espelham as views
 * REAIS dos serviços (members `application/mappers/views.ts`, payments
 * `application/mappers/payment-view.ts`, auth `application/mappers/user-view.ts`).
 */

// ── Sessão / usuário (claims do JWT do auth) ────────────────────────────────
export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
}

/** Sessão + avatar fresco (claims não carregam foto — o layout hidrata via GET /auth/me). */
export interface SessionUserWithAvatar extends SessionUser {
  avatarUrl: string | null
}

/** UserView do auth (GET /auth/me — traz phone/avatar, que não estão nas claims). */
export interface UserView {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone?: string
  signupSource?: string
  avatarUrl?: string
}

// ── Members (área do aluno) ─────────────────────────────────────────────────
export interface AccessView {
  accessType: string
  /** ISO-8601 ou null (vitalício). */
  expiresAt: string | null
}

export interface CourseProgress {
  completedLessons: number
  totalLessons: number
  percent: number
}

export interface CourseProgressView extends CourseProgress {
  lastCompletedAt: string | null
}

/**
 * Item de `GET /members/catalog` → `{ courses: CatalogCourseView[] }` —
 * "Todos os cursos" da plataforma com a flag de acesso do aluno.
 */
export interface CatalogCourseView {
  courseSlug: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  hasAccess: boolean
  /** URL da página de vendas (funil); `null` → fallback FUNNEL_URL no server. */
  salesPageUrl: string | null
}

/** Item de `GET /members/courses` → `{ courses: MyCourseView[] }`. */
export interface MyCourseView {
  courseSlug: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  access: AccessView
  progress: CourseProgress
  /** Última aula acessada (posição de vídeo) — atalho do card; `null` se nunca acessou. */
  continueLessonId: string | null
}

export interface LessonOutlineView {
  id: string
  slug: string
  title: string
  sortOrder: number
  estimatedMinutes: number | null
  completed: boolean
}

export interface ModuleOutlineView {
  id: string
  title: string
  summary: string | null
  sortOrder: number
  lessons: LessonOutlineView[]
}

// ── Classificação do curso (estilo Udemy) ───────────────────────────────────
/** Chaves das perguntas fixas do passo opcional — espelham o members (domain/rating). */
export type CourseFeedbackQuestionKey =
  | 'importantInfo'
  | 'clearExplanations'
  | 'engagingInstructor'
  | 'enoughPractice'
  | 'meetsExpectations'
  | 'knowledgeable'

export type CourseFeedbackAnswer = 'yes' | 'no' | 'unsure'

export type CourseFeedbackAnswers = Partial<Record<CourseFeedbackQuestionKey, CourseFeedbackAnswer>>

/** Classificação que ESTE aluno deu ao curso (`PUT /members/courses/:slug/rating`). */
export interface CourseRatingView {
  /** 1–5 em passos de 0.5. */
  rating: number
  comment: string | null
  feedbackAnswers: CourseFeedbackAnswers | null
  createdAt: string
  updatedAt: string
}

/** `GET /members/courses/:slug` — detalhe com módulos/aulas (outline). */
export interface CourseDetailView {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  access: AccessView
  progress: CourseProgressView
  /** Aula-alvo do "Continuar de onde parei" (última acessada > 1ª não concluída > 1ª). */
  continueLessonId: string | null
  /** Classificação deste aluno — `null` se ainda não classificou (mostra o link). */
  myRating: CourseRatingView | null
  /** URL da página de vendas (compartilhar); `null` → fallback FUNNEL_URL no server. */
  salesPageUrl: string | null
  modules: ModuleOutlineView[]
}

// ── Blocos de aula (união discriminada por `kind` — espelha o members/admin) ─
export interface RichTextBlock {
  kind: 'rich_text'
  html?: string
  markdown?: string
  codeLanguageHints?: string[]
}
export interface VideoBlock {
  kind: 'video'
  provider: 'mux' | 'youtube' | 'vimeo' | 'file'
  src: string
  posterUrl?: string
  durationSeconds?: number
  captions?: { lang: string; url: string }[]
}
export interface ImageBlock {
  kind: 'image'
  url: string
  alt?: string
  caption?: string
}
export interface AudioBlock {
  kind: 'audio'
  url: string
  durationSeconds?: number
}
/**
 * Quiz member-facing: o GET da aula NÃO traz gabarito (`correctChoiceIds`/
 * `explanation` só chegam na RESPOSTA do submit — `QuizAttemptResultView`).
 */
export interface QuizQuestion {
  id: string
  prompt: string
  choices: { id: string; label: string }[]
}
export interface QuizBlock {
  kind: 'quiz'
  questions: QuizQuestion[]
  /** Nota de corte que BLOQUEIA a conclusão da aula; `null` = quiz de fixação. */
  passingScore?: number | null
}
export interface EmbedBlock {
  kind: 'embed'
  embedType: 'three_js' | 'iframe' | 'codepen' | 'custom'
  src?: string
  html?: string
  sandbox?: string
  height?: number
}
export type LessonBlockContent =
  | RichTextBlock
  | VideoBlock
  | ImageBlock
  | AudioBlock
  | QuizBlock
  | EmbedBlock

/** Estado das tentativas do aluno num bloco de quiz (vem no GET da aula). */
export interface QuizStateView {
  lastScore: number | null
  passed: boolean
  attemptsCount: number
  /** ISO; não-nulo só durante o cooldown de retry após reprovar. */
  retryAvailableAt: string | null
}

/** Correção por questão — devolvida SÓ pelo submit do quiz. */
export interface QuizQuestionResultView {
  questionId: string
  correct: boolean
  correctChoiceIds: string[]
  explanation: string | null
}

/** `POST /members/lessons/:lessonId/blocks/:blockId/quiz-attempts`. */
export interface QuizAttemptResultView {
  score: number
  passed: boolean
  passingScore: number
  attemptsCount: number
  retryAvailableAt: string | null
  questions: QuizQuestionResultView[]
}

/** Bloco como chega da API (`content` é `unknown` na borda — narrowing por `kind`). */
export interface LessonBlockView {
  id: string
  kind: string
  sortOrder: number
  content: unknown
  /** Presente só em blocos de quiz. */
  quizState?: QuizStateView | null
}

/**
 * Anexo SEM `url` — a localização real nunca chega ao browser; o download é
 * pela rota autenticada `/api/cursos/:slug/aulas/:lessonId/anexos/:id` (marca d'água).
 */
export interface LessonAttachmentView {
  id: string
  label: string
  fileType: string | null
  sizeBytes: number | null
  sortOrder: number
}

/**
 * `GET …/attachments/:id/resolve` (server↔server, SÓ o BFF consome): localização
 * real do anexo. NUNCA repassar `storageRef` ao browser.
 */
export interface AttachmentDownloadView {
  label: string
  fileType: string | null
  sizeBytes: number | null
  /** `r2priv:<key>` (bucket privado) ou URL http(s) externa/legada. */
  storageRef: string
}

/** `GET /members/courses/:slug/lessons/:lessonId` (busca por ID, não slug). */
export interface LessonDetailView {
  id: string
  slug: string
  title: string
  moduleId: string
  courseSlug: string
  estimatedMinutes: number | null
  completed: boolean
  /** Posição de reprodução salva (segundos) — `null` se nunca assistiu. */
  positionSeconds: number | null
  blocks: LessonBlockView[]
  attachments: LessonAttachmentView[]
}

// ── Payments ("minhas compras" — PaymentView PÚBLICA, sem dados sensíveis) ──
export interface PaymentView {
  id: string
  consumerId: string
  status: string
  method: string
  /** Centavos serializados como STRING (bigint) → use `formatCentsStr`. */
  amountInCents: string
  currency: string
  description: string | null
  pix?: { txid: string; copiaECola: string; imagemQrcodeBase64?: string; expiresAt: string | null }
  boleto?: { barcode: string; digitableLine: string; pdfUrl: string; expiresAt: string | null }
  card?: { brand: string; last4: string; installments: number }
  metadata: Record<string, unknown>
  createdAt: string
  paidAt: string | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  FAILED: 'Falhou',
  EXPIRED: 'Expirado',
  REFUNDED: 'Estornado',
  CANCELED: 'Cancelado',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de crédito',
}
