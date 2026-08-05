/**
 * A ponte "Usar no Estúdio": monta o payload {dataUrl, width, height} que o
 * host grava em `@sistemazero/studio/personal-assets`. SEMPRE um PNG achatado:
 * sprites enviam a FOLHA inteira (a criança usa os from/to da receita no bloco
 * "Animar sprite"), tilesets a folha de peças, tilemap o mapa achatado,
 * cenários a imagem. `null` = não deu para rasterizar (o chamador mostra toast).
 */
import type { ActiveFrameRef } from '../core/assetEdit'
import { flattenActiveOf } from '../core/assetEdit'
import {
  type AnyTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  resolveAssetPalette,
  type TilemapAsset,
  type TilemapLayer,
} from '../core/project'
import type { PintaSpriteMeta, PintaTilemapMeta, PintaTilesetMeta } from '../core/types'
import { packTileset, tilesetPngDataUrl } from '../tiles/packTileset'
import { packVectorTileset, vectorTilesetPngDataUrl } from '../tiles/packVectorTileset'
import { tilemapThumbnail } from '../tiles/renderTilemap'
import { vectorTilemapPngDataUrl } from '../tiles/renderVectorTilemap'
import { hasFrontLayer } from '../tiles/tilemapOps'
import { vectorPngDataUrl } from '../vector/rasterize'
import { bitmapToPngDataUrl } from './png'
import { packSpritesheet, spritesheetPngDataUrl } from './spritesheet'
import { tilemapToStudioGrid } from './studioGrid'
import { packVectorSpritesheet, vectorSheetPngDataUrl } from './vectorSheet'

export interface StudioPayload {
  dataUrl: string
  width: number
  height: number
  /** Só sprites: animações nomeadas p/ o seletor do bloco "Animar sprite" no Estúdio. */
  sprite?: PintaSpriteMeta
  /** Só tilesets: tamanho + índices sólidos p/ o seletor de tiles do Estúdio. */
  tileset?: PintaTilesetMeta
  /** Só tilemaps: grade jogável + folha de peças EMBUTIDA (mapa auto-contido). */
  tilemap?: PintaTilemapMeta
  /**
   * Só tilemaps COM camada "da frente": a grade só das camadas da frente (mesma
   * folha embutida) — o Estúdio desenha por cima do jogador.
   */
  tilemapFront?: PintaTilemapMeta
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

/** boolean[] paralelo → lista de índices ligados. */
function indicesOf(flags: readonly boolean[]): number[] {
  return flags.flatMap((f, i) => (f ? [i] : []))
}

/**
 * Índices SÓLIDOS + PLATAFORMA de um tileset. `platform` é OMITIDO quando vazio
 * → payload de tileset sem plataforma fica byte-idêntico ao de antes (retrocompat).
 */
export function tilesetMetaFrom(
  tileSize: number,
  solid: readonly boolean[],
  platform: readonly boolean[] = [],
): PintaTilesetMeta {
  const platformIdx = indicesOf(platform)
  return {
    tileSize,
    solid: indicesOf(solid),
    ...(platformIdx.length ? { platform: platformIdx } : {}),
  }
}

/**
 * Metadados de MAPA (puro, testável sem canvas): grade no formato do Estúdio +
 * sólidos/plataformas do tileset + a folha de peças já rasterizada (`sheet`).
 * `platform` OMITIDO quando vazio (retrocompat byte-idêntica).
 */
export function tilemapMetaFrom(
  tilemap: TilemapAsset,
  tileset: AnyTilesetAsset,
  sheet: { dataUrl: string; width: number; height: number },
  include?: (layer: TilemapLayer) => boolean,
): PintaTilemapMeta {
  const platformIdx = indicesOf(tileset.platform)
  // Grade da FRENTE só no meta COMPLETO (sem predicado) e quando há camada de
  // frente — o gk a desenha por cima do jogador na opção "frente". O meta
  // `tilemapFront` (chamado COM predicado) não repete essa grade.
  const frontGrid =
    include === undefined && hasFrontLayer(tilemap)
      ? tilemapToStudioGrid(tilemap, (l) => l.front === true)
      : undefined
  return {
    tileSize: tileset.tileSize,
    cols: tilemap.cols,
    rows: tilemap.rows,
    grid: tilemapToStudioGrid(tilemap, include),
    solid: indicesOf(tileset.solid),
    ...(platformIdx.length ? { platform: platformIdx } : {}),
    ...(frontGrid ? { frontGrid } : {}),
    tileset: sheet,
  }
}

// Teto de UM asset no Studio — manter em sincronia com
// MAX_ASSET_DATA_URL_CHARS de packages/studio/src/core/project.ts (o
// EditorScreen valida de novo antes de enviar, com a mensagem gentil).
export const STUDIO_MAX_ASSET_CHARS = 800_000

// Teto da FOLHA de peças embutida no metadado de MAPA — manter em sincronia com
// MAX_TILEMAP_SHEET_CHARS de packages/studio/src/core/project.ts (o sanitizador
// de lá descartaria o metadado em silêncio).
export const STUDIO_MAX_TILEMAP_SHEET_CHARS = 180_000

/**
 * O payload cabe nos tetos do Estúdio? Funil ÚNICO das checagens que antes
 * viviam duplicadas nos call sites (enviar, jogar o mapa, reenvio automático).
 */
export function validateStudioPayloadSize(
  payload: StudioPayload,
): 'ok' | 'asset-too-big' | 'sheet-too-big' {
  if (payload.dataUrl.length > STUDIO_MAX_ASSET_CHARS) return 'asset-too-big'
  if (payload.tilemap && payload.tilemap.tileset.dataUrl.length > STUDIO_MAX_TILEMAP_SHEET_CHARS) {
    return 'sheet-too-big'
  }
  if (
    payload.tilemapFront &&
    payload.tilemapFront.tileset.dataUrl.length > STUDIO_MAX_TILEMAP_SHEET_CHARS
  ) {
    return 'sheet-too-big'
  }
  return 'ok'
}

// Maior lado da MINIATURA do mapa na biblioteca (o runtime não usa esta imagem
// — só a grade+folha do metadado). Capar evita cota estourada e canvas gigante.
const STUDIO_TILEMAP_THUMB_PX = 512

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
        tileset: tilesetMetaFrom(asset.tileSize, asset.solid, asset.platform),
      }
    }
    case 'tilemap': {
      const tileset = findAsset(asset.tilesetId)
      if (!tileset || !isTilesetKind(tileset)) return null
      // dataUrl do ASSET = miniatura do mapa achatado, CAPADA em 512px (o
      // runtime usa a grade+folha do metadado, não esta imagem) — mapas grandes
      // não estouram a cota nem o teto de canvas do device.
      const nativeMax = Math.max(asset.cols, asset.rows) * tileset.tileSize
      const thumbScale =
        nativeMax > STUDIO_TILEMAP_THUMB_PX ? STUDIO_TILEMAP_THUMB_PX / nativeMax : 1
      const thumb =
        tileset.kind === 'tileset'
          ? tilemapThumbnail(asset, tileset, STUDIO_TILEMAP_THUMB_PX)
          : await vectorTilemapPngDataUrl(asset, tileset, thumbScale).then((url) =>
              url
                ? {
                    dataUrl: url,
                    width: Math.round(asset.cols * tileset.tileSize * thumbScale),
                    height: Math.round(asset.rows * tileset.tileSize * thumbScale),
                  }
                : null,
            )
      if (!thumb) return null
      const dataUrl = thumb.dataUrl
      // A FOLHA de peças vai EMBUTIDA no metadado (mapa auto-contido): o bloco
      // "Criar mapa do meu desenho" monta grade + peças + sólidos sozinho.
      const sheetPack =
        tileset.kind === 'tileset' ? packTileset(tileset) : packVectorTileset(tileset)
      const sheetUrl =
        tileset.kind === 'tileset'
          ? tilesetPngDataUrl(tileset)
          : await vectorTilesetPngDataUrl(tileset)
      if (!sheetUrl) return null
      const sheet = {
        dataUrl: sheetUrl,
        width: sheetPack.columns * tileset.tileSize,
        height: sheetPack.rows * tileset.tileSize,
      }
      // `tilemap` = mapa COMPLETO (todas as camadas visíveis) — é o que a ponte
      // "Usar no Estúdio" grava em "Meus desenhos" e o que o "Jogar meu mapa"
      // desenha como base. A frente (se houver) vira um 2º meta SÓ com as
      // camadas "da frente", que o jogo redesenha DEPOIS do jogador (as peças
      // de frente aparecem nos dois passes = oclusão por cima do herói; sem
      // filtrar o `tilemap` aqui a decoração NÃO some no caminho "Meus desenhos").
      const front = hasFrontLayer(asset)
      return {
        dataUrl,
        width: thumb.width,
        height: thumb.height,
        tilemap: tilemapMetaFrom(asset, tileset, sheet),
        ...(front
          ? { tilemapFront: tilemapMetaFrom(asset, tileset, sheet, (l) => l.front === true) }
          : {}),
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
        tileset: tilesetMetaFrom(asset.tileSize, asset.solid, asset.platform),
      }
    }
    default: {
      // Cenário: o Estúdio recebe o desenho VISÍVEL (camadas achatadas).
      const bitmap = flattenActiveOf(asset, frameRef)
      if (!bitmap) return null
      const dataUrl = bitmapToPngDataUrl(bitmap, resolveAssetPalette(asset))
      if (!dataUrl) return null
      return { dataUrl, width: bitmap.width, height: bitmap.height }
    }
  }
}
