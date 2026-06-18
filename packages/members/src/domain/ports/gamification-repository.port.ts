import type { CourseAudience } from '../course/course'

/**
 * Origem de um evento de XP — par (sourceType, sourceId) é a chave de
 * idempotência. `course_complete`/`quiz_perfect` são MARCOS (amount 0): só
 * contam p/ badges (cursos 100% e quizzes com nota 100); marcos NÃO movem
 * XP nem streak (streak só avança com evento novo de amount > 0).
 */
export type XpSourceType =
  | 'lesson_complete'
  | 'quiz_passed'
  | 'unit_complete'
  | 'course_complete'
  | 'quiz_perfect'
  // Atividade do Estúdio aprovada (auto-correção, fase 2). XP igual ao quiz.
  | 'studio_passed'

export interface XpEventInput {
  sourceType: XpSourceType
  /** lessonId | blockId | moduleId | courseId — snapshot, sem FK (XP é histórico). */
  sourceId: string
  amount: number
}

export interface GamificationProfileRecord {
  userId: string
  xp: number
  streakCurrent: number
  streakBest: number
  /** Data civil SP (`YYYY-MM-DD`) da última atividade que rendeu XP. */
  lastActivityDate: string | null
}

export interface AwardInput {
  userId: string
  /**
   * CONTA do responsável (sessão de perfil estilo Netflix). Em sessão normal = o
   * próprio `userId`. Snapshot no perfil — usado SÓ pela coorte do ranking.
   */
  accountId: string
  /**
   * Vitrine da ação (audiência do CURSO que gerou o award) — TODA a
   * gamificação é segregada por audiência: perfil/streak/badges/contagens.
   */
  audience: CourseAudience
  /** Eventos CANDIDATOS — o ledger dedupa por (userId, sourceType, sourceId). */
  events: XpEventInput[]
  /** Data civil SP do instante da ação (o service calcula com o clock). */
  today: string
  now: Date
  /**
   * Ator é equipe (superadmin/admin/staff — `isPrivilegedActor` da rota)?
   * Gravado no perfil: rankings contam SÓ clientes (`privileged = false`).
   */
  privileged: boolean
}

export interface AwardResult {
  /** Soma dos eventos realmente NOVOS (0 = tudo já premiado antes). */
  xpAwarded: number
  totalXp: number
  streak: { current: number; best: number; extended: boolean }
  /** Eventos que entraram no ledger NESTA chamada (p/ o caller sinalizar baú etc). */
  newEvents: XpEventInput[]
  badgesUnlocked: { slug: string; unlockedAt: Date }[]
}

export interface GamificationRanking {
  /** Competition ranking: nº de alunos da coorte com XP ESTRITAMENTE maior + 1 (empate divide). */
  position: number
  /** Tamanho da coorte (alunos com matrícula em curso da audiência, mesmo sem XP). */
  totalStudents: number
}

export interface GamificationRepository {
  /**
   * Concede XP/streak/badges numa transação serializada POR ALUNO (advisory
   * xact-lock). Sem evento novo, streak/lastActivityDate ficam INTOCADOS (só
   * atividade que rende XP conta) — mas badges candidatas ainda concedem.
   */
  award(input: AwardInput): Promise<AwardResult>
  getProfile(userId: string, audience: CourseAudience): Promise<GamificationProfileRecord | null>
  listBadges(
    userId: string,
    audience: CourseAudience,
  ): Promise<{ badgeSlug: string; unlockedAt: Date }[]>
  /**
   * Colocação do PERFIL no ranking de XP da VITRINE. Coorte (estilo Netflix) =
   * PERFIS (linhas de `gamification_profiles`, `privileged=false`) cuja CONTA
   * (`account_id`) tem ≥1 matrícula em curso da audiência. O `userId` é o perfil
   * (XP do perfil); o `accountId` decide a pertinência à coorte (acesso da conta).
   * **`null` quando a conta NÃO tem matrícula na audiência** (sem acesso) — o
   * service omite o `ranking`. O requester sem perfil (XP 0) ainda é contado.
   */
  getRanking(
    userId: string,
    accountId: string,
    audience: CourseAudience,
  ): Promise<GamificationRanking | null>
}
