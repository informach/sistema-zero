import { type AiCreditsView, computeAiCredits } from '../../domain/ai-usage/ai-credits'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import type {
  AiUsageRepository,
  ConsumeAiUsageOutcome,
} from '../../domain/ports/ai-usage-repository.port'

/**
 * Consome 1 crédito de IA da CONTA (quota diária + mensal — "50/dia + 500/mês").
 *
 * Chamado pelo BFF (member-shell) ANTES de cada chamada ao provedor de LLM —
 * 1 crédito por INTERAÇÃO (mensagem de chat, síntese, descrição), independente
 * de quantas chamadas internas o recurso faça. A recusa é resposta de DOMÍNIO
 * (`allowed:false` + `scope`), não erro: o chamador decide a UX (recado gentil,
 * fallback manual). Equipe (`privileged`) nunca é recusada, mas o consumo é
 * gravado para o custo continuar visível no admin.
 *
 * Dia/mês = calendário civil de São Paulo (mesma régua do streak; o "dia" vira
 * às 03:00Z). Limites vêm do env (`AI_LIMIT_DAILY`/`AI_LIMIT_MONTHLY`) —
 * ajustáveis sem retrabalho.
 */
export interface ConsumeAiUsageDeps {
  aiUsage: AiUsageRepository
  dailyLimit: number
  monthlyLimit: number
  clock: () => Date
}

export interface ConsumeAiUsageResult extends ConsumeAiUsageOutcome {
  /** Equipe: sem teto (o front pode esconder contadores). */
  unlimited?: true
  /**
   * Saldo DEPOIS deste consumo (ou o atual, na recusa) — o medidor do chamador se
   * atualiza sem uma 2ª ida. Sai de dados que o `execute` já tem em mãos: zero
   * query extra.
   */
  credits: AiCreditsView
}

export class ConsumeAiUsageService {
  constructor(private readonly deps: ConsumeAiUsageDeps) {}

  async execute(
    accountId: string,
    feature: string,
    privileged: boolean,
  ): Promise<ConsumeAiUsageResult> {
    const now = this.deps.clock()
    const day = localDateSaoPaulo(now)
    const month = day.slice(0, 7)
    const outcome = await this.deps.aiUsage.consume({
      accountId,
      day,
      month,
      feature,
      privileged,
      dailyLimit: this.deps.dailyLimit,
      monthlyLimit: this.deps.monthlyLimit,
      now,
    })
    const credits = computeAiCredits({
      now,
      usedDay: outcome.usedDay,
      usedMonth: outcome.usedMonth,
      dailyLimit: this.deps.dailyLimit,
      monthlyLimit: this.deps.monthlyLimit,
      unlimited: privileged,
    })
    return privileged ? { ...outcome, unlimited: true, credits } : { ...outcome, credits }
  }
}
