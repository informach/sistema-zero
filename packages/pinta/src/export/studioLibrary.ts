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
import type {
  PintaImageDerivation,
  PintaImageRecipe,
  PintaImageSelectionSummary,
  PintaImageTargetLimits,
} from '@sistemazero/core/studio/pinta-image'
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
import {
  capturePintaAssetForImage,
  createPintaPersistence,
  getPintaStorageNamespace,
} from '../state/persistence'
import { tilemapThumbnail } from '../tiles/renderTilemap'
import { vectorTilemapPortableSvg } from '../tiles/renderVectorTilemap'
import { vectorToPortableSvg } from '../vector/portableSvg'
import { svgToPngDataUrl } from '../vector/rasterize'
import { bitmapToPngDataUrl } from './png'
import { buildStudioPayload, validateStudioPayloadSize } from './studioBridge'

export { capturePintaAssetForImage, setPintaStorageNamespace } from '../state/persistence'
export type { PintaPortableImage } from './portableImage'
export type { PintaExportedAsset }

/** Native fingerprints only. No canvas, export or personal-library write. */
export async function inspectImageForStudio(
  drawingId: string,
  options: { namespace?: string; signal?: AbortSignal } = {},
): Promise<PintaImageDerivation['provenance']> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  signal?.throwIfAborted()
  const { inspectPintaImageForStudio } = await import('./portableImage')
  signal?.throwIfAborted()
  return inspectPintaImageForStudio(drawingId, { namespace, signal })
}

/** Loaded only when a host explicitly requests a portable PNG; legacy JS exports stay unchanged. */
export async function exportImageForStudio(
  recipe: PintaImageRecipe,
  limits: PintaImageTargetLimits,
  options: {
    namespace?: string
    signal?: AbortSignal
    expectedProvenance?: PintaImageDerivation['provenance']
  } = {},
) {
  const input = structuredClone({
    recipe,
    limits,
    expectedProvenance: options.expectedProvenance,
  })
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  signal?.throwIfAborted()
  const { exportPintaImageForStudio } = await import('./portableImage')
  signal?.throwIfAborted()
  return exportPintaImageForStudio(input.recipe, input.limits, {
    namespace,
    signal,
    expectedProvenance: input.expectedProvenance,
  })
}

/** The personal library keeps the JS representation; the project receives its selected PNG.
 * Both are derived from the very same native source/dependency transaction. */
export async function exportImageAndSourceForStudio(
  recipeInput: PintaImageRecipe,
  limitsInput: PintaImageTargetLimits,
  options: { namespace?: string; signal?: AbortSignal } = {},
): Promise<
  | (Extract<ExportForStudioResult, { ok: true }> & {
      image: import('./portableImage').PintaPortableImage
    })
  | Extract<ExportForStudioResult, { ok: false }>
  | { ok: false; reason: 'source-changed' }
> {
  const { recipe, limits } = structuredClone({ recipe: recipeInput, limits: limitsInput })
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  signal?.throwIfAborted()
  const captured = await capturePintaAssetForImage(recipe.drawingId, { namespace, signal })
  signal?.throwIfAborted()
  if (!captured.ok)
    return captured.reason === 'needs-tileset'
      ? { ok: false, reason: 'needs-tileset', message: NEEDS_TILESET_MESSAGE }
      : { ok: false, reason: captured.reason }
  const { deriveLoadedPintaImage } = await import('./portableImage')
  signal?.throwIfAborted()
  const image = await deriveLoadedPintaImage(captured.source, recipe, limits, {
    tileset: captured.tileset,
    signal,
  })
  signal?.throwIfAborted()
  const canonical = await exportResolvedForStudio(captured.source, captured.tileset)
  signal?.throwIfAborted()
  return canonical.ok ? { ...canonical, image } : canonical
}

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
  /** Requested only by hosts choosing a portable image; omitted for historical JS callers. */
  imageSelection?: PintaImageSelectionSummary
}

export type ExportForStudioResult =
  | { ok: true; asset: PintaExportedAsset }
  | { ok: false; reason: 'not-found' | 'raster-failed' | 'asset-too-big' | 'sheet-too-big' }
  /** Só do `exportLoadedAssetForStudio`: o mapa chegou SEM o conjunto de peças dele. */
  | { ok: false; reason: 'needs-tileset'; message: string }

/**
 * A frase do mapa que chegou sozinho (o "Trazer da equipe" baixa UM desenho por vez, e o
 * mapa só se desenha com as peças que ele aponta). Pronta para a tela da criança.
 */
export const NEEDS_TILESET_MESSAGE =
  'Este mapa de peças precisa do conjunto de peças dele, e o conjunto não veio junto.'

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
 * a lista do "Trazer do Pinta". O host pode fornecer o namespace explicitamente;
 * sem ele, o perfil global é capturado uma única vez ao iniciar a operação.
 */
export async function listGalleryForStudio(
  options: { namespace?: string; signal?: AbortSignal; includeImageSelection?: boolean } = {},
): Promise<PintaGallerySummary[]> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  const includeImageSelection = options.includeImageSelection === true
  signal?.throwIfAborted()
  const persistence = createPintaPersistence({ namespace })
  const assets = await persistence.listAllAssets()
  signal?.throwIfAborted()
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  const findAsset = (id: string) => byId.get(id) ?? null
  const summaries: PintaGallerySummary[] = []
  for (const asset of assets) {
    const thumbDataUrl = await cachedThumb(namespace, asset, findAsset)
    signal?.throwIfAborted()
    summaries.push({
      id: asset.id,
      name: asset.name,
      role: assetRole(asset.kind),
      style: assetStyle(asset.kind),
      updatedAt: asset.updatedAt,
      ...(asset.projectRef?.name ? { projectName: asset.projectRef.name } : {}),
      thumbDataUrl,
      ...(includeImageSelection ? { imageSelection: imageSelectionSummary(asset, findAsset) } : {}),
    })
  }
  return summaries
}

function imageSelectionSummary(
  asset: PintaAsset,
  findAsset: (id: string) => PintaAsset | null,
): PintaImageSelectionSummary {
  switch (asset.kind) {
    case 'pixel-sprite':
    case 'vector-sprite':
      return {
        kind: 'frame',
        width: asset.frameWidth,
        height: asset.frameHeight,
        animations: asset.animations.map(({ id, name, frames }) => ({
          id,
          name,
          frameCount: frames.length,
        })),
      }
    case 'pixel-background': {
      // Gallery records are sanitized: the first cel owns every layer's size,
      // including when that layer is hidden. This summary never flattens pixels.
      const first = asset.cels[0]
      if (!first) throw new Error('O cenário de pixels não tem uma camada válida.')
      return { kind: 'background', width: first.width, height: first.height }
    }
    case 'vector-background':
      return { kind: 'background', width: asset.width, height: asset.height }
    case 'tileset':
    case 'vector-tileset':
      return {
        kind: 'tile',
        width: asset.tileSize,
        height: asset.tileSize,
        tileCount: asset.tiles.length,
      }
    case 'tilemap': {
      const tileset = findAsset(asset.tilesetId)
      if (!tileset || !isTilesetKind(tileset))
        return { kind: 'unavailable', reason: 'needs-tileset' }
      return {
        kind: 'tilemap',
        width: asset.cols * tileset.tileSize,
        height: asset.rows * tileset.tileSize,
      }
    }
  }
}

/**
 * Exporta UM desenho no formato da ponte (PNG achatado + metadados), já
 * validado pelos tetos do Estúdio — o mesmo payload do foguete "Usar no
 * Estúdio". `tilemapFront` fica de fora de propósito: a biblioteca pessoal do
 * Estúdio não o guarda (só o "Jogar meu mapa" o usa, e aquele caminho é outro).
 */
export async function exportAssetForStudio(
  id: string,
  options: { namespace?: string; signal?: AbortSignal } = {},
): Promise<ExportForStudioResult> {
  const namespace = options.namespace?.trim() ?? getPintaStorageNamespace()
  const signal = options.signal
  signal?.throwIfAborted()
  const persistence = createPintaPersistence({ namespace })
  const asset = await persistence.loadAssetById(id)
  signal?.throwIfAborted()
  if (!asset) return { ok: false, reason: 'not-found' }
  // buildStudioPayload só resolve OUTRO asset no caso tilemap→tileset; carregar
  // a galeria inteira aqui seria desperdício.
  const linked = asset.kind === 'tilemap' ? await persistence.loadAssetById(asset.tilesetId) : null
  signal?.throwIfAborted()
  const result = await exportResolvedForStudio(asset, linked)
  signal?.throwIfAborted()
  return result
}

/**
 * O MESMO payload do `exportAssetForStudio`, a partir de um desenho JÁ carregado e sem
 * tocar o IndexedDB (14/10/2026, "Trazer da equipe"): o desenho é da COLEGA, desceu da
 * conta dela como `.pinta.json` e nunca passou pela galeria deste perfil. O mapa é o único
 * que precisa de outro desenho (as peças), e um documento só não o traz: sem ele a resposta
 * é `needs-tileset` com a frase, em vez do `raster-failed` mudo do caminho da galeria.
 */
export async function exportLoadedAssetForStudio(
  asset: PintaAsset,
): Promise<ExportForStudioResult> {
  if (asset.kind === 'tilemap') {
    return { ok: false, reason: 'needs-tileset', message: NEEDS_TILESET_MESSAGE }
  }
  return exportResolvedForStudio(asset, null)
}

async function exportResolvedForStudio(
  asset: PintaAsset,
  linked: PintaAsset | null,
): Promise<ExportForStudioResult> {
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
