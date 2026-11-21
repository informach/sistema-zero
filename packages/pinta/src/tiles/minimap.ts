/**
 * Cores representativas para miniaturas e navegação. A API legada retorna uma
 * cor por casa; tilemapOverview limita a saída e visita regiões armazenadas.
 */
import {
  type AnyTilesetAsset,
  effectiveLayer,
  isTileLayer,
  resolveAssetPalette,
  type TilemapAsset,
  type TilemapCells,
  type VectorFrame,
} from '../core/project'
import { bitmapDominantColor } from '../export/png'
import { isVectorGradient } from '../vector/model'
import { cellTile } from './cell'
import type { AuthorMap } from './mapCellEdits'
import { createTileCellReader, mapCellBounds } from './mapCells'
import { drawableMapTile, type MapTilesets, resolveMapTilesets } from './mapTilesets'
import { flattenWithTilesets } from './tilemapOps'

/** Cor "dominante" de um tile vetorial: o fill visível do shape do TOPO. */
function vectorTileColor(tile: VectorFrame): string | null {
  for (let i = tile.length - 1; i >= 0; i -= 1) {
    const shape = tile[i]
    if (!shape) continue
    // Degradê: usa a cor de começo como representante no minimapa.
    if (isVectorGradient(shape.fill)) return shape.fill.from
    if (shape.fill !== 'none') return shape.fill
    if (shape.stroke) return shape.stroke.color
  }
  return null
}

function tileColorsOf(tileset: AnyTilesetAsset): Array<string | null> {
  if (tileset.kind === 'tileset') {
    const palette = resolveAssetPalette(tileset)
    return tileset.tiles.map((tile) => bitmapDominantColor(tile, palette))
  }
  return tileset.tiles.map((tile) => vectorTileColor(tile))
}

const tileColorCache = new WeakMap<AnyTilesetAsset, Array<string | null>>()
/** A changed immutable artwork value gets new colors; callers never need a fake map asset. */
export function tilesetMinimapColors(tileset: AnyTilesetAsset): Array<string | null> {
  const cached = tileColorCache.get(tileset)
  if (cached) return cached
  const colors = tileColorsOf(tileset)
  tileColorCache.set(tileset, colors)
  return colors
}

/**
 * Uma cor CSS (ou null = célula vazia) por célula, row-major. Com várias peças,
 * cada célula usa a cor do tileset da camada que venceu nela.
 */
export function tilemapMinimapColors(
  tilemap: TilemapAsset,
  tilesets: MapTilesets,
): Array<string | null> {
  return minimapColors(tilemap, tilesets, tileColorsOf)
}

export function cachedTilemapMinimapColors(
  tilemap: TilemapAsset,
  tilesets: MapTilesets,
): Array<string | null> {
  return minimapColors(tilemap, tilesets, tilesetMinimapColors)
}

function minimapColors(
  tilemap: TilemapAsset,
  tilesets: MapTilesets,
  colorsOf: (asset: AnyTilesetAsset) => Array<string | null>,
): Array<string | null> {
  const resolved = resolveMapTilesets(tilemap, tilesets)
  // Camada sem peças achadas não tapa a de baixo (o mesmo que o jogo mostra).
  const flat = flattenWithTilesets(tilemap, undefined, drawableMapTile(tilemap, resolved))
  const colorsBySource = resolved.map((tileset) => (tileset ? colorsOf(tileset) : null))
  return Array.from(flat.tiles, (index, at) =>
    index >= 0 ? (colorsBySource[flat.sources[at] ?? 0]?.[index] ?? null) : null,
  )
}

export const MINIMAP_MAX_SIDE = 256
export interface TilemapOverview {
  width: number
  height: number
  colors: Array<string | null>
}

/** Representative colors only; storage and output size stay independent of empty world area. */
export function tilemapOverview(
  map: AuthorMap,
  tilesets: MapTilesets,
  maxSide = MINIMAP_MAX_SIDE,
): TilemapOverview | null {
  if (!Number.isSafeInteger(maxSide) || maxSide < 1 || maxSide > MINIMAP_MAX_SIDE) return null
  const scale = Math.min(1, maxSide / Math.max(map.cols, map.rows)),
    width = Math.max(1, Math.round(map.cols * scale)),
    height = Math.max(1, Math.round(map.rows * scale))
  if (!('origin' in map) && width === map.cols && height === map.rows)
    return { width, height, colors: cachedTilemapMinimapColors(map, tilesets) }
  const bounds = mapCellBounds(map),
    colors: Array<string | null> = Array(width * height).fill(null),
    winners = new Int32Array(colors.length),
    resolved = resolveMapTilesets(map, tilesets),
    byId = new Map(resolved.flatMap((asset) => (asset ? [[asset.id, asset] as const] : []))),
    tileSize = resolved[0]?.tileSize
  if (!tileSize) return { width, height, colors }
  for (const layer of map.layers) {
    if (!isTileLayer<TilemapCells>(layer) || layer.collision) continue
    const e = effectiveLayer(map, layer),
      asset = byId.get(layer.tilesetId ?? map.tilesetId)
    if (!e.visible || !e.opacity || !asset) continue
    const palette = tilesetMinimapColors(asset),
      reader = createTileCellReader(layer.cells, bounds),
      dx = e.offsetX / tileSize,
      dy = e.offsetY / tileSize
    winners.fill(-1)
    reader.visitOccupied(bounds, (cell, col, row) => {
      const tile = cellTile(cell),
        color = palette[tile]
      if (tile < 0 || tile >= asset.tiles.length || !color) return
      const left = Math.max(bounds.col, col + dx),
        top = Math.max(bounds.row, row + dy),
        right = Math.min(bounds.col + bounds.cols, col + dx + 1),
        bottom = Math.min(bounds.row + bounds.rows, row + dy + 1)
      if (left >= right || top >= bottom) return
      const x = Math.min(
          width - 1,
          Math.floor((((left + right) / 2 - bounds.col) * width) / bounds.cols),
        ),
        y = Math.min(
          height - 1,
          Math.floor((((top + bottom) / 2 - bounds.row) * height) / bounds.rows),
        ),
        at = y * width + x,
        rank = (row - bounds.row) * map.cols + col - bounds.col
      if (rank < winners[at]!) return
      winners[at] = rank
      colors[at] = color
    })
  }
  return { width, height, colors }
}

/** Pinta o minimapa num canvas 1:1 (guard de contexto: happy-dom → false). */
export function paintMinimap(
  canvas: HTMLCanvasElement,
  cols: number,
  rows: number,
  colors: Array<string | null>,
): boolean {
  if (
    !Number.isSafeInteger(cols) ||
    !Number.isSafeInteger(rows) ||
    cols < 1 ||
    rows < 1 ||
    cols > MINIMAP_MAX_SIDE ||
    rows > MINIMAP_MAX_SIDE ||
    colors.length !== cols * rows
  )
    return false
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  ctx.clearRect(0, 0, cols, rows)
  for (let i = 0; i < colors.length; i += 1) {
    const color = colors[i]
    if (!color) continue
    ctx.fillStyle = color
    ctx.fillRect(i % cols, Math.floor(i / cols), 1, 1)
  }
  return true
}
