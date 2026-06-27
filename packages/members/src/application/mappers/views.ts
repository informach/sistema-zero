import type { AvatarCategory, AvatarSlot } from '../../domain/avatar/avatar3d-catalog'
import type { CertificateRecord } from '../../domain/certificate/certificate'
import type { Course, LessonWithContent, ModuleWithLessons } from '../../domain/course/course'
import { toMemberFacingQuizContent } from '../../domain/course/quiz'
import type { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { AwardResult } from '../../domain/ports/gamification-repository.port'
import type { CourseProgress } from '../../domain/progress/progress'
import type { CourseFeedbackAnswers, CourseRating } from '../../domain/rating/course-rating'
import type { RoomItemCategory, RoomState } from '../../domain/room/room-catalog'

/** Acesso do aluno àquele curso (snapshot da matrícula ativa). */
export interface AccessView {
  accessType: string
  /** ISO-8601 ou `null` (vitalício / assinatura ativa sem validade calculada). */
  expiresAt: string | null
}

export function toAccessView(e: EntitlementAggregate): AccessView {
  return { accessType: e.accessType, expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null }
}

export interface CourseProgressView extends CourseProgress {
  lastCompletedAt: string | null
}

export function toCourseProgressView(
  progress: CourseProgress,
  lastCompletedAt: Date | null,
): CourseProgressView {
  return { ...progress, lastCompletedAt: lastCompletedAt ? lastCompletedAt.toISOString() : null }
}

/**
 * Delta de gamificação de UMA ação (complete/quiz aprovado) — devolvido NA
 * RESPOSTA da ação (a UI celebra sem round-trip). `null` na rota = award
 * falhou (fail-open) ou quiz reprovado. Campo ADITIVO: o community adulto
 * ignora; a vitrine v1 é o community-kids.
 */
export interface GamificationDeltaView {
  /** XP desta ação (0 = tudo já premiado antes — ledger idempotente). */
  xpAwarded: number
  totalXp: number
  streak: { current: number; best: number; extended: boolean }
  badgesUnlocked: { slug: string; unlockedAt: string }[]
  /** `true` quando ESTA ação fechou a unidade (baú de +25 XP incluído no total). */
  unitCompleted: boolean
  /** Moedas Zappy ganhas nesta ação (já com teto diário aplicado). */
  coinsAwarded: number
  /** Saldo da carteira Zappy após a ação. */
  coinBalance: number
  /** `true` quando o teto diário cortou parte do ganho de moeda (feedback gentil). */
  coinsCapped: boolean
}

export function toGamificationDeltaView(result: AwardResult): GamificationDeltaView {
  return {
    xpAwarded: result.xpAwarded,
    totalXp: result.totalXp,
    // Só os 3 campos públicos — `freezesConsumed` é detalhe interno do repo.
    streak: {
      current: result.streak.current,
      best: result.streak.best,
      extended: result.streak.extended,
    },
    badgesUnlocked: result.badgesUnlocked.map((b) => ({
      slug: b.slug,
      unlockedAt: b.unlockedAt.toISOString(),
    })),
    unitCompleted: result.newEvents.some((e) => e.sourceType === 'unit_complete'),
    coinsAwarded: result.coinsAwarded,
    coinBalance: result.coinBalance,
    coinsCapped: result.coinsCapped,
  }
}

/** Certificado emitido (Date→ISO) — devolvido ao BFF na emissão/consulta. */
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

export function toCertificateView(record: CertificateRecord): CertificateView {
  return {
    id: record.id,
    serial: record.serial,
    studentName: record.studentName,
    courseTitle: record.courseTitle,
    courseRef: record.courseRef,
    completedAt: record.completedAt.toISOString(),
    issuedAt: record.issuedAt.toISOString(),
    revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null,
  }
}

/** Estado do bloco certificado p/ a UI do aluno (emitir vs baixar). */
export interface CertificateStateView {
  /** Todas as aulas publicadas anteriores ao certificado concluídas? */
  eligible: boolean
  /** Já há certificado emitido para este aluno+curso? */
  issued: boolean
  /** Emitido, mas revogado pelo admin. */
  revoked: boolean
  serial: string | null
  issuedAt: string | null
  revokedAt: string | null
}

/** Resultado da validação PÚBLICA (só dados não-sensíveis — propósito do validador). */
export interface CertificateValidationView {
  valid: boolean
  revoked: boolean
  studentName: string | null
  courseTitle: string | null
  issuedAt: string | null
  revokedAt: string | null
  serial: string | null
}

export function toCertificateValidationView(
  record: CertificateRecord | null,
): CertificateValidationView {
  if (!record) {
    return {
      valid: false,
      revoked: false,
      studentName: null,
      courseTitle: null,
      issuedAt: null,
      revokedAt: null,
      serial: null,
    }
  }
  return {
    // Revogado → inválido, mas ainda mostra de quem/qual curso era (a página dirá "revogado").
    valid: record.revokedAt === null,
    revoked: record.revokedAt !== null,
    studentName: record.studentName,
    courseTitle: record.courseTitle,
    issuedAt: record.issuedAt.toISOString(),
    revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null,
    serial: record.serial,
  }
}

/** Dica de vitrine (Mural): a aula concluída é ponto de auto-publicação. */
export interface LessonCompleteShowcaseHint {
  /** Bloco de estúdio a publicar (o BFF re-busca o conteúdo autoritativo). */
  blockId: string
  /** Título do projeto (preview do botão "Publicar no Mural"). */
  title: string
}

/** Resposta do complete da aula: progresso + delta de gamificação (aditivo). */
export interface LessonCompleteView extends CourseProgressView {
  gamification: GamificationDeltaView | null
  /**
   * Aula é ponto de VITRINE (bloco de estúdio com `showcase.enabled`): o front
   * mostra o botão "Publicar no Mural". `null` quando a aula não publica nada
   * (aditivo — o community adulto ignora).
   */
  showcase: LessonCompleteShowcaseHint | null
}

/** Perfil de gamificação do aluno (widgets/perfil — `GET /members/gamification/me`). */
export interface GamificationMeView {
  xp: number
  /**
   * Carteira Zappy Coins (saldo gastável). Segregada por vitrine, como o XP.
   * `unlimited` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞.
   */
  coins: { balance: number; unlimited?: boolean }
  streak: {
    /** Streak de EXIBIÇÃO: 0 quando quebrado (e nem freeze nem férias cobrem). */
    current: number
    best: number
    /** `true` = já houve atividade com XP hoje (data civil de São Paulo). */
    activeToday: boolean
    /** Protetores de sequência disponíveis (1 grátis/mês + comprados). */
    freezesAvailable: number
    /** `true` = hoje está dentro da janela de férias (sequência pausada, sem culpa). */
    onVacation: boolean
    /** Data civil SP do fim das férias quando `onVacation` (senão null). */
    vacationUntil: string | null
  }
  /** Catálogo COMPLETO na ordem do domain — badge bloqueada tem `unlockedAt: null`. */
  badges: { slug: string; unlockedAt: string | null }[]
  /**
   * Colocação no ranking de XP da VITRINE pedida (`?ranking=true` junto do
   * `?audience=`) — XP/perfil/coorte são por audiência, então os rankings
   * adult/kids são separados. Ausente quando o caller não pediu.
   */
  ranking?: { position: number; totalStudents: number }
}

/** Uma peça do catálogo de avatar 3D na visão do aluno (lojinha/configurador). */
export interface AvatarPartView {
  id: string
  category: AvatarCategory
  tier: 'free' | 'coins'
  price: number
  /** Possui (grátis OU comprada). */
  owned: boolean
  /** Paga e ainda não comprada → mostra cadeado + preço na lojinha. */
  locked: boolean
}

/**
 * Perfil PÚBLICO de uma criança (`GET /members/profiles/:profileId/public`) — visível
 * a qualquer aluno da comunidade. SÓ dado de jogo: XP, colocação, conquistas QUE TEM
 * (não o catálogo), avatar e quarto. NENHUM dado sensível (nome vem do auth no BFF;
 * e-mail/telefone/nascimento/conta NUNCA). `ranking` null = fora da coorte.
 */
export interface PublicProfileView {
  profileId: string
  xp: number
  ranking: { position: number; totalStudents: number } | null
  /** SÓ as conquistas conquistadas (não o catálogo completo). */
  badges: { slug: string; unlockedAt: string }[]
  /** Config 3D equipada (peça+cor por categoria) — p/ uma futura visualização do personagem. */
  avatar: { style: string; slots: Partial<Record<AvatarCategory, AvatarSlot>> }
  /** Foto (snapshot) do avatar 3D — mostrada no card público; `null` se nunca tirou. */
  avatarPhotoUrl: string | null
  /** Quarto virtual (modo visualização) — `null` se a criança nunca montou. */
  room: RoomState | null
}

/** Uma missão do aluno (`GET /members/gamification/missions/me`). */
export interface MissionView {
  slug: string
  cadence: 'daily' | 'weekly'
  goalType: string
  target: number
  /** Progresso DERIVADO do ledger no período (limitado ao alvo). */
  progress: number
  completed: boolean
  /** Já resgatou o prêmio? (claim idempotente). */
  claimed: boolean
  rewardXp: number
  rewardCoins: number
  /** Chave do período (dia civil SP ou `w:<segunda>`) — o front passa no claim. */
  periodKey: string
}

/** Missões do aluno por cadência (`GET …/missions/me`). */
export interface MissionsMeView {
  daily: MissionView[]
  weekly: MissionView[]
}

/** Uma linha do board da liga — SEM PII (nem userId de terceiro; só `isMe` aponta você). */
export interface LeagueEntryView {
  position: number
  weeklyXp: number
  isMe: boolean
}

/** Liga semanal do aluno (`GET …/league/me`). */
export interface LeagueMeView {
  tier: string
  weekKey: string
  /** Quantos sobem no topo / caem na base ESTA semana (0 = semana amistosa, pouca massa). */
  promotionCount: number
  relegationCount: number
  /** Board da coorte (audiência+semana+tier), por XP da semana — você incluído. */
  entries: LeagueEntryView[]
  /** Sua colocação atual na coorte (1 = 1º). */
  myPosition: number
}

/** Resultado do resgate de uma missão (`POST …/missions/:slug/claim`). */
export interface MissionClaimView {
  /** `false` = já tinha sido resgatada antes (idempotente — o front trata como ok). */
  claimed: boolean
  xpAwarded: number
  coinsAwarded: number
  coinBalance: number
}

/** Um item/tema do catálogo do quarto na visão do aluno (lojinha/editor). */
export interface RoomItemView {
  id: string
  category: RoomItemCategory
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

/** Estado do quarto do aluno (`GET /members/room`): montado + catálogo + saldo. */
export interface RoomEditorView {
  state: RoomState
  items: RoomItemView[]
  themes: RoomThemeView[]
  /** Pisos e presets de iluminação/clima (mesmo shape de tema: id/tier/price/owned/locked). */
  floors: RoomThemeView[]
  lightings: RoomThemeView[]
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  balanceUnlimited?: boolean
}

/** Estado do avatar 3D do aluno (`GET /members/avatar`): equipado + catálogo + saldo. */
export interface AvatarStateView {
  style: string
  /** Peça+cor equipada por categoria (categoria faltante já vem com o default). */
  equipped: Partial<Record<AvatarCategory, AvatarSlot>>
  parts: AvatarPartView[]
  /** Paleta de cores por categoria (categoria sem cor é omitida). */
  palettes: Partial<Record<AvatarCategory, string[]>>
  /** Oclusão de render (chapéu real esconde o cabelo). Single source com o domínio. */
  hideGroups: Partial<Record<AvatarCategory, AvatarCategory[]>>
  /** Categoria removível → id da peça "nenhum" (o configurador mostra "Tirar"). */
  removable: Partial<Record<AvatarCategory, string>>
  /** Foto (snapshot) atual do avatar 3D — `null` se a criança ainda não salvou. */
  photoUrl: string | null
  /** Saldo de moedas Zappy (p/ a lojinha do avatar). */
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  balanceUnlimited?: boolean
}

export interface MyCourseView {
  courseSlug: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  /** Plataforma do curso (`adult` | `kids`) — a vitrine já vem filtrada. */
  audience: string
  access: AccessView
  progress: CourseProgress
  /** Atalho seguro do card: última aula acessada, ou a próxima liberada se a última travou. */
  continueLessonId: string | null
}

export function toMyCourseView(
  course: Course,
  entitlement: EntitlementAggregate,
  progress: CourseProgress,
  continueLessonId: string | null,
): MyCourseView {
  return {
    courseSlug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    coverImageUrl: course.coverImageUrl,
    audience: course.audience,
    access: toAccessView(entitlement),
    progress,
    continueLessonId,
  }
}

/**
 * Card do catálogo "Todos os cursos" (descoberta/venda): todo curso `published`
 * com a flag de acesso do aluno. Sem progresso (isso é da home/detalhe).
 */
export interface CatalogCourseView {
  courseSlug: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  /** Plataforma do curso (`adult` | `kids`) — o catálogo já vem filtrado. */
  audience: string
  hasAccess: boolean
  /** URL da página de vendas (funil) — de `course.metadata.salesPageUrl`; `null` se não setada. */
  salesPageUrl: string | null
}

export function toCatalogCourseView(course: Course, hasAccess: boolean): CatalogCourseView {
  return {
    courseSlug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    coverImageUrl: course.coverImageUrl,
    audience: course.audience,
    hasAccess,
    salesPageUrl: resolveSalesPageUrl(course),
  }
}

/** URL da página de vendas (funil) — `metadata.salesPageUrl` string não-vazia, senão `null`. */
export function resolveSalesPageUrl(course: Course): string | null {
  const raw = course.metadata?.salesPageUrl
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

/** Classificação do curso feita pelo aluno (nota 1–5 em passos de 0.5). */
export interface CourseRatingView {
  rating: number
  comment: string | null
  feedbackAnswers: CourseFeedbackAnswers | null
  createdAt: string
  updatedAt: string
}

export function toCourseRatingView(r: CourseRating): CourseRatingView {
  return {
    rating: r.ratingHalf / 2,
    comment: r.comment,
    feedbackAnswers: r.feedbackAnswers,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export interface LessonOutlineView {
  id: string
  slug: string
  title: string
  sortOrder: number
  estimatedMinutes: number | null
  completed: boolean
  /**
   * Trava sequencial (estilo Duolingo): `true` = a aula ainda está bloqueada
   * porque uma aula publicada anterior não foi concluída. Sempre `false` quando o
   * curso tem a trava desligada, para equipe interna, ou se a aula já foi concluída.
   */
  locked: boolean
}

export interface ModuleOutlineView {
  id: string
  title: string
  summary: string | null
  sortOrder: number
  lessons: LessonOutlineView[]
}

export interface CourseDetailView {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  coverImageUrl: string | null
  /** Plataforma do curso (`adult` | `kids`) — o BFF pode validar/redirecionar. */
  audience: string
  access: AccessView
  progress: CourseProgressView
  /** Aula-alvo do CTA "Continuar de onde parou" (ver `resolveContinueLesson`). */
  continueLessonId: string | null
  /** Classificação que ESTE aluno deu ao curso — `null` se ainda não classificou. */
  myRating: CourseRatingView | null
  /** URL da página de vendas (compartilhar) — `metadata.salesPageUrl`; `null` se não setada. */
  salesPageUrl: string | null
  modules: ModuleOutlineView[]
}

export function toCourseDetailView(
  course: Course,
  modules: ModuleWithLessons[],
  completedLessonIds: Set<string>,
  entitlement: EntitlementAggregate,
  progress: CourseProgressView,
  continueLessonId: string | null,
  myRating: CourseRating | null,
  // Aulas TRAVADAS pela trava sequencial (já resolvido pelo service: vazio quando a
  // trava está desligada ou para equipe interna). Default vazio = nada travado.
  lockedLessonIds: Set<string> = new Set(),
): CourseDetailView {
  return {
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    coverImageUrl: course.coverImageUrl,
    audience: course.audience,
    access: toAccessView(entitlement),
    progress,
    continueLessonId,
    myRating: myRating ? toCourseRatingView(myRating) : null,
    salesPageUrl: resolveSalesPageUrl(course),
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      sortOrder: m.sortOrder,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        sortOrder: l.sortOrder,
        estimatedMinutes: l.estimatedMinutes,
        completed: completedLessonIds.has(l.id),
        locked: lockedLessonIds.has(l.id),
      })),
    })),
  }
}

/** Estado das tentativas do aluno num bloco de quiz (derivado do histórico). */
export interface QuizStateView {
  lastScore: number | null
  passed: boolean
  attemptsCount: number
  /** ISO; não-nulo só durante o cooldown após reprovar. */
  retryAvailableAt: string | null
}

/** Estado da entrega do aluno num bloco de estúdio (já enviou? quando? nota?). */
export interface StudioStateView {
  submitted: boolean
  /** ISO da última entrega; `null` se ainda não enviou. */
  submittedAt: string | null
  /** Nota da última correção (atividade); `null` sem atividade ou sem entrega. */
  lastScore?: number | null
  /** Atingiu a nota de corte (sticky). `false` sem atividade/entrega. */
  passed?: boolean
}

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
 * Anexo na visão do ALUNO — SEM `url`: a localização real (key do bucket privado
 * ou link externo) nunca chega ao browser. O download é pela rota autenticada do
 * community (que resolve via `AttachmentDownloadView` e aplica a marca d'água).
 */
export interface LessonAttachmentView {
  id: string
  label: string
  fileType: string | null
  sizeBytes: number | null
  sortOrder: number
}

/** Resolução de download (server↔server, BFF do community): localização real do anexo. */
export interface AttachmentDownloadView {
  label: string
  fileType: string | null
  sizeBytes: number | null
  /** `r2priv:<key>` (bucket privado) ou URL http(s) externa/legada. */
  storageRef: string
}

/** Resolução do PDF do bloco e-book (server↔server, BFF do community). */
export interface EbookDownloadView {
  title: string | null
  /** `r2priv:<key>` (bucket privado) ou URL http(s) externa/legada. */
  storageRef: string
}

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

export function toLessonDetailView(
  lesson: LessonWithContent,
  courseSlug: string,
  completed: boolean,
  positionSeconds: number | null,
  quizStates: Map<string, QuizStateView> = new Map(),
  studioStates: Map<string, StudioStateView> = new Map(),
): LessonDetailView {
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    moduleId: lesson.moduleId,
    courseSlug,
    estimatedMinutes: lesson.estimatedMinutes,
    completed,
    positionSeconds,
    blocks: lesson.blocks.map((b) => {
      // Quiz: NUNCA envia o gabarito (correctChoiceIds/explanation) ao aluno —
      // a projeção member-facing remove e anexa o estado das tentativas.
      if (b.content.kind === 'quiz') {
        return {
          id: b.id,
          kind: b.kind,
          sortOrder: b.sortOrder,
          content: toMemberFacingQuizContent(b.content),
          quizState: quizStates.get(b.id) ?? {
            lastScore: null,
            passed: false,
            attemptsCount: 0,
            retryAvailableAt: null,
          },
        }
      }
      // E-book: a localização real do PDF (`r2priv:<key>`) nunca chega ao browser —
      // o community resolve via rota própria e serve com marca d'água (igual anexo).
      if (b.content.kind === 'ebook') {
        const { url: _url, ...memberFacing } = b.content
        return { id: b.id, kind: b.kind, sortOrder: b.sortOrder, content: memberFacing }
      }
      // Estúdio: a config (initialProject/level/allowlist) NÃO é segredo — o aluno
      // precisa dela para montar o editor. Anexa só o estado da entrega (já enviou?).
      if (b.content.kind === 'studio') {
        return {
          id: b.id,
          kind: b.kind,
          sortOrder: b.sortOrder,
          content: b.content,
          studioState: studioStates.get(b.id) ?? { submitted: false, submittedAt: null },
        }
      }
      return { id: b.id, kind: b.kind, sortOrder: b.sortOrder, content: b.content }
    }),
    attachments: lesson.attachments.map((a) => ({
      id: a.id,
      label: a.label,
      fileType: a.fileType,
      sizeBytes: a.sizeBytes,
      sortOrder: a.sortOrder,
    })),
  }
}
