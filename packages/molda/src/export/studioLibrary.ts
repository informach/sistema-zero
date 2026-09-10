/**
 * A face de DADOS que o Estúdio consome (subpath `@sistemazero/molda/studio-library`).
 * Zero React: o host kids importa este módulo dinamicamente, nunca a raiz.
 *
 * - `listGalleryForStudio()`: resumos + miniatura.
 * - `exportAssetForStudio(id)` / `exportLoadedAssetForStudio(asset)`: o payload da
 *   ponte "Trazer do Molda" (e da volta dela, ao salvar no editor) já
 *   validado pelos tetos do Estúdio (`isValidAssetDataUrl` de lá: MIME, extensão
 *   e assinatura): modelo (`.glb`, `model3d`), céu (`.hdr`, `environment3d`)
 *   e textura (`.png`, `image`).
 */

import { type MoldaAssetSummary, summarizeAsset } from '../core/assetSummary'
import { ByteLru } from '../core/byteLru'
import { COPY } from '../core/copy'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaAsset } from '../core/model'
import { bytesToBase64 } from '../core/skinCodec'
import type { MoldaSceneDocument } from '../scene/document'
import {
  getDefaultMoldaPersistence,
  getMoldaGenerationStore,
  getMoldaStorageNamespace,
  type MoldaPersistence,
} from '../state/persistence'
import { createMoldaSceneCloudSource } from '../state/sceneCloudSource'
import { createScenePersistence } from '../state/scenePersistence'
import { prepareSceneGlbInWorker } from '../workers/sceneGlb'
import { exportSkyHdrInWorker } from '../workers/skyExport'
import { exportModelGlb } from './modelGlb'
import type { SceneGlbIssue } from './sceneGlbReport'
import { inspectSceneStudioCompatibility } from './sceneStudioCompatibility'
import { exportTexturePng } from './texturePng'

export { getMoldaStorageNamespace, setMoldaStorageNamespace } from '../state/persistence'

export type MoldaLibraryItem = Omit<MoldaAssetSummary, 'createdAt'>

/** O `ProjectAsset.kind` do Estúdio que cada criação vira. */
export type StudioAssetKind = 'model3d' | 'image' | 'environment3d'

export interface MoldaExportedAsset {
  id: string
  name: string
  kind: StudioAssetKind
  dataUrl: string
  originalFileName: string
  bytes: number
  thumbDataUrl: string | null
  /** Só a imagem (textura): o Estúdio guarda o tamanho. */
  width?: number
  height?: number
}

/** Resultado da volta automática ao Estúdio depois de salvar no Molda. */
export type MoldaStudioResyncResult =
  | { updated: true }
  | { updated: false; reason: 'not-linked' | 'failed'; error?: string }

export type ExportForStudioResult =
  | { ok: true; asset: MoldaExportedAsset }
  | { ok: false; reason: 'not-found' | 'encode-failed' | 'asset-too-big' }
  | { ok: false; reason: 'needs-review'; review: MoldaStudioReview }

export interface MoldaStudioReview {
  /** Consent applies to this namespace, creation and saved revision only. */
  token: string
  losses: string[]
}

export interface MoldaStudioExportContext {
  persistence?: MoldaPersistence
  namespace?: string
  acceptedReview?: string
  signal?: AbortSignal
  /** Supplied only by the transactional storage reader, never by the review UI. */
  storageRevision?: number
}

const MAX_EXPORT_CACHE_ENTRIES = 16
type CachedExport =
  | { ok: false; reason: 'encode-failed' | 'asset-too-big' }
  | {
      ok: true
      encoded: Pick<MoldaExportedAsset, 'kind' | 'dataUrl' | 'bytes' | 'width' | 'height'>
      losses?: string[]
    }
const exportCaches = new WeakMap<MoldaPersistence, ByteLru<string, CachedExport>>()
const sceneSnapshotIds = new WeakMap<MoldaSceneDocument, number>()
let nextSceneSnapshotId = 0

function cacheFor(persistence: MoldaPersistence): ByteLru<string, CachedExport> {
  let cache = exportCaches.get(persistence)
  if (!cache) {
    cache = new ByteLru({
      maxBytes: MOLDA_LIMITS.exportCacheBytes,
      maxEntries: MAX_EXPORT_CACHE_ENTRIES,
      sizeOf: (key, value) =>
        128 +
        2 *
          (key.length +
            (value.ok ? value.encoded.dataUrl.length + (value.losses?.join('').length ?? 0) : 0)),
    })
    exportCaches.set(persistence, cache)
  }
  return cache
}

function materializeExport(
  asset: Pick<MoldaAsset, 'id' | 'name' | 'thumb'>,
  cached: CachedExport,
): ExportForStudioResult {
  if (!cached.ok) return cached
  const extension =
    cached.encoded.kind === 'model3d'
      ? 'glb'
      : cached.encoded.kind === 'environment3d'
        ? 'hdr'
        : 'png'
  return {
    ok: true,
    asset: {
      id: asset.id,
      name: asset.name,
      ...cached.encoded,
      originalFileName: `${asset.name}.${extension}`,
      thumbDataUrl: asset.thumb ?? null,
    },
  }
}

/** Do namespace corrente, ordenada da mais recente para a mais antiga, nas DUAS gerações. */
export async function listGalleryForStudio(): Promise<MoldaLibraryItem[]> {
  const persistence = getDefaultMoldaPersistence()
  const generation = createMoldaSceneCloudSource(getMoldaGenerationStore())
  const v1 = persistence.listSummaries
    ? await persistence.listSummaries()
    : (await persistence.loadAll()).map(summarizeAsset)
  // A criação promovida continua sendo a mesma criação para o Estúdio: some daqui e o
  // "Trazer do Molda" deixaria de enxergar o que a criança acabou de modelar.
  const scene = await generation.listSummaries()
  return [...v1, ...scene].sort((a, b) => b.updatedAt - a.updatedAt)
}

/** The editor owns a validated snapshot: no JSON roundtrip or disk reload. */
export async function exportLoadedSceneForStudio(
  document: MoldaSceneDocument,
  context: MoldaStudioExportContext = {},
): Promise<ExportForStudioResult> {
  context.signal?.throwIfAborted()
  const namespace = context.namespace ?? getMoldaStorageNamespace()
  const cache = cacheFor(context.persistence ?? getDefaultMoldaPersistence())
  let snapshotId = sceneSnapshotIds.get(document)
  if (snapshotId === undefined) {
    snapshotId = ++nextSceneSnapshotId
    sceneSnapshotIds.set(document, snapshotId)
  }
  const token = JSON.stringify([
    namespace,
    document.id,
    document.updatedAt,
    context.storageRevision === undefined
      ? ['snapshot', snapshotId]
      : ['storage', context.storageRevision],
  ])
  const key = `scene:${token}`
  const finish = (result: CachedExport): ExportForStudioResult => {
    if (result.ok && result.losses?.length && context.acceptedReview !== token)
      return { ok: false, reason: 'needs-review', review: { token, losses: [...result.losses] } }
    return materializeExport(document, result)
  }
  const cached = cache.get(key)
  if (cached) return finish(cached)
  try {
    const result = await prepareSceneGlbInWorker(
      {
        document,
        documentId: document.id,
        revision: document.updatedAt,
        animatedPaint: true,
      },
      { ...(context.signal ? { signal: context.signal } : {}) },
    )
    const report = inspectSceneStudioCompatibility({
      stats: result.stats,
      byteLength: result.bytes.length,
    })
    if (!report.fitsSingleCopy)
      return { ok: false, reason: report.empty ? 'encode-failed' : 'asset-too-big' }
    const counts = new Map<SceneGlbIssue['code'], number>()
    for (const issue of result.issues) counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1)
    const encoded: CachedExport = {
      ok: true,
      encoded: {
        kind: 'model3d',
        dataUrl: `data:model/gltf-binary;base64,${bytesToBase64(result.bytes)}`,
        bytes: result.bytes.length,
      },
      losses: [...counts].map(([code, count]) => COPY.scene.glbExport.issues[code](count)),
    }
    context.signal?.throwIfAborted()
    cache.set(key, encoded)
    return finish(encoded)
  } catch {
    context.signal?.throwIfAborted()
    return { ok: false, reason: 'encode-failed' }
  }
}

async function exportSceneForStudio(
  id: string,
  context: MoldaStudioExportContext,
): Promise<ExportForStudioResult> {
  const found = await createScenePersistence(getMoldaGenerationStore(context.namespace)).read(
    id,
    context.signal,
  )
  if (found.status === 'missing' || found.status === 'deleted')
    return { ok: false, reason: 'not-found' }
  if (found.status !== 'active') return { ok: false, reason: 'encode-failed' }
  return exportLoadedSceneForStudio(found.document, {
    ...context,
    storageRevision: found.summary.revision,
  })
}

export { sameSceneContent as sameSceneStudioContent } from '../scene/documentContent'

/** Separador das chaves do cache: `namespace` (o viewerId do host, um UUID), `id` e `updatedAt` nunca o contêm. */
const CACHE_KEY_SEPARATOR = String.fromCharCode(0)

/**
 * A exportação a partir de uma criação JÁ carregada: o editor, ao salvar, reenvia ao
 * Estúdio sem reler o armazenamento (`useStudioResync`). Cache por id + `updatedAt`
 * compartilhado com `exportAssetForStudio` (a mesma persistência é a dona do cache).
 */
export async function exportLoadedAssetForStudio(
  asset: MoldaAsset,
  options: MoldaStudioExportContext = {},
): Promise<ExportForStudioResult> {
  options.signal?.throwIfAborted()
  const namespace = options.namespace ?? getMoldaStorageNamespace()
  const persistence = options.persistence ?? getDefaultMoldaPersistence()
  const cache = cacheFor(persistence)
  const cacheKey = [namespace, asset.id, String(asset.updatedAt)].join(CACHE_KEY_SEPARATOR)
  const cached = cache.get(cacheKey)
  if (cached) return materializeExport(asset, cached)
  const finish = (result: CachedExport): ExportForStudioResult => {
    options.signal?.throwIfAborted()
    cache.set(cacheKey, result)
    return materializeExport(asset, result)
  }
  if (asset.kind === 'model') {
    const result = exportModelGlb(asset)
    if (!result.ok) {
      return finish({
        ok: false,
        reason: result.reason === 'too-big' ? 'asset-too-big' : 'encode-failed',
      })
    }
    return finish({
      ok: true,
      encoded: { kind: 'model3d', dataUrl: result.dataUrl, bytes: result.bytes.length },
    })
  }
  if (asset.kind === 'sky') {
    const result = await exportSkyHdrInWorker(asset, { signal: options.signal })
    if (!result.ok) return finish({ ok: false, reason: 'asset-too-big' })
    return finish({
      ok: true,
      encoded: { kind: 'environment3d', dataUrl: result.dataUrl, bytes: result.bytes.length },
    })
  }
  const result = exportTexturePng(asset)
  if (!result.ok) return finish({ ok: false, reason: 'asset-too-big' })
  return finish({
    ok: true,
    encoded: {
      kind: 'image',
      dataUrl: result.dataUrl,
      bytes: result.bytes.length,
      width: result.width,
      height: result.height,
    },
  })
}

export async function exportAssetForStudio(
  id: string,
  /**
   * O perfil ao qual esta exportação pertence. `useStudioResync` prende a conta ANTES de
   * entrar na fila justamente porque uma troca de criança no meio da espera faria a cópia
   * sair do banco da outra; reler o namespace aqui, depois dos awaits, desfazia isso.
   */
  context?: MoldaStudioExportContext,
): Promise<ExportForStudioResult> {
  const namespace = context?.namespace ?? getMoldaStorageNamespace()
  const persistence = context?.persistence ?? getDefaultMoldaPersistence()
  // Falhar ao ler o inventário v1 não pode impedir a geração seguinte de responder:
  // uma criação promovida não está mais lá, e é justamente ela que precisa sair daqui.
  const asset = await persistence.load(id).catch(() => null)
  if (!asset) return exportSceneForStudio(id, { ...context, namespace, persistence })
  return exportLoadedAssetForStudio(asset, { ...context, persistence, namespace })
}
