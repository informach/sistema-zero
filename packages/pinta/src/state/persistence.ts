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

/**
 * Cliente ligado ao banco do perfil ATUAL neste instante. Stores com fila
 * própria guardam este objeto, então uma troca global posterior não redireciona
 * mutações que ainda aguardam sua vez.
 */
export function createPintaPersistence(): PintaPersistence {
  const storeHandle = getStoreHandle()
  const persistAssetsForStore = async (assets: readonly PintaAsset[]): Promise<void> => {
    if (assets.length === 0) return
    const unique = new Map(assets.map((asset) => [asset.id, asset]))
    const pairs = [...unique.values()].map(
      (asset) => [assetKey(asset.id), asset] as [IDBValidKey, PintaAsset],
    )
    await runSerializedWrite(storeHandle, () => setMany(pairs, storeHandle))
  }
  return {
    persistAsset: (asset) => persistAssetsForStore([asset]),
    persistAssets: persistAssetsForStore,
    deleteAsset: (id) => runSerializedWrite(storeHandle, () => del(assetKey(id), storeHandle)),
    async loadAssetById(id) {
      const raw = await get<unknown>(assetKey(id), storeHandle)
      return safeSanitize(raw)
    },
    async listAllAssets() {
      const allKeys = await keys(storeHandle)
      const assetKeys = allKeys.filter(
        (key): key is string => typeof key === 'string' && key.startsWith(ASSET_KEY_PREFIX),
      )
      if (assetKeys.length === 0) return []
      const values = await getMany<unknown>(assetKeys, storeHandle)
      const assets = values
        .map((value) => safeSanitize(value))
        .filter((asset): asset is PintaAsset => asset !== null)
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
