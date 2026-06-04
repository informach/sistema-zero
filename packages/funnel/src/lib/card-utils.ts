// Utilitários de cartão de crédito — client-safe: funções puras, sem env/server
// e sem importar `payment-token-efi` (testável com bun:test sem o SDK do browser).
// Bandeiras/limites seguem a doc oficial da Efí (payment-token-efi): visa,
// mastercard, elo e hipercard têm 16 dígitos e CVV de 3; amex tem 15 (grupos
// 4-6-5) e CVV de 4.

/** Bandeiras aceitas pela Efí (retornos válidos de `verifyCardBrand`). */
export const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'elo', 'hipercard'] as const
export type CardBrand = (typeof CARD_BRANDS)[number]

/**
 * Normaliza o retorno de `verifyCardBrand` para o union de bandeiras aceitas.
 * A Efí devolve `'undefined'`/`'unsupported'` como STRING quando não identifica
 * ou não aceita a bandeira — ambas (e qualquer outro valor) viram `null`.
 */
export function normalizeBrand(raw: string | null | undefined): CardBrand | null {
  return (CARD_BRANDS as readonly string[]).includes(raw ?? '') ? (raw as CardBrand) : null
}

/** Total de dígitos do PAN por bandeira (desconhecida → 16, o mais comum). */
export function cardLengthFor(brand: CardBrand | null): number {
  return brand === 'amex' ? 15 : 16
}

/** Tamanho do CVV por bandeira (desconhecida → 3, o mais comum). */
export function cvvLengthFor(brand: CardBrand | null): number {
  return brand === 'amex' ? 4 : 3
}

/** Só dígitos, com teto de tamanho (impede letras/símbolos no campo). */
export function onlyDigits(v: string, max: number): string {
  return v.replace(/\D/g, '').slice(0, max)
}

/**
 * Máscara do número do cartão, ciente da bandeira: corta no teto da bandeira e
 * agrupa 4-4-4-4 (→ "4242 4242 4242 4242") ou 4-6-5 para amex (→ "3782 822463 10005").
 */
export function maskCardNumber(v: string, brand: CardBrand | null): string {
  const d = onlyDigits(v, cardLengthFor(brand))
  if (brand === 'amex') {
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ')
  }
  return d.replace(/(.{4})/g, '$1 ').trim()
}

/** Placeholder do campo do número, no formato da bandeira. */
export function cardPlaceholder(brand: CardBrand | null): string {
  return brand === 'amex' ? '0000 000000 00000' : '0000 0000 0000 0000'
}

/**
 * Validação de Luhn (dígito verificador do PAN). Recebe SÓ dígitos; qualquer
 * outra coisa (ou comprimento fora de 13–19) → false.
 */
export function luhnCheck(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (double) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    double = !double
  }
  return sum % 10 === 0
}

/**
 * Validade do cartão não pode estar no passado (o mês corrente ainda vale).
 * `now` é injetado (handler puro/testável). Entradas não-numéricas → false —
 * o formato em si (MM/AAAA) é responsabilidade do `CardFormSchema`.
 */
export function isExpiryInFuture(mm: string, yyyy: string, now: Date): boolean {
  const m = Number(mm)
  const y = Number(yyyy)
  if (!Number.isInteger(m) || !Number.isInteger(y) || m < 1 || m > 12) return false
  return y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth() + 1)
}

/** Máscara de CPF: "000.000.000-00" (usada no CPF do titular do cartão). */
export function maskCpf(v: string): string {
  const d = onlyDigits(v, 11)
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`
  return d
}

/** Nome de exibição da bandeira (pt-BR). */
export function brandLabel(brand: CardBrand): string {
  const labels: Record<CardBrand, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    elo: 'Elo',
    hipercard: 'Hipercard',
  }
  return labels[brand]
}
