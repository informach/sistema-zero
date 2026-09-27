/** Conservative payload accounting for opaque/recovery data, including shared/cyclic buffers. */
export function structuredBytes(raw: unknown): number {
  const seen = new Set<object>()
  const pending: unknown[] = [raw]
  let bytes = 0
  while (pending.length) {
    const value = pending.pop()
    if (typeof value === 'string') bytes += value.length * 2
    else if (typeof value === 'number' || typeof value === 'bigint') bytes += 8
    else if (value && typeof value === 'object' && !seen.has(value)) {
      seen.add(value)
      if (ArrayBuffer.isView(value)) pending.push(value.buffer)
      else if (value instanceof ArrayBuffer) bytes += value.byteLength
      else {
        bytes += 32
        for (const [key, entry] of Object.entries(value)) {
          bytes += key.length * 2
          pending.push(entry)
        }
      }
    }
  }
  return bytes
}
