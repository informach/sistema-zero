/**
 * Galeria PARA O ESTÚDIO (subpath `@sistemazero/pinta/studio-library`) — o lado
 * de dados do fluxo "Trazer do Pinta": o Estúdio lista TODOS os desenhos do
 * perfil (resumos com miniatura leve) e importa um por id, sem o foguete.
 *
 * Consumido SÓ pelo host (community-kids), nunca pelo <PintaApp>: zero React
 * aqui dentro, para o import dinâmico do host não puxar o app inteiro. O
 * Estúdio declara tipos-espelho do lado de lá e o host liga as pontas
 * (invariante "zero import pinta↔studio", a mesma da ponte do foguete).
 */
import {
  assetRole,
  assetStyle,
  isTilesetKind,
  type PintaAsset,
  type PintaAssetRole,
  type PintaAssetStyle,
  resolveAssetPalette,
} from '../core/project'
import type { PintaExportedAsset } from '../core/types'
import { flattenCels } from '../pixel/layers'
import { getPintaStorageNamespace, listAllAssets, loadAssetById } from '../state/persistence'
import { tilemapThumbnail } from '../tiles/renderTilemap'
import { vectorTilemapPortableSvg } from '../tiles/renderVectorTilemap'
import { vectorToPortableSvg } from '../vector/portableSvg'
import { svgToPngDataUrl } from '../vector/rasterize'
import { bitmapToPngDataUrl } from './png'
import { buildStudioPayload, validateStudioPayloadSize } from './studioBridge'

export { setPintaStorageNamespace } from '../state/persistence'
export type { PintaExportedAsset }

/** Maior lado da MINIATURA raster (só prévia da lista — o import re-exporta). */
const THUMB_MAX_PX = 128

/**
 * Teto do dataUrl de miniatura SVG: um cenário vetorial com dezenas de shapes
 * pode crescer — acima disso rasteriza pequeno; falhou, a UI cai no emoji.
 */
const SVG_THUMB_MAX_CHARS = 100_000

export interface PintaGallerySummary {
  id: string
  name: string
  role: PintaAssetRole
  /** null = tilemap (papel dos dois estilos). */
  style: PintaAssetStyle | null
  updatedAt: number
  /** Nome do jogo do Pensa (asset.projectRef), quando o desenho é de um jogo. */
  projectName?: string
  /** PNG ou `data:image/svg+xml` pequeno; null = irrasterizável (UI usa emoji). */
  thumbDataUrl: string | null
}

export type ExportForStudioResult =
  | { ok: true; asset: PintaExportedAsset }
  | { ok: false; reason: 'not-found' | 'raster-failed' | 'asset-too-big' | 'sheet-too-big' }

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** SVG pequeno vai como texto (zero canvas); grande demais rasteriza capado. */
async function svgThumb(svg: string, width: number, height: number): Promise<string | null> {
  const asText = svgDataUrl(svg)
  if (asText.length <= SVG_THUMB_MAX_CHARS) return asText
  const scale = Math.min(1, THUMB_MAX_PX / Math.max(width, height, 1))
  return svgToPngDataUrl(svg, width, height, scale)
}

async function thumbFor(
  asset: PintaAsset,
  findAsset: (id: string) => PintaAsset | null,
): Promise<string | null> {
  switch (asset.kind) {
    case 'pixel-sprite': {
      const frame = asset.animations[0]?.frames[0]
      const flat = frame ? flattenCels(frame, asset.layers) : null
      return flat ? bitmapToPngDataUrl(flat, resolveAssetPalette(asset)) : null
    }
    case 'pixel-background': {
      const flat = flattenCels(asset.cels, asset.layers)
      return flat ? bitmapToPngDataUrl(flat, resolveAssetPalette(asset)) : null
    }
    case 'tileset': {
      const tile = asset.tiles[0]
      return tile ? bitmapToPngDataUrl(tile, resolveAssetPalette(asset)) : null
    }
    case 'vector-sprite': {
      const frame = asset.animations[0]?.frames[0] ?? []
      const svg = await vectorToPortableSvg({
        width: asset.frameWidth,
        height: asset.frameHeight,
        shapes: frame,
      })
      return svgThumb(svg, asset.frameWidth, asset.frameHeight)
    }
    case 'vector-background': {
      const svg = await vectorToPortableSvg({
        width: asset.width,
        height: asset.height,
        shapes: asset.shapes,
      })
      return svgThumb(svg, asset.width, asset.height)
    }
    case 'vector-tileset': {
      const svg = await vectorToPortableSvg({
        width: asset.tileSize,
        height: asset.tileSize,
        shapes: asset.tiles[0] ?? [],
      })
      return svgThumb(svg, asset.tileSize, asset.tileSize)
    }
    case 'tilemap': {
      const tileset = findAsset(asset.tilesetId)
      if (!tileset || !isTilesetKind(tileset)) return null
      if (tileset.kind === 'tileset') {
        return tilemapThumbnail(asset, tileset, THUMB_MAX_PX)?.dataUrl ?? null
      }
      const svg = await vectorTilemapPortableSvg(asset, tileset)
      return svgThumb(svg, asset.cols * tileset.tileSize, asset.rows * tileset.tileSize)
    }
  }
}

// Miniatura por asset, recomputada só quando o desenho muda (reabrir a modal
// fica ~zero). O carimbo do TILEMAP inclui o tileset — editar uma peça muda o
// mapa sem tocar o updatedAt dele.
const thumbCache = new Map<string, { stamp: string; thumb: string | null }>()
const THUMB_CACHE_MAX = 512

function thumbStamp(asset: PintaAsset, findAsset: (id: string) => PintaAsset | null): string {
  if (asset.kind !== 'tilemap') return String(asset.updatedAt)
  const tileset = findAsset(asset.tilesetId)
  return `${asset.updatedAt}:${tileset?.updatedAt ?? 'sem-tileset'}`
}

async function cachedThumb(
  namespace: string,
  asset: PintaAsset,
  findAsset: (id: string) => PintaAsset | null,
): Promise<string | null> {
  const stamp = thumbStamp(asset, findAsset)
  const cacheKey = JSON.stringify([namespace, asset.id])
  const hit = thumbCache.get(cacheKey)
  if (hit && hit.stamp === stamp) return hit.thumb
  const thumb = await thumbFor(asset, findAsset).catch(() => null)
  if (thumbCache.size >= THUMB_CACHE_MAX) thumbCache.clear()
  thumbCache.set(cacheKey, { stamp, thumb })
  return thumb
}

/**
 * Resumos de TODOS os desenhos do perfil (mais recente primeiro), prontos para
 * a lista do "Trazer do Pinta". O host seta o namespace antes de chamar.
 */
export async function listGalleryForStudio(): Promise<PintaGallerySummary[]> {
  const namespace = getPintaStorageNamespace()
  const assets = await listAllAssets()
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  const findAsset = (id: string) => byId.get(id) ?? null
  const summaries: PintaGallerySummary[] = []
  for (const asset of assets) {
    summaries.push({
      id: asset.id,
      name: asset.name,
      role: assetRole(asset.kind),
      style: assetStyle(asset.kind),
      updatedAt: asset.updatedAt,
      ...(asset.projectRef?.name ? { projectName: asset.projectRef.name } : {}),
      thumbDataUrl: await cachedThumb(namespace, asset, findAsset),
    })
  }
  return summaries
}

/**
 * Exporta UM desenho no formato da ponte (PNG achatado + metadados), já
 * validado pelos tetos do Estúdio — o mesmo payload do foguete "Usar no
 * Estúdio". `tilemapFront` fica de fora de propósito: a biblioteca pessoal do
 * Estúdio não o guarda (só o "Jogar meu mapa" o usa, e aquele caminho é outro).
 */
export async function exportAssetForStudio(id: string): Promise<ExportForStudioResult> {
  const asset = await loadAssetById(id)
  if (!asset) return { ok: false, reason: 'not-found' }
  // buildStudioPayload só resolve OUTRO asset no caso tilemap→tileset; carregar
  // a galeria inteira aqui seria desperdício.
  const linked = asset.kind === 'tilemap' ? await loadAssetById(asset.tilesetId) : null
  const payload = await buildStudioPayload(
    asset,
    (assetId) => (linked && linked.id === assetId ? linked : null),
    { animationId: null, frameIndex: 0 },
  ).catch(() => null)
  if (!payload) return { ok: false, reason: 'raster-failed' }
  const size = validateStudioPayloadSize(payload)
  if (size !== 'ok') return { ok: false, reason: size }
  return {
    ok: true,
    asset: {
      id: asset.id,
      name: asset.name,
      dataUrl: payload.dataUrl,
      width: payload.width,
      height: payload.height,
      ...(payload.sprite ? { sprite: payload.sprite } : {}),
      ...(payload.tileset ? { tileset: payload.tileset } : {}),
      ...(payload.tilemap ? { tilemap: payload.tilemap } : {}),
    },
  }
}
