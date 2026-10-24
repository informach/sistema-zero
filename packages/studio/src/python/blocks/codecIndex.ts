import type { PythonNode } from '../language/types'
import type { PythonBlockCodec } from './contract'
import { isNode } from './nodes'

const ANY = '*'

/** The name a call reaches: `print(...)` → print, `screen.draw.text(...)` → text. */
export function pythonCalleeName(call: PythonNode): string | undefined {
  if (call.kind !== 'Call' || !isNode(call.fields.func)) return
  const func = call.fields.func
  if (func.kind === 'Name' && typeof func.fields.id === 'string') return func.fields.id
  if (func.kind === 'Attribute' && typeof func.fields.attr === 'string') return func.fields.attr
}

/** The specific index name of a node: callee of a call or command, name of a definition. */
function nodeName(value: PythonNode): string | undefined {
  if (value.kind === 'Call') return pythonCalleeName(value)
  if (value.kind === 'Expr' && isNode(value.fields.value))
    return pythonCalleeName(value.fields.value)
  if (
    (value.kind === 'FunctionDef' || value.kind === 'AsyncFunctionDef') &&
    typeof value.fields.name === 'string'
  )
    return value.fields.name
  if (value.kind === 'Attribute' && typeof value.fields.attr === 'string') return value.fields.attr
}

export interface PythonCodecIndex {
  /** Candidates in catalog priority order; specific codecs keep their original position. */
  candidates(value: PythonNode): readonly PythonBlockCodec[]
}

const cache = new WeakMap<readonly PythonBlockCodec[], PythonCodecIndex>()

/**
 * Projection used to try every codec for every node. The index keeps the exact catalog order
 * (specific APIs before generic call/attribute codecs) but only visits codecs that could
 * decode the node's kind and, when declared, its callee or definition name.
 */
export function pythonCodecIndex(codecs: readonly PythonBlockCodec[]): PythonCodecIndex {
  const existing = cache.get(codecs)
  if (existing) return existing
  const buckets = new Map<string, { order: number; codec: PythonBlockCodec }[]>()
  codecs.forEach((codec, order) => {
    const kinds = codec.match?.kinds ?? [codec.defaultNode().kind]
    const names = codec.match?.names?.length ? codec.match.names : [ANY]
    for (const kind of kinds)
      for (const name of names) {
        const key = `${kind}\u0000${name}`
        let bucket = buckets.get(key)
        if (!bucket) {
          bucket = []
          buckets.set(key, bucket)
        }
        bucket.push({ order, codec })
      }
  })
  const merged = new Map<string, readonly PythonBlockCodec[]>()
  const empty: readonly PythonBlockCodec[] = Object.freeze([])
  const index: PythonCodecIndex = {
    candidates(value) {
      const name = nodeName(value)
      const key = name === undefined ? `${value.kind}\u0000${ANY}` : `${value.kind}\u0000${name}`
      const found = merged.get(key)
      if (found) return found
      const general = buckets.get(`${value.kind}\u0000${ANY}`) ?? []
      const specific = name === undefined ? [] : (buckets.get(key) ?? [])
      const result = specific.length
        ? [...specific, ...general].sort((a, b) => a.order - b.order).map((entry) => entry.codec)
        : general.length
          ? general.map((entry) => entry.codec)
          : empty
      merged.set(key, result)
      return result
    },
  }
  cache.set(codecs, index)
  return index
}
