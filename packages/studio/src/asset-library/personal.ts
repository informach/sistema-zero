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
 * `blockly/blockClipboard.ts`. Sem listener: quem sincroniza lê no foco.
 *
 * A chave leva o NAMESPACE porque a biblioteca é por PERFIL: o desenho de um
 * irmão não pode disparar a sincronia dos projetos do outro.
 */
const CHANGED_KEY_PREFIX = 'sz:desenhos-alterados:'
const changedKey = () => `${CHANGED_KEY_PREFIX}${storageNamespace}`

/** `localStorage` pode não existir (SSR) ou lançar (Safari privado, cota). */
function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Carimba "a biblioteca deste perfil mudou agora". Best-effort. */
function markPersonalAssetsChanged(): void {
  try {
    safeLocalStorage()?.setItem(changedKey(), JSON.stringify({ at: Date.now() }))
  } catch {
    // fail-soft: sem o carimbo a sincronia só perde a otimização (ela ainda roda
    // uma vez por aba, porque o relógio dela começa em 0).
  }
}

/**
 * Quando a biblioteca deste perfil mudou pela última vez (0 = nunca/indisponível).
 * É o portão barato da sincronia: igual ao já visto ⇒ nada a fazer, sem tocar
 * no IndexedDB.
 */
export function personalAssetsChangedAt(): number {
  try {
    const raw = safeLocalStorage()?.getItem(changedKey())
    if (!raw) return 0
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return 0
    const at = (parsed as { at?: unknown }).at
    return typeof at === 'number' && Number.isFinite(at) ? at : 0
  } catch {
    return 0
  }
}

export const PERSONAL_ASSET_LIMITS = {
  maxCount: 128,
  /** Orçamento total de `dataUrl` (~17 MB de binário inflado em base64). */
  maxTotalChars: 24_000_000,
  maxNameChars: 48,
} as const

/**
 * Um desenho na biblioteca pessoal. Compatível com o `ProjectAsset` do projeto
 * (mesmo shape de imagem) — "Adicionar ao projeto" só copia os campos.
 */
export interface PersonalAsset {
  /** Id do desenho na ORIGEM (Pinta) — chave do upsert. */
  id: string
  /** Nome kebab-case (o mesmo `normalizeAssetName` dos assets de projeto). */
  name: string
  kind: 'image'
  /** `data:image/...;base64,...` */
  dataUrl: string
  width?: number
  height?: number
  /** Metadados do Pinta (animações da folha) — viajam até o `ProjectAsset` no projeto. */
  sprite?: ProjectSpriteMeta
  /** Metadados do Pinta (tiles sólidos do tileset). */
  tileset?: ProjectTilesetMeta
  /** Metadados do Pinta (MAPA de tiles: grade + folha embutida). */
  tilemap?: ProjectTilemapMeta
  updatedAt: number
}

export interface SavePersonalAssetResult {
  ok: boolean
  /** Nome final salvo (pode ganhar sufixo em colisão com OUTRO desenho). */
  name?: string
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

function getStoreHandle() {
  if (!store) {
    store = createStore(
      storageNamespace
        ? `sistema-zero-personal-assets-${storageNamespace}`
        : 'sistema-zero-personal-assets',
      'kv',
    )
  }
  return store
}

function sanitizePersonalAsset(raw: unknown): PersonalAsset | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (typeof a.id !== 'string' || !a.id || a.id.includes(':')) return null
  const name = typeof a.name === 'string' ? normalizeAssetName(a.name) : null
  if (!name) return null
  if (!isValidAssetDataUrl(a.dataUrl)) return null
  const updatedAt =
    typeof a.updatedAt === 'number' && Number.isFinite(a.updatedAt) ? a.updatedAt : 0
  const sprite = sanitizeSpriteMeta(a.sprite)
  const tileset = sanitizeTilesetMeta(a.tileset)
  const tilemap = sanitizeTilemapMeta(a.tilemap)
  return {
    id: a.id,
    name,
    kind: 'image',
    dataUrl: a.dataUrl,
    width: typeof a.width === 'number' ? a.width : undefined,
    height: typeof a.height === 'number' ? a.height : undefined,
    ...(sprite ? { sprite } : {}),
    ...(tileset ? { tileset } : {}),
    ...(tilemap ? { tilemap } : {}),
    updatedAt,
  }
}

/** Todos os desenhos do perfil, saneados e do mais recente para o mais antigo. */
export async function listPersonalAssets(): Promise<PersonalAsset[]> {
  try {
    const kvStore = getStoreHandle()
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
  } catch {
    return []
  }
}

/**
 * Salva (upsert por id) um desenho vindo do Pinta. Valida dataUrl/nome, aplica
 * dedup de nome por sufixo (`heroi` → `heroi-2`) contra OUTROS ids e respeita
 * os tetos de contagem/orçamento. Nunca lança.
 */
export async function savePersonalAsset(input: {
  id: string
  name: string
  dataUrl: string
  width?: number
  height?: number
  /** Metadados do Pinta (animações/tiles/mapa) — saneados aqui e guardados no registro. */
  sprite?: unknown
  tileset?: unknown
  tilemap?: unknown
}): Promise<SavePersonalAssetResult> {
  try {
    if (!input.id || input.id.includes(':')) {
      return { ok: false, error: 'Esse desenho veio com uma identificação inválida.' }
    }
    if (!isValidAssetDataUrl(input.dataUrl)) {
      return { ok: false, error: 'Essa imagem é grande demais para a biblioteca.' }
    }
    const baseName = normalizeAssetName(input.name)
    if (!baseName) {
      return { ok: false, error: 'Esse nome não vai funcionar aqui.' }
    }

    const existing = await listPersonalAssets()
    const previous = existing.find((a) => a.id === input.id)
    const others = existing.filter((a) => a.id !== input.id)

    if (!previous && others.length >= PERSONAL_ASSET_LIMITS.maxCount) {
      return { ok: false, error: 'A sua biblioteca está cheia! Apague um desenho antigo.' }
    }
    const othersChars = others.reduce((sum, a) => sum + a.dataUrl.length, 0)
    if (othersChars + input.dataUrl.length > PERSONAL_ASSET_LIMITS.maxTotalChars) {
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
    const record: PersonalAsset = {
      id: input.id,
      name,
      kind: 'image',
      dataUrl: input.dataUrl,
      width: input.width,
      height: input.height,
      ...(sprite ? { sprite } : {}),
      ...(tileset ? { tileset } : {}),
      ...(tilemap ? { tilemap } : {}),
      updatedAt: Date.now(),
    }
    await set(assetKey(input.id), record, getStoreHandle())
    markPersonalAssetsChanged()
    return { ok: true, name }
  } catch {
    return { ok: false, error: 'Não consegui salvar agora. Tente de novo daqui a pouco.' }
  }
}

export type RemovePersonalAssetResult = { ok: true } | { ok: false; error: string }

/** Remove um desenho da biblioteca sem esconder falhas de persistência. */
export async function removePersonalAsset(id: string): Promise<RemovePersonalAssetResult> {
  try {
    await del(assetKey(id), getStoreHandle())
    markPersonalAssetsChanged()
    return { ok: true }
  } catch {
    return { ok: false, error: 'Não consegui excluir agora. Tente de novo daqui a pouco.' }
  }
}

/** Leitura pontual (testes/depuração). */
export async function getPersonalAsset(id: string): Promise<PersonalAsset | null> {
  try {
    const raw = await get<unknown>(assetKey(id), getStoreHandle())
    return sanitizePersonalAsset(raw)
  } catch {
    return null
  }
}
