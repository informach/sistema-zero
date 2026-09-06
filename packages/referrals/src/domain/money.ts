/**
 * "R$ 30,00" — porte FIEL da régua do fiscal (`packages/fiscal/src/domain/money.ts`,
 * agrupamento por regex determinística, sem depender do ICU do runtime). O
 * chamador passa centavos inteiros (snapshot de `bonus_cents`).
 */
export function formatBrl(value: number | bigint): string {
  const cents = typeof value === 'bigint' ? value : BigInt(Math.trunc(value))
  const abs = cents < 0n ? -cents : cents
  const reais = `${abs / 100n}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cents < 0n ? '-' : ''}R$ ${reais},${(abs % 100n).toString().padStart(2, '0')}`
}
