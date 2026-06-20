import type { BadgeSlug } from './badges'

/** Valores de XP por atividade (calibrados com o usuário, 06/2026). */
export const XP_VALUES = {
  LESSON_COMPLETE: 10,
  QUIZ_PASSED_BASE: 20,
  /** Bônus proporcional à nota do quiz aprovado (nota 100 → +10). */
  QUIZ_SCORE_BONUS_MAX: 10,
  /** Baú de fim de unidade (todas as aulas publicadas do módulo concluídas). */
  UNIT_COMPLETE: 25,
} as const

/** XP de um quiz APROVADO: base + bônus proporcional à nota (cap em +10). */
export function quizPassedXp(score: number): number {
  const bonus = Math.min(XP_VALUES.QUIZ_SCORE_BONUS_MAX, Math.max(0, Math.round(score / 10)))
  return XP_VALUES.QUIZ_PASSED_BASE + bonus
}

// Timezone FIXA do streak (decisão do usuário): o "dia" é o dia civil de São
// Paulo, calculado SEMPRE no backend. `en-CA` formata como YYYY-MM-DD.
const SP_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })

/** Data civil de São Paulo (`YYYY-MM-DD`) do instante dado. */
export function localDateSaoPaulo(now: Date): string {
  return SP_DATE_FORMAT.format(now)
}

/** Dia anterior de uma data `YYYY-MM-DD` (aritmética UTC pura — sem DST). */
export function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export interface StreakState {
  streakCurrent: number
  streakBest: number
  /** Data civil SP da última atividade que rendeu XP — `null` = nunca. */
  lastActivityDate: string | null
  /** Protetores de sequência disponíveis (cobrem dias perdidos fora de férias). */
  freezes?: number
  /** Janela de FÉRIAS (data civil SP) — dias dentro dela não quebram a sequência. */
  vacationFrom?: string | null
  vacationTo?: string | null
}

export interface StreakAdvance {
  current: number
  best: number
  /** `true` quando ESTA atividade moveu o streak (1ª do dia). */
  extended: boolean
  /** Protetores consumidos p/ cobrir os dias perdidos (o repo debita). */
  freezesConsumed: number
}

/** Dia `d` (YYYY-MM-DD) está dentro da janela de férias [from, to] (inclusiva)? */
function inVacation(d: string, from?: string | null, to?: string | null): boolean {
  return from != null && to != null && d >= from && d <= to
}

/**
 * Dias civis ESTRITAMENTE entre `a` e `b` (a < b) — os "perdidos" entre a última
 * atividade e hoje. Limitado a `cap` (gap maior já não é cobrível por freezes →
 * o chamador trata como quebra), evitando laços longos.
 */
function missedDaysBetween(a: string, b: string, cap = 400): string[] {
  const out: string[] = []
  let cur = previousDay(b)
  while (cur > a && out.length < cap) {
    out.push(cur)
    cur = previousDay(cur)
  }
  return out
}

/** Quantos dias perdidos precisam de FREEZE (não cobertos pelas férias). */
function freezesNeeded(state: StreakState, today: string): number {
  if (!state.lastActivityDate) return 0
  return missedDaysBetween(state.lastActivityDate, today).filter(
    (d) => !inVacation(d, state.vacationFrom, state.vacationTo),
  ).length
}

/**
 * Avança o streak por uma atividade que rendeu XP `today` (data civil SP): mesmo dia →
 * mantém; ontem → +1; gap → +1 SE os dias perdidos forem cobertos por férias OU por
 * freezes (consome 1 por dia perdido fora de férias), senão recomeça em 1. `best`
 * nunca regride. Ética: a sequência só quebra quando NEM férias NEM freezes cobrem.
 */
export function advanceStreak(state: StreakState, today: string): StreakAdvance {
  if (state.lastActivityDate === today) {
    return {
      current: state.streakCurrent,
      best: state.streakBest,
      extended: false,
      freezesConsumed: 0,
    }
  }
  if (!state.lastActivityDate) {
    return { current: 1, best: Math.max(state.streakBest, 1), extended: true, freezesConsumed: 0 }
  }
  const need = freezesNeeded(state, today)
  if (need <= (state.freezes ?? 0)) {
    const current = state.streakCurrent + 1
    return {
      current,
      best: Math.max(state.streakBest, current),
      extended: true,
      freezesConsumed: need,
    }
  }
  return { current: 1, best: Math.max(state.streakBest, 1), extended: true, freezesConsumed: 0 }
}

/**
 * Streak para EXIBIÇÃO: vale enquanto os dias perdidos desde a última atividade são
 * cobertos por férias OU pelos freezes DISPONÍVEIS (não consome — só projeta); senão 0.
 * O valor persistido não é zerado — `advanceStreak` recomeça/consome na próxima atividade.
 */
export function effectiveStreak(state: StreakState, today: string): number {
  if (!state.lastActivityDate) return 0
  if (state.lastActivityDate === today) return state.streakCurrent
  return freezesNeeded(state, today) <= (state.freezes ?? 0) ? state.streakCurrent : 0
}

/** Marcos de streak (dias → badge). 180 ≈ 6 meses; 365 = 1 ano. */
const STREAK_BADGES: readonly (readonly [number, BadgeSlug])[] = [
  [7, 'streak-7'],
  [30, 'streak-30'],
  [60, 'streak-60'],
  [180, 'streak-180'],
  [365, 'streak-365'],
]

/** Badges de streak destravadas em `current` (idempotente — o ledger dedupa). */
export function streakBadgeSlugs(current: number): BadgeSlug[] {
  return STREAK_BADGES.filter(([days]) => current >= days).map(([, slug]) => slug)
}

/** Badges por nº de CURSOS 100% concluídos (contado pelo ledger `course_complete`). */
export function courseBadgeSlugs(completedCourses: number): BadgeSlug[] {
  const slugs: BadgeSlug[] = []
  if (completedCourses >= 1) slugs.push('course-complete')
  if (completedCourses >= 2) slugs.push('course-complete-2')
  if (completedCourses >= 3) slugs.push('course-complete-3')
  return slugs
}

/** Badges por nº de QUIZZES com nota 100 (contado pelo ledger `quiz_perfect`). */
export function quizPerfectBadgeSlugs(perfectQuizzes: number): BadgeSlug[] {
  const slugs: BadgeSlug[] = []
  if (perfectQuizzes >= 1) slugs.push('quiz-perfect')
  if (perfectQuizzes >= 10) slugs.push('quiz-perfect-10')
  if (perfectQuizzes >= 30) slugs.push('quiz-perfect-30')
  return slugs
}

/** Badges de maestria do Estúdio (contado pelo ledger `studio_passed`). */
export function studioMasteryBadgeSlugs(passed: number): BadgeSlug[] {
  const slugs: BadgeSlug[] = []
  if (passed >= 1) slugs.push('studio-first')
  if (passed >= 3) slugs.push('studio-master-3')
  if (passed >= 10) slugs.push('studio-master-10')
  return slugs
}

/** Badges de poupador (moedas Zappy ganhas na vida — `lifetime_coins_earned`). */
export function coinsSaverBadgeSlugs(lifetimeCoins: number): BadgeSlug[] {
  const slugs: BadgeSlug[] = []
  if (lifetimeCoins >= 300) slugs.push('coins-saver-300')
  if (lifetimeCoins >= 1000) slugs.push('coins-saver-1000')
  return slugs
}
