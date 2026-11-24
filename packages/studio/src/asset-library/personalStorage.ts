import { createStore } from 'idb-keyval'
import { conditionalGeneration, conditionalWrite, type IdbWrite } from '../state/idbTransaction'

export const PERSONAL_ASSET_LIMITS = {
  maxCount: 128,
  /** Total including original image strings and the existing map metadata. */
  maxTotalChars: 40_000_000,
  maxNameChars: 48,
} as const

export const ASSET_KEY_PREFIX = 'asset:'
export const REGIONAL_KEY_PREFIX = 'region-map:'
export const assetKey = (id: string) => ASSET_KEY_PREFIX + id
export const regionalKey = (id: string) => REGIONAL_KEY_PREFIX + id

export type PersonalStorageInventory = {
  legacy: ReadonlyMap<string, unknown>
  regional: ReadonlyMap<string, unknown>
}

export function withPersonalAssetUpdate<T>(
  namespace: string,
  decide: (inventory: PersonalStorageInventory) => { write: IdbWrite; result: T },
): Promise<T> {
  const identity = personalAssetsDatabaseName(namespace.trim())
  return conditionalWrite(
    getStoreHandle(namespace),
    identity,
    conditionalGeneration(identity),
    (keys) =>
      keys.filter(
        (key): key is string =>
          typeof key === 'string' &&
          (key.startsWith(ASSET_KEY_PREFIX) || key.startsWith(REGIONAL_KEY_PREFIX)),
      ),
    (values, keys) => {
      const legacy = new Map<string, unknown>()
      const regional = new Map<string, unknown>()
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i] as string
        if (key.startsWith(ASSET_KEY_PREFIX))
          legacy.set(key.slice(ASSET_KEY_PREFIX.length), values[i])
        else regional.set(key.slice(REGIONAL_KEY_PREFIX.length), values[i])
      }
      return decide({ legacy, regional })
    },
  )
}

export function regionalQuota(
  regional: ReadonlyMap<string, unknown>,
  replaced?: string,
): { count: number; chars: number; names: string[] } | null {
  const quota = { count: 0, chars: 0, names: [] as string[] }
  for (const [id, entry] of regional) {
    if (id === replaced) continue
    if (
      !entry ||
      typeof entry !== 'object' ||
      !('dataUrl' in entry) ||
      typeof entry.dataUrl !== 'string'
    )
      return null // A future envelope whose size is unknown cannot justify another allocation.
    quota.count += 1
    quota.chars += entry.dataUrl.length
    if ('name' in entry && typeof entry.name === 'string') quota.names.push(entry.name)
  }
  return quota
}

export function personalAssetChars(asset: {
  dataUrl: string
  scene?: unknown
  tilemap?: unknown
  tilemapFront?: unknown
}): number {
  return (
    asset.dataUrl.length +
    JSON.stringify([asset.scene ?? null, asset.tilemap ?? null, asset.tilemapFront ?? null]).length
  )
}

let storageNamespace = ''
let store: ReturnType<typeof createStore> | null = null

/**
 * Namespace por PERFIL (mesmo contrato do `setStorageNamespace` de projetos).
 * Vazio = store default. Chamado pelo wrapper `setStudioStorageNamespace` e
 * pelo host do Pinta antes de salvar.
 */
export function setPersonalAssetsNamespace(namespace: string): void {
  const next = namespace.trim()
  if (next === storageNamespace) return
  storageNamespace = next
  store = null
}

/** Namespace atual — o AssetsPanel só mostra "Meus desenhos" quando ≠ ''. */
export function getPersonalAssetsNamespace(): string {
  return storageNamespace
}

function personalAssetsDatabaseName(namespace: string): string {
  return namespace ? `sistema-zero-personal-assets-${namespace}` : 'sistema-zero-personal-assets'
}

// Um handle por namespace explícito (a nuvem chama por item; cada `createStore` novo abre
// uma conexão própria com o IndexedDB no 1º uso).
const storesByNamespace = new Map<string, ReturnType<typeof createStore>>()
export function getStoreHandle(namespace?: string) {
  if (namespace !== undefined) {
    const key = namespace.trim()
    let handle = storesByNamespace.get(key)
    if (!handle) {
      handle = createStore(personalAssetsDatabaseName(key), 'kv')
      storesByNamespace.set(key, handle)
    }
    return handle
  }
  if (!store) {
    store = createStore(personalAssetsDatabaseName(storageNamespace), 'kv')
  }
  return store
}

/**
 * Marcador de "algum desenho mudou", em `localStorage` — o sinal que atravessa
 * ABAS (a criança edita no Pinta numa aba e o jogo está aberto noutra).
 *
 * Por que aqui: `savePersonalAsset` é o funil ÚNICO de escrita da biblioteca,
 * então o "Usar no Estúdio" e a reemissão automática do Pinta bumpam o marcador
 * de graça — nenhum host precisa saber que ele existe.
 *
 * Por que `localStorage` e não `BroadcastChannel`: o valor precisa SOBREVIVER à
 * aba fechada (editar hoje, abrir o Estúdio amanhã) e ser lido de forma
 * SÍNCRONA sob demanda. É a mesma escolha (e o mesmo motivo) do
 * `blockly/blockClipboard.ts`. O Estúdio lê no foco e acompanha commits de outras abas.
 *
 * A chave leva o NAMESPACE porque a biblioteca é por PERFIL: o desenho de um
 * irmão não pode disparar a sincronia dos projetos do outro.
 */
const CHANGED_KEY_PREFIX = 'sz:desenhos-alterados:'
const changedKey = (namespace = storageNamespace) => `${CHANGED_KEY_PREFIX}${namespace}`

/** `localStorage` pode não existir (SSR) ou lançar (Safari privado, cota). */
function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Carimba "a biblioteca deste perfil mudou agora". Best-effort. */
export function markPersonalAssetsChanged(namespace?: string): void {
  try {
    safeLocalStorage()?.setItem(
      changedKey(namespace),
      JSON.stringify({ at: Date.now(), changeId: crypto.randomUUID() }),
    )
  } catch {
    // Only the notification is removed; the committed library stays intact.
    // A missing marker makes the next sweep conservative instead of looking unchanged.
    try {
      safeLocalStorage()?.removeItem(changedKey(namespace))
    } catch {}
  }
}

/**
 * Quando a biblioteca deste perfil mudou pela última vez (0 = nunca/indisponível).
 * Carimbo legado para consumidores de datas. A sincronia compara o token completo,
 * pois duas gravações podem acontecer no mesmo milissegundo.
 */
export function personalAssetsChangedAt(namespace?: string): number {
  try {
    const raw = safeLocalStorage()?.getItem(changedKey(namespace))
    if (!raw) return 0
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return 0
    const at = (parsed as { at?: unknown }).at
    return typeof at === 'number' && Number.isFinite(at) ? at : 0
  } catch {
    return 0
  }
}

/** Opaque change identity; legacy `{at}` markers remain readable. */
export function personalAssetsChangeToken(namespace?: string): string {
  try {
    const raw = safeLocalStorage()?.getItem(changedKey(namespace))
    if (!raw) return ''
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || !('at' in value)) return ''
    return typeof value.at === 'number' && Number.isFinite(value.at) ? raw : ''
  } catch {
    return ''
  }
}

/** Notify only after another tab commits this profile's personal library. */
export function subscribePersonalAssetsChanged(
  onChange: () => void,
  namespace = storageNamespace,
): () => void {
  const storage = safeLocalStorage()
  if (!storage || typeof window === 'undefined') return () => {}
  const key = changedKey(namespace)
  const onStorage = (event: StorageEvent): void => {
    if (event.storageArea === storage && event.key === key) onChange()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
