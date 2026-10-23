import { isNode } from '../blocks/nodes'
import type { PythonValue } from './types'

/** Compare an editor tree in one analysis generation, including retained origins.
 * Codec-created helper nodes have no origin; their fields still participate.
 * This is deliberately separate from the final, origin-free semantic proof.
 */
export function samePythonSourceTree(a: PythonValue, b: PythonValue): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => samePythonSourceTree(item, b[index]!))
    )
  if (isNode(a) || isNode(b)) {
    if (!isNode(a) || !isNode(b) || a.kind !== b.kind || (a.id && b.id && a.id !== b.id))
      return false
    const keys = Object.keys(a.fields)
    return (
      keys.length === Object.keys(b.fields).length &&
      keys.every(
        (key) =>
          b.fields[key] !== undefined && samePythonSourceTree(a.fields[key]!, b.fields[key]!),
      )
    )
  }
  // Exact integer/float/bytes/complex representations, never coerced to Number.
  return JSON.stringify(a) === JSON.stringify(b)
}
