import {
  PintaPaletteHeadSchema,
  PintaPaletteUploadCapabilitySchema,
} from '@sistemazero/core/creations/pinta-palette-writer'
import { pintaValuesEqual } from '../core/assetEquality'
import { newId } from '../core/id'
import type {
  PaletteAccount,
  PaletteAccountSnapshot,
  PaletteAccountToken,
  PaletteSubmission,
} from '../core/paletteAccount'
import {
  emptyPaletteLibrary,
  mergePaletteLibraries,
  type PaletteLibrary,
  paletteLibraryContentKey,
  type RemovedPaletteMark,
  readAccountPaletteLibrary,
  readAuthoredPaletteLibrary,
  type SavedPalette,
  sanitizePaletteLibrary,
} from '../core/paletteLibrary'
import { PINTA_LIMITS } from '../core/project'

import { captureRemovals, retainCompactedRemovals, settleRemovals } from './localPaletteRemovals'

export const PALETTE_LIBRARY_KEY = 'pinta:palettes'
export const PALETTE_ACCOUNT_KEY = 'pinta:sync:palette-account'

interface PaletteRecord extends PaletteAccountToken {
  version: 1 | 2 | 3
  introduced?: string[]
  priorRemovals?: RemovedPaletteMark[]
  submission?: PaletteSubmission
  rejected?: true
  priorSubmission?: PaletteLibrary
  recheck?: true
  priorEdits?: PaletteLibrary
  confirmed: PaletteLibrary | null
  library: PaletteLibrary | null
  /** Foreign edits stay local until the author explicitly edits their recovered copy. */
  recoveries: { source: SavedPalette; id: string }[]
  migrationSource: PaletteLibrary | null
  retired: PaletteLibrary | null
  /** Preserve the exact latest foreign snapshot, including deletion marks. */
  lastLegacyWrite: PaletteLibrary | null
}

type Transaction = <T>(plan: (records: Map<string, unknown>) => T) => Promise<T>

function sameLibrary(a: PaletteLibrary | null, b: PaletteLibrary | null): boolean {
  return a && b
    ? a.updatedAt === b.updatedAt && paletteLibraryContentKey(a) === paletteLibraryContentKey(b)
    : a === b
}

function delta(current: PaletteLibrary, base: PaletteLibrary | null): PaletteLibrary {
  if (!base) return current
  const previous = new Map(base.palettes.map((p) => [p.id, p]))
  const marks = new Map(base.removed.map((p) => [p.id, p.removedAt]))
  return {
    ...current,
    palettes: current.palettes.filter((p) => !pintaValuesEqual(previous.get(p.id), p)),
    removed: current.removed.filter((p) => marks.get(p.id) !== p.removedAt),
  }
}

function withoutCopies(record: PaletteRecord): PaletteLibrary | null {
  if (!record.library) return null
  const ids = new Set(record.recoveries.map((copy) => copy.id))
  const authored = delta(record.library, record.retired)
  return {
    ...authored,
    palettes: authored.palettes.filter((p) => !ids.has(p.id)),
    removed: authored.removed.filter((p) => !ids.has(p.id)),
  }
}

function snapshot(record: PaletteRecord): PaletteAccountSnapshot {
  const source = withoutCopies(record)
  const candidate = source && record.revision === 0 ? delta(source, record.confirmed) : source
  const base = record.revision === 0 ? null : record.confirmed
  return {
    ...(record.head
      ? {
          head: record.head,
          needsHead: record.recheck === true,
          rejected:
            !!record.rejected &&
            !!record.priorSubmission &&
            !!candidate &&
            paletteLibraryContentKey(record.priorSubmission) ===
              paletteLibraryContentKey(candidate),
          submission: record.submission,
        }
      : {}),
    ...(record.removals ? { removals: captureRemovals(record.removals) } : {}),
    generation: record.generation,
    revision: record.revision,
    minimum: record.minimum,
    candidate,
    dirty:
      !record.migrationSource &&
      !!candidate &&
      paletteLibraryContentKey(candidate) !==
        paletteLibraryContentKey(base ?? emptyPaletteLibrary()),
  }
}

/** A missing tombstone can mean compaction. Only a newly authored delta may bring back its ID. */
function addCopies(
  record: PaletteRecord,
  source: PaletteLibrary,
  against: PaletteLibrary | null,
): void {
  const current = record.library ?? emptyPaletteLibrary()
  const copies: SavedPalette[] = []
  for (const palette of delta(source, against).palettes) {
    if (record.recoveries.some((copy) => pintaValuesEqual(copy.source, palette))) continue
    const id = newId()
    record.recoveries.push({ id, source: palette })
    copies.push({
      ...palette,
      id,
      name: `${palette.name.slice(0, PINTA_LIMITS.maxNameChars - ' (cópia)'.length)} (cópia)`,
    })
  }
  if (copies.length)
    record.library = mergePaletteLibraries(current, { ...source, palettes: copies, removed: [] })
}

function supportedRecord(record: PaletteRecord): boolean {
  if (
    (record?.version !== 1 && record?.version !== 2 && record?.version !== 3) ||
    typeof record.generation !== 'string' ||
    !record.generation ||
    !Number.isSafeInteger(record.minimum) ||
    record.minimum < 0 ||
    (record.revision !== null && (!Number.isSafeInteger(record.revision) || record.revision < 0)) ||
    !Array.isArray(record.recoveries)
  )
    return false
  const allowed = new Set([
    'version',
    'generation',
    'revision',
    'minimum',
    'confirmed',
    'library',
    'recoveries',
    'migrationSource',
    'retired',
    'lastLegacyWrite',
  ])
  if (record.version === 3) {
    allowed.add('removals')
    allowed.add('priorRemovals')
    allowed.add('introduced')
    captureRemovals(record.removals)
    captureRemovals(record.priorRemovals)
    if (
      record.introduced !== undefined &&
      (!Array.isArray(record.introduced) ||
        record.introduced.some((id) => typeof id !== 'string' || !id.length || id.length > 64))
    )
      return false
  }
  if (record.version === 2 || (record.version === 3 && record.head)) {
    allowed.add('head')
    allowed.add('priorEdits')
    allowed.add('recheck')
    allowed.add('submission')
    allowed.add('priorSubmission')
    allowed.add('rejected')
    if (record.rejected !== undefined && (record.rejected !== true || !record.priorSubmission))
      return false
    if (record.priorSubmission !== undefined && !readAccountPaletteLibrary(record.priorSubmission))
      return false
    if (
      record.submission !== undefined &&
      (!record.submission ||
        Object.keys(record.submission).some(
          (key) =>
            !['ticket', 'revision', 'sent'].includes(key) &&
            !(record.version === 3 && key === 'removals'),
        ) ||
        !PintaPaletteUploadCapabilitySchema.safeParse(record.submission.ticket).success ||
        record.submission.ticket.baseGeneration !== record.head?.generation ||
        !Number.isSafeInteger(record.submission.revision) ||
        record.submission.revision <= (record.revision ?? 0) ||
        !readAccountPaletteLibrary(record.submission.sent))
    )
      return false
    if (record.submission) captureRemovals(record.submission.removals)
    if (record.recheck !== undefined && record.recheck !== true) return false
    const parsed = PintaPaletteHeadSchema.safeParse(record.head)
    if (
      !parsed.success ||
      parsed.data.revision !== record.revision ||
      parsed.data.exists !== !!record.confirmed ||
      (record.priorEdits !== undefined && !readAccountPaletteLibrary(record.priorEdits))
    )
      return false
  }
  if (Object.keys(record).some((key) => !allowed.has(key))) return false
  for (const library of [
    record.confirmed,
    record.library,
    record.migrationSource,
    record.retired,
    record.lastLegacyWrite,
  ]) {
    if (library !== null && !readAccountPaletteLibrary(library)) return false
  }
  return record.recoveries.every(
    (copy) =>
      copy &&
      typeof copy.id === 'string' &&
      typeof copy.source?.updatedAt === 'number' &&
      Object.keys(copy).length === 2 &&
      !!readAccountPaletteLibrary({
        version: 1,
        updatedAt: copy.source.updatedAt,
        palettes: [copy.source],
        removed: [],
      }),
  )
}

function validRevision(revision: number, minimum: number): void {
  if (!Number.isSafeInteger(revision) || revision < minimum)
    throw Error('Revisão de paletas inválida.')
}

function captureToken(token: PaletteAccountToken): PaletteAccountToken {
  const { generation, revision, minimum } = token
  if (!generation || typeof generation !== 'string') throw Error('Identidade das paletas inválida.')
  validRevision(minimum, 0)
  if (revision !== null) validRevision(revision, 0)
  return {
    generation,
    revision,
    minimum,
    ...(token.removals ? { removals: captureRemovals(token.removals) } : {}),
    ...(token.head ? { head: PintaPaletteHeadSchema.parse(token.head) } : {}),
  }
}

function captureLibrary(input: PaletteLibrary): PaletteLibrary {
  const accepted = readAccountPaletteLibrary(input)
  if (!accepted) throw Error('Não consegui conferir o conteúdo da biblioteca de paletas.')
  return accepted
}

/** Keep the authored difference on this device when another incarnation replaces its base. */
function archivePriorEdits(record: PaletteRecord, remote: PaletteLibrary | null) {
  const local = withoutCopies(record) ?? emptyPaletteLibrary()
  const edits = delta(local, record.confirmed)
  if (record.removals) record.priorRemovals = record.removals
  delete record.removals
  delete record.introduced
  record.priorEdits = edits
  addCopies(record, edits, remote)
  const copyIds = new Set(record.recoveries.map((copy) => copy.id))
  const copies = record.library?.palettes.filter((p) => copyIds.has(p.id)) ?? []
  const visible = remote ? emptyPaletteLibrary() : (record.confirmed ?? emptyPaletteLibrary())
  record.library = {
    ...visible,
    updatedAt: Math.max(visible.updatedAt, local.updatedAt),
    palettes: [...visible.palettes, ...copies],
  }
  record.retired = remote ? null : record.confirmed
  record.confirmed = null
  record.migrationSource = null
  record.revision = null
  record.minimum = 0
}

function setRemovals(record: PaletteRecord, removals: RemovedPaletteMark[]) {
  if (removals.length) {
    record.version = 3
    record.removals = removals
  } else delete record.removals
}

function withRemovals(changes: PaletteLibrary, record: PaletteRecord) {
  return record.removals
    ? { ...changes, removed: [...changes.removed, ...record.removals] }
    : changes
}

function checkReady(ready?: () => boolean) {
  if (ready && !ready()) throw new DOMException('A leitura da biblioteca mudou.', 'AbortError')
}

export function createLocalPaletteAccount(transaction: Transaction, notify: () => void) {
  function access<T>(action: (record: PaletteRecord) => T, ready?: () => boolean): Promise<T> {
    return transaction((records) => {
      checkReady(ready)
      const original = records.get(PALETTE_ACCOUNT_KEY) as PaletteRecord | undefined
      if (original !== undefined && !supportedRecord(original))
        throw Error('Esta biblioteca de paletas precisa de uma versão mais nova.')
      const raw = records.get(PALETTE_LIBRARY_KEY)
      const legacy = readAccountPaletteLibrary(raw)
      if (raw !== undefined && !legacy)
        throw Error('Esta biblioteca de paletas precisa de uma versão mais nova.')
      const record: PaletteRecord = original
        ? { ...original, recoveries: [...original.recoveries] }
        : {
            version: 1,
            generation: newId(),
            revision: null,
            minimum: 0,
            confirmed: null,
            library: legacy,
            migrationSource: legacy,
            retired: null,
            lastLegacyWrite: null,
            recoveries: [],
          }
      if (original && !sameLibrary(legacy, original.library)) {
        record.lastLegacyWrite = legacy
        if (legacy) addCopies(record, legacy, original.library)
        // The private row keeps the confirmed document and the identity of every recovered color.
      }
      const result = action(record)
      if (!original || !pintaValuesEqual(original, record)) records.set(PALETTE_ACCOUNT_KEY, record)
      if (record.library && !sameLibrary(legacy, record.library))
        records.set(PALETTE_LIBRARY_KEY, record.library)
      return result
    })
  }

  const account: PaletteAccount = {
    async inspect(minimum = 0, ready, producing = false) {
      validRevision(minimum, 0)
      return access((record) => {
        record.minimum = Math.max(record.minimum, minimum)
        const seen = snapshot(record)
        if (
          producing &&
          seen.dirty &&
          seen.candidate &&
          !seen.rejected &&
          !seen.needsHead &&
          !seen.submission &&
          seen.minimum <= (seen.revision ?? 0)
        ) {
          const confirmed = new Set(record.confirmed?.palettes.map((p) => p.id))
          const introduced = seen.candidate.palettes
            .filter((p) => !confirmed.has(p.id))
            .map((p) => p.id)
          if (introduced.length) {
            record.version = 3
            record.introduced = [...new Set([...(record.introduced ?? []), ...introduced])]
          }
        }
        return seen
      }, ready)
    },
    async observeConflict(origin, minimum, ready) {
      const expected = captureToken(origin)
      validRevision(minimum, 0)
      return access((record) => {
        if (
          record.generation !== expected.generation ||
          (record.revision ?? 0) !== (expected.revision ?? 0)
        )
          return false
        if (record.submission) return false
        if (record.head) {
          record.recheck = true
          record.generation = newId()
        }
        record.minimum = Math.max(record.minimum, minimum)
        return true
      }, ready)
    },
    async prepare(origin, input, ready, replaces) {
      const expected = captureToken(origin),
        ticket = PintaPaletteUploadCapabilitySchema.parse(input.ticket),
        sent = captureLibrary(input.sent)
      const revision = input.revision
      validRevision(revision, 1)
      return access((record) => {
        if (
          !record.head ||
          record.recheck ||
          record.generation !== expected.generation ||
          record.revision !== expected.revision ||
          record.head.generation !== ticket.baseGeneration ||
          revision <= record.head.revision
        )
          return false
        if (
          replaces &&
          (record.submission?.ticket.nonce !== replaces ||
            !sameLibrary(record.submission.sent, sent))
        )
          return false
        if (record.submission && !replaces)
          return (
            pintaValuesEqual(record.submission.ticket, ticket) &&
            record.submission.revision === revision &&
            sameLibrary(record.submission.sent, sent)
          )
        const removals = replaces ? record.submission?.removals : expected.removals
        record.submission = { ticket, revision, sent, ...(removals?.length ? { removals } : {}) }
        return true
      }, ready)
    },
    async release(origin, nonce, revision, ready, invalid = false) {
      const expected = captureToken(origin)
      return access((record) => {
        const transfer = record.submission
        if (
          !transfer ||
          transfer.ticket.nonce !== nonce ||
          transfer.revision !== revision ||
          expected.generation !== record.generation
        )
          return false
        if (invalid || !sameLibrary(transfer.sent, withoutCopies(record))) {
          if (invalid) record.rejected = true
          else delete record.rejected
          record.priorSubmission = transfer.sent
          addCopies(record, delta(transfer.sent, record.confirmed), withoutCopies(record))
        }
        delete record.submission
        record.generation = newId()
        record.recheck = true
        return true
      }, ready)
    },
    async receive(origin, response, ready, now, previousSyncAt, reportedHead) {
      const head = reportedHead ? PintaPaletteHeadSchema.parse(reportedHead) : undefined
      const expected = captureToken(origin)
      const remote = response
        ? {
            revision: response.revision,
            updatedAt: response.updatedAt,
            library: captureLibrary(response.library),
          }
        : null
      if (remote) {
        validRevision(remote.revision, 1)
        if (!Number.isFinite(remote.updatedAt) || !Number.isFinite(now))
          throw Error('Data da biblioteca de paletas inválida.')
      }
      const result = await access((record) => {
        if (expected.generation !== record.generation || record.submission) return null
        const sameRead =
          record.revision === expected.revision && record.minimum === expected.minimum
        if (!remote && !sameRead) return null
        if (record.head && !head)
          throw Error('A nuvem precisa confirmar a identidade da biblioteca de paletas.')
        if (head) {
          if (
            head.exists !== !!remote ||
            head.revision !== (remote?.revision ?? 0) ||
            (record.head?.adopted && !head.adopted)
          )
            throw Error('A nuvem não confirmou a identidade e a revisão da biblioteca de paletas.')
          const bind = !record.head
          const rotate = record.head
            ? record.head.generation !== head.generation ||
              (!record.head.adopted && record.head.exists && !head.exists)
            : record.minimum > head.revision ||
              (!!record.confirmed &&
                (!remote ||
                  head.revision !== record.revision ||
                  !sameLibrary(record.confirmed, remote.library)))
          if ((rotate || bind) && !sameRead) return null
          if (!rotate && remote && remote.revision < Math.max(record.minimum, record.revision ?? 0))
            return null
          if (!rotate && !remote && record.head?.exists) return null
          if (rotate) archivePriorEdits(record, remote?.library ?? null)
          if (rotate || bind) record.generation = newId()
          if (record.version === 1) record.version = 2
          record.head = head
          delete record.recheck
        }
        if (!remote) {
          if (record.revision !== 0 || record.minimum > 0) {
            record.generation = newId()
            const previous =
              record.confirmed ??
              (record.migrationSource?.updatedAt === previousSyncAt ? record.migrationSource : null)
            if (previous)
              record.retired = mergePaletteLibraries(
                record.retired ?? emptyPaletteLibrary(),
                previous,
              )
            delete record.introduced
            if (record.removals) {
              record.priorRemovals = record.removals
              delete record.removals
            }
            record.confirmed = null
            record.revision = 0
            record.minimum = 0
          }
          record.migrationSource = null
          return snapshot(record)
        }
        if (remote.revision < Math.max(record.minimum, record.revision ?? 0)) return null
        if (
          remote.revision === record.revision &&
          (!record.confirmed ||
            paletteLibraryContentKey(remote.library) !== paletteLibraryContentKey(record.confirmed))
        )
          throw Error('O conteúdo confirmado da biblioteca mudou na mesma revisão.')
        const source = withoutCopies(record) ?? emptyPaletteLibrary()
        let changes = delta(source, record.confirmed)
        if (record.migrationSource) {
          changes = delta(source, record.migrationSource)
          addCopies(record, record.migrationSource, remote.library)
        }
        const copyIds = new Set(record.recoveries.map((copy) => copy.id))
        const copies = record.library?.palettes.filter((p) => copyIds.has(p.id)) ?? []
        const merged = mergePaletteLibraries(remote.library, withRemovals(changes, record))
        const kept = retainCompactedRemovals(
          record.removals,
          source,
          changes,
          merged,
          remote.library,
          record.confirmed ?? undefined,
          record.introduced,
        )
        setRemovals(record, settleRemovals(kept, expected.removals, remote.library))
        if (remote.revision !== (record.revision ?? 0)) delete record.introduced
        const activeIds = new Set([...merged.palettes, ...merged.removed].map((entry) => entry.id))
        if (record.retired)
          record.retired = {
            ...record.retired,
            palettes: record.retired.palettes.filter((p) => !activeIds.has(p.id)),
            removed: record.retired.removed.filter((p) => !activeIds.has(p.id)),
          }
        const visible = mergePaletteLibraries(merged, record.retired ?? emptyPaletteLibrary())
        const dirty = paletteLibraryContentKey(merged) !== paletteLibraryContentKey(remote.library)
        record.library = {
          ...visible,
          updatedAt: Math.max(
            record.library?.updatedAt ?? 0,
            dirty ? Math.max(now, remote.updatedAt + 1) : remote.updatedAt,
            merged.updatedAt,
          ),
          palettes: [...visible.palettes, ...copies],
        }
        record.confirmed = remote.library
        record.revision = remote.revision
        record.minimum = Math.max(record.minimum, remote.revision)
        record.migrationSource = null
        return snapshot(record)
      }, ready)
      if (result && remote) notify()
      return result
    },
    async acknowledge(origin, candidate, revision, ready, reportedHead, nonce) {
      const head = reportedHead ? PintaPaletteHeadSchema.parse(reportedHead) : undefined
      const expected = captureToken(origin),
        sent = captureLibrary(candidate)
      validRevision(revision, 1)
      return access((record) => {
        if (
          expected.generation !== record.generation ||
          (expected.revision ?? 0) !== (record.revision ?? 0) ||
          revision <= (record.revision ?? 0) ||
          revision < record.minimum
        )
          return null
        const observed = record.submission ? record.submission.removals : expected.removals
        if (record.head || head) {
          if (
            !record.submission ||
            record.submission.revision !== revision ||
            record.submission.ticket.nonce !== nonce ||
            !sameLibrary(record.submission.sent, sent)
          )
            return null
          if (
            !record.head ||
            !head?.adopted ||
            !head.exists ||
            head.revision !== revision ||
            (record.head.adopted
              ? head.generation !== record.head.generation
              : head.generation === record.head.generation)
          )
            throw Error('A nuvem não confirmou a encarnação desta biblioteca.')
          if (head.generation !== record.head.generation) record.generation = newId()
          record.head = head
          delete record.submission
          delete record.rejected
        }
        setRemovals(
          record,
          settleRemovals(record.removals, [...(observed ?? []), ...sent.removed], sent),
        )
        delete record.introduced
        record.confirmed = sent
        record.revision = revision
        record.minimum = revision
        record.migrationSource = null
        return snapshot(record)
      }, ready)
    },
  }

  return {
    account,
    load: () => access((record) => record.library),
    async save(library: PaletteLibrary, ready?: () => boolean, observed?: PaletteLibrary) {
      const incoming = readAuthoredPaletteLibrary(library)
      if (!incoming && library && typeof library === 'object' && 'palettes' in library)
        throw Error('Não consegui conferir o conteúdo da biblioteca de paletas.')
      const previous = observed ? sanitizePaletteLibrary(observed) : null
      const result = await access((record) => {
        if (!incoming) {
          if (record.library || record.revision !== null)
            throw Error('Biblioteca de paletas inválida.')
          return library
        }
        const changes = delta(incoming, previous)
        const changedCopies = new Set(changes.palettes.map((p) => p.id))
        if (observed)
          record.recoveries = record.recoveries.filter((copy) => !changedCopies.has(copy.id))
        const merged = mergePaletteLibraries(
          record.library ?? emptyPaletteLibrary(),
          withRemovals(changes, record),
        )
        setRemovals(
          record,
          retainCompactedRemovals(
            record.removals,
            record.library,
            changes,
            merged,
            record.confirmed,
            record.submission?.sent,
            record.introduced,
          ),
        )
        record.library = merged
        return record.library
      }, ready)
      notify()
      return result
    },
  }
}
