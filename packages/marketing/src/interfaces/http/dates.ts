import { ValidationError } from '@sistemazero/core/errors'

/** ISO 8601 → Date (400 em formato inválido); null/undefined passam adiante. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Data inválida: "${value}" (use ISO 8601)`)
  }
  return date
}
