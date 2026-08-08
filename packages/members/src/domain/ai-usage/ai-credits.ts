import { localDateSaoPaulo } from '../gamification/gamification'
import { monthBoundsUtc } from '../gamification/missions'

/**
 * Quanto ainda resta da ajuda de IA da CONTA (a "família": irmãos dividem o mesmo
 * bolso — ver `ai_usage_daily`, keyada por account_id).
 *
 * ⚠️ `monthRenewsOn` é uma data CIVIL de São Paulo (`YYYY-MM-DD`), não um instante.
 * O cliente formata string→string; derivar a data de um ISO no browser aplicaria o
 * fuso do aparelho e mostraria o dia errado para quem está fora do Brasil ou com o
 * relógio torto. O DIA não precisa de data: a virada é 03:00Z e a copy é
 * "amanhã de manhã".
 */
export interface AiCreditsView {
  dayLimit: number
  dayRemaining: number
  monthLimit: number
  monthRemaining: number
  /** Data civil SP em que o MÊS vira (`YYYY-MM-DD`, sempre dia 01). */
  monthRenewsOn: string
  /** Equipe: sem teto. Quem lê precisa checar ISTO antes de qualquer número. */
  unlimited?: boolean
}

export interface ComputeAiCreditsInput {
  now: Date
  usedDay: number
  usedMonth: number
  dailyLimit: number
  monthlyLimit: number
  /** Equipe (superadmin/admin/staff): grava consumo mas nunca é recusada. */
  unlimited: boolean
}

/** Nunca negativo: equipe consome acima do teto e o front mostraria "-3 restantes". */
function remaining(limit: number, used: number): number {
  return Math.max(0, limit - used)
}

export function computeAiCredits(input: ComputeAiCreditsInput): AiCreditsView {
  const month = localDateSaoPaulo(input.now).slice(0, 7)
  // `monthBoundsUtc().to` é o dia 1 do mês seguinte às 03:00Z = meia-noite em SP,
  // então o formatter devolve exatamente a data civil que abre o mês novo (e o
  // overflow dezembro→janeiro já está resolvido lá).
  const monthRenewsOn = localDateSaoPaulo(monthBoundsUtc(`m:${month}`).to)
  return {
    dayLimit: input.dailyLimit,
    dayRemaining: remaining(input.dailyLimit, input.usedDay),
    monthLimit: input.monthlyLimit,
    monthRemaining: remaining(input.monthlyLimit, input.usedMonth),
    monthRenewsOn,
    ...(input.unlimited ? { unlimited: true } : {}),
  }
}
