import type { Course, LessonWithContent, ModuleWithLessons } from '../../domain/course/course'
import { toMemberFacingQuizContent } from '../../domain/course/quiz'
import type { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { AwardResult } from '../../domain/ports/gamification-repository.port'
import type { CourseProgress } from '../../domain/progress/progress'
import type { CourseFeedbackAnswers, CourseRating } from '../../domain/rating/course-rating'

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
}

export function toGamificationDeltaView(result: AwardResult): GamificationDeltaView {
  return {
    xpAwarded: result.xpAwarded,
    totalXp: result.totalXp,
    streak: result.streak,
    badgesUnlocked: result.badgesUnlocked.map((b) => ({
      slug: b.slug,
      unlockedAt: b.unlockedAt.toISOString(),
    })),
    unitCompleted: result.newEvents.some((e) => e.sourceType === 'unit_complete'),
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
  streak: {
    /** Streak de EXIBIÇÃO: 0 quando quebrado (última atividade antes de ontem). */
    current: number
    best: number
    /** `true` = já houve atividade com XP hoje (data civil de São Paulo). */
    activeToday: boolean
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

export interface MyCourseView {
  courseSlug: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  /** Plataforma do curso (`adult` | `kids`) — a vitrine já vem filtrada. */
  audience: string
  access: AccessView
  progress: CourseProgress
  /** Última aula acessada (posição de vídeo) — atalho do card; `null` se nunca acessou. */
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
