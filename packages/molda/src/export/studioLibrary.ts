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
import { getDefaultMoldaPersistence } from '../state/persistence'
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
  const assets = await getDefaultMoldaPersistence().loadAll()
  const asset = assets.find((item) => item.id === id)
  if (!asset) return { ok: false, reason: 'not-found' }
  if (asset.kind === 'model') {
    const result = exportModelGlb(asset)
    if (!result.ok) {
      return { ok: false, reason: result.reason === 'too-big' ? 'asset-too-big' : 'encode-failed' }
    }
    return {
      ok: true,
      asset: {
        id: asset.id,
        name: asset.name,
        kind: 'model3d',
        dataUrl: result.dataUrl,
        originalFileName: `${asset.name}.glb`,
        bytes: result.bytes.length,
        thumbDataUrl: asset.thumb ?? null,
      },
    }
  }
  if (asset.kind === 'sky') {
    const result = exportSkyHdr(asset)
    if (!result.ok) return { ok: false, reason: 'asset-too-big' }
    return {
      ok: true,
      asset: {
        id: asset.id,
        name: asset.name,
        kind: 'environment3d',
        dataUrl: result.dataUrl,
        originalFileName: `${asset.name}.hdr`,
        bytes: result.bytes.length,
        thumbDataUrl: asset.thumb ?? null,
      },
    }
  }
  const result = exportTexturePng(asset)
  if (!result.ok) return { ok: false, reason: 'asset-too-big' }
  return {
    ok: true,
    asset: {
      id: asset.id,
      name: asset.name,
      kind: 'image',
      dataUrl: result.dataUrl,
      originalFileName: `${asset.name}.png`,
      bytes: result.bytes.length,
      thumbDataUrl: asset.thumb ?? null,
      width: result.width,
      height: result.height,
    },
  }
}
