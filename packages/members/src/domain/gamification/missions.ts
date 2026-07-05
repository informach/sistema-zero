import type { BadgeSlug } from './badges'

/**
 * Missões diárias/semanais/mensais (catálogo EM CÓDIGO — como badges; prod sem
 * seed). São CONTENT-DRIVEN: cada missão conta eventos REAIS do ledger de XP num
 * período — o progresso é DERIVADO na leitura (sem hook no award), e o prêmio (XP
 * + moedas) é resgatado explicitamente (claim idempotente por mission_claims).
 * Atribuição DETERMINÍSTICA por (userId, período) — sem `Date.now`/random.
 *
 * Cadência coerente com a NATUREZA da ação (premissa ~1 aula/dia): eventos
 * frequentes/repetíveis (aula/quiz/enviar-ao-professor/comentar) são DIÁRIOS;
 * fechar módulo/projeto/publicar são SEMANAIS; metas grandes e raras
 * (20 aulas/3 projetos/classificar curso) são MENSAIS. Assim nenhuma missão fica
 * estruturalmente travada (o problema antigo: "abra um baú" DIÁRIO era quase
 * impossível — fechar um módulo leva vários dias).
 */

/** Tipos de evento do ledger que uma missão pode contar (⊂ xp_source_type). */
export type MissionGoalType =
  | 'lesson_complete'
  | 'quiz_passed'
  | 'unit_complete'
  // Entregou uma atividade do Estúdio ao professor (MARCO amount 0 por bloco).
  | 'studio_submitted'
  // Publicou um jogo no Mural dos Criadores (MARCO amount 0 por curso).
  | 'course_showcased'
  // Classificou um curso (MARCO amount 0 por curso — reclassificar não refarma).
  | 'course_rated'
  // Comprou/posicionou um item do quarto (MARCO amount 0 por item).
  | 'room_item_buy'
  // Comprou uma peça do avatar (MARCO amount 0 por peça).
  | 'avatar_part_buy'
  // Comentou no Mural, APROVADO pela equipe (MARCO amount 0 por comentário).
  | 'mural_comment'
  // Clube: conta `clube_thread` (só APROVADO entra no ledger → não farmável por spam).
  // GATED por posse do produto (ver `requiresAccess`).
  | 'clube_thread'

export interface MissionDef {
  slug: string
  cadence: 'daily' | 'weekly' | 'monthly'
  goalType: MissionGoalType
  target: number
  rewardXp: number
  rewardCoins: number
  rewardBadge?: BadgeSlug
  /**
   * Produto (ref de acesso) EXIGIDO para a missão entrar no pool do aluno. Ausente
   * = universal. Presente (ex.: `clube-dos-criadores`) = só entra no sorteio de quem
   * TEM o produto — a gamificação nuclear NUNCA depende de produto vendido à parte;
   * quem não tem simplesmente não vê a missão (em vez de vê-la travada em 0).
   */
  requiresAccess?: string
}

/** Ref do produto Clube dos Criadores (vendido à parte) — gate das missões de Clube. */
export const CLUBE_ACCESS_REF = 'clube-dos-criadores'

export const DAILY_MISSIONS: readonly MissionDef[] = [
  {
    slug: 'daily-aula',
    cadence: 'daily',
    goalType: 'lesson_complete',
    target: 1,
    rewardXp: 10,
    rewardCoins: 10,
  },
  {
    slug: 'daily-quiz',
    cadence: 'daily',
    goalType: 'quiz_passed',
    target: 1,
    rewardXp: 15,
    rewardCoins: 15,
  },
  {
    // "Enviar para o professor" — o ato de entregar (todo bloco de Estúdio tem),
    // mais alcançável que "passar na atividade" (que depende de auto-correção).
    slug: 'daily-enviar',
    cadence: 'daily',
    goalType: 'studio_submitted',
    target: 1,
    rewardXp: 15,
    rewardCoins: 15,
  },
  {
    // Mural: comentar (só conta o APROVADO pela equipe → anti-farm por moderação).
    slug: 'daily-comentar',
    cadence: 'daily',
    goalType: 'mural_comment',
    target: 1,
    rewardXp: 10,
    rewardCoins: 10,
  },
  {
    // Clube: uma conversa aprovada. GATED — só quem tem o produto vê.
    slug: 'daily-clube',
    cadence: 'daily',
    goalType: 'clube_thread',
    target: 1,
    rewardXp: 10,
    rewardCoins: 10,
    requiresAccess: CLUBE_ACCESS_REF,
  },
]

export const WEEKLY_MISSIONS: readonly MissionDef[] = [
  {
    slug: 'weekly-aulas-5',
    cadence: 'weekly',
    goalType: 'lesson_complete',
    target: 5,
    rewardXp: 40,
    rewardCoins: 50,
  },
  {
    slug: 'weekly-quizzes-3',
    cadence: 'weekly',
    goalType: 'quiz_passed',
    target: 3,
    rewardXp: 35,
    rewardCoins: 40,
  },
  {
    slug: 'weekly-bau',
    cadence: 'weekly',
    goalType: 'unit_complete',
    target: 1,
    rewardXp: 30,
    rewardCoins: 35,
  },
  {
    slug: 'weekly-enviar-2',
    cadence: 'weekly',
    goalType: 'studio_submitted',
    target: 2,
    rewardXp: 40,
    rewardCoins: 45,
  },
  {
    slug: 'weekly-publicar',
    cadence: 'weekly',
    goalType: 'course_showcased',
    target: 1,
    rewardXp: 50,
    rewardCoins: 60,
  },
  {
    // Cosmético: SÓ XP (rewardCoins 0) — decorar GASTA moeda; premiar com moeda
    // criaria um loop de ganhar-e-gastar. Idem o avatar.
    slug: 'weekly-quarto',
    cadence: 'weekly',
    goalType: 'room_item_buy',
    target: 1,
    rewardXp: 30,
    rewardCoins: 0,
  },
  {
    slug: 'weekly-avatar',
    cadence: 'weekly',
    goalType: 'avatar_part_buy',
    target: 1,
    rewardXp: 30,
    rewardCoins: 0,
  },
  {
    slug: 'weekly-clube-3',
    cadence: 'weekly',
    goalType: 'clube_thread',
    target: 3,
    rewardXp: 40,
    rewardCoins: 45,
    requiresAccess: CLUBE_ACCESS_REF,
  },
]

export const MONTHLY_MISSIONS: readonly MissionDef[] = [
  {
    slug: 'monthly-aulas-20',
    cadence: 'monthly',
    goalType: 'lesson_complete',
    target: 20,
    rewardXp: 120,
    rewardCoins: 90,
  },
  {
    slug: 'monthly-baus-3',
    cadence: 'monthly',
    goalType: 'unit_complete',
    target: 3,
    rewardXp: 100,
    rewardCoins: 80,
  },
  {
    slug: 'monthly-enviar-3',
    cadence: 'monthly',
    goalType: 'studio_submitted',
    target: 3,
    rewardXp: 120,
    rewardCoins: 90,
  },
  {
    slug: 'monthly-publicar-3',
    cadence: 'monthly',
    goalType: 'course_showcased',
    target: 3,
    rewardXp: 150,
    rewardCoins: 100,
  },
  {
    slug: 'monthly-classificar',
    cadence: 'monthly',
    goalType: 'course_rated',
    target: 1,
    rewardXp: 60,
    rewardCoins: 50,
  },
  {
    slug: 'monthly-avatar-3',
    cadence: 'monthly',
    goalType: 'avatar_part_buy',
    target: 3,
    rewardXp: 80,
    rewardCoins: 0,
  },
  {
    slug: 'monthly-clube-10',
    cadence: 'monthly',
    goalType: 'clube_thread',
    target: 10,
    rewardXp: 100,
    rewardCoins: 80,
    requiresAccess: CLUBE_ACCESS_REF,
  },
]

export const MISSIONS_BY_SLUG: ReadonlyMap<string, MissionDef> = new Map(
  [...DAILY_MISSIONS, ...WEEKLY_MISSIONS, ...MONTHLY_MISSIONS].map((m) => [m.slug, m]),
)

export const DAILY_SET_SIZE = 3
export const WEEKLY_SET_SIZE = 3
export const MONTHLY_SET_SIZE = 2

/** Predicado de posse de produto — decide se uma missão GATED entra no pool. */
export type MissionAccessPredicate = (ref: string) => boolean

/** Poda o pool pelas missões cujo `requiresAccess` a conta NÃO possui. */
function filterByAccess(
  pool: readonly MissionDef[],
  hasAccess: MissionAccessPredicate,
): MissionDef[] {
  return pool.filter((m) => !m.requiresAccess || hasAccess(m.requiresAccess))
}

/** FNV-1a 32-bit (determinístico, puro) — semente da atribuição. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** PRNG determinístico (xorshift32) semeado — sem `Math.random`, estável por plataforma. */
function xorshift32(seed: number): () => number {
  let x = seed >>> 0 || 0x9e3779b9 // estado 0 trava o xorshift → usa um não-zero fixo
  return () => {
    x ^= x << 13
    x >>>= 0
    x ^= x >>> 17
    x ^= x << 5
    x >>>= 0
    return x
  }
}

/**
 * Escolhe `count` missões DISTINTAS do pool por um embaralho parcial de Fisher–Yates
 * SEMEADO (determinístico por `seed`). Diferente da janela contígua antiga (que só
 * alcançava `pool.length` subconjuntos — p.ex. 5 dos 10 trios diários possíveis), este
 * alcança QUALQUER subconjunto de tamanho `count`, distribuindo as missões com justiça.
 */
function pick(pool: readonly MissionDef[], count: number, seed: number): MissionDef[] {
  const n = Math.min(count, pool.length)
  const idx = pool.map((_, i) => i)
  const rand = xorshift32(seed)
  for (let i = 0; i < n; i++) {
    const j = i + (rand() % (pool.length - i))
    const vi = idx[i]
    const vj = idx[j]
    if (vi === undefined || vj === undefined) continue
    idx[i] = vj
    idx[j] = vi
  }
  const out: MissionDef[] = []
  for (let i = 0; i < n; i++) {
    const k = idx[i]
    const m = k === undefined ? undefined : pool[k]
    if (m) out.push(m)
  }
  return out
}

/**
 * Set diário do aluno (estável por dia/criança). `hasAccess` poda o pool por posse
 * de produto ANTES do sorteio — default seguro (`() => false`): sem posse informada,
 * missões gated (Clube) NÃO entram (não vaza produto vendido à parte).
 */
export function assignDailyMissions(
  userId: string,
  dayKey: string,
  hasAccess: MissionAccessPredicate = () => false,
): MissionDef[] {
  return pick(
    filterByAccess(DAILY_MISSIONS, hasAccess),
    DAILY_SET_SIZE,
    fnv1a(`${userId}:${dayKey}`),
  )
}

/** Set semanal do aluno (estável por semana/criança). */
export function assignWeeklyMissions(
  userId: string,
  weekKey: string,
  hasAccess: MissionAccessPredicate = () => false,
): MissionDef[] {
  return pick(
    filterByAccess(WEEKLY_MISSIONS, hasAccess),
    WEEKLY_SET_SIZE,
    fnv1a(`${userId}:${weekKey}`),
  )
}

/** Set mensal do aluno (estável por mês/criança). */
export function assignMonthlyMissions(
  userId: string,
  monthKey: string,
  hasAccess: MissionAccessPredicate = () => false,
): MissionDef[] {
  return pick(
    filterByAccess(MONTHLY_MISSIONS, hasAccess),
    MONTHLY_SET_SIZE,
    fnv1a(`${userId}:${monthKey}`),
  )
}

/** Chave do período semanal: segunda-feira civil SP da semana de `dayKey` (`w:YYYY-MM-DD`). */
export function weeklyPeriodKey(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`)
  const dow = d.getUTCDay() // 0=domingo … 6=sábado
  const sinceMonday = (dow + 6) % 7
  d.setUTCDate(d.getUTCDate() - sinceMonday)
  return `w:${d.toISOString().slice(0, 10)}`
}

/** Chave do período mensal: mês civil SP de `dayKey` (`m:YYYY-MM`, mesma régua do Desafio do mês). */
export function monthlyPeriodKey(dayKey: string): string {
  return `m:${dayKey.slice(0, 7)}`
}

/**
 * Janela UTC de um dia civil SP (`YYYY-MM-DD`). SP é fixo UTC-3 (sem DST desde 2019),
 * então o dia civil começa às 03:00Z. Usada para contar eventos do dia no ledger.
 */
export function dayBoundsUtc(dayKey: string): { from: Date; to: Date } {
  const from = new Date(`${dayKey}T03:00:00Z`)
  const to = new Date(from)
  to.setUTCDate(to.getUTCDate() + 1)
  return { from, to }
}

/** Janela UTC da semana (segunda 03:00Z → segunda seguinte 03:00Z) a partir do `weekKey`. */
export function weekBoundsUtc(weekKey: string): { from: Date; to: Date } {
  const monday = weekKey.replace(/^w:/, '')
  const from = new Date(`${monday}T03:00:00Z`)
  const to = new Date(from)
  to.setUTCDate(to.getUTCDate() + 7)
  return { from, to }
}

/** Janela UTC do mês civil SP (dia 1 03:00Z → dia 1 do mês seguinte 03:00Z). */
export function monthBoundsUtc(monthKey: string): { from: Date; to: Date } {
  const ym = monthKey.replace(/^m:/, '')
  const from = new Date(`${ym}-01T03:00:00Z`)
  const to = new Date(from)
  to.setUTCMonth(to.getUTCMonth() + 1) // overflow de dezembro → janeiro do ano seguinte
  return { from, to }
}

/** Janela do período de uma missão (diária = o dia; semanal = a semana; mensal = o mês). */
export function periodBoundsFor(mission: MissionDef, dayKey: string): { from: Date; to: Date } {
  if (mission.cadence === 'daily') return dayBoundsUtc(dayKey)
  if (mission.cadence === 'monthly') return monthBoundsUtc(monthlyPeriodKey(dayKey))
  return weekBoundsUtc(weeklyPeriodKey(dayKey))
}

/** Chave de período de uma missão (diária = dayKey; semanal = weekKey; mensal = monthKey). */
export function periodKeyFor(mission: MissionDef, dayKey: string): string {
  if (mission.cadence === 'daily') return dayKey
  if (mission.cadence === 'monthly') return monthlyPeriodKey(dayKey)
  return weeklyPeriodKey(dayKey)
}
