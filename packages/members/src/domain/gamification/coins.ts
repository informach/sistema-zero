/**
 * Regras da moeda **Zappy Coins** (carteira, fatia 06/2026) — domínio PURO, sem
 * I/O nem `Date.now`. A moeda é o SINK gastável da gamificação (cosméticos de
 * avatar/quarto); o XP continua sendo a métrica de status/ranking. v1 é
 * EARN-ONLY (a compra com dinheiro real pelos pais é fase futura).
 *
 * Ética baked-in (pesquisa Duolingo/Eureka + gamificação infantil): **teto diário
 * de GANHO** (anti-grind/anti-compulsão — limita o ganho, nunca o saldo), gasto
 * SÓ cosmético (sem pay-to-win), sem loot box. Os valores são constantes
 * calibráveis aqui — mudar é trivial.
 */

/** Valores de moeda por atividade (faucets de rotina — contam no teto diário). */
export const COIN_VALUES = {
  LESSON_COMPLETE: 5,
  QUIZ_PASSED_BASE: 10,
  /** Bônus proporcional à nota do quiz/estúdio aprovado (nota 100 → +5). */
  QUIZ_SCORE_BONUS_MAX: 5,
  /** Baú de fim de unidade (todas as aulas publicadas do módulo concluídas). */
  UNIT_COMPLETE: 15,
} as const

/** Teto DIÁRIO de GANHO de moeda (dia civil de São Paulo). Limita o ganho, nunca o saldo. */
export const DAILY_COIN_CAP = 100

/** Preço de 1 protetor de sequência extra (1 grátis/mês; este é o COMPRÁVEL). */
export const STREAK_FREEZE_PRICE = 80

/** Moedas de um quiz/estúdio APROVADO: base + bônus proporcional à nota (cap +5). */
export function quizPassedCoins(score: number): number {
  const bonus = Math.min(COIN_VALUES.QUIZ_SCORE_BONUS_MAX, Math.max(0, Math.round(score / 20)))
  return COIN_VALUES.QUIZ_PASSED_BASE + bonus
}

// Marcos de streak → bônus de moedas (one-time por marco, dedupado pelo ledger).
// EXEMPTOS do teto diário: são raros e não-grindáveis (você só cruza 365 uma vez);
// capá-los a 100 perderia o bônus para sempre. Espelham os marcos de badge de streak.
const STREAK_COIN_MILESTONES: readonly (readonly [number, number])[] = [
  [7, 20],
  [30, 50],
  [60, 80],
  [180, 150],
  [365, 300],
]

export interface CoinMilestoneReward {
  /** sourceId estável do `coin_event` (`streak:<dias>`) — one-time por marco. */
  sourceId: string
  amount: number
}

/** Bônus de moeda dos marcos de streak alcançados em `current` (o ledger dedupa). */
export function streakMilestoneCoins(current: number): CoinMilestoneReward[] {
  return STREAK_COIN_MILESTONES.filter(([days]) => current >= days).map(([days, amount]) => ({
    sourceId: `streak:${days}`,
    amount,
  }))
}

export interface DailyCapResult {
  /** Valor efetivamente concedido por candidato, na ordem (≤ pedido). */
  granted: number[]
  totalGranted: number
  /** `true` quando algo foi cortado pelo teto (feedback gentil "limite do dia"). */
  capped: boolean
}

/**
 * Aplica o teto DIÁRIO a candidatos que contam no teto (faucets de rotina), em
 * ordem: cada um é concedido até o que resta do teto; o excedente é descartado
 * (perdido — o teto é um limite duro de GANHO por dia). Marcos/missões/ligas que
 * NÃO contam no teto não passam por aqui (são concedidos integralmente).
 */
export function applyDailyCap(amounts: number[], earnedToday: number, cap: number): DailyCapResult {
  let room = Math.max(0, cap - Math.max(0, earnedToday))
  let capped = false
  const granted = amounts.map((a) => {
    const give = Math.max(0, Math.min(a, room))
    if (give < a) capped = true
    room -= give
    return give
  })
  return { granted, totalGranted: granted.reduce((s, g) => s + g, 0), capped }
}
