/** Exact UTF-8 size of JSON with two-space indentation, without building its text.
 * Inputs are immutable JSON values; accessors, cycles and non-JSON objects refuse.
 * A cache retains numerical summaries only, by weak identity.
 */
type Size = { bytes: number; lines: number; depth: number }

export function utf8ByteLength(text: string): number {
  let bytes = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0x80) bytes++
    else if (code < 0x800) bytes += 2
    else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      text.charCodeAt(i + 1) >= 0xdc00 &&
      text.charCodeAt(i + 1) <= 0xdfff
    ) {
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}

function stringBytes(text: string): number {
  let bytes = 2
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code === 34 || code === 92) bytes += 2
    else if (code < 32) bytes += [8, 9, 10, 12, 13].includes(code) ? 2 : 6
    else if (code < 0x80) bytes++
    else if (code < 0x800) bytes += 2
    else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      text.charCodeAt(i + 1) >= 0xdc00 &&
      text.charCodeAt(i + 1) <= 0xdfff
    ) {
      bytes += 4
      i++
    } else if (code >= 0xd800 && code <= 0xdfff) bytes += 6
    else bytes += 3
  }
  return bytes
}

export class JsonByteSizeCache {
  private readonly sizes = new WeakMap<object, Size>()

  constructor(private readonly maxDepth: number) {}

  /** Infinity means unsupported or above the caller's byte budget. */
  byteLength(value: unknown, maxBytes = Number.MAX_SAFE_INTEGER): number {
    if (
      !Number.isSafeInteger(maxBytes) ||
      maxBytes < 0 ||
      !Number.isSafeInteger(this.maxDepth) ||
      this.maxDepth < 0
    )
      return Infinity
    const ancestors = new WeakSet<object>()
    const measure = (input: unknown, level: number): Size | null => {
      if (level > this.maxDepth) return null
      const result: Size = { bytes: 0, lines: 0, depth: 0 }
      if (input === null) result.bytes = 4
      else if (typeof input === 'boolean') result.bytes = input ? 4 : 5
      else if (typeof input === 'number' && Number.isFinite(input))
        result.bytes = JSON.stringify(input).length
      else if (typeof input === 'string') result.bytes = stringBytes(input)
      else if (input && typeof input === 'object') {
        if (ancestors.has(input)) return null
        const cached = this.sizes.get(input)
        if (cached)
          return cached.depth + level <= this.maxDepth && cached.bytes <= maxBytes ? cached : null
        const array = Array.isArray(input)
        const prototype = Object.getPrototypeOf(input)
        if (!array && prototype !== null && prototype !== Object.prototype) return null
        ancestors.add(input)
        let count = 0
        const length = array ? input.length : 0
        const keys = array ? null : Object.keys(input)
        for (let i = 0; i < (keys ? keys.length : length); i++) {
          const key = keys ? keys[i]! : String(i)
          const descriptor = Object.getOwnPropertyDescriptor(input, key)
          if (!descriptor || !('value' in descriptor)) return null
          if (keys && descriptor.value === undefined) continue
          const child = measure(descriptor.value, level + 1)
          if (!child) return null
          count++
          result.bytes += child.bytes + child.lines * 2 + (keys ? stringBytes(key) + 2 : 0)
          result.lines += child.lines
          result.depth = Math.max(result.depth, child.depth + 1)
          if (result.bytes > maxBytes) return null
        }
        // Opening/closing delimiters, separators, line breaks and one indentation level.
        result.bytes += count ? 2 + (count - 1) + (count + 1) + count * 2 : 2
        result.lines += count ? count + 1 : 0
        ancestors.delete(input)
        if (result.bytes > maxBytes) return null
        this.sizes.set(input, result)
      } else return null
      return result.bytes <= maxBytes ? result : null
    }
    try {
      return measure(value, 0)?.bytes ?? Infinity
    } catch {
      return Infinity
    }
  }
}
