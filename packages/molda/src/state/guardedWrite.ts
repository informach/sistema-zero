import type { UseStore } from 'idb-keyval'
import { readAssetSummary, summarizeAsset, summaryBytes } from '../core/assetSummary'
import { assetBytes } from '../core/bytes'
import { readMoldaDocument } from '../core/documentReader'
import {
  assertMoldaDocumentWritable,
  checkMoldaDocumentVersion,
  MOLDA_DOCUMENT_WRITE_VERSION,
  MoldaUnsupportedVersionError,
} from '../core/documentVersion'
import type { MoldaAsset } from '../core/model'
import { structuredBytes as opaqueBytes } from '../core/structuredBytes'
import { collectRecords } from './readRecords'
import {
  DELETED_KEY_PREFIX,
  DOCUMENT_KEY_PREFIX,
  DOCUMENT_PREFIXES,
  documentKeys,
  LEGACY_KEY_PREFIX,
  PREVIOUS_DELETED_KEY_PREFIX,
  PREVIOUS_DOCUMENT_KEY_PREFIX,
  PREVIOUS_RECOVERY_KEY_PREFIX,
  RECOVERY_KEY_PREFIX,
  SCENE_DELETED_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
  SCENE_SUMMARY_KEY_PREFIX,
  SUMMARY_KEY_PREFIX,
  storedDocumentKey,
} from './storageKeys'

export class MoldaStorageBudgetError extends Error {
  readonly code = 'storage-budget' as const
  constructor(message = 'A galeria do Molda chegou ao limite de espaço.') {
    super(message)
    this.name = 'MoldaStorageBudgetError'
  }
}

/** Absence, corruption and a newer format are different from a readable matching revision. */
function matchesRevision(
  records: ReadonlyMap<IDBValidKey, unknown>,
  id: string,
  expected: number | null,
): boolean {
  const key = storedDocumentKey(records, id)
  if (key === null) return expected === null
  const read = readMoldaDocument(records.get(key))
  if (read.status === 'unsupported') throw new MoldaUnsupportedVersionError(read.version)
  return read.status === 'valid' && read.asset.id === id && read.asset.updatedAt === expected
}

/**
 * Check format, quota, preserve legacy originals and write in ONE IDB transaction.
 * Web Locks are useful coordination, but correctness must not depend on their availability.
 * No await between reading and putting: the transaction stays active on Safari too.
 */
export function guardedWrite(
  withStore: UseStore,
  assets: readonly MoldaAsset[],
  maxBytes: number,
  expectedRevisions?: ReadonlyMap<string, number | null>,
): Promise<boolean> {
  try {
    for (const asset of assets) assertMoldaDocumentWritable(asset)
  } catch (error) {
    return Promise.reject(error)
  }
  const incoming = new Map(assets.map((asset) => [`${DOCUMENT_KEY_PREFIX}${asset.id}`, asset]))
  if (!incoming.size) return Promise.resolve(true)
  return withStore(
    'readwrite',
    (store) =>
      new Promise<boolean>((resolve, reject) => {
        const tx = store.transaction
        let failure: unknown
        let written = false
        tx.oncomplete = () => resolve(written)
        tx.onabort = tx.onerror = () =>
          reject(failure ?? tx.error ?? new Error('Não foi possível guardar a criação.'))
        const keys = store.getAllKeys()
        const values = store.getAll()
        values.onsuccess = () => {
          try {
            const backups: Array<[string, unknown]> = []
            const records = new Map<IDBValidKey, unknown>(
              keys.result.map((key, index) => [key, values.result[index]]),
            )
            for (const asset of assets) {
              if (records.has(`${SCENE_DELETED_KEY_PREFIX}${asset.id}`)) {
                throw new MoldaUnsupportedVersionError(2)
              }
            }
            if (
              expectedRevisions &&
              [...expectedRevisions].some(
                ([id, revision]) => !matchesRevision(records, id, revision),
              )
            )
              return
            const retiredKeys = new Set<string>()
            let bytes = 0
            for (const [key, asset] of incoming) {
              const sourceKey = storedDocumentKey(records, asset.id)
              if (sourceKey === null) continue
              const raw = records.get(sourceKey)
              const read = readMoldaDocument(raw)
              if (read.status === 'unsupported')
                throw new MoldaUnsupportedVersionError(read.version)
              const migrating = !records.has(key)
              // Any legacy-key record is an original, including format-tagged v1 records.
              if (
                migrating ||
                read.status === 'invalid' ||
                read.legacy ||
                read.asset.id !== asset.id
              ) {
                const backupKey = `${RECOVERY_KEY_PREFIX}${asset.id}`
                if (!records.has(backupKey)) {
                  const previousBackupKey = `${PREVIOUS_RECOVERY_KEY_PREFIX}${asset.id}`
                  const original = records.has(previousBackupKey)
                    ? records.get(previousBackupKey)
                    : raw
                  backups.push([backupKey, original])
                  bytes += opaqueBytes(original)
                }
              }
              if (migrating) {
                for (const prefix of [LEGACY_KEY_PREFIX, PREVIOUS_DOCUMENT_KEY_PREFIX]) {
                  const version = checkMoldaDocumentVersion(records.get(`${prefix}${asset.id}`))
                  if (version.status === 'unsupported')
                    throw new MoldaUnsupportedVersionError(version.version)
                }
                retiredKeys.add(`${LEGACY_KEY_PREFIX}${asset.id}`)
                retiredKeys.add(`${PREVIOUS_DOCUMENT_KEY_PREFIX}${asset.id}`)
                retiredKeys.add(`${PREVIOUS_RECOVERY_KEY_PREFIX}${asset.id}`)
              }
            }
            for (let index = 0; index < keys.result.length; index += 1) {
              const key = keys.result[index]
              if (typeof key !== 'string' || retiredKeys.has(key)) continue
              const raw: unknown = values.result[index]
              if (
                key.startsWith(RECOVERY_KEY_PREFIX) ||
                key.startsWith(PREVIOUS_RECOVERY_KEY_PREFIX) ||
                key.startsWith(SCENE_RECOVERY_KEY_PREFIX) ||
                key.startsWith(SCENE_DELETED_KEY_PREFIX) ||
                key.startsWith(SCENE_SUMMARY_KEY_PREFIX)
              ) {
                bytes += opaqueBytes(raw)
                continue
              }
              if (key.startsWith(SUMMARY_KEY_PREFIX)) {
                if (
                  !incoming.has(`${DOCUMENT_KEY_PREFIX}${key.slice(SUMMARY_KEY_PREFIX.length)}`)
                ) {
                  const summary = readAssetSummary(raw, key.slice(SUMMARY_KEY_PREFIX.length))
                  bytes += summary ? summaryBytes(summary) : opaqueBytes(raw)
                }
                continue
              }
              if (incoming.has(key)) continue
              if (!DOCUMENT_PREFIXES.some((prefix) => key.startsWith(prefix))) {
                // Future layouts (including pixel blobs) occupy space even when this
                // writer cannot interpret them. Their own advertised size is not authority.
                // Only Molda records are in this tool's budget; leave other tools alone.
                if (key.startsWith('molda:')) bytes += opaqueBytes(raw)
                continue
              }
              const read = readMoldaDocument(raw)
              bytes += read.status === 'valid' ? assetBytes(read.asset) : opaqueBytes(raw)
            }
            for (const asset of incoming.values())
              bytes += assetBytes(asset) + summaryBytes(summarizeAsset(asset))
            if (bytes > maxBytes) throw new MoldaStorageBudgetError()
            for (const [key, raw] of backups) store.put(raw, key)
            for (const key of retiredKeys) store.delete(key)
            for (const [key, asset] of incoming) {
              store.put({ ...asset, formatVersion: MOLDA_DOCUMENT_WRITE_VERSION }, key)
              store.put(
                { ...summarizeAsset(asset), formatVersion: MOLDA_DOCUMENT_WRITE_VERSION },
                `${SUMMARY_KEY_PREFIX}${asset.id}`,
              )
              store.delete(`${DELETED_KEY_PREFIX}${asset.id}`)
            }
            written = true
          } catch (error) {
            failure = error
            tx.abort()
          }
        }
      }),
  )
}

/** Deletion and its legacy tombstone are one transaction, including recovery cleanup. */
export function removeStoredDocuments(
  withStore: UseStore,
  ids: readonly string[],
  expectedRevisions?: ReadonlyMap<string, number | null>,
): Promise<boolean> {
  if (!ids.length) return Promise.resolve(true)
  return withStore(
    'readwrite',
    (store) =>
      new Promise<boolean>((resolve, reject) => {
        const tx = store.transaction
        let removed = false
        let failure: unknown
        tx.oncomplete = () => resolve(removed)
        tx.onabort = tx.onerror = () =>
          reject(failure ?? tx.error ?? new Error('Não foi possível apagar a criação.'))
        const remove = () => {
          for (const id of new Set(ids)) {
            store.delete(`${DOCUMENT_KEY_PREFIX}${id}`)
            store.delete(`${PREVIOUS_DOCUMENT_KEY_PREFIX}${id}`)
            store.delete(`${LEGACY_KEY_PREFIX}${id}`)
            store.delete(`${RECOVERY_KEY_PREFIX}${id}`)
            store.delete(`${PREVIOUS_RECOVERY_KEY_PREFIX}${id}`)
            store.delete(`${SUMMARY_KEY_PREFIX}${id}`)
            store.put(true, `${DELETED_KEY_PREFIX}${id}`)
            store.put(true, `${PREVIOUS_DELETED_KEY_PREFIX}${id}`)
          }
          removed = true
        }
        // Every document being erased is guarded, including shadowed originals/recovery.
        // Check in this transaction, never in a preflight read vulnerable to another tab.
        const targetKeys = ids.flatMap((id) =>
          [...DOCUMENT_PREFIXES, RECOVERY_KEY_PREFIX, PREVIOUS_RECOVERY_KEY_PREFIX].map(
            (prefix) => `${prefix}${id}`,
          ),
        )
        const keys = new Set([
          ...targetKeys,
          ...[...(expectedRevisions?.keys() ?? [])].flatMap(documentKeys),
        ])
        collectRecords(store, [...keys], (records) => {
          try {
            for (const key of targetKeys) {
              const version = checkMoldaDocumentVersion(records.get(key))
              if (version.status === 'unsupported')
                throw new MoldaUnsupportedVersionError(version.version)
            }
            if (
              !expectedRevisions ||
              [...expectedRevisions].every(([id, revision]) =>
                matchesRevision(records, id, revision),
              )
            )
              remove()
          } catch (error) {
            failure = error
            tx.abort()
          }
        })
      }),
  )
}
