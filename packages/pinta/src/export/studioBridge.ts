/**
 * A ponte "Usar no Estúdio": monta o payload {dataUrl, width, height} que o
 * host grava em `@sistemazero/studio/personal-assets`. SEMPRE um PNG achatado:
 * sprites enviam a FOLHA inteira (a criança usa os from/to da receita no bloco
 * "Animar sprite"), tilesets a folha de peças, tilemap o mapa achatado,
 * cenários a imagem. `null` = não deu para rasterizar (o chamador mostra toast).
 */
import type { ActiveFrameRef } from '../core/assetEdit'
import { activeBitmapOf } from '../core/assetEdit'
import { isTilesetKind, type PintaAsset, resolveAssetPalette } from '../core/project'
import type { PintaSpriteMeta, PintaTilesetMeta } from '../core/types'
import { packTileset, tilesetPngDataUrl } from '../tiles/packTileset'
import { packVectorTileset, vectorTilesetPngDataUrl } from '../tiles/packVectorTileset'
import { tilemapPngDataUrl } from '../tiles/renderTilemap'
import { vectorTilemapPngDataUrl } from '../tiles/renderVectorTilemap'
import { vectorPngDataUrl } from '../vector/rasterize'
import { bitmapToPngDataUrl } from './png'
import { packSpritesheet, spritesheetPngDataUrl } from './spritesheet'
import { packVectorSpritesheet, vectorSheetPngDataUrl } from './vectorSheet'

export interface StudioPayload {
  dataUrl: string
  width: number
  height: number
  /** Só sprites: animações nomeadas p/ o seletor do bloco "Animar sprite" no Estúdio. */
  sprite?: PintaSpriteMeta
  /** Só tilesets: tamanho + índices sólidos p/ o seletor de tiles do Estúdio. */
  tileset?: PintaTilesetMeta
}

/** Extrai as animações da geometria da folha (mesma p/ pixel e vetor). */
export function spriteMetaFromPack(pack: {
  frameWidth: number
  frameHeight: number
  animations: ReadonlyArray<{ name: string; from: number; to: number; fps: number; loop: boolean }>
}): PintaSpriteMeta {
  return {
    frameW: pack.frameWidth,
    frameH: pack.frameHeight,
    animations: pack.animations.map((a) => ({
      name: a.name,
      from: a.from,
      to: a.to,
      fps: a.fps,
      loop: a.loop,
    })),
  }
}

/** Índices SÓLIDOS de um tileset (boolean[] paralelo → lista de índices). */
export function tilesetMetaFrom(tileSize: number, solid: readonly boolean[]): PintaTilesetMeta {
  return { tileSize, solid: solid.flatMap((s, i) => (s ? [i] : [])) }
}

// Teto de UM asset no Studio — manter em sincronia com
// MAX_ASSET_DATA_URL_CHARS de packages/studio/src/core/project.ts (o
// EditorScreen valida de novo antes de enviar, com a mensagem gentil).
const STUDIO_MAX_ASSET_CHARS = 800_000

export async function buildStudioPayload(
  asset: PintaAsset,
  findAsset: (id: string) => PintaAsset | null,
  frameRef: ActiveFrameRef,
): Promise<StudioPayload | null> {
  switch (asset.kind) {
    case 'pixel-sprite': {
      const pack = packSpritesheet(asset)
      const dataUrl = spritesheetPngDataUrl(asset, pack)
      if (!dataUrl) return null
      return {
        dataUrl,
        width: pack.columns * pack.frameWidth,
        height: pack.rows * pack.frameHeight,
        sprite: spriteMetaFromPack(pack),
      }
    }
    case 'tileset': {
      const pack = packTileset(asset)
      const dataUrl = tilesetPngDataUrl(asset)
      if (!dataUrl) return null
      return {
        dataUrl,
        width: pack.columns * pack.tileSize,
        height: pack.rows * pack.tileSize,
        tileset: tilesetMetaFrom(asset.tileSize, asset.solid),
      }
    }
    case 'tilemap': {
      const tileset = findAsset(asset.tilesetId)
      if (!tileset || !isTilesetKind(tileset)) return null
      const dataUrl =
        tileset.kind === 'tileset'
          ? tilemapPngDataUrl(asset, tileset)
          : await vectorTilemapPngDataUrl(asset, tileset)
      if (!dataUrl) return null
      return {
        dataUrl,
        width: asset.cols * tileset.tileSize,
        height: asset.rows * tileset.tileSize,
      }
    }
    case 'vector-background': {
      // Cenário vetorial vai ×2: upscale vetorial é re-render (sem perda) e o
      // PNG chega com folga de resolução para cobrir o palco 800×480. É o único
      // kind SEM receita acoplada (sprite/tileset têm frameW/tileSize — lá o ×1
      // é contrato). Estouro do teto do Studio ou falha de raster → ×1 de antes.
      const scaled = await vectorPngDataUrl(asset, 2)
      if (scaled && scaled.length <= STUDIO_MAX_ASSET_CHARS) {
        return { dataUrl: scaled, width: asset.width * 2, height: asset.height * 2 }
      }
      const dataUrl = await vectorPngDataUrl(asset)
      if (!dataUrl) return null
      return { dataUrl, width: asset.width, height: asset.height }
    }
    case 'vector-sprite': {
      const pack = packVectorSpritesheet(asset)
      const dataUrl = await vectorSheetPngDataUrl(pack)
      if (!dataUrl) return null
      return {
        dataUrl,
        width: pack.columns * pack.frameWidth,
        height: pack.rows * pack.frameHeight,
        sprite: spriteMetaFromPack(pack),
      }
    }
    case 'vector-tileset': {
      const pack = packVectorTileset(asset)
      const dataUrl = await vectorTilesetPngDataUrl(asset)
      if (!dataUrl) return null
      return {
        dataUrl,
        width: pack.columns * pack.tileSize,
        height: pack.rows * pack.tileSize,
        tileset: tilesetMetaFrom(asset.tileSize, asset.solid),
      }
    }
    default: {
      const bitmap = activeBitmapOf(asset, frameRef)
      if (!bitmap) return null
      const dataUrl = bitmapToPngDataUrl(bitmap, resolveAssetPalette(asset))
      if (!dataUrl) return null
      return { dataUrl, width: bitmap.width, height: bitmap.height }
    }
  }
}
