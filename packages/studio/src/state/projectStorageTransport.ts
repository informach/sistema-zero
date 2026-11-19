import { decodeProjectJsonGraph } from './projectJsonGraphDecode'
import { STUDIO_PROJECT_JSON_LIMITS } from '@sistemazero/core/studio/project-json'
import { ProjectDocumentError } from '../core/projectDocumentGuards'
import { encodeProjectJsonGraph } from './projectJsonGraph'

const FORMAT = 'sz-project-json-graph'
// Other stores, especially learner game-storage values, never interpret this envelope.
const PROJECT_V4_KEY =
  /^sz:v4:project-(?:meta|files|state|blocks|assets|thumb|head|applications|recovery|source|backup):/
const SAFE_NATIVE_DEPTH = 64
const prepared = new WeakSet<object>()

function descriptorValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor && 'value' in descriptor ? descriptor.value : undefined
}
function envelope(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    descriptorValue(value, 'format') === FORMAT
  )
}

/** Detect depth without recursive calls, getters, toJSON or an unbounded cycle walk. */
function needsGraph(value: unknown): boolean {
  const pending = [{ value, depth: 0 }]
  const depths = new WeakMap<object, number>()
  let nodes = 0
  while (pending.length) {
    const current = pending.pop()!
    if (!current.value || typeof current.value !== 'object') continue
    if (current.depth > SAFE_NATIVE_DEPTH) return true
    const seen = depths.get(current.value)
    if (seen !== undefined && seen >= current.depth) continue
    depths.set(current.value, current.depth)
    if (++nodes > STUDIO_PROJECT_JSON_LIMITS.nodes)
      throw new Error('O projeto excede o limite de complexidade local.')
    for (const key of Object.keys(current.value)) {
      const descriptor = Object.getOwnPropertyDescriptor(current.value, key)
      if (!descriptor || !('value' in descriptor)) return true // The shared JSON guard rejects it.
      pending.push({ value: descriptor.value, depth: current.depth + 1 })
    }
  }
  return false
}

function readEnvelope(value: Record<string, unknown>): string {
  const version = descriptorValue(value, 'version')
  const payload = descriptorValue(value, 'payload')
  if (
    version !== 1 ||
    typeof payload !== 'string' ||
    Object.keys(value).some((key) => !['format', 'version', 'payload'].includes(key))
  )
    throw new ProjectDocumentError(
      'future-format',
      'O armazenamento deste projeto usa uma codificação incompatível. Os dados foram preservados.',
    )
  return payload
}

export function encodeProjectStorageValue(key: IDBValidKey, value: unknown): unknown {
  if (typeof key !== 'string' || !PROJECT_V4_KEY.test(key)) return value
  if (envelope(value)) {
    // Never authorize a future envelope merely because a writer recognizes its tag.
    const payload = readEnvelope(value)
    if (!prepared.has(value)) decodeProjectJsonGraph(payload)
    return value
  }
  if (!needsGraph(value)) return value
  const encoded = Object.freeze({
    format: FORMAT,
    version: 1,
    payload: encodeProjectJsonGraph(value),
  })
  prepared.add(encoded)
  return encoded
}

export function decodeProjectStorageValue(key: IDBValidKey, value: unknown): unknown {
  if (typeof key !== 'string' || !PROJECT_V4_KEY.test(key) || !envelope(value)) return value
  return decodeProjectJsonGraph(readEnvelope(value))
}
