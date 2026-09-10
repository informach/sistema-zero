import type { RetainedSnapshot } from './history'

type Delta =
  | { kind: 'value'; value: unknown; bytes: number }
  | { kind: 'bytes'; spans: Array<{ start: number; data: Uint8Array }>; bytes: number }
  | { kind: 'array'; entries: Array<[number, Delta]>; bytes: number }
  | {
      kind: 'object'
      entries: Array<{ key: string; present: boolean; delta: Delta | null }>
      bytes: number
    }

function record(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  )
}

/** Approximate retained payload, not a claim about JS heap size. Internal acyclic documents only. */
function payloadBytes(value: unknown): number {
  if (typeof value === 'string') return value.length * 2 + 16
  if (value instanceof Uint8Array) return value.byteLength + 32
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + payloadBytes(item), 32)
  if (record(value))
    return Object.entries(value).reduce(
      (sum, [key, item]) => sum + key.length * 2 + payloadBytes(item),
      32,
    )
  return 8
}

function diff(target: unknown, base: unknown): Delta | null {
  if (Object.is(target, base)) return null
  if (target instanceof Uint8Array && base instanceof Uint8Array && target.length === base.length) {
    const spans: Array<{ start: number; data: Uint8Array }> = []
    let bytes = 32
    for (let index = 0; index < target.length; ) {
      if (target[index] === base[index]) {
        index += 1
        continue
      }
      const start = index
      while (index < target.length && target[index] !== base[index]) index += 1
      const data = target.slice(start, index)
      spans.push({ start, data })
      bytes += data.byteLength + 32
      // Stop collecting immediately; a dense edit must not allocate all tiny spans first.
      if (bytes > target.byteLength + 32)
        return { kind: 'value', value: target, bytes: target.byteLength + 32 }
    }
    // Dense/noisy edits can cost more in spans than in a full replacement.
    return spans.length ? { kind: 'bytes', spans, bytes } : null
  }
  if (Array.isArray(target) && Array.isArray(base) && target.length === base.length) {
    const entries: Array<[number, Delta]> = []
    let bytes = 32
    for (let index = 0; index < target.length; index += 1) {
      const delta = diff(target[index], base[index])
      if (delta) {
        entries.push([index, delta])
        bytes += delta.bytes + 16
      }
    }
    return entries.length ? { kind: 'array', entries, bytes } : null
  }
  if (record(target) && record(base)) {
    const entries: Array<{ key: string; present: boolean; delta: Delta | null }> = []
    let bytes = 32
    for (const key of new Set([...Object.keys(base), ...Object.keys(target)])) {
      const present = Object.hasOwn(target, key)
      const delta = present ? diff(target[key], base[key]) : null
      if (delta || present !== Object.hasOwn(base, key)) {
        entries.push({ key, present, delta })
        bytes += key.length * 2 + 32 + (delta?.bytes ?? 0)
      }
    }
    return entries.length ? { kind: 'object', entries, bytes } : null
  }
  return { kind: 'value', value: target, bytes: payloadBytes(target) }
}

function apply(delta: Delta | null, base: unknown): unknown {
  if (!delta) return base
  switch (delta.kind) {
    case 'value':
      return delta.value
    case 'bytes': {
      if (!(base instanceof Uint8Array))
        throw new Error('Base inválida para o histórico de pixels.')
      const result = base.slice()
      for (const span of delta.spans) result.set(span.data, span.start)
      return result
    }
    case 'array': {
      if (!Array.isArray(base)) throw new Error('Base inválida para o histórico de listas.')
      const result = base.slice()
      for (const [index, entry] of delta.entries) result[index] = apply(entry, base[index])
      return result
    }
    case 'object': {
      if (!record(base)) throw new Error('Base inválida para o histórico de objetos.')
      const result = { ...base }
      for (const entry of delta.entries) {
        if (!entry.present) delete result[entry.key]
        else
          Object.defineProperty(result, entry.key, {
            value: apply(entry.delta, base[entry.key]),
            enumerable: true,
            configurable: true,
            writable: true,
          })
      }
      return result
    }
  }
}

/** Stores only changed branches and pixel runs. No reference to either root snapshot is retained. */
export function retainSnapshotDelta<T>(snapshot: T, current: T): RetainedSnapshot<T> {
  const delta = diff(snapshot, current)
  return {
    bytes: delta?.bytes ?? 0,
    // Both sides originate from the same internal T contract; never used to parse foreign input.
    restore: (base) => apply(delta, base) as T,
  }
}
