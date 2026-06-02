import { ValidationError } from '../shared/errors'

// kebab-case: minúsculas, números e hífens (sem hífens nas pontas ou duplicados).
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Slug como value object: normaliza (trim + lowercase) e valida. Usado para o
 * lookup público de produtos/ofertas (ex.: `/catalog/offers/no-comando-da-ia`).
 */
export class Slug {
  private constructor(readonly value: string) {}

  static create(raw: string): Slug {
    const value = raw.trim().toLowerCase()
    if (value.length < 1 || value.length > 140 || !SLUG_RE.test(value)) {
      throw new ValidationError('Slug inválido (use minúsculas, números e hífens)')
    }
    return new Slug(value)
  }

  toString(): string {
    return this.value
  }
}
