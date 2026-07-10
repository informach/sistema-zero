import type { AiUsageConsumeView } from '../lib/types'
import type { MembersClient } from './clients'

/**
 * Quota de IA por CONTA (50/dia + 500/mês, ajustável no members) — consumida
 * ANTES de cada ida ao OpenRouter. 1 crédito por INTERAÇÃO (mensagem do chat,
 * síntese, descrição), independente de quantas chamadas LLM internas o recurso
 * faça. Recurso novo = string nova (o members valida o formato e o admin ganha
 * o breakdown de custo automaticamente).
 */
export type AiFeature = 'pensa-chat' | 'pensa-synthesis' | 'studio-describe'

export type AiQuotaResult = { allowed: true } | { allowed: false; scope: 'day' | 'month' }

/**
 * Consome 1 crédito da conta. **FAIL-OPEN**: se o members estiver fora / a
 * resposta vier malformada, libera com log — indisponibilidade da quota não
 * pode derrubar o Pensa/Mural (o rate-limit in-process de 10/min continua como
 * anti-burst local). Só recusa com um `allowed:false` EXPLÍCITO do members.
 */
export async function consumeAiQuota(
  members: MembersClient,
  feature: AiFeature,
): Promise<AiQuotaResult> {
  try {
    const res = await members.aiUsageConsume(feature)
    if (res.status !== 200 || !res.body || typeof res.body.allowed !== 'boolean') {
      console.error(`[ai-quota] consumo indisponível (status ${res.status}) — liberando`, {
        feature,
      })
      return { allowed: true }
    }
    const body = res.body as AiUsageConsumeView
    if (body.allowed) return { allowed: true }
    return { allowed: false, scope: body.scope === 'month' ? 'month' : 'day' }
  } catch (error) {
    console.error('[ai-quota] falha ao consumir — liberando', { feature, error })
    return { allowed: true }
  }
}

/** Copy da recusa (tom Zappy, público inclui crianças) por escopo. */
export function aiQuotaMessage(scope: 'day' | 'month'): string {
  return scope === 'day'
    ? 'Por hoje a gente já pensou bastante! Amanhã tem mais 🤖'
    : 'Uau, você usou toda a ajuda do Zappy deste mês! No mês que vem tem mais 🤖'
}
