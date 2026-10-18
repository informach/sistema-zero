/**
 * Transport values separately from observer errors. Every learner container is
 * encoded, so a literal {$sz:'error'} can never become a control marker.
 * Keep this factory self-contained: the browser probe injects its generated source.
 */
export function createExecutionObservationCodec() {
  const format = 'sz-observed-v1'
  const failure = () =>
    new Error('Não foi possível observar o valor inteiro dentro dos limites do teste.')
  const functionValue = () => undefined
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)

  function encode(value: unknown, maxChars = 20_000) {
    let nodes = 10_000
    let chars = maxChars
    const ancestors = new Set<object>()
    const text = (value: string) => {
      chars -= value.length
      if (chars < 0) throw failure()
      return value
    }
    const visit = (item: unknown, depth: number): unknown[] => {
      if (--nodes < 0) throw failure()
      if (item === null || typeof item === 'boolean') return [0, item]
      if (typeof item === 'string') return [0, text(item)]
      if (typeof item === 'number') return Number.isFinite(item) ? [0, item] : [3, String(item)]
      if (item === undefined) return [3, 'undefined']
      if (typeof item === 'function') return [3, 'function']
      if (typeof item !== 'object' || depth > 6 || ancestors.has(item)) throw failure()
      ancestors.add(item)
      try {
        if (Array.isArray(item)) {
          if (item.length > nodes) throw failure()
          const values: unknown[] = []
          for (let index = 0; index < item.length; index++)
            values.push(visit(item[index], depth + 1))
          return [1, values]
        }
        const entries: unknown[] = []
        for (const key in item) {
          if (!Object.hasOwn(item, key)) continue
          entries.push([text(key), visit((item as Record<string, unknown>)[key], depth + 1)])
        }
        return [2, entries]
      } finally {
        ancestors.delete(item)
      }
    }
    const encoded = { format, value: visit(value, 0) }
    if (JSON.stringify(encoded).length > maxChars) throw failure()
    return encoded
  }

  function decode(encoded: unknown, functionsAsText = false): unknown {
    if (!isRecord(encoded) || encoded.format !== format || Object.keys(encoded).length !== 2)
      throw failure()
    let nodes = 10_000
    const visit = (item: unknown, depth: number): unknown => {
      if (--nodes < 0 || depth > 8 || !Array.isArray(item) || item.length !== 2) throw failure()
      const [type, payload] = item
      if (type === 0) {
        if (
          payload === null ||
          typeof payload === 'boolean' ||
          typeof payload === 'string' ||
          (typeof payload === 'number' && Number.isFinite(payload))
        )
          return payload
      } else if (type === 3) {
        if (payload === 'undefined') return undefined
        if (payload === 'function') return functionsAsText ? '[função]' : functionValue
        if (payload === 'NaN' || payload === 'Infinity' || payload === '-Infinity')
          return Number(payload)
      } else if (type === 1 && Array.isArray(payload)) {
        if (payload.length > nodes) throw failure()
        return payload.map((child) => visit(child, depth + 1))
      } else if (type === 2 && Array.isArray(payload)) {
        if (payload.length > nodes) throw failure()
        const out: Record<string, unknown> = {}
        for (const entry of payload) {
          if (
            !Array.isArray(entry) ||
            entry.length !== 2 ||
            typeof entry[0] !== 'string' ||
            Object.hasOwn(out, entry[0])
          )
            throw failure()
          Object.defineProperty(out, entry[0], {
            value: visit(entry[1], depth + 1),
            enumerable: true,
            configurable: true,
            writable: true,
          })
        }
        return out
      }
      throw failure()
    }
    return visit(encoded.value, 0)
  }

  return { encode, decode }
}

export function isEncodedExecutionObservation(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { format?: unknown }).format === 'sz-observed-v1'
  )
}
