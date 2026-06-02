import { ValidationError } from '../shared/errors'

// Maiúsculas/números, podendo conter `.`, `_` e `-` no meio. Normalizado UPPERCASE
// (matching case-insensitive). Ex.: "PROMO10", "BLACK-FRIDAY".
const CODE_RE = /^[A-Z0-9][A-Z0-9._-]*$/

/** Código de cupom como value object: normaliza (trim + UPPERCASE) e valida. */
export class CouponCode {
  private constructor(readonly value: string) {}

  static create(raw: string): CouponCode {
    const value = raw.trim().toUpperCase()
    if (value.length < 1 || value.length > 60 || !CODE_RE.test(value)) {
      throw new ValidationError('Código de cupom inválido')
    }
    return new CouponCode(value)
  }

  toString(): string {
    return this.value
  }
}
