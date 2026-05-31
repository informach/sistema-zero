// Helpers de dinheiro (client-safe — sem dependências de servidor). Valores
// internos em CENTAVOS (inteiro), exibidos como R$ no padrão pt-BR.

const BRL0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const BRL2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Ex.: 400000 → "R$ 4.000". */
export function formatBRLFromCents(cents: number): string {
  return BRL0.format(Math.round(cents) / 100)
}

/** Ex.: 3700 → "R$ 37,00". */
export function formatBRLFromCents2(cents: number): string {
  return BRL2.format(Math.round(cents) / 100)
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}

/**
 * Converte texto digitado em R$ para centavos. Convenção pt-BR ("." milhar,
 * "," decimal): "1.234,50" → 123450; "2000" → 200000. Sem vírgula, o ponto é
 * ambíguo — tratamos vários pontos OU um grupo final de 3 dígitos como milhar
 * ("1.234" → 1234) e 1-2 casas finais como decimal ("50.00" → 50, "1.5" → 1,5),
 * para não ler "50.00" como R$ 5.000. Retorna null se inválido.
 */
export function parseReaisToCents(input: string): number | null {
  let s = String(input).trim().replace(/r\$/i, '').replace(/\s/g, '')
  if (s === '') return null
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes('.')) {
    const parts = s.split('.')
    const last = parts[parts.length - 1] ?? ''
    if (parts.length > 2 || last.length === 3) s = s.replace(/\./g, '')
  }
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Inteiro não-negativo a partir de texto (ex.: horas). Retorna null se inválido. */
export function parseNonNegativeInt(input: string): number | null {
  const n = Number(String(input).trim().replace(/\s/g, ''))
  if (!Number.isInteger(n) || n < 0) return null
  return n
}
