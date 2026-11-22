import { sha256Hex } from '@sistemazero/core/creations'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { isDocumentRecord } from '../core/projectDocumentGuards'
import { localSnapshotsEqual } from '../project-migrations/localTransaction'
import {
  conditionalGeneration,
  conditionalWrite,
  type IdbWrite,
  readValue,
  readValues,
} from './idbTransaction'
import { RETAINED_PROJECT_PREFIX } from './projectStorageKeys'
import { ProjectWriteConflict } from './projectStorageRevision'
import { isPrivateRegionalProjectScope, type ProjectStorageScope } from './projectStorageRuntime'
import {
  capturedRetainedBody,
  checkExpandedRetention,
  invalidRetention,
  type PreparedRetention,
  RETAINED_PARTS,
  RETAINED_PROJECT_LIMITS,
  type RetainedPart,
  readRetainedPartition,
  restoreRetainedPart,
  retainedBodyIds,
  retentionLimit,
  retentionSize,
  validRetainedHash,
} from './retainedProjectParts'

const LEDGER = 'sz:v5:retention-bytes'
const bodyKey = (hash: string) => `sz:v5:body:${hash}`
const refKey = (hash: string) => `sz:v5:references:${hash}`
const fixed = (n: number) => String(n).padStart(12, '0')
const counter = (n: number) => `1:${fixed(n)}`
const ref = (bytes: number, count: number) => `1:${fixed(bytes)}:${fixed(count)}`
const keySize = (key: string, value: string) => retentionSize(key) + retentionSize(value)

export function retainedProjectKey(id: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) invalidRetention()
  return RETAINED_PROJECT_PREFIX + id
}
export interface RetainedManifest {
  version: 1
  id: string
  token: string
  origin: string
  deleted: boolean
  parts: PreparedRetention['parts']
}
function readManifest(value: unknown, id: string): RetainedManifest | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.length > RETAINED_PROJECT_LIMITS.projectBytes)
    invalidRetention()
  let raw: unknown
  try {
    raw = JSON.parse(value)
  } catch {
    invalidRetention()
  }
  if (
    !isDocumentRecord(raw) ||
    Object.keys(raw).length !== 6 ||
    raw.version !== 1 ||
    raw.id !== id ||
    typeof raw.token !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(raw.token) ||
    !validRetainedHash(raw.origin) ||
    typeof raw.deleted !== 'boolean' ||
    !isDocumentRecord(raw.parts)
  )
    invalidRetention()
  const parts: PreparedRetention['parts'] = {}
  let slots = 0
  for (const key of Object.keys(raw.parts)) {
    const name = RETAINED_PARTS.find((name) => name === key)
    if (!name) invalidRetention()
    const p = readRetainedPartition(raw.parts[key])
    slots += 1 + p.strings.length
    if (slots > RETAINED_PROJECT_LIMITS.slots) invalidRetention()
    parts[name] = p
  }
  if (raw.deleted ? Object.keys(parts).length !== 0 : !parts.meta || !parts.files || !parts.state)
    invalidRetention()
  return { version: 1, id, token: raw.token, origin: raw.origin, deleted: raw.deleted, parts }
}
function assertScope(scope: ProjectStorageScope) {
  if (!isPrivateRegionalProjectScope(scope))
    throw Error('A retenção regional requer um perfil local de teste.')
  scope.signal?.throwIfAborted()
}

export async function readRetainedManifest(scope: ProjectStorageScope, id: string) {
  assertScope(scope)
  return readManifest(await readValue(scope.store, retainedProjectKey(id)), id)
}
function parseLedger(raw: unknown) {
  if (raw === undefined) return 0
  if (typeof raw !== 'string' || !/^1:\d{12}$/.test(raw)) invalidRetention()
  const used = Number(raw.slice(2))
  if (used < keySize(LEDGER, raw) || used > RETAINED_PROJECT_LIMITS.scopeBytes) invalidRetention()
  return used
}
function parseRef(raw: unknown) {
  if (raw === undefined) return undefined
  if (typeof raw !== 'string' || !/^1:\d{12}:\d{12}$/.test(raw)) invalidRetention()
  const [, bytes, count] = raw.split(':').map(Number)
  if (!bytes || bytes > RETAINED_PROJECT_LIMITS.projectBytes || !count) invalidRetention()
  return { bytes, count }
}
function itemCharge(hash: string, bytes: number) {
  return retentionSize(bodyKey(hash)) + bytes + keySize(refKey(hash), ref(bytes, 1))
}
type Guard = readonly [key: IDBValidKey, value: unknown]
/** All digests and the complete new head are prepared before entering this transaction.
 * The only rows shared across projects are immutable bodies, their reference counts and the ledger.
 */
export async function commitRetainedProject(
  scope: ProjectStorageScope,
  options: {
    id: string
    expectedToken: string | null
    origin: string
    candidate: PreparedRetention | null
    source?: ReadonlyArray<Guard>
    absent?: readonly IDBKeyRange[]
    ready?: () => boolean
  },
): Promise<RetainedManifest> {
  assertScope(scope)
  const { id, expectedToken, origin, candidate, ready } = options
  const headKey = retainedProjectKey(id)
  if (!validRetainedHash(origin)) invalidRetention()
  const manifest: RetainedManifest = {
    version: 1,
    id,
    token: crypto.randomUUID(),
    origin,
    deleted: candidate === null,
    parts: candidate?.parts ?? {},
  }
  const nextText = JSON.stringify(manifest)
  const nextManifest = readManifest(nextText, id)!
  const ownedBodies = new Map(candidate?.bodies)
  const selected = retainedBodyIds(nextManifest.parts)
  checkExpandedRetention(
    nextManifest.parts,
    (hash) => capturedRetainedBody(hash, ownedBodies.get(hash)).text.length,
  )
  const estimate = selected.reduce(
    (bytes, hash) => {
      const body = capturedRetainedBody(hash, ownedBodies.get(hash))
      return bytes + itemCharge(hash, body.bytes)
    },
    keySize(headKey, nextText),
  )
  if (estimate > RETAINED_PROJECT_LIMITS.projectBytes) retentionLimit()
  // Capture guards before yielding. The normal caller passes the captured disk values.
  const source = (options.source ?? []).map(
    ([key, value]) => [key, copyStudioProjectJson(value)] as const,
  )
  const emptyRanges = options.absent?.length
    ? { ranges: [...options.absent], conflict: () => new ProjectWriteConflict() }
    : undefined
  const raw = await readValue(scope.store, headKey)
  const before = readManifest(raw, id)
  if ((before?.token ?? null) !== expectedToken || (before?.deleted && candidate !== null))
    throw new ProjectWriteConflict()
  const old = new Set(retainedBodyIds(before?.parts ?? {})),
    next = new Set(selected)
  const changed = [...new Set([...old, ...next])].filter((hash) => old.has(hash) !== next.has(hash))
  const guards = source.map(([key]) => key)
  const readKeys = [headKey, LEDGER, ...guards, ...changed.map(refKey)]
  return conditionalWrite(
    scope.store,
    scope.identity,
    conditionalGeneration(scope.identity),
    readKeys,
    (values) => {
      assertScope(scope)
      if (
        ready?.() === false ||
        values[0] !== raw ||
        source.some(([, expected], i) => !localSnapshotsEqual(values[i + 2], expected))
      )
        throw new ProjectWriteConflict()
      let used = parseLedger(values[1])
      if ((raw !== undefined || old.size) && !used) invalidRetention()
      if (!used) used = keySize(LEDGER, counter(0))
      used += keySize(headKey, nextText) - (typeof raw === 'string' ? keySize(headKey, raw) : 0)
      const puts: NonNullable<IdbWrite['puts']>[number][] = [[headKey, nextText]]
      const deletes: IDBValidKey[] = []
      for (const [index, hash] of changed.entries()) {
        const state = parseRef(values[2 + source.length + index])
        if (next.has(hash)) {
          const body = ownedBodies.get(hash)!
          if (state && state.bytes !== body.bytes) invalidRetention()
          if (!state) {
            used += itemCharge(hash, body.bytes)
            puts.push([bodyKey(hash), body.text])
          }
          puts.push([refKey(hash), ref(body.bytes, (state?.count ?? 0) + 1)])
        } else {
          if (!state) invalidRetention()
          if (state.count > 1) puts.push([refKey(hash), ref(state.bytes, state.count - 1)])
          else {
            used -= itemCharge(hash, state.bytes)
            deletes.push(bodyKey(hash), refKey(hash))
          }
        }
      }
      if (used < keySize(LEDGER, counter(0))) invalidRetention()
      if (used > RETAINED_PROJECT_LIMITS.scopeBytes) retentionLimit()
      puts.push([LEDGER, counter(used)])
      return { write: { puts, deletes }, result: nextManifest }
    },
    emptyRanges,
  )
}

/** Recheck the head in the same snapshot as its bodies so concurrent GC cannot mix editions. */
export async function readRetainedParts(
  scope: ProjectStorageScope,
  manifest: RetainedManifest,
  names: readonly RetainedPart[] = RETAINED_PARTS,
) {
  assertScope(scope)
  const pinned = readManifest(JSON.stringify(manifest), manifest.id)!
  const selectedNames = [...names]
  const descriptors: PreparedRetention['parts'] = {}
  for (const name of selectedNames) if (pinned.parts[name]) descriptors[name] = pinned.parts[name]!
  const hashes = retainedBodyIds(descriptors)
  const [current, ...texts] = await readValues(scope.store, [
    retainedProjectKey(pinned.id),
    ...hashes.map(bodyKey),
  ])
  if (!localSnapshotsEqual(readManifest(current, pinned.id), pinned))
    throw new ProjectWriteConflict()
  const bodies = new Map<string, string>()
  let bytes = 0
  for (const [index, hash] of hashes.entries()) {
    const text = texts[index]
    if (typeof text !== 'string' || text.length > RETAINED_PROJECT_LIMITS.projectBytes)
      invalidRetention()
    bytes += retentionSize(text)
    if (bytes > RETAINED_PROJECT_LIMITS.projectBytes || (await sha256Hex(text)) !== hash)
      invalidRetention()
    bodies.set(hash, text)
  }
  checkExpandedRetention(descriptors, (hash) => bodies.get(hash)!.length)
  assertScope(scope)
  const result: Partial<Record<RetainedPart, unknown>> = {}
  for (const name of selectedNames) {
    const descriptor = descriptors[name]
    if (descriptor) result[name] = restoreRetainedPart(name, descriptor, bodies)
  }
  return result
}
