import { formatBRLFromCents } from './money'

/** Frase de impacto da calculadora (P7), a partir do custo mensal em centavos. */
export function custoMensalText(custoMensalCents: number): string {
  return `Você pode estar perdendo cerca de ${formatBRLFromCents(custoMensalCents)} por mês em tempo travado, retrabalho ou espera. O critério certo não elimina todos os problemas, mas reduz muito o tempo perdido no escuro.`
}

/** Fórmula da calculadora: custo_mensal (centavos) = horas × valor_hora(centavos) × 4. */
export function calcCustoMensalCents(horasRetrabalho: number, valorHoraCents: number): number {
  return Math.round(horasRetrabalho * valorHoraCents * 4)
}
