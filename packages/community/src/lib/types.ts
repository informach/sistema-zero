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

/** UserView do auth (GET /auth/me — traz phone, que pode não estar nas claims). */
export interface UserView {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone?: string
  signupSource?: string
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

/** Item de `GET /members/courses` → `{ courses: MyCourseView[] }`. */
export interface MyCourseView {
  courseSlug: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  access: AccessView
  progress: CourseProgress
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

/** `GET /members/courses/:slug` — detalhe com módulos/aulas (outline). */
export interface CourseDetailView {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  access: AccessView
  progress: CourseProgressView
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
export interface QuizQuestion {
  id: string
  prompt: string
  choices: { id: string; text: string }[]
  correctChoiceIds: string[]
  explanation?: string
}
export interface QuizBlock {
  kind: 'quiz'
  questions: QuizQuestion[]
  passingScore?: number
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

/** Bloco como chega da API (`content` é `unknown` na borda — narrowing por `kind`). */
export interface LessonBlockView {
  id: string
  kind: string
  sortOrder: number
  content: unknown
}

export interface LessonAttachmentView {
  id: string
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
  sortOrder: number
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
