import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
/**
 * Biblioteca PESSOAL de imagens ("Meus desenhos") — a ponte Pinta → Estúdio.
 * O Studio é o DONO do formato/limites/normalização; o Pinta só conhece o
 * callback `sendToStudio` do host, e o host (community-kids) liga os dois via
 * o subpath `@sistemazero/studio/personal-assets` (zero import pinta↔studio).
 *
 * Armazenamento: IndexedDB próprio (`sistema-zero-personal-assets-<ns>`, um DB
 * por PERFIL — o wrapper `setStudioStorageNamespace` seta este namespace junto
 * com o da persistência de projetos, então nenhum host muda). Registros
 * `asset:<id>` com upsert por id: reenviar o MESMO desenho do Pinta atualiza
 * em vez de duplicar.
 *
 * Todas as operações são FAIL-SOFT (`{ok:false}`/array vazio/no-op) — quota de
 * IndexedDB cheia ou ambiente sem IDB nunca derruba o editor.
 */
import { createStore, del, get, getMany, keys, set } from 'idb-keyval'
import {
  isValidAssetDataUrl,
  normalizeAssetName,
  type ProjectSpriteMeta,
  type ProjectTilemapMeta,
  type ProjectTilesetMeta,
  sanitizeSpriteMeta,
  sanitizeTilemapMeta,
  sanitizeTilesetMeta,
} from '#core'
import { sanitizeSceneMeta } from '../core/projectAssets'
import { writeInOneTransaction } from '../state/idbTransaction'

const ASSET_KEY_PREFIX = 'asset:'
const assetKey = (id: string) => `${ASSET_KEY_PREFIX}${id}`

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
function markPersonalAssetsChanged(namespace?: string): void {
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

export const PERSONAL_ASSET_LIMITS = {
  maxCount: 128,
  /**
   * Orçamento total de `dataUrl` (~28 MB de binário inflado em base64). Subiu de 24 M
   * em 09/2026, quando os binários 3D do Molda (modelo .glb até ~5 MB, céu .hdr)
   * passaram a morar aqui ao lado dos desenhos.
   */
  maxTotalChars: 40_000_000,
  maxNameChars: 48,
} as const

/** O tipo de um item da biblioteca pessoal (imagem do Pinta; modelo/céu do Molda). */
export type PersonalAssetKind = 'image' | 'model3d' | 'environment3d'

/**
 * Um item na biblioteca pessoal. Compatível com o `ProjectAsset` do projeto
 * (mesmo shape) — "Adicionar ao projeto" só copia os campos. Nasceu para os
 * DESENHOS do Pinta; desde 09/2026 guarda também os binários 3D trazidos do Molda
 * (`model3d` = `.glb`, `environment3d` = `.hdr`). Registro legado sem `kind` = imagem.
 */
export interface PersonalAsset {
  /** Id do desenho na ORIGEM (Pinta/Molda) — chave do upsert. */
  id: string
  /** Nome kebab-case (o mesmo `normalizeAssetName` dos assets de projeto). */
  name: string
  kind: PersonalAssetKind
  /**
   * De onde veio: `pinta` (default, e o legado sem o campo) ou `molda`. Uma textura do
   * Molda é uma IMAGEM comum aqui, mas NÃO é um desenho do Pinta: sem o campo o painel
   * ofereceria "✏️ editar desenho" e abriria o Pinta num id que não é dele.
   */
  origin?: 'pinta' | 'molda'
  /** `data:image/...;base64,...` (imagem) ou o MIME do binário 3D (ver `isValidAssetDataUrl`). */
  dataUrl: string
  /** Só nos 3D: `<nome>.glb` / `.hdr` — a validação cruza extensão × MIME × assinatura. */
  originalFileName?: string
  width?: number
  height?: number
  /** Metadados do Pinta (animações da folha) — viajam até o `ProjectAsset` no projeto. */
  sprite?: ProjectSpriteMeta
  /** Metadados do Pinta (tiles sólidos do tileset). */
  tileset?: ProjectTilesetMeta
  /** Metadados do Pinta (MAPA de tiles: grade + folha embutida). */
  tilemapFront?: ProjectTilemapMeta
  scene?: PintaScene
  tilemap?: ProjectTilemapMeta
  updatedAt: number
}

export interface SavePersonalAssetResult {
  ok: boolean
  /** Nome final salvo (pode ganhar sufixo em colisão com OUTRO desenho). */
  name?: string
  /** Revisão monotônica efetivamente persistida. */
  updatedAt?: number
  error?: string
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
function getStoreHandle(namespace?: string) {
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

function sanitizePersonalAsset(raw: unknown): PersonalAsset | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (typeof a.id !== 'string' || !a.id || a.id.includes(':')) return null
  const name = typeof a.name === 'string' ? normalizeAssetName(a.name) : null
  if (!name) return null
  const kind = personalAssetKindOf(a.kind)
  const fileName =
    typeof a.originalFileName === 'string' ? a.originalFileName.slice(0, 128) : undefined
  // Binário 3D valida pelo MESMO portão do projeto (MIME × extensão × assinatura);
  // a imagem, pelo de sempre.
  if (kind === 'image') {
    if (!isValidAssetDataUrl(a.dataUrl)) return null
  } else if (!isValidAssetDataUrl(a.dataUrl, kind, fileName)) {
    return null
  }
  const updatedAt =
    typeof a.updatedAt === 'number' && Number.isFinite(a.updatedAt) ? a.updatedAt : 0
  const origin = a.origin === 'molda' ? { origin: 'molda' as const } : {}
  if (kind !== 'image') {
    return {
      id: a.id,
      name,
      kind,
      ...origin,
      dataUrl: a.dataUrl,
      ...(fileName ? { originalFileName: fileName } : {}),
      updatedAt,
    }
  }
  const sprite = sanitizeSpriteMeta(a.sprite)
  const tileset = sanitizeTilesetMeta(a.tileset)
  const tilemap = sanitizeTilemapMeta(a.tilemap)
  const tilemapFront = sanitizeTilemapMeta(a.tilemapFront),
    scene = sanitizeSceneMeta(a.scene)
  return {
    id: a.id,
    name,
    kind: 'image',
    ...origin,
    dataUrl: a.dataUrl,
    width: typeof a.width === 'number' ? a.width : undefined,
    height: typeof a.height === 'number' ? a.height : undefined,
    ...(sprite ? { sprite } : {}),
    ...(tileset ? { tileset } : {}),
    ...(tilemap ? { tilemap } : {}),
    ...(tilemapFront ? { tilemapFront } : {}),
    ...(scene ? { scene } : {}),
    updatedAt,
  }
}

/** Registro legado (sem `kind`) e valor desconhecido caem em imagem. */
function personalAssetKindOf(value: unknown): PersonalAssetKind {
  return value === 'model3d' || value === 'environment3d' ? value : 'image'
}

/** Todos os desenhos do perfil, saneados e do mais recente para o mais antigo. */
export async function listPersonalAssets(options?: {
  namespace?: string
}): Promise<PersonalAsset[]> {
  const result = await readPersonalAssetInventory(options)
  return result.ok ? result.assets : []
}

/** Reconciliation cannot mistake a failed catalog read for an empty world. */
export async function readPersonalAssetInventory(options?: {
  namespace?: string
}): Promise<{ ok: true; assets: PersonalAsset[] } | { ok: false; error: string }> {
  try {
    return { ok: true, assets: await readPersonalAssets(getStoreHandle(options?.namespace)) }
  } catch {
    return { ok: false, error: 'Não consegui conferir os mapas guardados. O jogo foi mantido.' }
  }
}

/** Writers must distinguish an unreadable inventory from an empty library. */
async function readPersonalAssets(
  kvStore: ReturnType<typeof createStore>,
): Promise<PersonalAsset[]> {
  const allKeys = await keys(kvStore)
  const assetKeys = allKeys.filter(
    (key): key is string => typeof key === 'string' && key.startsWith(ASSET_KEY_PREFIX),
  )
  if (assetKeys.length === 0) return []
  const values = await getMany<unknown>(assetKeys, kvStore)
  const assets = values
    .map((value) => sanitizePersonalAsset(value))
    .filter((asset): asset is PersonalAsset => asset !== null)
  assets.sort((a, b) => b.updatedAt - a.updatedAt)
  return assets
}

/**
 * Salva (upsert por id) um desenho vindo do Pinta. Valida dataUrl/nome, aplica
 * dedup de nome por sufixo (`heroi` → `heroi-2`) contra OUTROS ids e respeita
 * os tetos de contagem/orçamento. Nunca lança.
 */
export interface PersonalAssetInput {
  id: string
  name: string
  dataUrl: string
  /** `'image'` (padrão, o Pinta), `'model3d'` (.glb) ou `'environment3d'` (.hdr) — o Molda. */
  kind?: PersonalAssetKind
  /** `'molda'` marca a criação do Molda (a textura não vira "desenho para editar no Pinta"). */
  origin?: 'pinta' | 'molda'
  /** OBRIGATÓRIO nos 3D (a validação cruza a extensão com o MIME e a assinatura). */
  originalFileName?: string
  width?: number
  height?: number
  /** Metadados do Pinta (animações/tiles/mapa) — saneados aqui e guardados no registro. */
  sprite?: unknown
  tileset?: unknown
  tilemapFront?: unknown
  scene?: unknown
  tilemap?: unknown
  /** Usado por restauros da nuvem para preservar a revisão autoritativa da origem. */
  updatedAt?: number
}

type PreparedPersonalAsset = { ok: true; record: PersonalAsset } | { ok: false; error: string }

function preparePersonalAsset(
  input: PersonalAssetInput,
  existing: readonly PersonalAsset[],
  now: number,
): PreparedPersonalAsset {
  if (!input.id || input.id.includes(':')) {
    return { ok: false, error: 'Esse desenho veio com uma identificação inválida.' }
  }
  const kind = personalAssetKindOf(input.kind)
  if (kind === 'image') {
    if (!isValidAssetDataUrl(input.dataUrl)) {
      return { ok: false, error: 'Essa imagem é grande demais para a biblioteca.' }
    }
  } else if (!isValidAssetDataUrl(input.dataUrl, kind, input.originalFileName)) {
    return {
      ok: false,
      error: 'Esse arquivo 3D não é válido ou é grande demais para a biblioteca.',
    }
  }
  const baseName = normalizeAssetName(input.name)
  if (!baseName) {
    return { ok: false, error: 'Esse nome não vai funcionar aqui.' }
  }

  const previous = existing.find((a) => a.id === input.id)
  const others = existing.filter((a) => a.id !== input.id)

  if (!previous && others.length >= PERSONAL_ASSET_LIMITS.maxCount) {
    return { ok: false, error: 'A sua biblioteca está cheia! Apague um desenho antigo.' }
  }
  const chars = (a: {
    dataUrl: string
    scene?: unknown
    tilemap?: unknown
    tilemapFront?: unknown
  }) =>
    a.dataUrl.length +
    JSON.stringify([a.scene ?? null, a.tilemap ?? null, a.tilemapFront ?? null]).length
  const othersChars = others.reduce((sum, a) => sum + chars(a), 0)
  if (othersChars + chars(input) > PERSONAL_ASSET_LIMITS.maxTotalChars) {
    return { ok: false, error: 'A sua biblioteca está sem espaço! Apague um desenho antigo.' }
  }

  // Dedup de nome contra OUTROS desenhos (reenviar o mesmo id mantém o nome).
  const taken = new Set(others.map((a) => a.name))
  let name = baseName
  for (let n = 2; taken.has(name); n += 1) {
    name = `${baseName}-${n}`
    if (name.length > PERSONAL_ASSET_LIMITS.maxNameChars) {
      return { ok: false, error: 'Esse nome ficou comprido demais.' }
    }
  }

  // Metadado do Pinta é saneado pelo MESMO portão do projeto (o Studio é dono do
  // formato); inválido é descartado sem derrubar o salvamento (fail-soft).
  const sprite = sanitizeSpriteMeta(input.sprite)
  const tileset = sanitizeTilesetMeta(input.tileset)
  const tilemap = sanitizeTilemapMeta(input.tilemap)
  const tilemapFront = sanitizeTilemapMeta(input.tilemapFront),
    scene = sanitizeSceneMeta(input.scene)
  if (input.scene && !scene)
    return {
      ok: false,
      error: 'Este cenário passou do limite do Estúdio ou tem dados inválidos.',
    }
  const requestedRevision =
    typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt) && input.updatedAt > 0
      ? Math.round(input.updatedAt)
      : now
  const updatedAt = Math.max(requestedRevision, (previous?.updatedAt ?? 0) + 1)
  const origin = input.origin === 'molda' ? { origin: 'molda' as const } : {}
  const record: PersonalAsset =
    kind === 'image'
      ? {
          id: input.id,
          name,
          kind: 'image',
          ...origin,
          dataUrl: input.dataUrl,
          width: input.width,
          height: input.height,
          ...(sprite ? { sprite } : {}),
          ...(tileset ? { tileset } : {}),
          ...(tilemap ? { tilemap } : {}),
          ...(tilemapFront ? { tilemapFront } : {}),
          ...(scene ? { scene } : {}),
          updatedAt,
        }
      : {
          id: input.id,
          name,
          kind,
          ...origin,
          dataUrl: input.dataUrl,
          // O nome já passou na validação acima (só chega aqui com extensão certa).
          originalFileName: (input.originalFileName ?? '').slice(0, 128),
          updatedAt,
        }
  return { ok: true, record }
}

export async function savePersonalAsset(
  input: PersonalAssetInput,
  options?: { namespace?: string },
): Promise<SavePersonalAssetResult> {
  // Capture the account before the first asynchronous read.
  const namespace = options?.namespace ?? storageNamespace
  try {
    const kvStore = getStoreHandle(namespace)
    const prepared = preparePersonalAsset(input, await readPersonalAssets(kvStore), Date.now())
    if (!prepared.ok) return prepared
    const { record } = prepared
    await set(assetKey(record.id), record, kvStore)
    markPersonalAssetsChanged(namespace)
    return { ok: true, name: record.name, updatedAt: record.updatedAt }
  } catch {
    return { ok: false, error: 'Não consegui salvar agora. Tente de novo daqui a pouco.' }
  }
}

export type SavePersonalAssetBundleResult =
  | { ok: true; assets: PersonalAsset[] }
  | { ok: false; error: string }

/** Preflight the entire world, then commit all records in one IDB transaction. */
export async function savePersonalAssetBundle(
  inputs: readonly PersonalAssetInput[],
  options?: { namespace?: string },
): Promise<SavePersonalAssetBundleResult> {
  const namespace = options?.namespace ?? storageNamespace
  if (
    inputs.length < 1 ||
    inputs.length > 16 ||
    new Set(inputs.map((a) => a.id)).size !== inputs.length
  )
    return { ok: false, error: 'Este conjunto de mapas é inválido ou grande demais.' }
  try {
    const kvStore = getStoreHandle(namespace)
    const previous = await readPersonalAssets(kvStore)
    const replaced = new Set(inputs.map((a) => a.id))
    let inventory = previous.filter((a) => !replaced.has(a.id))
    const assets: PersonalAsset[] = []
    const now = Date.now()
    for (const input of inputs) {
      const old = previous.find((a) => a.id === input.id)
      const prepared = preparePersonalAsset(input, old ? [...inventory, old] : inventory, now)
      if (!prepared.ok) return prepared
      assets.push(prepared.record)
      inventory = [...inventory.filter((a) => a.id !== input.id), prepared.record]
    }
    await writeInOneTransaction(kvStore, { puts: assets.map((a) => [assetKey(a.id), a]) })
    markPersonalAssetsChanged(namespace)
    return { ok: true, assets }
  } catch {
    return { ok: false, error: 'Não consegui salvar os mapas agora. Tente de novo daqui a pouco.' }
  }
}

export type RemovePersonalAssetResult = { ok: true } | { ok: false; error: string }

/**
 * Remove um desenho da biblioteca sem esconder falhas de persistência. O namespace
 * explícito espelha o de `getPersonalAsset`: quem capturou o perfil no render (o
 * painel) apaga daquele perfil, mesmo que o singleton tenha trocado no meio.
 */
export async function removePersonalAsset(
  id: string,
  options?: { namespace?: string },
): Promise<RemovePersonalAssetResult> {
  const namespace = options?.namespace ?? storageNamespace
  try {
    await del(assetKey(id), getStoreHandle(namespace))
    markPersonalAssetsChanged(namespace)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Não consegui excluir agora. Tente de novo daqui a pouco.' }
  }
}

/** Leitura pontual (testes/depuração). */
/**
 * Vários desenhos de uma vez (uma transação `getMany`): quem precisa de N desenhos — o
 * restauro da nuvem reconciliando os de um jogo — não paga N idas ao IndexedDB. Ids
 * ausentes viram `null`. Nunca lança.
 */
export async function getPersonalAssets(
  ids: readonly string[],
  options?: { namespace?: string },
): Promise<Map<string, PersonalAsset | null>> {
  const result = new Map<string, PersonalAsset | null>()
  const unique = [...new Set(ids)]
  if (unique.length === 0) return result
  try {
    const values = await getMany<unknown>(
      unique.map((id) => assetKey(id)),
      getStoreHandle(options?.namespace),
    )
    unique.forEach((id, index) => {
      result.set(id, sanitizePersonalAsset(values[index]))
    })
  } catch {
    for (const id of unique) result.set(id, null)
  }
  return result
}

export async function getPersonalAsset(
  id: string,
  options?: { namespace?: string },
): Promise<PersonalAsset | null> {
  try {
    const raw = await get<unknown>(assetKey(id), getStoreHandle(options?.namespace))
    return sanitizePersonalAsset(raw)
  } catch {
    return null
  }
}
