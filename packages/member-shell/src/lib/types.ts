/**
 * Tipos compartilhados client/server do app do aluno. SEM lógica e SEM imports de
 * `server/*` — Client Components importam daqui com segurança. Espelham as views
 * REAIS dos serviços (members `application/mappers/views.ts`, payments
 * `application/mappers/payment-view.ts`, auth `application/mappers/user-view.ts`).
 */

// Tipos do editor embarcável (bloco `studio`) — type-only (erasado em runtime).
import type { BlockLevel, CheckResult, IDEMode, LessonActivity, Project } from '@sistemazero/studio'

// ── Sessão / usuário (claims do JWT do auth) ────────────────────────────────

/**
 * Claim de ATOR (RFC 8693 `act`): presente quando a sessão é de IMPERSONAÇÃO —
 * um admin navegando como o aluno (suporte). `sub` = id do admin; `email`/`name`
 * são do ADMIN (exibição no banner). Sessão normal não tem a claim.
 */
export interface ActClaim {
  sub: string
  email?: string
  name?: string
}

/**
 * Claim de PERFIL (estilo Netflix `pfl`): a sessão age COMO um perfil de criança —
 * `id` (sub) do JWT = o perfil; `accountId` = a conta do responsável; `name` = nome
 * do perfil (a UI exibe em vez do nome da conta). Sessão da conta não tem a claim.
 */
export interface ProfileClaim {
  accountId: string
  name?: string
}

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  /** Sessão de impersonação (suporte). Ausente = sessão normal do aluno. */
  act?: ActClaim
  /** Sessão de PERFIL (kids): conta do responsável + nome do perfil ativo. Ausente = sessão da conta. */
  activeProfile?: ProfileClaim
}

/** Perfil (estilo Netflix) — a grade do responsável (view do `/auth/profiles`). */
export interface ProfileView {
  id: string
  name: string
  avatarUrl: string | null
  whatsapp: string | null
  /** Data de nascimento (`YYYY-MM-DD`) — só os pais editam (controle de idade). */
  birthDate: string | null
  sortOrder: number
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

/**
 * `GET /members/access?refs=` → mapa ref→tem-acesso. Gate de produtos que NÃO são
 * curso de trilha (ex.: o Estúdio Completo vendável). Distinto do `AccessView` acima
 * (matrícula de curso) — este é a resposta da checagem de acesso por ref.
 */
export interface ProductAccessView {
  access: Record<string, boolean>
}

/** Config de autoria do bloco certificado (espelha CertificateBlock do members). */
export interface CertificateConfig {
  title?: string
  issuerName?: string
  signatureImageUrl?: string
  logoUrl?: string
  accentColor?: string
  message?: string
}

/** Conteúdo member-facing do bloco certificado (`kind` + config). */
export interface CertificateBlock extends CertificateConfig {
  kind: 'certificate'
}

/** Certificado emitido (devolvido na emissão; o BFF usa p/ montar o PDF). */
export interface CertificateView {
  id: string
  serial: string
  studentName: string
  courseTitle: string
  courseRef: string
  completedAt: string
  issuedAt: string
  revokedAt: string | null
}

/** Resposta da emissão: registro + config do bloco. */
export interface CertificateIssueView {
  certificate: CertificateView
  config: CertificateConfig
}

/** Estado do bloco certificado p/ a UI (emitir vs baixar). */
export interface CertificateStateView {
  eligible: boolean
  issued: boolean
  revoked: boolean
  serial: string | null
  issuedAt: string | null
  revokedAt: string | null
}

/** Validação pública do certificado (`/validar/:id`) — só dados não-sensíveis. */
export interface CertificateValidationView {
  valid: boolean
  studentName: string | null
  courseTitle: string | null
  issuedAt: string | null
  serial: string | null
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
/**
 * Interativo v3: HTML que roda SEMPRE em iframe sandbox 16:9 (largura total).
 * `embedType`/`src`/`height` são legado da autoria v2 (renderer ignora).
 */
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
/**
 * E-book member-facing: SEM `url` (a localização real do PDF nunca chega ao
 * browser) — o livro 3D busca o PDF pela rota autenticada do BFF, que aplica a
 * marca d'água do aluno.
 */
export interface EbookBlock {
  kind: 'ebook'
  title?: string
}
/**
 * Bloco Estúdio: renderiza o @sistemazero/studio pré-configurado pelo admin. A config
 * NÃO é segredo (o aluno precisa dela p/ montar o editor). `initialProject` é o snapshot
 * `Project` da lib. A entrega do aluno (mesmo JSON do "Exportar projeto") bloqueia a
 * conclusão da aula até ser enviada — `studioState` reflete se já enviou.
 */
export interface StudioBlock {
  kind: 'studio'
  initialProject: Project
  level?: BlockLevel
  allowBlocks?: string[]
  allowCategories?: string[]
  allowedModes?: IDEMode[]
  allowLevelReveal?: boolean
  /** Atividade com auto-correção (fase 2). Vai ao aluno (feedback instantâneo). */
  activity?: LessonActivity
  /**
   * Nome do projeto contínuo (cadeia). Quando presente, o editor carrega a última
   * entrega do aluno no bloco contínuo da aula anterior da mesma cadeia (carryover).
   */
  chain?: string
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

/** Estado das tentativas do aluno num bloco de quiz (vem no GET da aula). */
export interface QuizStateView {
  lastScore: number | null
  passed: boolean
  attemptsCount: number
  /** ISO; não-nulo só durante o cooldown de retry após reprovar. */
  retryAvailableAt: string | null
}

/** Estado da entrega do aluno num bloco de estúdio (vem no GET da aula). */
export interface StudioStateView {
  submitted: boolean
  /** ISO da última entrega; `null` se ainda não enviou. */
  submittedAt: string | null
  /** Nota da última correção (atividade); `null` sem atividade ou sem entrega. */
  lastScore?: number | null
  /** Atingiu a nota de corte (sticky). */
  passed?: boolean
}

/** `POST /members/lessons/:lessonId/blocks/:blockId/studio-submission`. */
export interface StudioSubmissionResultView {
  submittedAt: string
  /** Auto-correção (presentes só quando o bloco tem atividade). */
  score?: number
  passed?: boolean
  results?: CheckResult[]
  gamification?: GamificationDelta | null
}

/** Correção por questão — devolvida SÓ pelo submit do quiz. */
export interface QuizQuestionResultView {
  questionId: string
  correct: boolean
  correctChoiceIds: string[]
  explanation: string | null
}

// ── Gamificação (XP/streak/badges — vitrine v1 = community-kids) ────────────
/** Catálogo v1 de badges (mirror de members `domain/gamification/badges.ts`). */
export type BadgeSlug =
  | 'first-lesson'
  | 'streak-7'
  | 'streak-30'
  | 'streak-60'
  | 'streak-180'
  | 'streak-365'
  | 'course-complete'
  | 'course-complete-2'
  | 'course-complete-3'
  | 'quiz-perfect'
  | 'quiz-perfect-10'
  | 'quiz-perfect-30'
  // Maestria (06/2026): projetos do Estúdio + poupador de moedas.
  | 'studio-first'
  | 'studio-master-3'
  | 'studio-master-10'
  | 'coins-saver-300'
  | 'coins-saver-1000'

/**
 * Delta de UMA ação (complete/quiz aprovado) — vem NA resposta da ação (a UI
 * celebra sem round-trip). `null` = award falhou no members (fail-open) ou
 * resposta de um members antigo sem o campo.
 */
export interface GamificationDelta {
  /** XP desta ação (0 = já premiado antes — ledger idempotente). */
  xpAwarded: number
  totalXp: number
  streak: { current: number; best: number; extended: boolean }
  /** `slug` largo de propósito (forward-compat) — a UI ignora slug desconhecido. */
  badgesUnlocked: { slug: string; unlockedAt: string }[]
  /** `true` quando ESTA ação fechou a unidade (baú já incluído no xpAwarded). */
  unitCompleted: boolean
  /** Moedas Zappy ganhas nesta ação (já com teto diário). `?? 0` p/ members antigo. */
  coinsAwarded?: number
  /** Saldo da carteira Zappy após a ação. */
  coinBalance?: number
  /** `true` quando o teto diário cortou parte do ganho (feedback gentil). */
  coinsCapped?: boolean
}

/** `GET /members/gamification/me` — widgets (sidebar/home) e vitrine do perfil. */
export interface GamificationMeView {
  xp: number
  /**
   * Carteira Zappy Coins (saldo gastável). Opcional p/ tolerar members antigo.
   * `unlimited` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞.
   */
  coins?: { balance: number; unlimited?: boolean }
  streak: {
    /** Streak de exibição: 0 quando quebrado. */
    current: number
    best: number
    /** Já houve atividade com XP hoje (dia civil de São Paulo). */
    activeToday: boolean
    /** Protetores de sequência disponíveis (opcional p/ tolerar members antigo). */
    freezesAvailable?: number
    /** Hoje está em férias (sequência pausada sem culpa). */
    onVacation?: boolean
    /** Fim das férias quando `onVacation` (data civil SP). */
    vacationUntil?: string | null
  }
  /** Catálogo COMPLETO na ordem do members — bloqueada tem `unlockedAt: null`. */
  badges: { slug: string; unlockedAt: string | null }[]
  /**
   * Colocação no ranking de XP da VITRINE do app (rankings adult/kids são
   * separados). Presente só quando pedido com `withRanking` (página de perfil).
   */
  ranking?: { position: number; totalStudents: number }
}

// ── Missões + proteção de sequência — espelham as views do members ──────────
export interface MissionView {
  slug: string
  cadence: 'daily' | 'weekly'
  goalType: string
  target: number
  progress: number
  completed: boolean
  claimed: boolean
  rewardXp: number
  rewardCoins: number
  periodKey: string
}
export interface MissionsMeView {
  daily: MissionView[]
  weekly: MissionView[]
}
export interface MissionClaimResult {
  claimed: boolean
  xpAwarded: number
  coinsAwarded: number
  coinBalance: number
}
export interface StreakFreezeResult {
  freezes: number
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  unlimited?: boolean
}
export interface VacationResult {
  vacationFrom: string | null
  vacationTo: string | null
}

// ── Liga semanal — espelha as views do members (board SEM PII) ──────────────
export interface LeagueEntryView {
  position: number
  weeklyXp: number
  isMe: boolean
}
export interface LeagueMeView {
  tier: string
  weekKey: string
  promotionCount: number
  relegationCount: number
  entries: LeagueEntryView[]
  myPosition: number
}

// ── Avatar 3D (configurador por categorias) — espelha as views do members ───
/** Peça+cor equipada por categoria (`color` ausente em categoria sem paleta). */
export interface AvatarSlotView {
  asset: string
  color?: string
}

/** Config equipada enviada ao salvar (`PUT /members/avatar`). `slots` = categoria→peça+cor. */
export interface AvatarConfigInput {
  style?: string
  slots: Record<string, AvatarSlotView>
}

/** Uma peça do catálogo na visão do aluno (lojinha). `category` largo (forward-compat). */
export interface AvatarPartView {
  id: string
  category: string
  tier: 'free' | 'coins'
  price: number
  owned: boolean
  locked: boolean
}

/** `GET /members/avatar` — equipado + catálogo + paletas + foto + saldo Zappy. */
export interface AvatarStateView {
  style: string
  equipped: Record<string, AvatarSlotView>
  parts: AvatarPartView[]
  /** Paleta de cores por categoria (categoria sem cor é omitida). */
  palettes?: Record<string, string[]>
  /** Oclusão de render (chapéu real esconde o cabelo). */
  hideGroups?: Record<string, string[]>
  /** Categoria removível → id da peça "nenhum". */
  removable?: Record<string, string>
  /** Foto (snapshot) atual do avatar 3D — `null` se ainda não salvou. */
  photoUrl?: string | null
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  balanceUnlimited?: boolean
}

/** Resposta da compra de peça (`POST /members/avatar/parts/:id/buy`). */
export interface AvatarPurchaseResult {
  alreadyOwned: boolean
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  unlimited?: boolean
}

/** Resposta de salvar a config (`PUT /members/avatar`). */
export interface AvatarEquipResult {
  equipped: Record<string, AvatarSlotView>
  style: string
}

/** Resposta de salvar a foto/snapshot (`POST /api/members/avatar/snapshot`). */
export interface AvatarSnapshotResult {
  url: string
}

// ── Quarto virtual ──────────────────────────────────────────────────────────
export interface RoomPlacedItem {
  itemId: string
  x: number
  y: number
  /** Rotação em quartos de volta (0=0°, 1=90°, 2=180°, 3=270°). Ausente = 0. Só item de chão. */
  rot?: 0 | 1 | 2 | 3
  /** Item de PAREDE: em qual parede (x=horizontal, y=altura). Ausente = item de chão. */
  wall?: 'left' | 'right'
}
/** Cor de cada parede do recorte em "L" (hex da paleta). Lado ausente = default do tema. */
export interface RoomWallColors {
  left?: string
  right?: string
}
/** Estado montado do quarto (tema + itens + pet + paredes/piso/luz). Serializável. */
export interface RoomStateView {
  theme: string
  placedItems: RoomPlacedItem[]
  pet: string | null
  wallColors?: RoomWallColors
  floor?: string
  lighting?: string
}
/** Item/tema do catálogo do quarto (lojinha/editor). `category` largo (forward-compat). */
export interface RoomItemView {
  id: string
  category: string
  tier: 'free' | 'coins'
  price: number
  owned: boolean
  locked: boolean
}
export interface RoomThemeView {
  id: string
  tier: 'free' | 'coins'
  price: number
  owned: boolean
  locked: boolean
}
/** `GET /members/room` — quarto montado + catálogo + saldo. */
export interface RoomEditorView {
  state: RoomStateView
  items: RoomItemView[]
  themes: RoomThemeView[]
  /** Pisos e presets de iluminação/clima (mesmo shape de tema). */
  floors: RoomThemeView[]
  lightings: RoomThemeView[]
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  balanceUnlimited?: boolean
}
export interface RoomBuyResult {
  alreadyOwned: boolean
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  unlimited?: boolean
}

/** Identidade pública de um perfil (auth S2S) — só nome + flag (nunca PII). */
export interface PublicProfileIdentity {
  name: string
  publicProfileEnabled: boolean
}

/** Dado de jogo do perfil público (members) — sem identidade. */
export interface PublicProfileGameView {
  profileId: string
  xp: number
  ranking: { position: number; totalStudents: number } | null
  /** SÓ as conquistas que a criança tem (não o catálogo). */
  badges: { slug: string; unlockedAt: string }[]
  avatar: { style: string; slots: Record<string, AvatarSlotView> }
  /** Foto (snapshot) do avatar 3D — mostrada no card público; `null` se nunca tirou. */
  avatarPhotoUrl?: string | null
  /** Quarto virtual (modo visualização) — `null` se a criança nunca montou. */
  room: RoomStateView | null
}

/** Perfil público COMPLETO (BFF junta nome do auth + dado de jogo do members). */
export interface PublicProfileDTO extends PublicProfileGameView {
  name: string
}

/** Resumo de progresso de UM filho (perfil) — espelha a view do members. */
export interface ChildStatsView {
  profileId: string
  xp: number
  streak: { current: number; best: number }
  badgesCount: number
  coursesInProgress: number
  coursesCompleted: number
  /** Projetos do Estúdio que a criança entregou. */
  projectsCount: number
  /** Colocação no ranking da vitrine (null = conta sem matrícula). */
  rankingPosition: number | null
}

/** Card do filho na área dos pais: stats do members + identidade do perfil (auth). */
export interface ChildDashboardView extends ChildStatsView {
  name: string
  avatarUrl: string | null
}

/** Dica de vitrine (Mural): a aula concluída é ponto de auto-publicação. */
export interface LessonCompleteShowcaseHint {
  /** Bloco de estúdio a publicar (o BFF re-busca o conteúdo autoritativo). */
  blockId: string
  /** Título do projeto (preview do botão "Publicar no Mural"). */
  title: string
}

/** `POST /members/lessons/:lessonId/complete` — progresso + delta de gamificação. */
export interface LessonCompleteResult extends CourseProgressView {
  gamification: GamificationDelta | null
  /** Aula é ponto de vitrine (bloco de estúdio com `showcase.enabled`); `null` se não. */
  showcase: LessonCompleteShowcaseHint | null
}

/** `POST /members/lessons/:lessonId/blocks/:blockId/quiz-attempts`. */
export interface QuizAttemptResultView {
  score: number
  passed: boolean
  passingScore: number
  attemptsCount: number
  retryAvailableAt: string | null
  questions: QuizQuestionResultView[]
  /** Delta de XP/streak — só quando APROVADO (`null` reprovado/award falhou). */
  gamification?: GamificationDelta | null
}

/** Bloco como chega da API (`content` é `unknown` na borda — narrowing por `kind`). */
export interface LessonBlockView {
  id: string
  kind: string
  sortOrder: number
  content: unknown
  /** Presente só em blocos de quiz. */
  quizState?: QuizStateView | null
  /** Presente só em blocos de estúdio. */
  studioState?: StudioStateView | null
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

/**
 * `GET …/blocks/:blockId/ebook/resolve` (server↔server, SÓ o BFF consome):
 * localização real do PDF do e-book. NUNCA repassar `storageRef` ao browser.
 */
export interface EbookDownloadView {
  title: string | null
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

// ── Comunidade (fórum — @sistemazero/hub) ───────────────────────────────────
// Espelham as views STUDENT-facing do hub (`application/mappers/{views,thread-views}.ts`).

/** Servidor visto pelo aluno (sem accessConfig — detalhe interno do hub). */
export interface HubSpaceView {
  id: string
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  audience: 'adult' | 'kids'
  /** Aparece BLOQUEADO no menu (sem acesso): a UI mostra um recado e NÃO carrega canais. */
  locked: boolean
}

/** Canal (fórum) visto pelo aluno. `requiresApproval` é o efetivo (canal ?? space). */
export interface HubChannelView {
  id: string
  spaceId: string
  slug: string
  name: string
  topic: string | null
  postingPolicy: 'members' | 'staff_only'
  requiresApproval: boolean
  /** Há atividade depois da última visita (badge de novidade). */
  hasUnread: boolean
}

export type HubContentStatus = 'pending' | 'visible' | 'hidden' | 'deleted' | 'rejected'

/** Resumo agregado de um emoji num tópico/comentário. */
export interface HubReaction {
  emoji: string
  count: number
  reactedByMe: boolean
}

export type HubAttachmentKind = 'image' | 'pdf' | 'document' | 'audio' | 'video'

/** Anexo na view (SEM storageRef — o download é por `/api/hub/attachments/:id`). */
export interface HubAttachmentView {
  id: string
  kind: HubAttachmentKind
  mime: string
  sizeBytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  originalName: string
}

/**
 * Resolução de anexo do hub — consumida SÓ pelo BFF (traz a `storageRef` que
 * NUNCA vai ao browser; o BFF mina a URL pré-assinada a partir dela).
 */
export interface HubResolvedAttachment {
  id: string
  storageRef: string
  mime: string
  kind: HubAttachmentKind
  originalName: string
  sizeBytes: number
}

export interface HubThreadView {
  id: string
  channelId: string
  /** `null` quando NÃO é do viewer — o BFF redige o id de terceiros (ver `hub-redact`). */
  authorId: string | null
  /**
   * Id do PERFIL do autor p/ o link ao perfil público (`/crianca/[id]`) — presente SÓ
   * quando o autor é PÚBLICO (opt-in dos pais). `null`/ausente → sem link (a UI cai em
   * "Colega" no fórum; o Mural mostra o nome sem link).
   */
  authorProfileId?: string | null
  title: string
  slug: string
  body: string
  isPinned: boolean
  isLocked: boolean
  status: HubContentStatus
  /** Aguardando aprovação (só o autor/staff enxerga). */
  pending: boolean
  commentCount: number
  /** Post de PROJETO da vitrine (Mural) — a UI renderiza como card com capa/autor. */
  isShowcase: boolean
  /** Primeiro nome do autor (snapshot) — exibido na vitrine e no fórum (clicável se público). */
  authorDisplayName: string | null
  /** Perfil do autor é público (opt-in dos pais) — a UI decide o link. */
  authorPublic?: boolean
  /** Capa do projeto (URL pública) — só na vitrine. */
  coverImageUrl: string | null
  /**
   * Id público do artefato jogável (UUID) — só na vitrine do Estúdio. Quando
   * presente, o card do Mural mostra "Acessar" → `/jogar/<playId>` (página pública
   * sem login). `null` = sem link jogável (posts antigos / fluxo da aula).
   */
  playId: string | null
  reactions: HubReaction[]
  attachments: HubAttachmentView[]
  lastActivityAt: string
  createdAt: string
  editedAt: string | null
}

/** Payload autoritativo da vitrine (members) — o BFF monta o post a partir dele. */
export interface ShowcasePayloadView {
  eligible: boolean
  title: string
  summary: string
  defaultCoverUrl: string | null
  chain: string | null
  courseId: string
  audience: 'adult' | 'kids'
}

export interface HubCommentView {
  id: string
  threadId: string
  /** `null` quando NÃO é do viewer — o BFF redige o id de terceiros (ver `hub-redact`). */
  authorId: string | null
  /** Id do perfil do autor p/ o link (`/crianca/[id]`) — só quando público. Ver `HubThreadView`. */
  authorProfileId?: string | null
  /** Primeiro nome do autor (snapshot) — exibido/clicável no fórum (se público). */
  authorDisplayName?: string | null
  /** Perfil do autor é público (opt-in dos pais) — a UI decide o link. */
  authorPublic?: boolean
  body: string
  status: HubContentStatus
  pending: boolean
  reactions: HubReaction[]
  attachments: HubAttachmentView[]
  replyToId: string | null
  createdAt: string
  editedAt: string | null
}

/** Página por cursor opaco (tópicos/comentários). */
export interface HubPage<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}
