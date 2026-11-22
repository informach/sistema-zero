import { sha256Hex } from '@sistemazero/core/creations'
import {
  copyStudioProjectJson,
  STUDIO_PROJECT_JSON_LIMITS,
} from '@sistemazero/core/studio/project-json'
import { encodeProjectJsonGraph } from '@sistemazero/core/studio/project-json-graph'
import { decodeProjectJsonGraph } from '@sistemazero/core/studio/project-json-graph-decode'
import {
  isDocumentRecord,
  ProjectDocumentError,
  ProjectTooLargeError,
} from '../core/projectDocumentGuards'

/** Private retention limits; the V4 document and its editing/export budgets are independent. */
export const RETAINED_PROJECT_LIMITS = Object.freeze({
  projectBytes: 16 * 1024 * 1024,
  scopeBytes: 64 * 1024 * 1024,
  slots: 2048,
})
export const RETAINED_PARTS = [
  'meta',
  'files',
  'state',
  'blocks',
  'assets',
  'thumb',
  'head',
  'applications',
  'source',
  'game',
] as const
export type RetainedPart = (typeof RETAINED_PARTS)[number]
export interface RetainedBody {
  hash: string
  text: string
  bytes: number
}
/** Paths are derived from the existing partition shape; authored object keys are never interpreted as tags. */
export interface RetainedPartition {
  shape: string
  strings: Array<[number, string]>
}
export interface PreparedRetention {
  parts: Partial<Record<RetainedPart, RetainedPartition>>
  bodies: Map<string, RetainedBody>
}

const capturedBodies = new WeakSet<RetainedBody>()
export function capturedRetainedBody(hash: string, body: RetainedBody | undefined): RetainedBody {
  if (!body || hash !== body.hash || !capturedBodies.has(body)) invalidRetention()
  return body
}
const utf8 = new TextEncoder()
export function retentionSize(text: string) {
  return utf8.encode(text).byteLength
}
export const validRetainedHash = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
export function invalidRetention(): never {
  throw new ProjectDocumentError(
    'future-format',
    'A foto local do projeto está incompleta ou usa outra versão. Os dados estão preservados.',
  )
}
export function retentionLimit(): never {
  throw new ProjectTooLargeError(
    'A cópia regional excede o espaço privado disponível. O projeto anterior permanece disponível.',
  )
}

interface StringSlot {
  parent: Record<string, unknown>
  key: string
}
function separateStrings(part: RetainedPart, record: unknown): StringSlot[] {
  if (!isDocumentRecord(record)) return []
  const slots: StringSlot[] = []
  function add(parent: unknown, key: string) {
    if (isDocumentRecord(parent) && Object.hasOwn(parent, key)) slots.push({ parent, key })
  }
  if (part === 'assets' && Array.isArray(record.assets))
    for (const asset of record.assets) add(asset, 'dataUrl')
  if (part === 'files') {
    if (isDocumentRecord(record.files))
      for (const key of Object.keys(record.files)) add(record.files, key)
    if (Array.isArray(record.extraFiles)) for (const file of record.extraFiles) add(file, 'content')
    if (isDocumentRecord(record.tree))
      for (const node of Object.values(record.tree)) add(node, 'content')
  }
  return slots
}

/** Capture every argument before the first digest can yield to another writer. */
export async function prepareRetainedParts(
  values: Partial<Record<RetainedPart, unknown>>,
): Promise<PreparedRetention> {
  const captured = copyStudioProjectJson(values)
  if (
    !isDocumentRecord(captured) ||
    Object.keys(captured).some((key) => !RETAINED_PARTS.some((name) => name === key))
  )
    invalidRetention()
  const bodies = new Map<string, RetainedBody>()
  const repeated = new Map<string, string>()
  let uniqueBytes = 0
  async function body(value: unknown) {
    const text = encodeProjectJsonGraph(value)
    const known = repeated.get(text)
    if (known) return known
    const bytes = retentionSize(text)
    uniqueBytes += bytes
    if (
      uniqueBytes > RETAINED_PROJECT_LIMITS.projectBytes ||
      bodies.size >= RETAINED_PROJECT_LIMITS.slots
    )
      retentionLimit()
    const hash = await sha256Hex(text)
    if (bodies.has(hash)) invalidRetention()
    const immutable = Object.freeze({ hash, text, bytes })
    capturedBodies.add(immutable)
    bodies.set(hash, immutable)
    repeated.set(text, hash)
    return hash
  }
  const parts: PreparedRetention['parts'] = {}
  for (const part of RETAINED_PARTS) {
    const value = captured[part]
    if (value === undefined) continue
    const slots = separateStrings(part, value)
    if (slots.length > RETAINED_PROJECT_LIMITS.slots) retentionLimit()
    const strings: RetainedPartition['strings'] = []
    for (const [index, { parent, key }] of slots.entries()) {
      const source = parent[key]
      if (typeof source !== 'string') continue
      strings.push([index, await body(source)])
      parent[key] = null
    }
    parts[part] = { shape: await body(value), strings }
  }
  return { parts, bodies }
}

export function readRetainedPartition(raw: unknown): RetainedPartition {
  if (
    !isDocumentRecord(raw) ||
    Object.keys(raw).length !== 2 ||
    !validRetainedHash(raw.shape) ||
    !Array.isArray(raw.strings) ||
    raw.strings.length > RETAINED_PROJECT_LIMITS.slots
  )
    invalidRetention()
  let previous = -1
  const strings: RetainedPartition['strings'] = []
  for (const slot of raw.strings) {
    if (
      !Array.isArray(slot) ||
      slot.length !== 2 ||
      !Number.isSafeInteger(slot[0]) ||
      slot[0] <= previous ||
      slot[0] >= RETAINED_PROJECT_LIMITS.slots ||
      !validRetainedHash(slot[1])
    )
      invalidRetention()
    previous = slot[0]
    strings.push([previous, slot[1]])
  }
  return { shape: raw.shape, strings }
}

export function retainedBodyIds(parts: PreparedRetention['parts']): string[] {
  const hashes = new Set<string>()
  for (const part of Object.values(parts)) {
    hashes.add(part.shape)
    for (const [, hash] of part.strings) hashes.add(hash)
  }
  return Array.from(hashes).sort()
}

/** Charge repeated logical contents before materializing them for the existing project codecs. */
export function checkExpandedRetention(
  parts: PreparedRetention['parts'],
  length: (hash: string) => number,
) {
  let chars = 0
  for (const descriptor of Object.values(parts)) {
    chars += length(descriptor.shape)
    for (const [, hash] of descriptor.strings) chars += length(hash)
    if (chars > STUDIO_PROJECT_JSON_LIMITS.textChars) retentionLimit()
  }
}

/** The caller verifies hash/length for all bodies in the same pinned manifest before decoding. */
export function restoreRetainedPart(
  part: RetainedPart,
  descriptor: RetainedPartition,
  bodies: ReadonlyMap<string, string>,
): unknown {
  const read = (hash: string) => {
    const text = bodies.get(hash)
    if (text === undefined) invalidRetention()
    return decodeProjectJsonGraph(text)
  }
  const value = read(descriptor.shape)
  const slots = separateStrings(part, value)
  const strings = new Map<string, string>()
  for (const [index, hash] of descriptor.strings) {
    const slot = slots[index],
      text = strings.get(hash) ?? read(hash)
    if (!slot || slot.parent[slot.key] !== null || typeof text !== 'string') invalidRetention()
    strings.set(hash, text)
    slot.parent[slot.key] = text
  }
  return value
}
