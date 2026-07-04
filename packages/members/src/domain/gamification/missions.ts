import type { BadgeSlug } from './badges'

/**
 * Missões diárias/semanais (catálogo EM CÓDIGO — como badges; prod sem seed). São
 * CONTENT-DRIVEN: cada missão conta eventos REAIS do ledger de XP (aula/quiz/estúdio/
 * unidade) num período — o progresso é DERIVADO na leitura (sem hook no award), e o
 * prêmio (XP + moedas) é resgatado explicitamente (claim idempotente por mission_claims).
 * Atribuição DETERMINÍSTICA por (userId, período) — sem `Date.now`/random.
 */

/** Tipos de evento do ledger que uma missão pode contar (== xp_source_type contáveis). */
export type MissionGoalType =
  | 'lesson_complete'
  | 'quiz_passed'
  | 'studio_passed'
  | 'unit_complete'
  // Clube: conta `clube_thread` (só APROVADO entra no ledger → não farmável por spam).
  | 'clube_thread'

export interface MissionDef {
  slug: string
  cadence: 'daily' | 'weekly'
  goalType: MissionGoalType
  target: number
  rewardXp: number
  rewardCoins: number
  rewardBadge?: BadgeSlug
}

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
    slug: 'daily-aulas-3',
    cadence: 'daily',
    goalType: 'lesson_complete',
    target: 3,
    rewardXp: 20,
    rewardCoins: 20,
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
    slug: 'daily-estudio',
    cadence: 'daily',
    goalType: 'studio_passed',
    target: 1,
    rewardXp: 20,
    rewardCoins: 25,
  },
  {
    slug: 'daily-bau',
    cadence: 'daily',
    goalType: 'unit_complete',
    target: 1,
    rewardXp: 15,
    rewardCoins: 15,
  },
  {
    // Comunidade: uma conversa aprovada no Clube (só conta o que a equipe liberou).
    slug: 'daily-clube',
    cadence: 'daily',
    goalType: 'clube_thread',
    target: 1,
    rewardXp: 10,
    rewardCoins: 10,
  },
]

export const WEEKLY_MISSIONS: readonly MissionDef[] = [
  {
    slug: 'weekly-aulas-10',
    cadence: 'weekly',
    goalType: 'lesson_complete',
    target: 10,
    rewardXp: 60,
    rewardCoins: 75,
  },
  {
    slug: 'weekly-quizzes-5',
    cadence: 'weekly',
    goalType: 'quiz_passed',
    target: 5,
    rewardXp: 50,
    rewardCoins: 60,
  },
  {
    slug: 'weekly-estudio-3',
    cadence: 'weekly',
    goalType: 'studio_passed',
    target: 3,
    rewardXp: 75,
    rewardCoins: 80,
  },
  {
    // Comunidade: 3 conversas aprovadas no Clube na semana.
    slug: 'weekly-clube-3',
    cadence: 'weekly',
    goalType: 'clube_thread',
    target: 3,
    rewardXp: 40,
    rewardCoins: 45,
  },
]

export const MISSIONS_BY_SLUG: ReadonlyMap<string, MissionDef> = new Map(
  [...DAILY_MISSIONS, ...WEEKLY_MISSIONS].map((m) => [m.slug, m]),
)

export const DAILY_SET_SIZE = 3
export const WEEKLY_SET_SIZE = 2

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

/** Set diário do aluno (estável por dia/criança). */
export function assignDailyMissions(userId: string, dayKey: string): MissionDef[] {
  return pick(DAILY_MISSIONS, DAILY_SET_SIZE, fnv1a(`${userId}:${dayKey}`))
}

/** Set semanal do aluno (estável por semana/criança). */
export function assignWeeklyMissions(userId: string, weekKey: string): MissionDef[] {
  return pick(WEEKLY_MISSIONS, WEEKLY_SET_SIZE, fnv1a(`${userId}:${weekKey}`))
}

/** Chave do período semanal: segunda-feira civil SP da semana de `dayKey` (`w:YYYY-MM-DD`). */
export function weeklyPeriodKey(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00Z`)
  const dow = d.getUTCDay() // 0=domingo … 6=sábado
  const sinceMonday = (dow + 6) % 7
  d.setUTCDate(d.getUTCDate() - sinceMonday)
  return `w:${d.toISOString().slice(0, 10)}`
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

/** Janela do período de uma missão (diária = o dia; semanal = a semana). */
export function periodBoundsFor(mission: MissionDef, dayKey: string): { from: Date; to: Date } {
  return mission.cadence === 'daily' ? dayBoundsUtc(dayKey) : weekBoundsUtc(weeklyPeriodKey(dayKey))
}

/** Chave de período de uma missão (diária = dayKey; semanal = weekKey). */
export function periodKeyFor(mission: MissionDef, dayKey: string): string {
  return mission.cadence === 'daily' ? dayKey : weeklyPeriodKey(dayKey)
}
