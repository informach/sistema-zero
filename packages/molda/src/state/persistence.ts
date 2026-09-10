/**
 * Persistência LOCAL das criações (IndexedDB via idb-keyval), no molde do Pinta:
 *
 * - Um banco por NAMESPACE (`sistema-zero-molda-<ns>`): o host kids chama
 *   `setMoldaStorageNamespace(viewerId)` ANTES de montar o app, e cada perfil
 *   Netflix enxerga só a própria galeria.
 * - Documento (`molda:record:<id>`) e resumo separados, gravados atomicamente por structured clone
 *   (o `Uint8Array` das peles atravessa inteiro).
 * - Escritas em FILA por banco e, quando disponível, sob Web Lock: duas abas ou
 *   dois stores não calculam o orçamento sobre o mesmo estado antigo.
 * - Versão, orçamento em BYTES e gravação são conferidos na mesma transação IDB,
 *   inclusive sem Web Locks. Originais legados ficam em `molda:recovery:<id>`.
 * - `BroadcastChannel` avisa as outras abas (`changed`); a mesma instância
 *   ignora o próprio eco pelo `senderId`.
 * - Todo registro passa por `sanitizeMoldaAsset` na leitura (migração lazy);
 *   registro ilegível some da lista sem derrubar os outros.
 */
import { createStore, keys, type UseStore } from 'idb-keyval'
import { type MoldaAssetSummary, readAssetSummary, summarizeAsset } from '../core/assetSummary'
import {
  type MoldaDocumentRead,
  type MoldaReadIssue,
  moldaReadIssue,
  readMoldaDocumentForId,
} from '../core/documentReader'
import { MOLDA_DOCUMENT_WRITE_VERSION, MoldaUnsupportedVersionError } from '../core/documentVersion'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaAsset } from '../core/model'
import { guardedWrite, MoldaStorageBudgetError, removeStoredDocuments } from './guardedWrite'
import { readRecords } from './readRecords'
import {
  DOCUMENT_KEY_PREFIX,
  DOCUMENT_PREFIXES,
  documentKeys,
  PREVIOUS_RECOVERY_KEY_PREFIX,
  RECOVERY_KEY_PREFIX,
  SCENE_DELETED_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
  SUMMARY_KEY_PREFIX,
  storedDocumentKey,
} from './storageKeys'

export { MoldaStorageBudgetError } from './guardedWrite'

export type MoldaPersistenceEvent =
  | { type: 'sync-start' }
  | { type: 'changed'; ids?: string[] }
  | { type: 'sync-end' }

export interface MoldaPersistence {
  loadAll(): Promise<MoldaAsset[]>
  /** Lightweight listing. Legacy documents are read individually until the first explicit save. */
  listSummaries?(): Promise<MoldaAssetSummary[]>
  /** UMA criação pelo id (`null` = não existe/ilegível). A nuvem do host relê o disco na hora de subir. */
  load(id: string): Promise<MoldaAsset | null>
  /** Non-lossy inspection, including unsupported data, for recovery/export without opening. */
  read?(id: string): Promise<MoldaDocumentRead | null>
  /** Original retained by lazy migration (never passed through sanitize). */
  loadRecovery?(id: string): Promise<unknown>
  /** Issues from the latest loadAll, without another document scan. */
  getReadIssues?(): readonly MoldaReadIssue[]
  save(asset: MoldaAsset): Promise<void>
  /** Compare and write in one transaction; false leaves every record untouched. null = absent. */
  saveIfUnchanged(asset: MoldaAsset, expectedUpdatedAt: number | null): Promise<boolean>
  /** Atômico: ou grava todos, ou nenhum. */
  saveMany(assets: readonly MoldaAsset[]): Promise<void>
  remove(id: string): Promise<void>
  removeIfUnchanged(id: string, expectedUpdatedAt: number | null): Promise<boolean>
  removeMany(ids: readonly string[]): Promise<void>
  /** Opcional: avisos de mudança externa (outra aba, nuvem). */
  subscribe?(listener: (event: MoldaPersistenceEvent) => void): () => void
  /** Libera canais mantidos pela instância. Pode ser chamado mais de uma vez. */
  dispose?(): void
}

export function isStorageBudgetError(error: unknown): error is MoldaStorageBudgetError {
  return error instanceof MoldaStorageBudgetError
}

const DB_PREFIX = 'sistema-zero-molda'
const STORE_NAME = 'assets'

// ── Namespace ───────────────────────────────────────────────────────────────

let currentNamespace = ''
const defaults = new Map<string, MoldaPersistence>()

/** Chamar ANTES de montar o app (o host kids passa o id do perfil). */
export function setMoldaStorageNamespace(namespace: string): void {
  const nextNamespace = namespace.trim()
  if (nextNamespace === currentNamespace) return
  defaults.get(currentNamespace)?.dispose?.()
  defaults.delete(currentNamespace)
  currentNamespace = nextNamespace
}

export function getMoldaStorageNamespace(): string {
  return currentNamespace
}

export function moldaDbNameFor(namespace: string): string {
  return namespace ? `${DB_PREFIX}-${namespace}` : DB_PREFIX
}

const storeHandles = new Map<string, UseStore>()

function storeFor(dbName: string): UseStore {
  let handle = storeHandles.get(dbName)
  if (!handle) {
    handle = createStore(dbName, STORE_NAME)
    storeHandles.set(dbName, handle)
  }
  return handle
}

let generationStoreFactory: ((namespace: string) => UseStore) | null = null

/**
 * Injeta o banco da geração seguinte, no mesmo molde de `setMoldaViewportFactory`:
 * o mock de `idb-keyval` dos testes não é um `UseStore` chamável, e a persistência
 * de cena usa transações IndexedDB de verdade. `null` volta ao banco do namespace.
 */
export function setMoldaGenerationStoreFactory(
  factory: ((namespace: string) => UseStore) | null,
): void {
  generationStoreFactory = factory
}

/**
 * O MESMO banco do namespace corrente, para a geração seguinte abrir os próprios
 * registros. Não é um segundo inventário: `storedDocumentKey` já resolve as duas
 * gerações na mesma chave de criação, e é por isso que elas não podem se separar
 * em bancos diferentes. Não escreve nada por si.
 */
export function getMoldaGenerationStore(namespace = currentNamespace): UseStore {
  return generationStoreFactory?.(namespace) ?? storeFor(moldaDbNameFor(namespace))
}

// ── Fila de escrita por banco ───────────────────────────────────────────────

const writeQueues = new Map<string, Promise<unknown>>()
const WRITE_LOCK_PREFIX = 'molda:persistence:'

function runSerializedWrite<T>(dbName: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(dbName) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(task)
  writeQueues.set(dbName, next)
  next
    .finally(() => {
      if (writeQueues.get(dbName) === next) writeQueues.delete(dbName)
    })
    .catch(() => undefined)
  return next
}

function runExclusiveWrite<T>(dbName: string, task: () => Promise<T>): Promise<T> {
  return runSerializedWrite(dbName, async () => {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
    if (!locks) return task()
    return locks.request(`${WRITE_LOCK_PREFIX}${dbName}`, task)
  })
}

// ── Registro de criações ABERTAS (editor) ───────────────────────────────────

const openAssets = new Set<string>()
const openListeners = new Set<() => void>()

function notifyOpen(): void {
  for (const listener of openListeners) listener()
}

export function markMoldaAssetOpen(id: string): void {
  if (openAssets.has(id)) return
  openAssets.add(id)
  notifyOpen()
}

export function markMoldaAssetClosed(id: string): void {
  if (!openAssets.delete(id)) return
  notifyOpen()
}

export function isMoldaAssetOpen(id: string): boolean {
  return openAssets.has(id)
}

export function subscribeMoldaAssetOpenState(listener: () => void): () => void {
  openListeners.add(listener)
  return () => {
    openListeners.delete(listener)
  }
}

// ── Cross-tab ───────────────────────────────────────────────────────────────

interface ChangedMessage {
  type: 'changed'
  senderId: string
  ids: string[]
}

function channelName(dbName: string): string {
  return `molda:assets:${dbName}`
}

function openChannel(dbName: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(channelName(dbName))
  } catch {
    return null
  }
}

// ── A persistência ──────────────────────────────────────────────────────────

export interface CreateMoldaPersistenceOptions {
  /** Padrão: o namespace corrente (`setMoldaStorageNamespace`). */
  namespace?: string
  /** Padrão: `MOLDA_LIMITS.maxGalleryBytes`. */
  maxBytes?: number
}

export function createMoldaPersistence(
  options: CreateMoldaPersistenceOptions = {},
): MoldaPersistence {
  const namespace = options.namespace ?? currentNamespace
  const maxBytes = options.maxBytes ?? MOLDA_LIMITS.maxGalleryBytes
  const dbName = moldaDbNameFor(namespace)
  const store = storeFor(dbName)
  const senderId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  let sender = openChannel(dbName)
  const receivers = new Set<BroadcastChannel>()
  let disposed = false
  let readIssues: MoldaReadIssue[] = []

  async function readAll(): Promise<MoldaAsset[]> {
    const ids = new Set<string>()
    for (const key of await keys(store)) {
      if (typeof key !== 'string') continue
      for (const prefix of DOCUMENT_PREFIXES) {
        if (key.startsWith(prefix)) ids.add(key.slice(prefix.length))
      }
    }
    // Read related keys together: no stale fallback during migration/deletion in another tab.
    const allKeys = [...ids].flatMap(documentKeys)
    const records = await readRecords(store, allKeys)
    const assets: MoldaAsset[] = []
    readIssues = []
    for (const id of ids) {
      const key = storedDocumentKey(records, id)
      // Deleted between the key scan and the read; absent is not a damaged document.
      if (key === null) continue
      const raw = records.get(key)
      const read = readMoldaDocumentForId(raw, id)
      if (read.status !== 'valid') {
        readIssues.push(moldaReadIssue(id, read))
        continue
      }
      const asset = read.asset
      assets.push(asset)
    }
    return assets
  }

  async function listSummaries(): Promise<MoldaAssetSummary[]> {
    const diskKeys = new Set(await keys(store))
    const ids = new Set<string>()
    for (const key of diskKeys) {
      if (typeof key !== 'string') continue
      for (const prefix of DOCUMENT_PREFIXES) {
        if (key.startsWith(prefix)) ids.add(key.slice(prefix.length))
      }
    }
    // Only indexed storage writers know this generation, and update its summary atomically.
    // Older records cannot have trustworthy cached summaries: old tabs may still edit them.
    const summaries = await readRecords(
      store,
      [...ids]
        .filter(
          (id) =>
            diskKeys.has(`${DOCUMENT_KEY_PREFIX}${id}`) &&
            !diskKeys.has(`${SCENE_DOCUMENT_KEY_PREFIX}${id}`) &&
            !diskKeys.has(`${SCENE_DELETED_KEY_PREFIX}${id}`),
        )
        .map((id) => `${SUMMARY_KEY_PREFIX}${id}`),
    )
    const result: MoldaAssetSummary[] = []
    const issues: MoldaReadIssue[] = []
    for (const id of ids) {
      const raw = summaries.get(`${SUMMARY_KEY_PREFIX}${id}`)
      const summary =
        raw &&
        typeof raw === 'object' &&
        'formatVersion' in raw &&
        raw.formatVersion === MOLDA_DOCUMENT_WRITE_VERSION
          ? readAssetSummary(raw, id)
          : null
      if (summary) {
        result.push(summary)
        continue
      }
      // Migration/invalid index: retain at most ONE full document, without rewriting on read.
      const read = await readOne(id)
      if (read?.status === 'valid') result.push(summarizeAsset(read.asset))
      else if (read) issues.push(moldaReadIssue(id, read))
    }
    readIssues = issues
    return result
  }

  async function readOne(id: string): Promise<MoldaDocumentRead | null> {
    const records = await readRecords(store, documentKeys(id))
    const key = storedDocumentKey(records, id)
    return key === null ? null : readMoldaDocumentForId(records.get(key), id)
  }

  function broadcast(ids: string[]): void {
    if (!sender) return
    try {
      const message: ChangedMessage = { type: 'changed', senderId, ids }
      sender.postMessage(message)
    } catch {
      // Canal fechado ou indisponível: só perde o aviso cross-tab.
    }
  }

  return {
    loadAll: () => readAll(),
    listSummaries,

    async load(id) {
      const read = await readOne(id)
      if (!read) return null
      if (read.status === 'unsupported') throw new MoldaUnsupportedVersionError(read.version)
      return read.status === 'valid' ? read.asset : null
    },

    read: readOne,

    async loadRecovery(id) {
      const scene = `${SCENE_RECOVERY_KEY_PREFIX}${id}`
      const current = `${RECOVERY_KEY_PREFIX}${id}`
      const previous = `${PREVIOUS_RECOVERY_KEY_PREFIX}${id}`
      const records = await readRecords(store, [scene, current, previous])
      return records.get(records.has(scene) ? scene : records.has(current) ? current : previous)
    },
    getReadIssues: () => readIssues,

    save(asset) {
      return runExclusiveWrite(dbName, async () => {
        await guardedWrite(store, [asset], maxBytes)
        broadcast([asset.id])
      })
    },

    saveIfUnchanged(asset, expectedUpdatedAt) {
      return runExclusiveWrite(dbName, async () => {
        const written = await guardedWrite(
          store,
          [asset],
          maxBytes,
          new Map([[asset.id, expectedUpdatedAt]]),
        )
        if (written) broadcast([asset.id])
        return written
      })
    },

    saveMany(assets) {
      return runExclusiveWrite(dbName, async () => {
        if (assets.length === 0) return
        await guardedWrite(store, assets, maxBytes)
        broadcast([...new Set(assets.map((asset) => asset.id))])
      })
    },

    remove(id) {
      return runExclusiveWrite(dbName, async () => {
        await removeStoredDocuments(store, [id])
        broadcast([id])
      })
    },

    removeIfUnchanged(id, expectedUpdatedAt) {
      return runExclusiveWrite(dbName, async () => {
        const removed = await removeStoredDocuments(store, [id], new Map([[id, expectedUpdatedAt]]))
        if (removed) broadcast([id])
        return removed
      })
    },

    removeMany(ids) {
      return runExclusiveWrite(dbName, async () => {
        if (ids.length === 0) return
        await removeStoredDocuments(store, ids)
        broadcast([...ids])
      })
    },

    subscribe(listener) {
      if (disposed) return () => undefined
      const receiver = openChannel(dbName)
      if (!receiver) return () => undefined
      receivers.add(receiver)
      const onMessage = (event: MessageEvent<unknown>): void => {
        const data = event.data as Partial<ChangedMessage> | null
        if (data?.type !== 'changed' || data.senderId === senderId) return
        listener({ type: 'changed', ids: Array.isArray(data.ids) ? data.ids : undefined })
      }
      receiver.addEventListener('message', onMessage)
      return () => {
        if (!receivers.delete(receiver)) return
        receiver.removeEventListener('message', onMessage)
        receiver.close()
      }
    },

    dispose() {
      if (disposed) return
      disposed = true
      sender?.close()
      sender = null
      for (const receiver of receivers) {
        receiver.close()
      }
      receivers.clear()
    },
  }
}

// ── Instância padrão por namespace ──────────────────────────────────────────

/**
 * UMA instância por namespace: quem lê a galeria (app, `studio-library`) e
 * quem grava (editor) compartilham o mesmo banco e os avisos de recuperação.
 */
export function getDefaultMoldaPersistence(): MoldaPersistence {
  const namespace = currentNamespace
  let instance = defaults.get(namespace)
  if (!instance) {
    instance = createMoldaPersistence({ namespace })
    defaults.set(namespace, instance)
  }
  return instance
}

/** Só para testes: esquece as instâncias padrão (o mock do IndexedDB é limpo à parte). */
export function resetMoldaPersistenceForTests(): void {
  for (const persistence of defaults.values()) persistence.dispose?.()
  defaults.clear()
  storeHandles.clear()
  writeQueues.clear()
  openAssets.clear()
  // A fábrica é um global de TESTE: deixá-la de pé aponta o banco da geração seguinte para
  // um handle já fechado, e o teste seguinte passa por um motivo errado (lista vazia).
  generationStoreFactory = null
}
