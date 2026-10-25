import type { PythonValue } from '../language/types'
import { isNode } from './nodes'

/**
 * Structural equality of two Python syntax values, ignoring source identity (`id`) and
 * location (`range`), exactly like comparing `pythonSemanticTree` serializations but without
 * allocating. Used by every decode attempt, so it must stay allocation-free.
 */
export function samePythonValue(a: PythonValue | undefined, b: PythonValue | undefined): boolean {
  if (a === b) return true
  if (a === null || b === null || a === undefined || b === undefined) return false
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    for (let index = 0; index < a.length; index++)
      if (!samePythonValue(a[index], b[index])) return false
    return true
  }
  if (Array.isArray(b)) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  const aNode = isNode(a)
  if (aNode !== isNode(b)) return false
  if (aNode && isNode(b)) {
    if (a.kind !== b.kind) return false
    const left = a.fields
    const right = b.fields
    let count = 0
    for (const key in left) {
      if (!Object.hasOwn(left, key)) continue
      count++
      if (!Object.hasOwn(right, key) || !samePythonValue(left[key], right[key])) return false
    }
    for (const key in right) if (Object.hasOwn(right, key)) count--
    return count === 0
  }
  // Literal payloads such as { literal: 'int', value: '10' }.
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  let count = 0
  for (const key in left) {
    if (!Object.hasOwn(left, key)) continue
    count++
    if (
      !Object.hasOwn(right, key) ||
      !samePythonValue(left[key] as PythonValue, right[key] as PythonValue)
    )
      return false
  }
  for (const key in right) if (Object.hasOwn(right, key)) count--
  return count === 0
}
