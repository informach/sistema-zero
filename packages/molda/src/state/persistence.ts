/**
 * Persistência LOCAL das criações (IndexedDB via idb-keyval), no molde do Pinta:
 *
 * - Um banco por NAMESPACE (`sistema-zero-molda-<ns>`): o host kids chama
 *   `setMoldaStorageNamespace(viewerId)` ANTES de montar o app, e cada perfil
 *   Netflix enxerga só a própria galeria.
 * - Um registro por criação (`molda:asset:<id>`), gravado por structured clone
 *   (o `Uint8Array` das peles atravessa inteiro).
 * - Escritas em FILA por banco (`runSerializedWrite`): duas abas ou dois stores
 *   nunca intercalam um `setMany` com um `del`.
 * - Orçamento em BYTES por inventário em memória (`assetBytes`): estourar lança
 *   `MoldaStorageBudgetError` ANTES de tocar o banco.
 * - `BroadcastChannel` avisa as outras abas (`changed`); a mesma instância
 *   ignora o próprio eco pelo `senderId`.
 * - Todo registro passa por `sanitizeMoldaAsset` na leitura (migração lazy);
 *   registro ilegível some da lista sem derrubar os outros.
 */
import {
  createStore,
  del,
  delMany,
  get,
  getMany,
  keys,
  set,
  setMany,
  type UseStore,
} from 'idb-keyval'
import { assetBytes } from '../core/bytes'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaAsset } from '../core/model'
import { sanitizeMoldaAsset } from '../core/sanitize'

export type MoldaPersistenceEvent =
  | { type: 'sync-start' }
  | { type: 'changed'; ids?: string[] }
  | { type: 'sync-end' }

export interface MoldaPersistence {
  loadAll(): Promise<MoldaAsset[]>
  /** UMA criação pelo id (`null` = não existe/ilegível). A nuvem do host relê o disco na hora de subir. */
  load(id: string): Promise<MoldaAsset | null>
  save(asset: MoldaAsset): Promise<void>
  /** Atômico: ou grava todos, ou nenhum. */
  saveMany(assets: readonly MoldaAsset[]): Promise<void>
  remove(id: string): Promise<void>
  removeMany(ids: readonly string[]): Promise<void>
  /** Opcional: avisos de mudança externa (outra aba, nuvem). */
  subscribe?(listener: (event: MoldaPersistenceEvent) => void): () => void
  /** Libera canais mantidos pela instância. Pode ser chamado mais de uma vez. */
  dispose?(): void
}

export class MoldaStorageBudgetError extends Error {
  readonly code = 'storage-budget' as const
  constructor(message = 'A galeria do Molda chegou ao limite de espaço.') {
    super(message)
    this.name = 'MoldaStorageBudgetError'
  }
}

export function isStorageBudgetError(error: unknown): error is MoldaStorageBudgetError {
  return error instanceof MoldaStorageBudgetError
}

const DB_PREFIX = 'sistema-zero-molda'
const STORE_NAME = 'assets'
const KEY_PREFIX = 'molda:asset:'

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

// ── Fila de escrita por banco ───────────────────────────────────────────────

const writeQueues = new Map<string, Promise<unknown>>()

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

function safeSanitize(raw: unknown): MoldaAsset | null {
  try {
    return sanitizeMoldaAsset(raw)
  } catch {
    return null
  }
}

function keyFor(id: string): string {
  return `${KEY_PREFIX}${id}`
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

  const inventory = new Map<string, number>()
  let inventoryLoaded = false
  let totalBytes = 0

  function invalidateInventory(): void {
    inventoryLoaded = false
  }

  async function readAll(): Promise<MoldaAsset[]> {
    const allKeys = (await keys(store)).filter(
      (key): key is string => typeof key === 'string' && key.startsWith(KEY_PREFIX),
    )
    const values = allKeys.length > 0 ? await getMany(allKeys, store) : []
    inventory.clear()
    totalBytes = 0
    const assets: MoldaAsset[] = []
    for (const raw of values) {
      const asset = safeSanitize(raw)
      if (!asset) continue
      const bytes = assetBytes(asset)
      inventory.set(asset.id, bytes)
      totalBytes += bytes
      assets.push(asset)
    }
    inventoryLoaded = true
    return assets
  }

  async function ensureInventory(): Promise<void> {
    if (!inventoryLoaded) await readAll()
  }

  function assertBudget(incoming: ReadonlyArray<{ id: string; bytes: number }>): void {
    let projected = totalBytes
    for (const item of incoming) {
      projected -= inventory.get(item.id) ?? 0
      projected += item.bytes
    }
    if (projected > maxBytes) throw new MoldaStorageBudgetError()
  }

  function account(id: string, bytes: number | null): void {
    totalBytes -= inventory.get(id) ?? 0
    if (bytes === null) inventory.delete(id)
    else {
      inventory.set(id, bytes)
      totalBytes += bytes
    }
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

    async load(id) {
      const raw = await get(keyFor(id), store)
      return raw === undefined ? null : safeSanitize(raw)
    },

    save(asset) {
      return runSerializedWrite(dbName, async () => {
        await ensureInventory()
        const bytes = assetBytes(asset)
        assertBudget([{ id: asset.id, bytes }])
        await set(keyFor(asset.id), asset, store)
        account(asset.id, bytes)
        broadcast([asset.id])
      })
    },

    saveMany(assets) {
      return runSerializedWrite(dbName, async () => {
        if (assets.length === 0) return
        await ensureInventory()
        // O IndexedDB é chaveado por id e `setMany` preserva a última entrada
        // repetida. Consolide o lote com a mesma semântica ANTES do orçamento,
        // da gravação, do inventário e do aviso cross-tab.
        const byId = new Map<string, MoldaAsset>()
        for (const asset of assets) byId.set(asset.id, asset)
        const batch = [...byId.values()]
        const measured = batch.map((asset) => ({ id: asset.id, bytes: assetBytes(asset) }))
        assertBudget(measured)
        await setMany(
          batch.map((asset) => [keyFor(asset.id), asset] as [string, MoldaAsset]),
          store,
        )
        for (const item of measured) account(item.id, item.bytes)
        broadcast(measured.map((item) => item.id))
      })
    },

    remove(id) {
      return runSerializedWrite(dbName, async () => {
        await del(keyFor(id), store)
        account(id, null)
        broadcast([id])
      })
    },

    removeMany(ids) {
      return runSerializedWrite(dbName, async () => {
        if (ids.length === 0) return
        await delMany(
          ids.map((id) => keyFor(id)),
          store,
        )
        for (const id of ids) account(id, null)
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
        invalidateInventory()
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
 * quem grava (editor) enxergam o mesmo inventário de bytes.
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
}
