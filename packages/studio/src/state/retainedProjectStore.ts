import { sha256Hex } from '@sistemazero/core/creations'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocumentGuards'
import { localSnapshotsEqual } from '../project-migrations/localTransaction'
import {
  conditionalGeneration,
  conditionalWrite,
  type IdbWrite,
  readPhysicalProjectRecords,
  readValue,
  readValues,
} from './idbTransaction'
import { proBuilderDeletionKey } from './proBuilderDeletion'
import { BACKUP_KEY_SUFFIX, backupPrefixes } from './projectBackupKeys'
import { applicationBudgetKey, RETAINED_PROJECT_PREFIX } from './projectStorageKeys'
import { ProjectWriteConflict } from './projectStorageRevision'
import { isRegionalProjectScope, type ProjectStorageScope } from './projectStorageRuntime'
import type { RetainedApplicationBudget } from './retainedProjectApplications'
import { legacyProjectKeys } from './retainedProjectKeys'
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
  if (!isRegionalProjectScope(scope))
    throw Error('O perfil do projeto mudou. Abra o Estúdio novamente.')
  scope.signal?.throwIfAborted()
}
/** Synchronous admission for a head read inside a history transaction. */
export function parseRetainedProjectManifest(
  raw: unknown,
  id: string,
): RetainedManifest | undefined {
  return readManifest(raw, id)
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
    retireLegacy?: true
    /** Guarded rows (each one also in `source`) deleted in the same transaction. */
    retire?: readonly IDBValidKey[]
    absent?: readonly IDBKeyRange[]
    ready?: () => boolean
    applicationBudget?: RetainedApplicationBudget
    builderDeletion?: boolean
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
  const budget = options.applicationBudget && {
    previous: copyStudioProjectJson(options.applicationBudget.previous),
    next: { ...options.applicationBudget.next },
  }
  if (budget) {
    const existing = source.find(([key]) => key === applicationBudgetKey())
    if (existing && !localSnapshotsEqual(existing[1], budget.previous))
      throw new ProjectWriteConflict()
    if (!existing) source.push([applicationBudgetKey(), budget.previous])
  }
  const retiredLegacy = options.retireLegacy ? legacyProjectKeys(id) : undefined
  const keyChecks = {
    ranges: [...(options.absent ?? [])],
    conflict: () => new ProjectWriteConflict(),
    retire: retiredLegacy
      ? backupPrefixes(id).map((prefix) => ({
          range: IDBKeyRange.bound(prefix, `${prefix}\uffff`),
          owns: (key: IDBValidKey) =>
            typeof key === 'string' && BACKUP_KEY_SUFFIX.test(key.slice(prefix.length)),
        }))
      : undefined,
  }
  if (
    retiredLegacy &&
    (candidate !== null ||
      Object.values(retiredLegacy).some((key) => !source.some(([guard]) => guard === key)))
  )
    invalidRetention()
  const retiredRows = [...(options.retire ?? [])]
  if (retiredRows.some((key) => !source.some(([guard]) => guard === key))) invalidRetention()
  const raw = await readValue(scope.store, headKey)
  const before = readManifest(raw, id)
  if ((before?.token ?? null) !== expectedToken || (before?.deleted && candidate !== null))
    throw new ProjectWriteConflict()
  const old = new Set(retainedBodyIds(before?.parts ?? {})),
    next = new Set(selected)
  const touched = [...new Set([...old, ...next])]
  const retired = [...old].filter((hash) => !next.has(hash))
  const expectedRetired = new Map<string, { text: string; bytes: number }>()
  const previousBodies = await readValues(scope.store, retired.map(bodyKey))
  let retiredBytes = 0
  for (const [index, hash] of retired.entries()) {
    const text = previousBodies[index]
    if (typeof text !== 'string' || text.length > RETAINED_PROJECT_LIMITS.projectBytes)
      invalidRetention()
    const bytes = retentionSize(text)
    retiredBytes += bytes
    if (retiredBytes > RETAINED_PROJECT_LIMITS.projectBytes || (await sha256Hex(text)) !== hash)
      invalidRetention()
    expectedRetired.set(hash, { text, bytes })
  }
  const guards = source.map(([key]) => key)
  const readKeys = [
    headKey,
    LEDGER,
    ...guards,
    ...touched.flatMap((hash) => [refKey(hash), bodyKey(hash)]),
  ]
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
      if (budget) puts.push([applicationBudgetKey(), budget.next])
      if (options.builderDeletion) {
        if (candidate !== null || !options.retireLegacy) invalidRetention()
        puts.push([proBuilderDeletionKey(id), { version: 1, projectId: id, createdAt: Date.now() }])
      }
      const deletes: IDBValidKey[] = []
      for (const [index, hash] of touched.entries()) {
        const position = 2 + source.length + index * 2
        const state = parseRef(values[position])
        const stored = values[position + 1]
        const body = next.has(hash) ? ownedBodies.get(hash)! : expectedRetired.get(hash)!
        if (state) {
          if (state.bytes !== body.bytes || stored !== body.text) invalidRetention()
        } else if (stored !== undefined || old.has(hash)) invalidRetention()
        if (old.has(hash) && next.has(hash)) continue
        if (next.has(hash)) {
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
      if (retiredLegacy) {
        const oldHead = source.find(([guard]) => guard === retiredLegacy.head)?.[1]
        puts.push([
          retiredLegacy.head,
          {
            version: 1,
            deleted: true,
            token: crypto.randomUUID(),
            writer: '',
            sequence: 0,
            base:
              isDocumentRecord(oldHead) && typeof oldHead.token === 'string' ? oldHead.token : null,
          },
        ])
        deletes.push(...Object.values(retiredLegacy).filter((key) => key !== retiredLegacy.head))
      }
      deletes.push(...retiredRows)
      puts.push([LEDGER, counter(used)])
      return { write: { puts, deletes }, result: nextManifest }
    },
    keyChecks,
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

/** The export carries only the blobs reachable from the pinned physical head. A future
 * owner or a damaged body can still be downloaded exactly, with an explicit partial status. */
export async function retainedArchive(scope: ProjectStorageScope, id: string, raw: unknown) {
  const records: Array<readonly [string, unknown]> = []
  let manifest: RetainedManifest | undefined
  try {
    manifest = readManifest(raw, id)
  } catch (error) {
    if (!(error instanceof ProjectDocumentError)) throw error
    return { complete: false, records }
  }
  if (!manifest) return { complete: false, records }
  const hashes = retainedBodyIds(manifest.parts)
  const [head, ...bodies] = await readPhysicalProjectRecords(scope.store, [
    retainedProjectKey(id),
    ...hashes.map(bodyKey),
  ])
  if (head !== raw) throw new ProjectWriteConflict()
  let complete = true,
    bytes = 0
  for (const [index, hash] of hashes.entries()) {
    const body = bodies[index]
    if (body === undefined) {
      complete = false
      continue
    }
    if (typeof body !== 'string' || body.length > RETAINED_PROJECT_LIMITS.projectBytes) {
      complete = false
      continue
    }
    bytes += retentionSize(body)
    if (bytes > RETAINED_PROJECT_LIMITS.projectBytes) {
      complete = false
      break
    }
    records.push([bodyKey(hash), body])
    if ((await sha256Hex(body)) !== hash) complete = false
  }
  return { complete, records }
}
