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

export async function persistAsset(asset: PintaAsset): Promise<void> {
  await persistAssets([asset])
}

/** Grava um conjunto relacionado atomicamente no IndexedDB do perfil atual. */
export async function persistAssets(assets: readonly PintaAsset[]): Promise<void> {
  if (assets.length === 0) return
  const storeHandle = getStoreHandle()
  const unique = new Map(assets.map((asset) => [asset.id, asset]))
  const pairs = [...unique.values()].map(
    (asset) => [assetKey(asset.id), asset] as [IDBValidKey, PintaAsset],
  )
  await runSerializedWrite(storeHandle, () => setMany(pairs, storeHandle))
}

export async function deleteAsset(id: string): Promise<void> {
  const storeHandle = getStoreHandle()
  await runSerializedWrite(storeHandle, () => del(assetKey(id), storeHandle))
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

export async function loadAssetById(id: string): Promise<PintaAsset | null> {
  const raw = await get<unknown>(assetKey(id), getStoreHandle())
  return safeSanitize(raw)
}

/**
 * Carrega TODOS os assets do perfil, saneados (registros corrompidos/de outra
 * versão são descartados em silêncio) e ordenados por edição mais recente.
 */
export async function listAllAssets(): Promise<PintaAsset[]> {
  const kvStore = getStoreHandle()
  const allKeys = await keys(kvStore)
  const assetKeys = allKeys.filter(
    (key): key is string => typeof key === 'string' && key.startsWith(ASSET_KEY_PREFIX),
  )
  if (assetKeys.length === 0) return []
  const values = await getMany<unknown>(assetKeys, kvStore)
  const assets = values
    .map((value) => safeSanitize(value))
    .filter((asset): asset is PintaAsset => asset !== null)
  assets.sort((a, b) => b.updatedAt - a.updatedAt)
  return assets
}
