import { pintaValuesEqual } from '../core/assetEquality'
import { newId } from '../core/id'
import type {
  PaletteAccount,
  PaletteAccountSnapshot,
  PaletteAccountToken,
} from '../core/paletteAccount'
import {
  emptyPaletteLibrary,
  mergePaletteLibraries,
  type PaletteLibrary,
  paletteLibraryContentKey,
  readAccountPaletteLibrary,
  type SavedPalette,
  sanitizePaletteLibrary,
} from '../core/paletteLibrary'
import { PINTA_LIMITS } from '../core/project'

export const PALETTE_LIBRARY_KEY = 'pinta:palettes'
export const PALETTE_ACCOUNT_KEY = 'pinta:sync:palette-account'

interface PaletteRecord extends PaletteAccountToken {
  version: 1
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
    record?.version !== 1 ||
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
  return { generation, revision, minimum }
}

function captureLibrary(input: PaletteLibrary): PaletteLibrary {
  const accepted = readAccountPaletteLibrary(input)
  if (!accepted) throw Error('Não consegui conferir o conteúdo da biblioteca de paletas.')
  return accepted
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
    async inspect(minimum = 0, ready) {
      validRevision(minimum, 0)
      return access((record) => {
        record.minimum = Math.max(record.minimum, minimum)
        return snapshot(record)
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
        record.minimum = Math.max(record.minimum, minimum)
        return true
      }, ready)
    },
    async receive(origin, response, ready, now, previousSyncAt) {
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
        if (expected.generation !== record.generation) return null
        if (!remote) {
          if (record.revision !== expected.revision || record.minimum !== expected.minimum)
            return null
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
        const merged = mergePaletteLibraries(remote.library, changes)
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
    async acknowledge(origin, candidate, revision, ready) {
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
      const incoming = readAccountPaletteLibrary(library)
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
        record.library = mergePaletteLibraries(record.library ?? emptyPaletteLibrary(), changes)
        return record.library
      }, ready)
      notify()
      return result
    },
  }
}
