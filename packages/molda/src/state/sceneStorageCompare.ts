import { sameScenePixelBytes } from './sceneBlob'

/**
 * Exact comparison of the scene storage value domain, NOT a generic serializer or validator.
 * Used only after validating a captured scene, then rereading its dependencies at commit.
 * Preserves object/array order, -0, aliases, backing bytes and typed-array intervals.
 * Opaque receipts are not consumed as write preflight dependencies and never rewritten.
 */
export function sameSceneStoredValue(left: unknown, right: unknown): boolean {
  const pending: Array<readonly [unknown, unknown]> = [[left, right]]
  const seenLeft = new Map<object, object>(),
    seenRight = new Map<object, object>()
  while (pending.length) {
    const pair = pending.pop()
    if (!pair) return false
    const [a, b] = pair
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
      if (!Object.is(a, b)) return false
      continue
    }
    if (seenLeft.has(a) || seenRight.has(b)) {
      if (seenLeft.get(a) !== b || seenRight.get(b) !== a) return false
      continue
    }
    seenLeft.set(a, b)
    seenRight.set(b, a)
    if (a instanceof ArrayBuffer || b instanceof ArrayBuffer) {
      if (!(a instanceof ArrayBuffer && b instanceof ArrayBuffer) || a.byteLength !== b.byteLength)
        return false
      if (!sameScenePixelBytes(new Uint8Array(a), new Uint8Array(b))) return false
      continue
    }
    if (a instanceof Uint8Array || b instanceof Uint8Array) {
      if (
        !(a instanceof Uint8Array && b instanceof Uint8Array) ||
        a.byteOffset !== b.byteOffset ||
        a.byteLength !== b.byteLength
      )
        return false
      pending.push([a.buffer, b.buffer])
      continue
    }
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!(Array.isArray(a) && Array.isArray(b)) || a.length !== b.length) return false
    } else {
      const prototype = Object.getPrototypeOf(a)
      if (
        (prototype !== Object.prototype && prototype !== null) ||
        Object.getPrototypeOf(b) !== prototype
      )
        return false
    }
    const entriesA = Object.entries(a),
      entriesB = Object.entries(b)
    if (entriesA.length !== entriesB.length) return false
    for (let i = 0; i < entriesA.length; i++) {
      const entryA = entriesA[i],
        entryB = entriesB[i]
      if (!entryA || !entryB || entryA[0] !== entryB[0]) return false
      pending.push([entryA[1], entryB[1]])
    }
  }
  return true
}
