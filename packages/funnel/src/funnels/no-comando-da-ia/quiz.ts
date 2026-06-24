// Lógica do quiz do "No Comando da IA": validação por chave, derivação do
// custo_mensal e o motor de perfil — tudo VERBATIM do que vivia em server/leads.ts
// e lib/* , agora como propriedades do FunnelQuiz (cada funil traz a sua).

import { z } from 'zod'
import { PERFIL_LABELS } from '../../lib/perfil'
import { projetoLabel, renderTemplate } from '../../lib/result-template'
import { calcCustoMensalCents } from '../../lib/result-text'
import { type ScoringAnswers, computePerfil as scorePerfil } from '../../lib/scoring'
import type { QuizAnswers } from '../registry'

const CHOICE_ABCD = z.enum(['A', 'B', 'C', 'D'])
const CHOICE_ABCDE = z.enum(['A', 'B', 'C', 'D', 'E'])

/**
 * Validação do `value` por chave do quiz (P2 e P6 têm 5 opções A–E; demais 4 A–D).
 * Numéricos com teto que cabe em int4 (o produto horas×valor×4 não estoura). Chaves
 * fora daqui são rejeitadas pelo handler (`patchLead`).
 */
export const NCI_VALUE_SCHEMA = {
  segmento: CHOICE_ABCD,
  tipo_criar: CHOICE_ABCDE,
  relacao_ia: CHOICE_ABCD,
  ja_quebrou: CHOICE_ABCD,
  trava_principal: CHOICE_ABCD,
  custo_principal: CHOICE_ABCDE,
  mudanca_desejada: CHOICE_ABCD,
  proximo_passo: CHOICE_ABCD,
  sintese: CHOICE_ABCD,
  horas_retrabalho: z.coerce.number().int().min(0).max(168),
  valor_hora: z.coerce.number().int().min(0).max(2_000_000),
  custo_mensal: z.coerce.number().int().min(0).max(2_000_000_000),
}

const str = (v: string | number | undefined): string | null => (typeof v === 'string' ? v : null)

/** Extrai as respostas que pontuam, no formato do motor de perfil (snake_case). */
function scoringAnswers(a: QuizAnswers): ScoringAnswers {
  return {
    segmento: str(a.segmento),
    relacao_ia: str(a.relacao_ia),
    ja_quebrou: str(a.ja_quebrou),
    trava_principal: str(a.trava_principal),
    custo_principal: str(a.custo_principal),
    mudanca_desejada: str(a.mudanca_desejada),
    proximo_passo: str(a.proximo_passo),
  }
}

/** custo_mensal (centavos) = horas × valor_hora × 4 — derivado quando ambos existem. */
export function nciDerive(a: QuizAnswers): QuizAnswers {
  const horas = a.horas_retrabalho
  const valor = a.valor_hora
  if (typeof horas === 'number' && typeof valor === 'number') {
    return { custo_mensal: calcCustoMensalCents(horas, valor) }
  }
  return {}
}

/** Perfil vencedor do motor de pontuação a partir das respostas. */
export function nciComputePerfil(a: QuizAnswers): string {
  return scorePerfil(scoringAnswers(a))
}

/** Resolve {{projeto}}/{{custo_mensal}}/[[CUSTO]] do corpo do diagnóstico. */
export function nciRenderCorpo(corpo: string, a: QuizAnswers): string {
  return renderTemplate(corpo, {
    projeto: projetoLabel(str(a.tipo_criar)),
    custoMensalCents: typeof a.custo_mensal === 'number' ? a.custo_mensal : null,
  })
}

export { PERFIL_LABELS as NCI_PERFIL_LABELS }
