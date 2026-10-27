/**
 * Tempo livre no Kids (decisão da dona, 27/10/2026): 30 minutos por dia por padrão, e os pais
 * mudam para mais ou para menos. Desafios do Estúdio e o caminho para a aula não contam. Na
 * comunidade adulta não há limite.
 */
export const LIMITE_DIARIO_PADRAO_MINUTOS = 30
export const LIMITE_DIARIO_MINIMO_MINUTOS = 10
export const LIMITE_DIARIO_MAXIMO_MINUTOS = 240
export const LIMITE_DIARIO_PASSO_MINUTOS = 5

/** Normaliza o que os pais escolheram: dentro da faixa e em passos de 5 minutos. */
export function normalizarLimiteDiario(minutos: number): number {
  if (!Number.isFinite(minutos)) return LIMITE_DIARIO_PADRAO_MINUTOS
  const passo = Math.round(minutos / LIMITE_DIARIO_PASSO_MINUTOS) * LIMITE_DIARIO_PASSO_MINUTOS
  return Math.min(LIMITE_DIARIO_MAXIMO_MINUTOS, Math.max(LIMITE_DIARIO_MINIMO_MINUTOS, passo))
}

/** O dia do jogo para o limite é o dia civil de São Paulo (como o resto da plataforma). */
export function diaDeSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora)
}
