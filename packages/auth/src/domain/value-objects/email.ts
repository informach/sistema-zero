import { ValidationError } from '@sistemazero/core/errors'

// Validação pragmática (não RFC-completa): um `@`, com partes não vazias e um
// ponto no domínio. Casos extremos ficam para a verificação de e-mail (futuro).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * E-mail como value object: normaliza (trim + lowercase) e valida o formato.
 * A normalização garante unicidade consistente (índice único no banco).
 */
export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase()
    if (value.length < 3 || value.length > 320 || !EMAIL_RE.test(value)) {
      throw new ValidationError('E-mail inválido')
    }
    return new Email(value)
  }

  toString(): string {
    return this.value
  }
}
