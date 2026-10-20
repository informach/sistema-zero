/**
 * Economia do plano anual frente a doze mensalidades, em centavos de reais inteiros.
 *
 * Só existe com os DOIS preços ao vivo do catálogo: se um deles faltar (oferta irmã fora do ar), a
 * página não anuncia economia em vez de compará-la a um preço de fallback. Arredonda para BAIXO,
 * para nunca prometer um real a mais; abaixo de R$ 1 não há economia a anunciar.
 */
export function calcularEconomiaAnual(
  mensalCents: number | null | undefined,
  anualCents: number | null | undefined,
): number {
  if (!mensalCents || !anualCents) return 0
  const bruta = mensalCents * 12 - anualCents
  if (bruta < 100) return 0
  return Math.floor(bruta / 100) * 100
}

/**
 * O "menos de R$ X por dia" das páginas de assinatura: a mensalidade em 30 dias, levada à dezena de
 * centavos SEGUINTE (sempre acima do valor real, nunca igual, para o "menos de" ser verdade).
 */
export function precoPorDiaCents(mensalCents: number): number {
  return (Math.floor(mensalCents / 300) + 1) * 10
}
