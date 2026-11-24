/**
 * O mapa ACHATADO (camadas visíveis) como imagem — o PNG do export e da ponte
 * "Usar no Estúdio" (o mapa viaja achatado na v1; a grade colável é o caminho
 * de verdade p/ o bloco). Reusa o compositor de folha do export (as células
 * não se sobrepõem depois do flatten).
 *
 * Mapa com várias peças: cada célula é desenhada com o tileset (e a paleta) da
 * camada que venceu nela (`flattenWithTilesets` + `resolveMapTilesets`).
 */
import {
  type AnyTilesetAsset,
  effectiveLayer,
  isTileLayer,
  type PintaBitmap,
  resolveAssetPalette,
  type TilemapCells,
  type TilesetAsset,
  tileLayerTilesetId,
  tilemapNeedsV3,
} from '../core/project'
import { composeSheetPngDataUrl } from '../export/png'
import { drawCellImage } from './chunks'
import type { AuthorMap } from './mapCellEdits'
import { createTileCellReader, mapCellBounds } from './mapCells'
import { MAP_IMAGE_LIMITS, mapImageSize } from './mapImageBudget'
import { drawableMapTile, type MapTilesets, resolveMapTilesets } from './mapTilesets'
import { pixelSheetCanvas } from './sheetCanvas'
import { flattenWithTilesets } from './tilemapOps'

/** Só os tilesets de PIXEL (o resto vira `null`: aquela camada não aparece). */
function pixelTilesets(tilemap: AuthorMap, source: MapTilesets): Array<TilesetAsset | null> {
  return resolveMapTilesets(tilemap, source).map((tileset: AnyTilesetAsset | null) =>
    tileset?.kind === 'tileset' ? tileset : null,
  )
}

function paintPixelMap(
  ctx: CanvasRenderingContext2D,
  map: AuthorMap,
  tilesets: Array<TilesetAsset | null>,
  scale: number,
): void {
  const sheets = new Map(
    tilesets.flatMap((t) => {
      const sheet = t ? pixelSheetCanvas(t) : null
      return t && sheet ? [[t.id, sheet] as const] : []
    }),
  )
  const size = tilesets[0]?.tileSize ?? 16
  const bounds = mapCellBounds(map)
  ctx.imageSmoothingEnabled = false
  for (const layer of map.layers) {
    if (!isTileLayer<TilemapCells>(layer) || layer.collision) continue
    const e = effectiveLayer(map, layer),
      sheet = sheets.get(tileLayerTilesetId(map, layer))
    if (!e.visible || !sheet || !e.opacity) continue
    ctx.save()
    ctx.globalAlpha *= e.opacity
    createTileCellReader(layer.cells, bounds).visitOccupied(
      bounds,
      (cell, col, row) => {
        if (cell < 0) return
        drawCellImage(
          ctx,
          sheet,
          sheet.width,
          size,
          cell,
          ((col - bounds.col) * size + e.offsetX) * scale,
          ((row - bounds.row) * size + e.offsetY) * scale,
          size * scale,
        )
      },
      'row-major',
    )
    ctx.restore()
  }
}

export function tilemapPngDataUrl(
  tilemap: AuthorMap,
  tilesets: MapTilesets,
  scale = 1,
): string | null {
  const resolved = pixelTilesets(tilemap, tilesets)
  const primary = resolved[0]
  if (!primary) return null
  const image = 'origin' in tilemap ? mapImageSize(tilemap, primary.tileSize, scale) : null
  if ('origin' in tilemap && !image) return null
  if ('origin' in tilemap || tilemapNeedsV3(tilemap)) {
    const c = document.createElement('canvas')
    c.width = image?.width ?? tilemap.cols * primary.tileSize * scale
    c.height = image?.height ?? tilemap.rows * primary.tileSize * scale
    const ctx = c.getContext('2d')
    if (!ctx) return null
    paintPixelMap(ctx, tilemap, resolved, scale)
    const url = c.toDataURL('image/png')
    return url.startsWith('data:image/png') ? url : null
  }
  const palettes = resolved.map((tileset) => (tileset ? resolveAssetPalette(tileset) : null))
  const flat = flattenWithTilesets(tilemap, undefined, drawableMapTile(tilemap, resolved))
  const cells: Array<{
    bitmap: PintaBitmap
    col: number
    row: number
    colors?: readonly string[]
  }> = []
  const { cols, rows } = tilemap
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const at = row * cols + col
      const index = flat.tiles[at] ?? -1
      if (index < 0) continue
      const source = flat.sources[at] ?? 0
      const bitmap = resolved[source]?.tiles[index]
      if (!bitmap) continue
      // Peças padrão saem pela paleta do pedido (o caminho de sempre, sem objeto extra).
      const colors = source === 0 ? undefined : (palettes[source] ?? undefined)
      cells.push(colors ? { bitmap, col, row, colors } : { bitmap, col, row })
    }
  }
  return composeSheetPngDataUrl({
    cells,
    cellWidth: primary.tileSize,
    cellHeight: primary.tileSize,
    columns: tilemap.cols,
    rows: tilemap.rows,
    colors: resolveAssetPalette(primary),
    scale,
  })
}

/**
 * Miniatura do mapa CAPADA num tamanho fixo (`maxPx` no maior lado). Desenha as
 * peças JÁ ESCALADAS num canvas pequeno — NUNCA compõe o mapa inteiro em
 * resolução nativa (um 128×96 com peças de 48px daria 6144×4608, acima do teto
 * de área de canvas do Safari, além de estourar a cota de chars do Estúdio). O
 * runtime NÃO usa esta imagem (só grade + folha) — é só o thumbnail da
 * biblioteca. Devolve `{ dataUrl, width, height }` ou `null` sem canvas.
 */
export function tilemapThumbnail(
  tilemap: AuthorMap,
  tilesets: MapTilesets,
  maxPx = 512,
): { dataUrl: string; width: number; height: number } | null {
  if (!Number.isFinite(maxPx) || maxPx < 1 || maxPx > MAP_IMAGE_LIMITS.thumbnail) return null
  const resolved = pixelTilesets(tilemap, tilesets)
  const primary = resolved[0]
  if (!primary) return null
  const ts = primary.tileSize,
    image = mapImageSize(tilemap, ts, 1, maxPx)
  if (!image) return null
  const { width, height, scale } = image,
    cell = ts * scale
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  if ('origin' in tilemap || tilemapNeedsV3(tilemap)) {
    paintPixelMap(ctx, tilemap, resolved, scale)
    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl.startsWith('data:image/png') ? { dataUrl, width, height } : null
  }
  // Folhas empacotadas (pequenas: ≤8 colunas × tileSize), uma por tileset usado.
  const sheets: Array<HTMLCanvasElement | null | undefined> = []
  const sheetOf = (source: number): HTMLCanvasElement | null => {
    const known = sheets[source]
    if (known !== undefined) return known
    const tileset = resolved[source]
    const made = tileset ? pixelSheetCanvas(tileset) : null
    sheets[source] = made
    return made
  }
  if (!sheetOf(0)) return null
  ctx.imageSmoothingEnabled = false
  const flat = flattenWithTilesets(tilemap, undefined, drawableMapTile(tilemap, resolved))
  for (let row = 0; row < tilemap.rows; row += 1) {
    for (let col = 0; col < tilemap.cols; col += 1) {
      const at = row * tilemap.cols + col
      const index = flat.tiles[at] ?? -1
      if (index < 0) continue
      const sheet = sheetOf(flat.sources[at] ?? 0)
      if (!sheet) continue
      const sheetCols = Math.max(1, Math.floor(sheet.width / ts))
      const sx = (index % sheetCols) * ts
      const sy = Math.floor(index / sheetCols) * ts
      ctx.drawImage(sheet, sx, sy, ts, ts, col * cell, row * cell, cell, cell)
    }
  }
  const dataUrl = canvas.toDataURL('image/png')
  if (!dataUrl.startsWith('data:image/png')) return null
  return { dataUrl, width, height }
}
