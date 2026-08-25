/**
 * Dinheiro do fiscal — bigint de CENTAVOS na borda de exibição. Extraído do
 * emit-invoice.service (eram privados de módulo) porque o DANFSe local também
 * formata valores; NÃO duplicar estas réguas.
 */

/** "R$ 37,00" (e-mail da nota + DANFSe). */
export function formatBrl(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents
  const reais = `${abs / 100n}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cents < 0n ? '-' : ''}R$ ${reais},${(abs % 100n).toString().padStart(2, '0')}`
}

/** "37.00" (valor decimal da DPS — o formato que a Sefin espera). */
export function centsToReais(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`
}

/**
 * Valor DECIMAL vindo do XML da NFS-e ("37.00", "1234.5") → "R$ 1.234,50".
 * Formata por STRING (nunca parseFloat — dinheiro não passa por float).
 * Valor ilegível → null (o DANFSe imprime o traço da nota 12 da NT 008).
 */
export function formatXmlDecimalBrl(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) return null
  const negative = raw.startsWith('-')
  const [intPartRaw, fracRaw = ''] = (negative ? raw.slice(1) : raw).split('.')
  const intPart = (intPartRaw ?? '0').replace(/^0+(?=\d)/, '')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const frac = `${fracRaw}00`.slice(0, 2)
  return `${negative ? '-' : ''}R$ ${grouped},${frac}`
}
