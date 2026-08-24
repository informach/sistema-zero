/**
 * Contratos compartilhados entre o BFF e os componentes do painel. Espelham as
 * views do @sistemazero/catalog e o UserView do @sistemazero/auth (type-only —
 * seguro p/ Client Components).
 */

// Tipos do editor embarcável (bloco `studio`) — type-only (erasado em runtime).
// As atividades (auto-correção) reusam os tipos PÚBLICOS do @sistemazero/studio
// (sem mirror próprio — evita drift; o members tem o espelho do lado servidor).
import type {
  AnyBlockLevel,
  CheckResult,
  IDEMode,
  LessonActivity,
  Project,
} from '@sistemazero/studio'

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
  /**
   * A conta já definiu a própria senha? `false` = convite/compra pendente (senha
   * aleatória) — a UI destaca "acesso pendente" e oferece reenviar/definir senha.
   */
  passwordSet: boolean
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
  /** SKU do snapshot — identidade do cartão de uso da ferramenta. Opcional (skew). */
  sku?: string | null
  sourceKind: string
  sourceId: string
  subscriptionId: string | null
  grantedAt: string
  expiresAt: string | null
  revokedAt: string | null
  /**
   * O acesso está liberado AGORA (régua do members). ⚠️ Opcional porque um
   * members mais antigo que este painel não manda o campo — e nesse caso o selo
   * cai no comportamento anterior em vez de chamar tudo de vencido.
   */
  activeNow?: boolean
}

/** Rótulo do TIPO de produto (kind do catálogo) — a subcoluna "o que é isto". */
export const PRODUCT_KIND_LABELS: Record<string, string> = {
  course: 'Curso',
  ebook: 'E-book',
  tool: 'Ferramenta',
  community: 'Comunidade',
  bundle: 'Combo',
  template_kit: 'Kit',
  service: 'Serviço',
  other: 'Produto',
}

/** Progresso do membro num curso (no detalhe). */
export interface MemberCourseProgressView {
  courseRef: string
  title: string | null
  status: string | null
  completedLessons: number
  totalLessons: number
  percent: number
  /** Campos do members v2 (08/2026) — OPCIONAIS p/ tolerar members mais antigo. */
  courseId?: string | null
  /** Plataforma do curso (`adult`/`kids`); null na linha degradada de ref órfã. */
  audience?: string | null
  /** Última atividade do aprendiz no curso (ISO); null = matriculado e nunca abriu. */
  lastActivityAt?: string | null
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

// ── Ficha 360 do aluno (espelha as views admin do @sistemazero/members) ───────

/** Nível/rank do aluno (noob…god). Rótulo/cor são apresentação (no app). */
export interface StudentLevelView {
  slug: string
  next: string | null
}

/** Gamificação do aprendiz numa vitrine (ficha admin) — subconjunto do `gamification/me`. */
export interface MemberGamificationView {
  xp: number
  coins: { balance: number }
  streak: { current: number; best: number; activeToday: boolean }
  badges: { slug: string; unlockedAt: string | null }[]
  level: StudentLevelView
}

// ── Uso de IA (quota por conta — página "Uso de IA") ─────────────────────────
/** Top conta do mês, com identidade hidratada do auth pelo BFF (best-effort). */
export interface AiUsageTopAccountView {
  accountId: string
  used: number
  /** Conta de equipe (nunca recusada; entra nos totais — o rótulo distingue). */
  privileged: boolean
  name?: string
  email?: string
}

/** Agregados do mês (mirror do members + identidades hidratadas). */
export interface AiUsageStatsView {
  month: string
  monthUsed: number
  todayUsed: number
  accounts: number
  byFeature: { feature: string; used: number }[]
  days: { day: string; used: number }[]
  topAccounts: AiUsageTopAccountView[]
}

export const MEMBER_ACTIVITY_KINDS = [
  'lesson_accessed',
  'lesson_completed',
  'quiz_attempt',
  'studio_submission',
  'pinta_submission',
] as const
export type MemberActivityKind = (typeof MEMBER_ACTIVITY_KINDS)[number]

/** Um item da linha do tempo de atividade do aluno (ficha admin). */
export interface MemberActivityItemView {
  kind: MemberActivityKind
  at: string
  lessonId: string | null
  lessonTitle: string | null
  courseTitle: string | null
  score?: number | null
  passed?: boolean | null
  message?: string | null
}

export interface MemberActivityPage {
  items: MemberActivityItemView[]
  hasMore: boolean
}

/** Certificado emitido (ficha admin) — inclui revogados. */
export interface MemberCertificateView {
  id: string
  serial: string
  courseRef: string
  courseTitle: string
  studentName: string
  issuedAt: string
  completedAt: string
  revokedAt: string | null
}

/** Classificação dada pelo aluno (ficha admin). `rating` = nota 1–5. */
export interface MemberRatingView {
  courseId: string
  courseRef: string | null
  courseTitle: string | null
  rating: number
  comment: string | null
  updatedAt: string
}

// ── Analytics de aprendizado (espelha o @sistemazero/members) ─────────────────

/** Linha do overview de analytics de um curso. */
export interface CourseAnalyticsView {
  courseId: string
  courseRef: string
  title: string
  audience: CourseAudience
  status: string
  publishedLessons: number
  started: number
  completed: number
  completionRate: number
}

/** Uma aula no funil + conclusões. */
export interface LessonFunnelView {
  lessonId: string
  title: string
  moduleTitle: string
  completions: number
}

export interface CourseFunnelView {
  courseId: string
  started: number
  completed: number
  lessons: LessonFunnelView[]
}

// ── Auditoria de ações administrativas (espelha o @sistemazero/auth) ──────────

/** Um registro da trilha de auditoria (quem fez o quê, quando, de onde). */
export interface AuditLogView {
  id: string
  actorId: string
  actorEmail: string | null
  actorRole: string | null
  /** Ator REAL quando a ação saiu de uma sessão de suporte (impersonação); `null` fora dela. */
  impersonatorId: string | null
  action: string
  method: string
  path: string
  targetId: string | null
  status: number
  ip: string | null
  userAgent: string | null
  requestId: string | null
  createdAt: string
}

/** Resposta paginada da trilha (o auth devolve `{items,total,limit,offset}`). */
export interface AuditLogPage {
  items: AuditLogView[]
  total: number
  limit: number
  offset: number
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

/**
 * Dificuldade do curso. As 3 primeiras alimentam o nível do ALUNO (degraus da
 * carreira). `lenda` é uma categoria À PARTE, FORA da carreira: cursos bônus "de
 * formatura" que aparecem só na trilha da Lenda (kids) — NÃO é degrau, por isso NÃO
 * entra em `COURSE_TIER_OPTIONS` (travado por conformance com o core).
 */
export const COURSE_LEVELS = [
  'primeiros-passos',
  'iniciante',
  'intermediario',
  'avancado',
  'lenda',
] as const
export type CourseLevel = (typeof COURSE_LEVELS)[number]
export const LEVEL_LABELS: Record<CourseLevel, string> = {
  'primeiros-passos': 'Primeiros Passos',
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  lenda: 'Lenda',
}

/** Eixo 2D/3D do curso (par com `level` = DEGRAU pedagógico; reforma 07/2026). */
export const COURSE_TRACKS = ['2d', '3d'] as const
export type CourseTrack = (typeof COURSE_TRACKS)[number]

/**
 * Os 7 degraus do select "Nível do curso" — a ordem é a escada da carreira do aluno
 * (entrada primeiro; 2D antes de 3D em cada dificuldade). Duplicação INTENCIONAL do
 * member-shell/members (o admin não importa dos apps de aluno) — manter em lockstep com
 * `COURSE_TIERS` de lá, o que o `career-tier-conformance.test.ts` trava.
 *
 * ⚠️ **Primeiros Passos** (14/08) é o degrau de ENTRADA: uma posição só, o curso que a
 * Faísca faz, mais os bônus dela. Ele existe porque antes o curso-base morava no Iniciante
 * 2D e a divisão Faísca × Construtor(a) era só apresentação — então não havia como dar um
 * curso bônus à Faísca. Só existe no eixo 2D.
 */
export const COURSE_TIER_OPTIONS: readonly {
  level: CourseLevel
  track: CourseTrack
  label: string
}[] = [
  { level: 'primeiros-passos', track: '2d', label: 'Primeiros Passos' },
  { level: 'iniciante', track: '2d', label: 'Iniciante 2D' },
  { level: 'iniciante', track: '3d', label: 'Iniciante 3D' },
  { level: 'intermediario', track: '2d', label: 'Intermediário 2D' },
  { level: 'intermediario', track: '3d', label: 'Intermediário 3D' },
  { level: 'avancado', track: '2d', label: 'Avançado 2D' },
  { level: 'avancado', track: '3d', label: 'Avançado 3D' },
]

/** Rótulo do degrau de um curso (listagens/badges). `lenda` não é degrau → "Lenda". */
export function courseTierLabel(level: string, track?: string): string {
  if (level === 'lenda') return 'Lenda'
  const found = COURSE_TIER_OPTIONS.find((o) => o.level === level && o.track === (track ?? '2d'))
  return found?.label ?? level
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
  /** Dificuldade do curso (`iniciante` | `intermediario` | `avancado`). */
  level: CourseLevel
  /** Eixo 2D/3D (par com `level` = degrau). Opcional p/ tolerar members antigo. */
  track?: CourseTrack
  /** Posição na etapa da carreira; `null` = curso bônus. */
  careerSlot: number | null
  /** Trava sequencial das aulas (estilo Duolingo) ligada para este curso. */
  sequentialLock: boolean
  /**
   * Blocos que ESTE curso libera no Estúdio livre quando o aluno satisfaz o critério
   * atual (bônus Kids: conclusão; demais: conclusão + Mural). A paleta é a UNIÃO dos
   * cursos conquistados, no lugar do conjunto fixo por nível. Opcional p/ tolerar
   * members antigo.
   */
  studioUnlockBlocks?: string[]
  /**
   * SÓ na listagem e SÓ no curso-base kids (posição 1): tem aula publicada com
   * bloco de Estúdio de vitrine? `false` = o aluno nunca publica no Mural → o
   * slot 1 nunca qualifica e a etapa não destrava (aviso "Sem vitrine").
   */
  hasShowcaseBlock?: boolean
  /** Concorrência otimista: enviar de volta no PATCH do curso (o members exige). */
  version: number
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
  'pinta',
  'certificate',
  'coming_soon',
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
  zappyStudentNotebook?: boolean
}
/**
 * Bloco Estúdio: editor @sistemazero/studio pré-configurado pelo admin. `initialProject`
 * é o snapshot autorado no editor embutido (nome/tipo/código de partida); os demais
 * campos são a config de aprendizado (nível, allowlist de blocos, modos).
 */
export interface StudioBlock {
  kind: 'studio'
  initialProject: Project
  /** Aceita a escala LEGADA (aulas pré-reforma 2D/3D); o editor normaliza no load. */
  level?: AnyBlockLevel
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
/**
 * "Em breve": marca a aula como EM PRODUÇÃO. Enquanto o bloco existir, o aluno vê só
 * este recado (o members não serve os demais blocos nem os anexos) e não consegue
 * concluir a aula. A equipe segue vendo tudo, inclusive no "Ver como aluno".
 */
export interface ComingSoonBlock {
  kind: 'coming_soon'
  message?: string
}
/**
 * Bloco Pinta: o ateliê de desenho embarcado, com o desenho JÁ criado pela autora. O
 * `initialAsset` é o snapshot `PintaAsset` autorado no editor embutido — opaco aqui (o formato é
 * do pacote, que o sanea nas duas pontas).
 */
export interface PintaBlock {
  kind: 'pinta'
  initialAsset: unknown
  /** Ferramentas liberadas (vazia/ausente = a caixa inteira). */
  allowTools?: string[]
  /** Nome do desenho contínuo (cadeia entre aulas). */
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
  | PintaBlock
  | CertificateBlock
  | ComingSoonBlock

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

/**
 * Uma entrega na aba "Entregas" POR CURSO (todas as aulas): o mesmo resumo
 * hidratado da lista por bloco + a aula/módulo e o `blockId` (o viewer abre a
 * entrega pelo endpoint por-bloco `getStudioSubmission`).
 */
export interface StudioSubmissionCourseRow extends StudioSubmissionRow {
  /** Bloco de origem — o viewer abre a entrega por `(blockId, userId)`. */
  blockId: string
  lessonId: string
  /** Título da aula (para agrupar/rotular). */
  lessonTitle: string
  /** Título do módulo (para agrupar). */
  moduleTitle: string
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
  /** ISO do carimbo "já conferi"; `null` = nunca conferida. */
  reviewedAt: string | null
  /** O carimbo vale para a entrega ATUAL (um reenvio depois dele o invalida). */
  reviewed: boolean
  /**
   * ISO da versão ANTERIOR (backup do último reenvio). OPCIONAL: members mais
   * velho que o painel não manda — sem o campo, os botões de versão não aparecem.
   */
  previousSubmittedAt?: string | null
}

/** A versão anterior de uma entrega (backup do reenvio) — baixar/inspecionar. */
export interface StudioSubmissionPreviousView {
  project: Project
  submittedAt: string
}

/**
 * Contagem de entregas de um curso por bloco/aula — o aviso "N entregas serão
 * apagadas junto" dos confirms de exclusão. Módulo = soma das aulas no cliente.
 */
export interface CourseSubmissionCounts {
  total: number
  byLesson: Record<string, number>
  byBlock: Record<string, number>
}

/**
 * Linha da fila GLOBAL de entregas (página "Entregas" da Sala do Professor):
 * a linha do members (curso resolvido + `answered`) + identidade hidratada.
 */
export interface StudioSubmissionQueueRow {
  userId: string
  accountId: string | null
  blockId: string
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  courseId: string
  courseTitle: string
  audience: 'adult' | 'kids'
  submittedAt: string
  score: number | null
  checkedAt: string | null
  passed: boolean
  /** Recado opcional do aluno no envio. */
  message: string | null
  /** Há resposta do professor após o último envio. */
  answered: boolean
  /**
   * O professor carimbou "já conferi" após o último envio. É a saída da fila
   * para a entrega SEM recado. ⚠️ PENDENTE = nem `answered` nem `reviewed`.
   */
  reviewed: boolean
  accountName: string | null
  accountEmail: string | null
  childName: string | null
}

// ── Conversas com o aluno (canal de retorno) ────────────────────────────────
export type TeacherThreadContext = 'studio_submission' | 'mural_publication' | 'general'
export type TeacherMessageRole = 'teacher' | 'student'

export interface TeacherMessageView {
  id: string
  authorRole: TeacherMessageRole
  authorId: string | null
  authorName: string | null
  body: string
  createdAt: string
}

export interface TeacherThreadView {
  id: string
  userId: string
  accountId: string | null
  audience: 'adult' | 'kids'
  contextType: TeacherThreadContext
  contextRef: string | null
  courseId: string | null
  lessonId: string | null
  title: string | null
  lastMessageAt: string
  createdAt: string
  messages: TeacherMessageView[]
  nextCursor: string | null
}

/** Resumo de conversa na caixa de entrada do PROFESSOR (espelha o members). */
export interface TeacherThreadSummaryView {
  id: string
  userId: string
  accountId: string | null
  audience: 'adult' | 'kids'
  contextType: TeacherThreadContext
  contextRef: string | null
  courseId: string | null
  lessonId: string | null
  title: string | null
  lastMessageAt: string
  createdAt: string
  lastMessagePreview: string | null
  lastMessageRole: TeacherMessageRole | null
  messageCount: number
  /** Há mensagem do ALUNO depois do watermark do professor. */
  unread: boolean
}

/** Linha da caixa de entrada com a identidade hidratada do auth (BFF). */
export interface TeacherThreadRow extends TeacherThreadSummaryView {
  accountName: string | null
  accountEmail: string | null
  childName: string | null
}

export interface BlockView {
  id: string
  lessonId: string
  kind: string
  sortOrder: number
  content: LessonBlockContent
  blockRevision: string
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
  // ⚠️ `maxProfiles` saiu do produto — agora vive na OFERTA (`OfferContent.maxProfiles`).
}

/** Conteúdo comercial da oferta (badge/cta/cupom/perfis). Editado no form da oferta. */
export interface OfferContent {
  badge?: string
  ctaLabel?: string
  highlight?: string
  allowsCoupon?: boolean
  /** Teto de PERFIS (estilo Netflix) DESTA oferta — plataforma Kids. Inteiro 1..50. */
  maxProfiles?: number
  /**
   * OFERTA IRMÃ do alternador do checkout (mensal ↔ anual): `slug` = a oferta alvo
   * (o funil valida o slug escolhido contra este link); `label` = texto do alternador.
   */
  altOffer?: { slug: string; label?: string }
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
  /** Periodicidade da assinatura em meses (mensal=1, anual=12); null em one_time. */
  billingIntervalMonths: number | null
  installmentsMax: number | null
  trialDays: number | null
  guaranteeDays: number | null
  availableFrom: string | null
  availableUntil: string | null
  isAvailable: boolean
  productId: string
  productName: string | null
  items: OfferItemView[]
  /** Conteúdo comercial (badge/cta/cupom/maxProfiles) — p/ editar sem apagar os demais campos. */
  content: OfferContent | null
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

/** Recorrência do painel (`GET /payments/admin/stats/subscriptions`). */
export interface SubscriptionStatsView {
  /** Assinaturas ATIVAS agora, por periodicidade. */
  active: { total: number; monthly: number; annual: number; other: number }
  /** MRR em centavos (Σ amount/intervalo das ativas) — string (bigint). */
  mrrCents: string
  /** Criadas na janela. */
  newInWindow: number
  /** Canceladas na janela (canceled_at). */
  canceledInWindow: number
  /** Churn simples: canceladas / (ativas + canceladas). 0..1. */
  churnRate: number
  from: string
  to: string
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
  'CANCEL_FAILED',
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

// ── Desafio do mês (espelha as views admin do @sistemazero/members) ─────────

export type ChallengeThemeSource = 'sorteio' | 'definido'

export interface ChallengeThemeView {
  slug: string
  emoji: string
  title: string
  description: string
}

/** Um mês da janela do painel, com o tema RESOLVIDO (definido ou sorteado). */
export interface ChallengeMonthAdminView {
  /** `m:YYYY-MM` (régua interna do desafio). */
  monthKey: string
  /** `YYYY-MM` — vai nas URLs do BFF. */
  month: string
  /** Mês no ar agora. */
  current: boolean
  source: ChallengeThemeSource
  theme: ChallengeThemeView
  customThemeId: string | null
  updatedAt: string | null
}

export interface ChallengeThemeAdminView {
  id: string
  slug: string
  emoji: string
  title: string
  description: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface ChallengeThemesAdminView {
  /** Catálogo fixo em código (read-only; é o pool do sorteio). */
  builtin: ChallengeThemeView[]
  custom: ChallengeThemeAdminView[]
}
