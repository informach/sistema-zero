import type { UseStore } from 'idb-keyval'
import { MOLDA_LIMITS } from '../core/limits'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import * as v from '../scene/validation'
import { MoldaStorageBudgetError } from './guardedWrite'
import { collectRecords, readRecords } from './readRecords'
import { sameScenePixelBytes } from './sceneBlob'
import {
  inflateRecoveryBlock,
  type PreparedSceneRecovery,
  readRecoveryBlock,
  readSceneRecoveryRecord,
  restoreSceneRecovery,
  type SceneRecoveryRecord,
} from './sceneRecoveryCodec'
import { sameSceneStoredValue } from './sceneStorageCompare'
import {
  SCENE_CHECKPOINT_BLOCK_PREFIX as BLOCK,
  SCENE_CHECKPOINT_PREFIX as CHECKPOINT,
} from './storageKeys'

export function readSceneCheckpointSet(raw: unknown, key: string): SceneRecoveryRecord[] {
  const row = v.record(raw, 'checkpoints', ['kind', 'version', 'entries'])
  v.requireScene(
    row.kind === 'molda-checkpoint-set' && row.version === 1,
    'checkpoints',
    'Cópia de recuperação desconhecida.',
  )
  const entries = v.list(row.entries, 'entries', 2).map(readSceneRecoveryRecord)
  v.requireScene(
    entries.length > 0 &&
      entries.every((entry) => key === `${CHECKPOINT}${entry.id}:${entry.session}`),
    'checkpoints',
    'Identidade de recuperação inválida.',
  )
  return entries
}

export function createSceneRecoveryPersistence(
  store: UseStore,
  maxBytes: number = MOLDA_LIMITS.recoveryBudgetBytes,
) {
  v.number(maxBytes, 'recoveryBudget', 1, Number.MAX_SAFE_INTEGER, true)
  function capture(prepared: PreparedSceneRecovery): PreparedSceneRecovery {
    const record = readSceneRecoveryRecord(prepared.record)
    const required = new Set(record.layers.flatMap((layer) => layer.blocks))
    v.requireScene(
      prepared.blocks instanceof Map && prepared.blocks.size === required.size,
      'blocks',
      'Cópia de recuperação incompleta.',
    )
    const blocks: PreparedSceneRecovery['blocks'] = new Map()
    for (const hash of required) {
      const block = readRecoveryBlock(prepared.blocks.get(hash))
      blocks.set(hash, { ...block, bytes: new Uint8Array(block.bytes) })
    }
    return { record, blocks }
  }
  async function keys(): Promise<string[]> {
    return store(
      'readonly',
      (native) =>
        new Promise((resolve, reject) => {
          const request = native.getAllKeys()
          native.transaction.oncomplete = () =>
            resolve(
              request.result.filter(
                (key): key is string =>
                  typeof key === 'string' && (key.startsWith(CHECKPOINT) || key.startsWith(BLOCK)),
              ),
            )
          native.transaction.onabort = native.transaction.onerror = () =>
            reject(native.transaction.error)
        }),
    )
  }
  /** Checkpoint swap and collection share one serializable transaction across all tabs. */
  async function mutate(
    key: string,
    prepared: PreparedSceneRecovery | null,
    expected?: SceneRecoveryRecord,
  ) {
    return store(
      'readwrite',
      (native) =>
        new Promise<boolean>((resolve, reject) => {
          let failure: unknown
          let applied = false
          const tx = native.transaction
          tx.oncomplete = () => resolve(applied)
          tx.onabort = tx.onerror = () => reject(failure ?? tx.error)
          const request = native.getAllKeys()
          request.onsuccess = () => {
            const keys = request.result.filter(
              (key): key is string =>
                typeof key === 'string' && (key.startsWith(CHECKPOINT) || key.startsWith(BLOCK)),
            )
            collectRecords(native, keys, (records) => {
              try {
                const current = records.has(key)
                  ? readSceneCheckpointSet(records.get(key), key)
                  : []
                const expectedIndex = expected
                  ? current.findIndex((entry) => sameSceneStoredValue(entry, expected))
                  : -1
                if (expected && expectedIndex < 0) return
                const entries = prepared
                  ? [
                      prepared.record,
                      ...current.filter((entry) => entry.updatedAt !== prepared.record.updatedAt),
                    ].slice(0, 2)
                  : expectedIndex > 0
                    ? current.filter((_, index) => index !== expectedIndex)
                    : []
                if (entries.length)
                  records.set(key, { kind: 'molda-checkpoint-set', version: 1, entries })
                else records.delete(key)
                const kept = new Set<string>()
                const writes = new Map<string, unknown>()
                const removals: string[] = []
                let opaque = false
                for (const [entryKey, raw] of records) {
                  if (!entryKey.startsWith(CHECKPOINT)) continue
                  try {
                    for (const entry of readSceneCheckpointSet(raw, entryKey))
                      for (const layer of entry.layers)
                        for (const hash of layer.blocks) kept.add(hash)
                  } catch {
                    opaque = true
                  }
                }
                if (prepared)
                  for (const [hash, block] of prepared.blocks) {
                    const blockKey = `${BLOCK}${hash}`
                    if (records.has(blockKey)) {
                      const existing = readRecoveryBlock(records.get(blockKey))
                      v.requireScene(
                        sameSceneStoredValue(existing, block) ||
                          sameScenePixelBytes(
                            inflateRecoveryBlock(existing),
                            inflateRecoveryBlock(block),
                          ),
                        'block',
                        'Blocos de recuperação divergentes; cópias preservadas.',
                      )
                    } else {
                      records.set(blockKey, block)
                      writes.set(blockKey, block)
                    }
                  }
                if (!opaque)
                  for (const oldKey of keys)
                    if (oldKey.startsWith(BLOCK) && !kept.has(oldKey.slice(BLOCK.length))) {
                      // Unknown/corrupt records are retained for diagnostics, not silently erased.
                      try {
                        readRecoveryBlock(records.get(oldKey))
                        records.delete(oldKey)
                        removals.push(oldKey)
                      } catch {
                        /* preserved */
                      }
                    }
                const bytes = [...records.values()].reduce<number>(
                  (sum, raw) => sum + structuredBytes(raw),
                  0,
                )
                if (prepared && bytes > maxBytes)
                  throw new MoldaStorageBudgetError(
                    'Não há espaço para a cópia de recuperação. Guarde uma cópia do projeto.',
                  )
                for (const [writeKey, value] of writes) native.put(value, writeKey)
                for (const removeKey of removals) native.delete(removeKey)
                if (entries.length) native.put(records.get(key), key)
                else native.delete(key)
                applied = true
              } catch (error) {
                failure = error
                tx.abort()
              }
            })
          }
        }),
    )
  }
  async function inspect(
    id: string,
  ): Promise<{ records: SceneRecoveryRecord[]; unreadable: boolean }> {
    const records = await readRecords(
      store,
      (await keys()).filter((key) => key.startsWith(CHECKPOINT)),
    )
    const result: SceneRecoveryRecord[] = []
    let unreadable = false
    for (const [key, raw] of records) {
      try {
        for (const record of readSceneCheckpointSet(raw, key))
          if (record.id === id) result.push(record)
      } catch {
        if (key.startsWith(`${CHECKPOINT}${id}:`)) unreadable = true
      }
    }
    return { records: result.sort((a, b) => b.updatedAt - a.updatedAt), unreadable }
  }
  return {
    save: (prepared: PreparedSceneRecovery) => {
      const owned = capture(prepared)
      return mutate(`${CHECKPOINT}${owned.record.id}:${owned.record.session}`, owned)
    },
    clear: (id: string, session: string) => mutate(`${CHECKPOINT}${id}:${session}`, null),
    discard: (record: SceneRecoveryRecord) =>
      mutate(`${CHECKPOINT}${record.id}:${record.session}`, null, record),
    inspect,
    list: async (id: string): Promise<SceneRecoveryRecord[]> => (await inspect(id)).records,
    async restore(record: SceneRecoveryRecord): Promise<MoldaSceneDocument> {
      const refs = [...new Set(record.layers.flatMap((layer) => layer.blocks))]
      const stored = await readRecords(
        store,
        refs.map((hash) => `${BLOCK}${hash}`),
      )
      return restoreSceneRecovery(
        record,
        new Map(refs.map((hash) => [hash, stored.get(`${BLOCK}${hash}`)])),
      )
    },
  }
}
export type SceneRecoveryPersistence = ReturnType<typeof createSceneRecoveryPersistence>
