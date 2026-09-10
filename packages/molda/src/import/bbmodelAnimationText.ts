import type { BbmodelAnimationExpression } from './bbmodelAnimationTypes'
import {
  BbmodelInputError,
  bbmodelIdentifier,
  BBMODEL_INPUT_LIMITS as limits,
  requireBbmodel,
} from './bbmodelInput'
import { bbmodelNumber } from './bbmodelValues'

/** Source string occurrences in UTF-16, excluding defaults, property names and generated paths. */
export function bbmodelAnimationTextBudget(max: number, message: string) {
  let chars = 0
  function take(value: string, path: string): string {
    if (value.length > limits.identifierChars)
      throw new BbmodelInputError('budget', path, 'Este texto de animação é longo demais.')
    chars += value.length
    if (chars > max) throw new BbmodelInputError('budget', path, message)
    return value
  }
  return {
    get chars() {
      return chars
    },
    identifier: (value: unknown, path: string) => take(bbmodelIdentifier(value, path), path),
    optional(value: unknown, path: string): string | null {
      if (value === undefined) return null
      requireBbmodel(typeof value === 'string', path, 'Este metadado precisa ser texto.')
      return take(value, path)
    },
    expression(value: unknown, path: string, fallback = ''): BbmodelAnimationExpression {
      if (value === undefined) return fallback
      return typeof value === 'string' ? take(value, path) : bbmodelNumber(value, path)
    },
    markerName(value: unknown, path: string): string | 0 {
      if (value === undefined) return 0
      if (value === 0) return value
      requireBbmodel(
        typeof value === 'string',
        path,
        'O nome do marcador precisa ser texto ou zero.',
      )
      return take(value, path)
    },
  }
}
