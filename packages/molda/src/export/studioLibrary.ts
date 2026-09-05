/**
 * A face de DADOS que o Estúdio consome (subpath `@sistemazero/molda/studio-library`).
 * Zero React: o host kids importa este módulo dinamicamente, nunca a raiz.
 *
 * - `listGalleryForStudio()`: resumos + miniatura.
 * - `exportAssetForStudio(id)`: o payload da ponte "Trazer do Molda" já
 *   validado pelos tetos do Estúdio (`isValidAssetDataUrl` de lá: MIME, extensão
 *   e assinatura): modelo (`.glb`, `model3d`), céu (`.hdr`, `environment3d`)
 *   e textura (`.png`, `image`).
 */
import { assetBytes } from '../core/bytes'
import type { MoldaAssetKind } from '../core/model'
import {
  getDefaultMoldaPersistence,
  getMoldaStorageNamespace,
  type MoldaPersistence,
} from '../state/persistence'
import { exportModelGlb } from './modelGlb'
import { exportSkyHdr } from './skyHdr'
import { exportTexturePng } from './texturePng'

export { getMoldaStorageNamespace, setMoldaStorageNamespace } from '../state/persistence'

export interface MoldaLibraryItem {
  id: string
  name: string
  kind: MoldaAssetKind
  updatedAt: number
  bytes: number
  thumbDataUrl: string | null
}

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
const exportCaches = new WeakMap<MoldaPersistence, Map<string, CachedExport>>()

function cacheFor(persistence: MoldaPersistence): Map<string, CachedExport> {
  let cache = exportCaches.get(persistence)
  if (!cache) {
    cache = new Map()
    exportCaches.set(persistence, cache)
  }
  return cache
}

function readCachedExport(cache: Map<string, CachedExport>, key: string): CachedExport | undefined {
  const cached = cache.get(key)
  if (!cached) return undefined
  cache.delete(key)
  cache.set(key, cached)
  return cached
}

function writeCachedExport(
  cache: Map<string, CachedExport>,
  key: string,
  result: CachedExport,
): void {
  cache.set(key, result)
  while (cache.size > MAX_EXPORT_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) return
    cache.delete(oldest)
  }
}

function materializeExport(
  asset: Awaited<ReturnType<MoldaPersistence['load']>> & {},
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

/** Do namespace corrente, ordenada da mais recente para a mais antiga. */
export async function listGalleryForStudio(): Promise<MoldaLibraryItem[]> {
  const assets = await getDefaultMoldaPersistence().loadAll()
  return assets
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      updatedAt: asset.updatedAt,
      bytes: assetBytes(asset),
      thumbDataUrl: asset.thumb ?? null,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function exportAssetForStudio(id: string): Promise<ExportForStudioResult> {
  const namespace = getMoldaStorageNamespace()
  const persistence = getDefaultMoldaPersistence()
  const asset = await persistence.load(id)
  if (!asset) return { ok: false, reason: 'not-found' }
  const cache = cacheFor(persistence)
  const cacheKey = `${namespace}\u0000${asset.id}\u0000${asset.updatedAt}`
  const cached = readCachedExport(cache, cacheKey)
  if (cached) return materializeExport(asset, cached)
  const finish = (result: CachedExport): ExportForStudioResult => {
    writeCachedExport(cache, cacheKey, result)
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
      encoded: {
        kind: 'model3d',
        dataUrl: result.dataUrl,
        bytes: result.bytes.length,
      },
    })
  }
  if (asset.kind === 'sky') {
    const result = exportSkyHdr(asset)
    if (!result.ok) return finish({ ok: false, reason: 'asset-too-big' })
    return finish({
      ok: true,
      encoded: {
        kind: 'environment3d',
        dataUrl: result.dataUrl,
        bytes: result.bytes.length,
      },
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
