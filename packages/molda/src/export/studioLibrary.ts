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
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaAsset } from '../core/model'
import {
  getDefaultMoldaPersistence,
  getMoldaStorageNamespace,
  type MoldaPersistence,
} from '../state/persistence'
import { exportSkyHdrInWorker } from '../workers/skyExport'
import { exportModelGlb } from './modelGlb'
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

const MAX_EXPORT_CACHE_ENTRIES = 16
type CachedExport =
  | { ok: false; reason: 'encode-failed' | 'asset-too-big' }
  | {
      ok: true
      encoded: Pick<MoldaExportedAsset, 'kind' | 'dataUrl' | 'bytes' | 'width' | 'height'>
    }
const exportCaches = new WeakMap<MoldaPersistence, ByteLru<string, CachedExport>>()

function cacheFor(persistence: MoldaPersistence): ByteLru<string, CachedExport> {
  let cache = exportCaches.get(persistence)
  if (!cache) {
    cache = new ByteLru({
      maxBytes: MOLDA_LIMITS.exportCacheBytes,
      maxEntries: MAX_EXPORT_CACHE_ENTRIES,
      sizeOf: (key, value) =>
        128 + 2 * (key.length + (value.ok ? value.encoded.dataUrl.length : 0)),
    })
    exportCaches.set(persistence, cache)
  }
  return cache
}

function materializeExport(asset: MoldaAsset, cached: CachedExport): ExportForStudioResult {
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

/** Do namespace corrente, ordenada da mais recente para a mais antiga. */
export async function listGalleryForStudio(): Promise<MoldaLibraryItem[]> {
  const persistence = getDefaultMoldaPersistence()
  const summaries = persistence.listSummaries
    ? await persistence.listSummaries()
    : (await persistence.loadAll()).map(summarizeAsset)
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Separador das chaves do cache: `namespace` (o viewerId do host, um UUID), `id` e `updatedAt` nunca o contêm. */
const CACHE_KEY_SEPARATOR = String.fromCharCode(0)

/**
 * A exportação a partir de uma criação JÁ carregada: o editor, ao salvar, reenvia ao
 * Estúdio sem reler o armazenamento (`useStudioResync`). Cache por id + `updatedAt`
 * compartilhado com `exportAssetForStudio` (a mesma persistência é a dona do cache).
 */
export async function exportLoadedAssetForStudio(
  asset: MoldaAsset,
  options: { persistence?: MoldaPersistence; namespace?: string } = {},
): Promise<ExportForStudioResult> {
  const namespace = options.namespace ?? getMoldaStorageNamespace()
  const persistence = options.persistence ?? getDefaultMoldaPersistence()
  const cache = cacheFor(persistence)
  const cacheKey = [namespace, asset.id, String(asset.updatedAt)].join(CACHE_KEY_SEPARATOR)
  const cached = cache.get(cacheKey)
  if (cached) return materializeExport(asset, cached)
  const finish = (result: CachedExport): ExportForStudioResult => {
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
    const result = await exportSkyHdrInWorker(asset)
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

export async function exportAssetForStudio(id: string): Promise<ExportForStudioResult> {
  const namespace = getMoldaStorageNamespace()
  const persistence = getDefaultMoldaPersistence()
  const asset = await persistence.load(id)
  if (!asset) return { ok: false, reason: 'not-found' }
  return exportLoadedAssetForStudio(asset, { persistence, namespace })
}
