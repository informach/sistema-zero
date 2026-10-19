const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

/**
 * O mês do desafio pela chave do members (`m:AAAA-MM`): "outubro". Chave em outro formato devolve
 * `null`, e quem chama cai no texto sem o mês.
 */
export function challengeMonthName(key: string): string | null {
  const match = /^m:(\d{4})-(\d{2})$/.exec(key)
  if (!match) return null
  return MONTHS[Number(match[2]) - 1] ?? null
}
