/**
 * Contratos compartilhados entre o BFF e os componentes do painel. Espelham as
 * views do @sistemazero/catalog e o UserView do @sistemazero/auth (type-only —
 * seguro p/ Client Components).
 */

// Tipos do editor embarcável (bloco `studio`) — type-only (erasado em runtime).
// As atividades (auto-correção) reusam os tipos PÚBLICOS do @sistemazero/studio
// (sem mirror próprio — evita drift; o members tem o espelho do lado servidor).
import type { BlockLevel, CheckResult, IDEMode, LessonActivity, Project } from '@sistemazero/studio'

export type { ActivityCheck, CheckResult, LessonActivity } from '@sistemazero/studio'

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

/** Um perfil (estilo Netflix) da conta + seu progresso (nome do auth, progresso do members). */
export interface MemberProfileProgress {
  id: string
  name: string
  avatarUrl: string | null
  progress: MemberCourseProgressView[]
}

/** Detalhe do membro (members) + identidade hidratada (auth). */
export interface MemberDetail {
  userId: string
  user: UserView | null
  entitlements: AdminEntitlementView[]
  progress: MemberCourseProgressView[]
  /** Perfis da conta (estilo Netflix) com progresso por perfil — vazio = conta sem perfis. */
  profiles?: MemberProfileProgress[]
}

// ── Autoria de conteúdo (espelha admin-content-views do @sistemazero/members) ──

export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const
export type CourseStatus = (typeof COURSE_STATUSES)[number]

/** Plataforma do curso: `adult` (community) | `kids` (community-kids). */
export const COURSE_AUDIENCES = ['adult', 'kids'] as const
export type CourseAudience = (typeof COURSE_AUDIENCES)[number]
export const AUDIENCE_LABELS: Record<CourseAudience, string> = {
  adult: 'Adulto',
  kids: 'Kids',
}

export interface CourseView {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  /** Página de vendas (funil) — destino do cadeado no catálogo do community. */
  salesPageUrl: string | null
  status: string
  /** Plataforma do curso (`adult` | `kids`) — a chave-mestra cobre só `adult`. */
  audience: CourseAudience
  /** Trava sequencial das aulas (estilo Duolingo) ligada para este curso. */
  sequentialLock: boolean
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
  isPublished: boolean
}

/** Árvore do curso (editor): curso + módulos (ordenados) + aulas (resumidas). */
export interface CourseTreeView extends CourseView {
  modules: (ModuleView & { lessons: LessonView[] })[]
}

// Blocos: união discriminada por `kind` (espelha o domínio do members).
export const LESSON_BLOCK_KINDS = [
  'rich_text',
  'video',
  'image',
  'audio',
  'quiz',
  'embed',
  'ebook',
  'studio',
  'certificate',
] as const
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
/** Interativo v3: SEMPRE iframe sandbox com HTML (embedType/src/height = legado). */
export interface EmbedBlock {
  kind: 'embed'
  html?: string
  sandbox?: string
  /** @deprecated legado da autoria v2 */
  embedType?: string
  /** @deprecated legado da autoria v2 */
  src?: string
  /** @deprecated legado da autoria v2 */
  height?: number
}
/** E-book (PDF no bucket R2 privado) → livro 3D na área do aluno. */
export interface EbookBlock {
  kind: 'ebook'
  /** Referência `r2priv:<key>` (não navegável). */
  url: string
  title?: string
}
/**
 * Bloco Estúdio: editor @sistemazero/studio pré-configurado pelo admin. `initialProject`
 * é o snapshot autorado no editor embutido (nome/tipo/código de partida); os demais
 * campos são a config de aprendizado (nível, allowlist de blocos, modos).
 */
export interface StudioBlock {
  kind: 'studio'
  initialProject: Project
  level?: BlockLevel
  allowBlocks?: string[]
  allowCategories?: string[]
  allowedModes?: IDEMode[]
  allowLevelReveal?: boolean
  /** Atividade com auto-correção (fase 2). Ausente = bloco só de entrega. */
  activity?: LessonActivity
  /** Nome do projeto contínuo (cadeia). Aulas com o mesmo nome carregam o código entre si. */
  chain?: string
  /** Vitrine (Mural dos Criadores): config da auto-publicação ao concluir a última aula. */
  showcase?: {
    enabled: boolean
    title?: string
    summary?: string
    defaultCoverUrl?: string
  }
}
/** Uma assinatura no certificado: imagem (URL http(s)) + nome. */
export interface CertificateSignature {
  imageUrl?: string
  name?: string
}
/**
 * Bloco Certificado: o "diploma" do curso. Pode ficar em qualquer aula — libera quando
 * TODAS as aulas ANTES dela estão concluídas (aulas depois não contam). A config é metadado
 * de AUTORIA do PDF: cada curso sobe a `baseImageUrl` (fundo A4 paisagem com logo/título/
 * decoração) e o conteúdo dinâmico (abertura/nome/frase/parágrafo/data/assinaturas/QR) é
 * desenhado por cima. O members congela o registro e o community/BFF monta o PDF. ⚠️ A aula
 * do certificado NÃO pode ter blocos que travam a conclusão (quiz com nota / estúdio).
 */
export interface CertificateBlock {
  kind: 'certificate'
  /** Imagem base do certificado (fundo A4 paisagem, por curso) — URL http(s). */
  baseImageUrl?: string
  /** Linha fixa antes do nome (default "Certificamos que o aluno"). */
  introLine?: string
  /** Frase curta específica do curso (o que concluiu), abaixo do nome. */
  coursePhrase?: string
  /** Parágrafo explicando o que o aluno fez. */
  bodyText?: string
  /** Assinaturas (até 2): imagem + nome. */
  signatures?: CertificateSignature[]
  /** Cor do texto desenhado sobre a imagem (hex, ex.: `#0D1117`). */
  accentColor?: string
  /** @deprecated layout antigo (sem imagem base). */
  title?: string
  issuerName?: string
  signatureImageUrl?: string
  logoUrl?: string
  message?: string
}
export type LessonBlockContent =
  | RichTextBlock
  | VideoBlock
  | ImageBlock
  | AudioBlock
  | QuizBlock
  | EmbedBlock
  | EbookBlock
  | StudioBlock
  | CertificateBlock

/** Resumo de UMA entrega do Estúdio (admin), com identidade hidratada do auth. */
export interface StudioSubmissionRow {
  /** Quem entregou (perfil da criança no kids; a conta no adulto). */
  userId: string
  submittedAt: string
  /** Nome do RESPONSÁVEL (conta). */
  accountName: string | null
  /** E-mail do responsável (conta) — ajuda a identificar. */
  accountEmail: string | null
  /** Nome da CRIANÇA (perfil) quando a entrega veio de um perfil; `null` no adulto. */
  childName: string | null
  /** Correção automática (atividade): nota/aprovado; `null` sem atividade. */
  score: number | null
  checkedAt: string | null
  passed: boolean
  /** Recado OPCIONAL do aluno ao professor. `null` = sem recado. */
  message: string | null
}

/** Projeto enviado por um aluno (abrir no Estúdio embutido do admin) + correção. */
export interface StudioSubmissionDetailView {
  project: Project
  submittedAt: string
  score: number | null
  /** Resultado por checagem (`verifiedBy`: server recalculado × client reportado). */
  results: CheckResult[] | null
  checkedAt: string | null
  passed: boolean
  /** Recado OPCIONAL do aluno ao professor. `null` = sem recado. */
  message: string | null
}

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

// Fulfillment (entrega/acesso): espelha `domain/product/fulfillment.ts` do catalog.
// Entrega EXCLUSIVAMENTE via área de membros: `course` (um curso),
// `all_courses` (chave-mestra ADULTA) ou `all_kids_courses` (chave-mestra KIDS) —
// cada chave-mestra cobre todos os cursos da SUA audiência (atuais e futuros).
export type AccessType = 'course' | 'all_courses' | 'all_kids_courses' | 'community'
export type ReleaseMode = 'immediate' | 'days_after_purchase' | 'fixed_date'

export interface ReleaseRule {
  mode: ReleaseMode
  /** Dias após a compra (quando `mode = days_after_purchase`). */
  days?: number
  /** Data fixa ISO-8601 (quando `mode = fixed_date`). */
  date?: string
}

export interface FulfillmentSpec {
  accessType: AccessType
  /** SLUG do curso na área de membros (obrigatório quando `accessType = course`). */
  courseRef?: string
  release?: ReleaseRule
  /** Teto de PERFIS (estilo Netflix) liberado — plataforma Kids. Inteiro ≥ 1. */
  maxProfiles?: number
}

/** Componente de um combo (produto `kind=bundle`). */
export interface ProductComponentView {
  productId: string
  sortOrder: number
  isPrimary: boolean
}

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
  fulfillment: FulfillmentSpec | null
  metadata: Record<string, unknown> | null
  components: ProductComponentView[]
  createdAt: string
  updatedAt: string
}

/** Item extra (bônus) concedido pela oferta além do produto principal. */
export interface OfferItemView {
  productId: string
  sortOrder: number
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
  items: OfferItemView[]
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

/** Janela de garantia da oferta comprada (resolvida no BFF: metadata.offerId → catálogo). */
export interface PaymentGuarantee {
  /** ISO-8601 — fim da garantia (paidAt + guaranteeDays). */
  until: string
  /** Dias restantes (ceil; 0 quando `expired`). */
  daysLeft: number
  expired: boolean
  /** Janela configurada na oferta (p/ exibir "X dias"). */
  guaranteeDays: number
}

/** Linha de transação enriquecida pelo BFF (garantia é best-effort → null se indisponível). */
export interface PaymentRow extends PaymentView {
  guarantee: PaymentGuarantee | null
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

// ── Notas fiscais (espelha as views admin do @sistemazero/fiscal) ──
// ⚠️ `amountInCents` vem como STRING (bigint serializado) — formate com `formatCentsStr`.

export const INVOICE_STATUSES = [
  'SCHEDULED',
  'EMITTED',
  'SKIPPED',
  'FAILED',
  'CANCEL_PENDING',
  'CANCELLED',
  'SUBSTITUTED',
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export interface InvoiceView {
  id: string
  paymentId: string
  status: string
  customer: { name: string; email: string; document: string }
  amountInCents: string
  serviceDescription: string
  guaranteeDays: number | null
  paidAt: string
  scheduledFor: string
  attempts: number
  lastError: string | null
  skipReason: string | null
  dpsSeries: string | null
  dpsNumber: string | null
  accessKey: string | null
  competenceDate: string | null
  ambiente: string
  emittedAt: string | null
  cancelReason: string | null
  cancelRequestedBy: string | null
  cancelledAt: string | null
  substitutesId: string | null
  substitutedById: string | null
  pdfStoredAt: string | null
  emailSentAt: string | null
  createdAt: string
}

export interface InvoiceEventView {
  id: string
  type: string
  actor: string | null
  detail: Record<string, unknown>
  createdAt: string
}

/** Lista paginada do fiscal (o serviço devolve só `items`+`total`). */
export interface InvoiceList {
  items: InvoiceView[]
  total: number
}

/** Detalhe da nota: snapshot + timeline de eventos. */
export interface InvoiceDetail {
  invoice: InvoiceView
  events: InvoiceEventView[]
}

export interface FiscalStats {
  byStatus: Record<string, number>
}

// ── Série diária do painel "Gestão de vendas" ──

/** Bucket de um dia civil (America/Sao_Paulo). Valores em centavos como STRING. */
export interface DailyPaymentBucket {
  /** YYYY-MM-DD — início do bucket (dia, semana ou mês conforme `granularity`). */
  day: string
  /** YYYY-MM-DD — último dia coberto pelo bucket (presente só quando agregado). */
  periodEnd?: string
  /** Recebido no dia (pagamentos confirmados naquele dia, mesmo que estornados depois). */
  grossAmountInCents: string
  /** Estornado no dia. */
  refundedAmountInCents: string
  /** Líquido = recebido − estornado. Pode ser NEGATIVO. */
  netAmountInCents: string
  /** Cobranças criadas no dia (qualquer status). */
  transactions: number
  /** Estornos no dia. */
  cancellations: number
}

/** Granularidade dos buckets da série (janelas longas são agregadas no BFF). */
export type SalesGranularity = 'day' | 'week' | 'month'

/** Série DENSA (o BFF preenche dias sem movimento com zeros) + totais do período. */
export interface DailyPaymentStats {
  from: string
  to: string
  /** day p/ janelas ≤90 dias; week p/ ≤270; month acima. */
  granularity: SalesGranularity
  days: DailyPaymentBucket[]
  totals: {
    netAmountInCents: string
    grossAmountInCents: string
    refundedAmountInCents: string
    transactions: number
    cancellations: number
  }
}
