/**
 * Contratos compartilhados entre o BFF e os componentes do painel. Espelham as
 * views do @sistemazero/catalog e o UserView do @sistemazero/auth (type-only —
 * seguro p/ Client Components).
 */

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
}

/** Papéis com acesso ao painel admin. */
export const ADMIN_ROLES = ['superadmin', 'admin', 'staff'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role)
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// ── Usuários (espelha o admin-user-view do @sistemazero/auth) ──

/** Papéis de usuário (RBAC) — todos os do IdP, p/ os selects de edição/filtro. */
export const USER_ROLES = ['superadmin', 'admin', 'staff', 'customer'] as const
export type UserRole = (typeof USER_ROLES)[number]

/** Estados de conta — `active` autentica; `suspended`/`blocked` para moderação. */
export const USER_STATUSES = ['active', 'pending', 'suspended', 'blocked'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

/** Papéis privilegiados: só `superadmin` os gerencia/concede (espelha o guard do auth). */
export const PRIVILEGED_ROLES: readonly string[] = ['superadmin', 'admin']

export interface UserView {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone: string | null
  signupSource: string | null
  version: number
  createdAt: string
  updatedAt: string
}

// ── Membros (espelha os mappers admin do @sistemazero/members) ──

/** Status de uma matrícula (entitlement). */
export const ENTITLEMENT_STATUSES = ['active', 'revoked', 'expired', 'pending'] as const
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number]

/** Sumário de um membro na listagem (vem do members; identidade é hidratada do auth). */
export interface MemberSummaryView {
  userId: string
  totalCount: number
  activeCount: number
  lastGrantedAt: string
  courseRefs: string[]
}

/** Linha da lista de membros: sumário + identidade do auth (null se a conta sumiu). */
export interface MemberRow extends MemberSummaryView {
  user: UserView | null
}

/** Matrícula (entitlement) na visão admin. */
export interface AdminEntitlementView {
  id: string
  version: number
  status: string
  accessType: string
  productId: string
  productKind: string
  courseRef: string | null
  offerId: string | null
  name: string
  sourceKind: string
  sourceId: string
  subscriptionId: string | null
  grantedAt: string
  expiresAt: string | null
  revokedAt: string | null
}

/** Progresso do membro num curso (no detalhe). */
export interface MemberCourseProgressView {
  courseRef: string
  title: string | null
  status: string | null
  completedLessons: number
  totalLessons: number
  percent: number
}

/** Detalhe do membro (members) + identidade hidratada (auth). */
export interface MemberDetail {
  userId: string
  user: UserView | null
  entitlements: AdminEntitlementView[]
  progress: MemberCourseProgressView[]
}

// ── Autoria de conteúdo (espelha admin-content-views do @sistemazero/members) ──

export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const
export type CourseStatus = (typeof COURSE_STATUSES)[number]

export interface CourseView {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface ModuleView {
  id: string
  courseId: string
  title: string
  summary: string | null
  sortOrder: number
}

export interface LessonView {
  id: string
  moduleId: string
  courseId: string
  slug: string
  title: string
  sortOrder: number
  estimatedMinutes: number | null
}

/** Árvore do curso (editor): curso + módulos (ordenados) + aulas (resumidas). */
export interface CourseTreeView extends CourseView {
  modules: (ModuleView & { lessons: LessonView[] })[]
}

// Blocos: união discriminada por `kind` (espelha o domínio do members).
export const LESSON_BLOCK_KINDS = ['rich_text', 'video', 'image', 'audio', 'quiz', 'embed'] as const
export type LessonBlockKind = (typeof LESSON_BLOCK_KINDS)[number]

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
  choices: { id: string; label: string }[]
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

export interface BlockView {
  id: string
  lessonId: string
  kind: string
  sortOrder: number
  content: LessonBlockContent
}

export interface AttachmentView {
  id: string
  lessonId: string
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
  sortOrder: number
}

/** Conteúdo completo da aula (editor): blocos + anexos. */
export interface LessonContentView extends LessonView {
  blocks: BlockView[]
  attachments: AttachmentView[]
}

// ── Catálogo (espelha os mappers do @sistemazero/catalog) ──

export type ProductStatus = 'draft' | 'active' | 'archived'
export type OfferStatus = 'draft' | 'active' | 'paused' | 'archived'
export type CouponStatus = 'active' | 'inactive' | 'archived'
export type ProductKind =
  | 'ebook'
  | 'course'
  | 'template_kit'
  | 'community'
  | 'service'
  | 'bundle'
  | 'other'
export type PricingMode = 'one_time' | 'subscription'
export type CouponType = 'percent' | 'fixed'

export interface ProductView {
  id: string
  version: number
  sku: string
  slug: string
  name: string
  kind: string
  status: string
  sellable: boolean
  description: string | null
  currency: string
  createdAt: string
  updatedAt: string
}

export interface OfferListItem {
  id: string
  code: string
  slug: string
  name: string
  status: string
  priceCents: number
  compareAtPriceCents: number | null
  currency: string
  pricingMode: string
  installmentsMax: number | null
  trialDays: number | null
  guaranteeDays: number | null
  availableFrom: string | null
  availableUntil: string | null
  isAvailable: boolean
  productId: string
  productName: string | null
  createdAt: string
  updatedAt: string
}

export interface CouponView {
  id: string
  version: number
  code: string
  type: string
  percentOff: number | null
  amountOffCents: number | null
  currency: string
  status: string
  appliesToAll: boolean
  minPurchaseCents: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  validFrom: string | null
  validUntil: string | null
  offerIds: string[]
  createdAt: string
  updatedAt: string
}

// ── Pagamentos (espelha as views admin do @sistemazero/payments) ──
// ⚠️ Valores monetários vêm como STRING (bigint serializado em centavos) — formate
// com `formatCentsStr` (Number() é seguro p/ valores reais BRL).

export const PAYMENT_STATUSES = [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_METHODS = ['PIX', 'BOLETO', 'CREDIT_CARD'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const SUBSCRIPTION_STATUSES = ['PENDING', 'ACTIVE', 'CANCELED', 'EXPIRED'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/** Rótulos PT-BR dos métodos (para tabela/detalhe/filtros). */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão',
}

export interface PaymentView {
  id: string
  consumerId: string
  status: string
  method: string
  amountInCents: string
  currency: string
  description: string | null
  pix?: { txid: string; copiaECola: string; imagemQrcodeBase64?: string; expiresAt: string | null }
  boleto?: { barcode: string; digitableLine: string; pdfUrl: string; expiresAt: string | null }
  card?: { brand: string; last4: string; installments: number }
  metadata: Record<string, unknown>
  createdAt: string
  paidAt: string | null
  // Extras admin
  version: number
  provider: string
  providerPaymentId: string | null
  txid: string | null
  failureReason: string | null
  subscriptionId: string | null
  expiresAt: string | null
  updatedAt: string
  customer: { name: string; email: string; document: string; phone: string | null } | null
  refundedAt: string | null
  providerRefundId: string | null
}

export interface SubscriptionView {
  id: string
  consumerId: string
  status: string
  intervalMonths: number
  repeats: number | null
  amountInCents: string
  currency: string
  card: { brand: string; last4: string }
  cyclesCompleted: number
  lastChargeAt: string | null
  description: string | null
  metadata: Record<string, unknown>
  providerSubscriptionId: string | null
  canceledAt: string | null
  createdAt: string
}

export interface PaymentStatusBucket {
  status: string
  count: number
  amountInCents: string
}
export interface PaymentMethodBucket {
  method: string
  count: number
  amountInCents: string
}
export interface PaymentStats {
  totalCount: number
  paidCount: number
  paidAmountInCents: string
  refundedAmountInCents: string
  byStatus: PaymentStatusBucket[]
  byMethod: PaymentMethodBucket[]
}

export interface PaymentOps {
  outboxPending: number
  outboxDead: number
  paymentsAwaitingCharge: number
  webhookDeliveriesPending: number
  webhookDeliveriesDead: number
  reconcilePending: number
}
