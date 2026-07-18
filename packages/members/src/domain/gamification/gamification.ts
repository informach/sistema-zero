import type { BadgeSlug } from './badges'

/** Valores de XP por atividade (calibrados com o usuário, 06/2026). */
export const XP_VALUES = {
  LESSON_COMPLETE: 10,
  QUIZ_PASSED_BASE: 20,
  /** Bônus proporcional à nota do quiz aprovado (nota 100 → +10). */
  QUIZ_SCORE_BONUS_MAX: 10,
  /** Baú de fim de unidade (todas as aulas publicadas do módulo concluídas). */
  UNIT_COMPLETE: 25,
  /** Pensa: etapa do ciclo concluída (advance z→e, e→r, r→o). */
  PENSA_STAGE_COMPLETE: 15,
  /** Pensa: ciclo LANÇADO (advance o→done) — vale o prêmio maior, sem acumular com a etapa. */
  PENSA_CYCLE_COMPLETE: 30,
  /** Clube: tópico APROVADO pela equipe (XP puro, sem moeda — sem torneira p/ farmar). */
  CLUBE_THREAD: 5,
  /** Clube: comentário APROVADO pela equipe. */
  CLUBE_COMMENT: 3,
  /**
   * Publicou jogo standalone no Mural — XP DIÁRIO (1×/dia pelo sourceId
   * determinístico do dia civil SP, `studioPublishDaySourceId`): a âncora de
   * streak/liga de quem já acabou os cursos e só CRIA. Entre o baú (25) e o
   * desafio do mês (50).
   */
  STUDIO_PUBLISH_DAY: 25,
  /**
   * CRIOU/editou no Estúdio Completo — XP DIÁRIO (1×/dia pelo sourceId
   * determinístico do dia civil SP, `studioActivityDaySourceId`): segura o foguinho
   * de quem já terminou os cursos e fica criando, mesmo SEM publicar. Vale como uma
   * aula (10) — abaixo de publicar (25) e SEM moeda (é âncora de streak, não torneira).
   */
  STUDIO_ACTIVITY_DAY: 10,
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
 * Quantos dias perdidos precisam de FREEZE (não cobertos pelas férias). Varre os dias civis
 * estritamente entre a última atividade e hoje (do mais recente p/ trás) contando os que NÃO
 * caem em férias. O `cap` limita o laço; se o gap EXCEDER o cap (gap gigante), há dias perdidos
 * não varridos → não cobrível por freezes, devolve o cap (≫ teto de freezes) p/ o chamador
 * tratar como quebra. Crucial: o cap é detectado pelo ESTOURO da varredura, não consumido pelas
 * férias — antes a janela de férias era filtrada DEPOIS de truncar em `cap`, então férias longas
 * podiam "engolir" os 400 dias varridos e zerar a contagem mesmo com dias perdidos reais além.
 */
function freezesNeeded(state: StreakState, today: string, cap = 400): number {
  if (!state.lastActivityDate) return 0
  let cur = previousDay(today)
  let needed = 0
  let scanned = 0
  while (cur > state.lastActivityDate && scanned < cap) {
    if (!inVacation(cur, state.vacationFrom, state.vacationTo)) needed++
    cur = previousDay(cur)
    scanned++
  }
  if (cur > state.lastActivityDate) return cap
  return needed
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

/** Badge do 1º jogo PUBLICADO no Mural (contado pelo ledger `course_showcased`). */
export function showcaseBadgeSlugs(showcased: number): BadgeSlug[] {
  return showcased >= 1 ? ['first-showcase'] : []
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

/**
 * Badges por nº de ETAPAS do Pensa concluídas (ledger `pensa_stage_complete`).
 * A 1ª etapa concluída é SEMPRE a Z — a 1ª Carta da Ideia validada.
 */
export function pensaStageBadgeSlugs(stagesCompleted: number): BadgeSlug[] {
  return stagesCompleted >= 1 ? ['pensa-first-idea'] : []
}

/** Badges por nº de CICLOS do Pensa lançados (ledger `pensa_cycle_complete`). */
export function pensaCycleBadgeSlugs(cyclesCompleted: number): BadgeSlug[] {
  const slugs: BadgeSlug[] = []
  if (cyclesCompleted >= 1) slugs.push('pensa-first-launch')
  if (cyclesCompleted >= 3) slugs.push('pensa-creator-3')
  return slugs
}

/** Badge da 1ª participação no Desafio do mês (ledger `challenge_entry`). */
export function challengeBadgeSlugs(entries: number): BadgeSlug[] {
  return entries >= 1 ? ['challenge-first'] : []
}

/** Badge da 1ª conversa aprovada no Clube (contada pelo ledger `clube_thread`). */
export function clubeBadgeSlugs(approvedThreads: number): BadgeSlug[] {
  return approvedThreads >= 1 ? ['clube-primeiro-post'] : []
}

/**
 * Badges de jogadas recebidas: um jogo do autor cruzou 10/100 plays no /jogar
 * público (ledgers `play_milestone_10`/`play_milestone_100`, 1 marco por playId).
 * Basta 1 jogo cruzar o limiar — conquista de vaidade, não contagem agregada.
 */
export function playsBadgeSlugs(milestones10: number, milestones100: number): BadgeSlug[] {
  const slugs: BadgeSlug[] = []
  if (milestones10 >= 1) slugs.push('plays-10')
  if (milestones100 >= 1) slugs.push('plays-100')
  return slugs
}
