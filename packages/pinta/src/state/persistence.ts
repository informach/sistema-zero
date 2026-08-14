/**
 * Persistência LOCAL (IndexedDB via idb-keyval) — cada asset é um registro
 * independente (`pinta:asset:<id>`); não há documento de projeto. `Uint8Array`
 * passa no structured clone, então o modelo é gravado DIRETO (sem codec — o
 * RLE só existe no `.pinta.json` de export).
 *
 * Namespace por PERFIL: o host chama `setPintaStorageNamespace(viewerId)`
 * ANTES de montar o <PintaApp> (mesmo contrato do studio) — um DB por criança,
 * para irmãos no mesmo navegador não compartilharem a galeria. Vazio = store
 * default `sistema-zero-pinta`.
 */
import { createStore, del, get, getMany, keys, setMany } from 'idb-keyval'
import { type PintaAsset, sanitizePintaAsset } from '../core/project'
import { GalleryBackupSizeCache, MAX_BACKUP_FILE_BYTES } from '../export/projectJson'

const ASSET_KEY_PREFIX = 'pinta:asset:'
const assetKey = (id: string) => `${ASSET_KEY_PREFIX}${id}`

let storageNamespace = ''
type StoreHandle = ReturnType<typeof createStore>
const stores = new Map<string, StoreHandle>()

/**
 * Define o namespace do armazenamento local. Cada operação captura o store do
 * perfil no instante da chamada; trocar de perfil não redireciona operações já
 * enfileiradas.
 */
export function setPintaStorageNamespace(namespace: string): void {
  const next = namespace.trim()
  if (next === storageNamespace) return
  storageNamespace = next
}

/** Namespace normalizado que será capturado pela próxima operação. */
export function getPintaStorageNamespace(): string {
  return storageNamespace
}

function getStoreHandle(): StoreHandle {
  const namespace = storageNamespace
  const cached = stores.get(namespace)
  if (cached) return cached
  const created = createStore(
    namespace ? `sistema-zero-pinta-${namespace}` : 'sistema-zero-pinta',
    'kv',
  )
  stores.set(namespace, created)
  return created
}

// Uma cadeia FIFO por BANCO. Além de impedir interleaving entre save/rename/
// delete, permite gravar asset + mapas ligados numa única transação setMany.
const writeChains = new WeakMap<StoreHandle, Promise<void>>()
const backupSizeCaches = new WeakMap<StoreHandle, GalleryBackupSizeCache>()

function backupSizeCacheFor(storeHandle: StoreHandle): GalleryBackupSizeCache {
  const cached = backupSizeCaches.get(storeHandle)
  if (cached) return cached
  const created = new GalleryBackupSizeCache()
  backupSizeCaches.set(storeHandle, created)
  return created
}

export function runSerializedWrite(
  storeHandle: StoreHandle,
  task: () => Promise<void>,
): Promise<void> {
  const prev = writeChains.get(storeHandle)
  const next = prev ? prev.then(task, task) : task()
  const settled = next.then(
    () => {
      if (writeChains.get(storeHandle) === settled) writeChains.delete(storeHandle)
    },
    () => {
      if (writeChains.get(storeHandle) === settled) writeChains.delete(storeHandle)
    },
  )
  writeChains.set(storeHandle, settled)
  return next
}

export interface PintaPersistence {
  persistAsset(asset: PintaAsset): Promise<void>
  persistAssets(assets: readonly PintaAsset[]): Promise<void>
  deleteAsset(id: string): Promise<void>
  loadAssetById(id: string): Promise<PintaAsset | null>
  listAllAssets(): Promise<PintaAsset[]>
}

/**
 * `sanitizePintaAsset` NÃO deve lançar (descarta com `null`), mas o LOAD blinda
 * por registro mesmo assim: uma regressão futura que faça o sanitize lançar num
 * ÚNICO registro corrompido NÃO pode derrubar a galeria inteira (paridade com o
 * caminho de import `.pinta.json`, que já é try/catch por registro).
 */
function safeSanitize(raw: unknown): PintaAsset | null {
  try {
    return sanitizePintaAsset(raw)
  } catch {
    return null
  }
}

async function listAssetsForStore(storeHandle: StoreHandle): Promise<PintaAsset[]> {
  const allKeys = await keys(storeHandle)
  const assetKeys = allKeys.filter(
    (key): key is string => typeof key === 'string' && key.startsWith(ASSET_KEY_PREFIX),
  )
  if (assetKeys.length === 0) return []
  const values = await getMany<unknown>(assetKeys, storeHandle)
  return values
    .map((value) => safeSanitize(value))
    .filter((asset): asset is PintaAsset => asset !== null)
}

/** Erro específico para a UI explicar por que a mutação não foi persistida. */
export class PintaStorageBudgetError extends Error {
  readonly projectedBytes: number

  constructor(projectedBytes: number) {
    super('A galeria ultrapassaria o limite portátil de 32 MiB.')
    this.name = 'PintaStorageBudgetError'
    this.projectedBytes = projectedBytes
  }
}

export function isPintaStorageBudgetError(error: unknown): error is PintaStorageBudgetError {
  return error instanceof PintaStorageBudgetError
}

/**
 * Cliente ligado ao banco do perfil ATUAL neste instante. Stores com fila
 * própria guardam este objeto, então uma troca global posterior não redireciona
 * mutações que ainda aguardam sua vez.
 */
export function createPintaPersistence(): PintaPersistence {
  const storeHandle = getStoreHandle()
  const backupSizeCache = backupSizeCacheFor(storeHandle)
  const persistAssetsForStore = async (assets: readonly PintaAsset[]): Promise<void> => {
    if (assets.length === 0) return
    const unique = new Map(assets.map((asset) => [asset.id, asset]))
    const pairs = [...unique.values()].map(
      (asset) => [assetKey(asset.id), asset] as [IDBValidKey, PintaAsset],
    )
    await runSerializedWrite(storeHandle, async () => {
      const current = await listAssetsForStore(storeHandle)
      const projectedById = new Map(current.map((asset) => [asset.id, asset]))
      for (const asset of unique.values()) projectedById.set(asset.id, asset)
      const projected = [...projectedById.values()]
      const changedIds = new Set(unique.keys())
      // A primeira leitura aquece o legado; depois só percorre ids/timestamps.
      // A projeção força exclusivamente os assets desta mutação.
      const currentBytes = backupSizeCache.byteLength(current)
      const projectedBytes = backupSizeCache.byteLength(projected, changedIds)
      if (projectedBytes > MAX_BACKUP_FILE_BYTES) {
        // Legado acima do teto continua editável quando a mutação REDUZ o
        // backup. Em galeria saudável, qualquer projeção acima é recusada.
        if (projectedBytes >= currentBytes) {
          backupSizeCache.invalidate(changedIds)
          throw new PintaStorageBudgetError(projectedBytes)
        }
      }
      try {
        await setMany(pairs, storeHandle)
      } catch (error) {
        // O cache já descreve a projeção; uma transação recusada continua com
        // o estado anterior no disco, então a contribuição tocada é inválida.
        backupSizeCache.invalidate(changedIds)
        throw error
      }
    })
  }
  return {
    persistAsset: (asset) => persistAssetsForStore([asset]),
    persistAssets: persistAssetsForStore,
    deleteAsset: (id) =>
      runSerializedWrite(storeHandle, async () => {
        await del(assetKey(id), storeHandle)
        backupSizeCache.invalidate([id])
      }),
    async loadAssetById(id) {
      const raw = await get<unknown>(assetKey(id), storeHandle)
      return safeSanitize(raw)
    },
    async listAllAssets() {
      const assets = await listAssetsForStore(storeHandle)
      assets.sort((a, b) => b.updatedAt - a.updatedAt)
      return assets
    },
  }
}

export function persistAsset(asset: PintaAsset): Promise<void> {
  return createPintaPersistence().persistAsset(asset)
}

/** Grava um conjunto relacionado atomicamente no IndexedDB do perfil atual. */
export function persistAssets(assets: readonly PintaAsset[]): Promise<void> {
  return createPintaPersistence().persistAssets(assets)
}

export function deleteAsset(id: string): Promise<void> {
  return createPintaPersistence().deleteAsset(id)
}

export function loadAssetById(id: string): Promise<PintaAsset | null> {
  return createPintaPersistence().loadAssetById(id)
}

/** Carrega todos os assets saneados do perfil atual, do mais novo ao mais antigo. */
export function listAllAssets(): Promise<PintaAsset[]> {
  return createPintaPersistence().listAllAssets()
}
