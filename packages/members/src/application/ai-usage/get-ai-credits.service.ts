import { type AiCreditsView, computeAiCredits } from '../../domain/ai-usage/ai-credits'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import type { AiUsageRepository } from '../../domain/ports/ai-usage-repository.port'

/**
 * Lê quanto resta da ajuda de IA da CONTA — SEM consumir crédito.
 *
 * É o que alimenta o medidor que a criança vê antes de bater na parede. Até
 * 08/2026 a única forma de saber o saldo era chamar o `consume`, que gasta um
 * crédito para responder: quem quisesse mostrar "restam 13" gastava um dos 13.
 *
 * Os tetos continuam vindo do env (`AI_LIMIT_DAILY`/`AI_LIMIT_MONTHLY`), num
 * lugar só — a UI nunca deve hardcodar 50/500.
 */
export interface GetAiCreditsDeps {
  aiUsage: AiUsageRepository
  dailyLimit: number
  monthlyLimit: number
  clock: () => Date
}

export class GetAiCreditsService {
  constructor(private readonly deps: GetAiCreditsDeps) {}

  async execute(accountId: string, privileged: boolean): Promise<AiCreditsView> {
    const now = this.deps.clock()
    // Mesma régua do consume (dia civil SP, vira 03:00Z) — senão o medidor e a
    // recusa discordariam na virada do dia.
    const day = localDateSaoPaulo(now)
    const { usedDay, usedMonth } = await this.deps.aiUsage.totals({
      accountId,
      day,
      month: day.slice(0, 7),
    })
    return computeAiCredits({
      now,
      usedDay,
      usedMonth,
      dailyLimit: this.deps.dailyLimit,
      monthlyLimit: this.deps.monthlyLimit,
      unlimited: privileged,
    })
  }
}
