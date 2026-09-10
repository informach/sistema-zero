import type { BbmodelAnimationExpression } from './bbmodelAnimationTypes'

export type BbmodelAnimationConstant =
  | { kind: 'constant'; value: number }
  | { kind: 'expression' }
  | { kind: 'out-of-range'; reason: 'overflow' | 'underflow' }

/**
 * A deliberately small literal subset: optional minus, integer digits, optional fraction,
 * optional f/F after a fraction. No operators, exponent, hex, brackets or internal whitespace.
 * Returns the end of the numeric portion; never parses or evaluates a Molang expression.
 */
function decimalEnd(text: string): number | null {
  let cursor = text.startsWith('-') ? 1 : 0
  const integerStart = cursor
  const digit = (index: number) => text.charCodeAt(index) >= 48 && text.charCodeAt(index) <= 57
  while (digit(cursor)) cursor++
  if (cursor === integerStart) return null
  if (cursor === text.length) return cursor
  if (text[cursor] !== '.') return null
  cursor++
  const fractionStart = cursor
  while (digit(cursor)) cursor++
  if (cursor === fractionStart) return null
  if (cursor === text.length) return cursor
  return cursor === text.length - 1 && (text[cursor] === 'f' || text[cursor] === 'F')
    ? cursor
    : null
}

/** Classifies an already validated/bounded source scalar. It is not a general numeric/Molang parser. */
export function classifyBbmodelAnimationConstant(
  value: BbmodelAnimationExpression,
): BbmodelAnimationConstant {
  if (typeof value === 'number') return { kind: 'constant', value }
  const literal = value.trim(),
    end = decimalEnd(literal)
  if (end === null) return { kind: 'expression' }
  const numeric = literal.slice(0, end),
    result = Number(numeric)
  if (!Number.isFinite(result)) return { kind: 'out-of-range', reason: 'overflow' }
  // A nonzero decimal can be smaller than F64. Never silently convert that authorial value to zero.
  if (result === 0 && /[1-9]/.test(numeric)) return { kind: 'out-of-range', reason: 'underflow' }
  return { kind: 'constant', value: result }
}
