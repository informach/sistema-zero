import { ValidationError } from '../shared/errors'

// Token estável: minúsculas/números, podendo conter `.`, `_` e `-` no meio.
const SKU_RE = /^[a-z0-9][a-z0-9._-]*$/

/**
 * SKU como value object: identificador estável e único do produto/oferta.
 * Normaliza (trim + lowercase) e valida o formato.
 */
export class Sku {
  private constructor(readonly value: string) {}

  static create(raw: string): Sku {
    const value = raw.trim().toLowerCase()
    if (value.length < 1 || value.length > 80 || !SKU_RE.test(value)) {
      throw new ValidationError('SKU/código inválido')
    }
    return new Sku(value)
  }

  toString(): string {
    return this.value
  }
}
