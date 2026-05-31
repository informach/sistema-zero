import type { Segmento } from '../content/quiz-config'
import { RESULT_MESSAGES } from '../content/result-messages'
import { formatBRLFromCents } from './money'

/** Mensagem da tela de resultado conforme o segmento (A/B/C/D); fallback se ausente. */
export function getResultMessage(segmento: string | null | undefined): string {
  const seg = (segmento ?? '').trim().toUpperCase()
  if (seg === 'A' || seg === 'B' || seg === 'C' || seg === 'D') {
    return RESULT_MESSAGES.segmentos[seg as Segmento]
  }
  return RESULT_MESSAGES.fallback
}

/** Frase de impacto da calculadora (P6), a partir do custo mensal em centavos. */
export function custoMensalText(custoMensalCents: number): string {
  return `Você perde cerca de ${formatBRLFromCents(custoMensalCents)} por mês travado em retrabalho que um critério mínimo resolveria. Em um ano, isso vira mais de doze vezes esse valor.`
}

/** Fórmula da calculadora: custo_mensal (centavos) = horas × valor_hora(centavos) × 4. */
export function calcCustoMensalCents(horasRetrabalho: number, valorHoraCents: number): number {
  return Math.round(horasRetrabalho * valorHoraCents * 4)
}
