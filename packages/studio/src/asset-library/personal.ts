import type { PintaRegionalMarker } from '@sistemazero/core/studio/pinta-regional-marker'
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
import { getMany, keys } from 'idb-keyval'
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
import { isUnusablePintaRegionalAsset } from '../core/pintaAuthoredPngVersion'
import { admitPintaRegionalMaterial } from '../core/pintaRegionalMaterial'
import { hasRegionalPintaReference, UNSUPPORTED_PINTA_REGION } from '../core/pintaRegionalReference'
import { sanitizeSceneMeta } from '../core/projectAssets'
import {
  ASSET_KEY_PREFIX,
  assetKey,
  getPersonalAssetsNamespace,
  getStoreHandle,
  markPersonalAssetsChanged,
  PERSONAL_ASSET_LIMITS,
  type PersonalStorageInventory,
  personalAssetChars,
  REGIONAL_KEY_PREFIX,
  regionalKey,
  regionalQuota,
  withPersonalAssetUpdate,
} from './personalStorage'

export {
  getPersonalAssetsNamespace,
  PERSONAL_ASSET_LIMITS,
  personalAssetsChangedAt,
  personalAssetsChangeToken,
  setPersonalAssetsNamespace,
  subscribePersonalAssetsChanged,
} from './personalStorage'

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
  regional?: PintaRegionalMarker
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
  kvStore: ReturnType<typeof getStoreHandle>,
): Promise<PersonalAsset[]> {
  const allKeys = await keys(kvStore)
  const refs = [
    ...new Set(
      allKeys.flatMap((key) =>
        typeof key !== 'string'
          ? []
          : key.startsWith(ASSET_KEY_PREFIX)
            ? [key.slice(ASSET_KEY_PREFIX.length)]
            : key.startsWith(REGIONAL_KEY_PREFIX)
              ? [key.slice(REGIONAL_KEY_PREFIX.length)]
              : [],
      ),
    ),
  ]
  if (refs.length === 0) return []
  const values = await readPersonalAssetCopies(refs, kvStore)
  const assets = values.filter((asset): asset is PersonalAsset => asset !== null)
  assets.sort((a, b) => b.updatedAt - a.updatedAt)
  return assets
}

async function readPersonalAssetCopies(
  ids: readonly string[],
  store: ReturnType<typeof getStoreHandle>,
) {
  const values = await getMany<unknown>(
    ids.flatMap((id) => [regionalKey(id), assetKey(id)]),
    store,
  )
  return Promise.all(
    ids.map(async (id, i) => {
      const regional = values[i * 2]
      if (regional !== undefined) {
        if (
          !regional ||
          typeof regional !== 'object' ||
          !('format' in regional) ||
          regional.format !== 'pinta-regional-personal' ||
          !('version' in regional) ||
          regional.version !== 1 ||
          !('dataVersion' in regional) ||
          regional.dataVersion !== 5
        )
          return null
        const { admitPersonalRegionalRecord } = await import('./personalRegional')
        const record = await admitPersonalRegionalRecord(regional, id)
        return {
          id,
          name: record.name,
          kind: 'image' as const,
          dataUrl: record.dataUrl,
          width: record.width,
          height: record.height,
          updatedAt: record.updatedAt ?? 0,
          regional: { dataVersion: 5 as const, sourceId: id, sha256: record.sha256 },
        }
      }
      const legacy = values[i * 2 + 1]
      return values[i * 2] === undefined && !isUnusablePintaRegionalAsset(legacy)
        ? sanitizePersonalAsset(legacy)
        : null
    }),
  )
}

function splitInventory({ legacy, regional }: PersonalStorageInventory) {
  const protectedRecords = new Map(regional)
  const assets: PersonalAsset[] = []
  let shadowChars = 0
  for (const [id, raw] of legacy) {
    if (regional.has(id)) {
      // Old tabs may recreate a hidden cover. Charge its physical bytes but do
      // not let it count as a separate logical item or supply a legacy name.
      if (raw && typeof raw === 'object' && 'dataUrl' in raw && typeof raw.dataUrl === 'string')
        shadowChars += personalAssetChars(raw as { dataUrl: string })
      continue
    }
    if (isUnusablePintaRegionalAsset(raw)) {
      protectedRecords.set(id, raw)
      continue
    }
    const asset = sanitizePersonalAsset(raw)
    if (asset) assets.push(asset)
  }
  return { assets, protectedRecords, shadowChars }
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
  regional?: unknown
  tilemap?: unknown
  /** Usado por restauros da nuvem para preservar a revisão autoritativa da origem. */
  updatedAt?: number
}

type PreparedPersonalAsset = { ok: true; record: PersonalAsset } | { ok: false; error: string }

function preparePersonalAsset(
  input: PersonalAssetInput,
  existing: readonly PersonalAsset[],
  now: number,
  reserved: NonNullable<ReturnType<typeof regionalQuota>>,
): PreparedPersonalAsset {
  if (!input.id || input.id.includes(':')) {
    return { ok: false, error: 'Esse desenho veio com uma identificação inválida.' }
  }
  if (isUnusablePintaRegionalAsset(input)) return { ok: false, error: UNSUPPORTED_PINTA_REGION }
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

  if (!previous && others.length + reserved.count >= PERSONAL_ASSET_LIMITS.maxCount) {
    return { ok: false, error: 'A sua biblioteca está cheia! Apague um desenho antigo.' }
  }
  const othersChars = others.reduce((sum, a) => sum + personalAssetChars(a), reserved.chars)
  if (othersChars + personalAssetChars(input) > PERSONAL_ASSET_LIMITS.maxTotalChars) {
    return { ok: false, error: 'A sua biblioteca está sem espaço! Apague um desenho antigo.' }
  }

  // Dedup de nome contra OUTROS desenhos (reenviar o mesmo id mantém o nome).
  const taken = new Set([...others.map((a) => a.name), ...reserved.names])
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
  const namespace = options?.namespace ?? getPersonalAssetsNamespace()
  try {
    const result = await savePersonalAssetBundle([input], { namespace })
    if (!result.ok) return result
    markPersonalAssetsChanged(namespace)
    const record = result.assets[0]!
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
  options?: { namespace?: string; signal?: AbortSignal },
): Promise<SavePersonalAssetBundleResult> {
  const namespace = options?.namespace ?? getPersonalAssetsNamespace()
  if (
    inputs.length < 1 ||
    inputs.length > 16 ||
    new Set(inputs.map((a) => a.id)).size !== inputs.length
  )
    return { ok: false, error: 'Este conjunto de mapas é inválido ou grande demais.' }
  try {
    options?.signal?.throwIfAborted()
    if (inputs.some(hasRegionalPintaReference)) {
      const input = inputs[0]
      if (
        inputs.length !== 1 ||
        !input ||
        input.origin === 'molda' ||
        (input.kind !== undefined && input.kind !== 'image') ||
        typeof input.width !== 'number' ||
        typeof input.height !== 'number'
      )
        return { ok: false, error: UNSUPPORTED_PINTA_REGION }
      await admitPintaRegionalMaterial(
        { ...input, sourceId: input.id, width: input.width, height: input.height },
        options?.signal,
      )
      const { readPersonalRegionalMap, savePersonalRegionalMap, PINTA_REGIONAL_PERSONAL_CAPTURE } =
        await import('./personalRegional')
      const scope = { namespace, capability: PINTA_REGIONAL_PERSONAL_CAPTURE } satisfies Parameters<
        typeof readPersonalRegionalMap
      >[1]
      const previous = await readPersonalRegionalMap(input.id, scope)
      const saved = await savePersonalRegionalMap(
        {
          id: input.id,
          name: input.name,
          dataUrl: input.dataUrl,
          width: input.width,
          height: input.height,
        },
        { ...scope, signal: options?.signal, expectedRevision: previous?.revision ?? null },
      )
      if (!saved.ok) return saved
      const records = await getPersonalAssets([input.id], { namespace })
      const record = records.get(input.id)
      if (!record || record.updatedAt !== saved.updatedAt)
        return { ok: false, error: 'O desenho mudou em outra aba. Confira antes de continuar.' }
      return { ok: true, assets: [record] }
    }
    const result = await writePersonalAssets(inputs, namespace, options?.signal)
    if (result.ok) markPersonalAssetsChanged(namespace)
    return result
  } catch {
    return { ok: false, error: 'Não consegui salvar os mapas agora. Tente de novo daqui a pouco.' }
  }
}

function writePersonalAssets(
  inputs: readonly PersonalAssetInput[],
  namespace: string,
  signal?: AbortSignal,
): Promise<SavePersonalAssetBundleResult> {
  return withPersonalAssetUpdate<SavePersonalAssetBundleResult>(namespace, (stored) => {
    signal?.throwIfAborted()
    const { assets: previous, protectedRecords, shadowChars } = splitInventory(stored)
    const reserved = regionalQuota(protectedRecords)
    if (!reserved || inputs.some(({ id }) => protectedRecords.has(id)))
      return { write: {}, result: { ok: false, error: UNSUPPORTED_PINTA_REGION } }
    reserved.chars += shadowChars
    const replaced = new Set(inputs.map((a) => a.id))
    const inventory = previous.filter((a) => !replaced.has(a.id))
    const assets: PersonalAsset[] = []
    const now = Date.now()
    for (const input of inputs) {
      const old = previous.find((a) => a.id === input.id)
      const prepared = preparePersonalAsset(
        input,
        old ? [...inventory, old] : inventory,
        now,
        reserved,
      )
      if (!prepared.ok) return { write: {}, result: prepared }
      assets.push(prepared.record)
      inventory.push(prepared.record)
    }
    return { write: { puts: assets.map((a) => [assetKey(a.id), a]) }, result: { ok: true, assets } }
  })
}

export type RemovePersonalAssetResult = { ok: true } | { ok: false; error: string }

/**
 * Remove um desenho da biblioteca sem esconder falhas de persistência. O namespace
 * explícito espelha o de `getPersonalAsset`: quem capturou o perfil no render (o
 * painel) apaga daquele perfil, mesmo que o singleton tenha trocado no meio.
 */
export async function removePersonalAsset(
  id: string,
  options?: { namespace?: string; regional?: { sha256: string; updatedAt: number } },
): Promise<RemovePersonalAssetResult> {
  const namespace = options?.namespace ?? getPersonalAssetsNamespace()
  try {
    if (options?.regional) {
      const { removePersonalRegionalMap, PINTA_REGIONAL_PERSONAL_CAPTURE } = await import(
        './personalRegional'
      )
      return removePersonalRegionalMap(id, {
        namespace,
        capability: PINTA_REGIONAL_PERSONAL_CAPTURE,
        expected: options.regional,
      })
    }
    const result = await withPersonalAssetUpdate<RemovePersonalAssetResult>(
      namespace,
      ({ legacy, regional }) => {
        if (regional.has(id) || isUnusablePintaRegionalAsset(legacy.get(id)))
          return { write: {}, result: { ok: false, error: UNSUPPORTED_PINTA_REGION } }
        return { write: { deletes: [assetKey(id)] }, result: { ok: true } }
      },
    )
    if (result.ok) markPersonalAssetsChanged(namespace)
    return result
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
    const values = await readPersonalAssetCopies(unique, getStoreHandle(options?.namespace))
    unique.forEach((id, index) => {
      result.set(id, values[index] ?? null)
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
  const assets = await getPersonalAssets([id], options)
  return assets.get(id) ?? null
}
