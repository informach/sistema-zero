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
import { createStore, del, get, getMany, keys, set } from 'idb-keyval'
import { type PintaAsset, sanitizePintaAsset } from '../core/project'

const ASSET_KEY_PREFIX = 'pinta:asset:'
const assetKey = (id: string) => `${ASSET_KEY_PREFIX}${id}`

let storageNamespace = ''
let store: ReturnType<typeof createStore> | null = null

/**
 * Define o namespace do armazenamento local. Idempotente; invalida o store em
 * cache para recriar com o DB do namespace (um write em voo já capturou o
 * store antigo — mesmo trade-off aceito no studio).
 */
export function setPintaStorageNamespace(namespace: string): void {
  const next = namespace.trim()
  if (next === storageNamespace) return
  storageNamespace = next
  store = null
}

function getStoreHandle() {
  if (!store) {
    store = createStore(
      storageNamespace ? `sistema-zero-pinta-${storageNamespace}` : 'sistema-zero-pinta',
      'kv',
    )
  }
  return store
}

// Cadeia de ESCRITA por id de asset (FIFO, clone do studio): autosave, rename
// e delete do MESMO asset não intercalam. A cadeia guardada nunca rejeita (a
// limpeza roda nos dois ramos), mas o resultado devolvido ao chamador propaga
// a falha — o autosave precisa marcar o badge de erro.
const writeChains = new Map<string, Promise<void>>()

export function runSerializedWrite(id: string, task: () => Promise<void>): Promise<void> {
  const prev = writeChains.get(id)
  const next = prev ? prev.then(task, task) : task()
  const settled = next.then(
    () => {
      if (writeChains.get(id) === settled) writeChains.delete(id)
    },
    () => {
      if (writeChains.get(id) === settled) writeChains.delete(id)
    },
  )
  writeChains.set(id, settled)
  return next
}

export async function persistAsset(asset: PintaAsset): Promise<void> {
  await runSerializedWrite(asset.id, () => set(assetKey(asset.id), asset, getStoreHandle()))
}

export async function deleteAsset(id: string): Promise<void> {
  await runSerializedWrite(id, () => del(assetKey(id), getStoreHandle()))
}

export async function loadAssetById(id: string): Promise<PintaAsset | null> {
  const raw = await get<unknown>(assetKey(id), getStoreHandle())
  return sanitizePintaAsset(raw)
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
    .map((value) => sanitizePintaAsset(value))
    .filter((asset): asset is PintaAsset => asset !== null)
  assets.sort((a, b) => b.updatedAt - a.updatedAt)
  return assets
}
