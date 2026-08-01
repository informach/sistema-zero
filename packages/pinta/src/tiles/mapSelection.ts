/**
 * Seleção RETANGULAR de células do mapa (espelho de `pixel/selection.ts`):
 * copiar/extrair uma região vira um `TileStamp` flutuante que a criança
 * arrasta; soltar carimba 1:1 (SEM repetição de padrão). Célula vazia (`-1`)
 * do recorte é buraco — não apaga o que está por baixo. Tudo puro.
 */
import type { TilemapAsset, TilemapLayer } from '../core/project'
import type { CellPos, CellRect } from './cellGeometry'
import type { TileStamp } from './stamp'

function layerOf(tilemap: TilemapAsset, layerId: string): TilemapLayer | null {
  return tilemap.layers.find((l) => l.id === layerId) ?? null
}

function cellsAt(layer: TilemapLayer, cols: number, rect: CellRect): Int16Array {
  const out = new Int16Array(rect.cols * rect.rows).fill(-1)
  for (let r = 0; r < rect.rows; r += 1) {
    for (let c = 0; c < rect.cols; c += 1) {
      out[r * rect.cols + c] = layer.cells[(rect.row + r) * cols + (rect.col + c)] ?? -1
    }
  }
  return out
}

/**
 * Há alguma célula PREENCHIDA na região? Marcar um pedaço só de grade vazia não
 * é selecionar nada — a criança quer pegar o que ela pintou (espelho do
 * `hasPaintedPixel` do pixel).
 */
export function hasFilledCell(tilemap: TilemapAsset, layerId: string, rect: CellRect): boolean {
  const layer = layerOf(tilemap, layerId)
  if (!layer) return false
  for (let r = 0; r < rect.rows; r += 1) {
    for (let c = 0; c < rect.cols; c += 1) {
      if ((layer.cells[(rect.row + r) * tilemap.cols + (rect.col + c)] ?? -1) >= 0) return true
    }
  }
  return false
}

/** Copia a região da camada num carimbo (os vazios viram buraco `-1`). */
export function copyRegion(tilemap: TilemapAsset, layerId: string, rect: CellRect): TileStamp {
  const layer = layerOf(tilemap, layerId)
  if (!layer)
    return {
      cols: rect.cols,
      rows: rect.rows,
      tiles: new Int16Array(rect.cols * rect.rows).fill(-1),
    }
  return { cols: rect.cols, rows: rect.rows, tiles: cellsAt(layer, tilemap.cols, rect) }
}

/** Apaga a região (tudo vira `-1`). Devolve o MESMO asset quando nada muda. */
export function clearRegion(tilemap: TilemapAsset, layerId: string, rect: CellRect): TilemapAsset {
  const index = tilemap.layers.findIndex((l) => l.id === layerId)
  const layer = tilemap.layers[index]
  if (!layer) return tilemap
  let cells: Int16Array | null = null
  for (let r = 0; r < rect.rows; r += 1) {
    for (let c = 0; c < rect.cols; c += 1) {
      const at = (rect.row + r) * tilemap.cols + (rect.col + c)
      if ((cells ?? layer.cells)[at] === -1) continue
      if (!cells) cells = new Int16Array(layer.cells)
      cells[at] = -1
    }
  }
  if (!cells) return tilemap
  const next = { ...layer, cells }
  return { ...tilemap, layers: tilemap.layers.map((l, i) => (i === index ? next : l)) }
}

/**
 * Recorta a região: devolve o mapa com o buraco (`-1`) no lugar e o recorte
 * flutuante (carimbo). Espelho de `extractSelection` do pixel.
 */
export function extractRegion(
  tilemap: TilemapAsset,
  layerId: string,
  rect: CellRect,
): { remaining: TilemapAsset; floating: TileStamp } {
  return {
    remaining: clearRegion(tilemap, layerId, rect),
    floating: copyRegion(tilemap, layerId, rect),
  }
}

/**
 * Cola o carimbo flutuante 1:1 com o canto em `at` (SEM repetição de padrão);
 * buraco (`-1`) não apaga o que está por baixo; posições fora da grade são
 * cortadas. Devolve o MESMO asset quando nada muda.
 */
export function stampRegionAt(
  tilemap: TilemapAsset,
  layerId: string,
  at: CellPos,
  stamp: TileStamp,
): TilemapAsset {
  const index = tilemap.layers.findIndex((l) => l.id === layerId)
  const layer = tilemap.layers[index]
  if (!layer) return tilemap
  let cells: Int16Array | null = null
  for (let r = 0; r < stamp.rows; r += 1) {
    const row = at.row + r
    if (row < 0 || row >= tilemap.rows) continue
    for (let c = 0; c < stamp.cols; c += 1) {
      const col = at.col + c
      if (col < 0 || col >= tilemap.cols) continue
      const value = stamp.tiles[r * stamp.cols + c] ?? -1
      if (value < 0) continue
      const idx = row * tilemap.cols + col
      if ((cells ?? layer.cells)[idx] === value) continue
      if (!cells) cells = new Int16Array(layer.cells)
      cells[idx] = value
    }
  }
  if (!cells) return tilemap
  const next = { ...layer, cells }
  return { ...tilemap, layers: tilemap.layers.map((l, i) => (i === index ? next : l)) }
}
