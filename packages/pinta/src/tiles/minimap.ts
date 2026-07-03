/**
 * Minimapa do tilemap para a miniatura do card: 1 célula = 1 "pixel" com a cor
 * dominante do tile (o canvas cols×rows é esticado por CSS pixelated). Puro e
 * O(células) — barato até no mapa máximo de 100×100.
 */
import type { AnyTilesetAsset, TilemapAsset, VectorFrame } from '../core/project'
import { bitmapDominantColor } from '../export/png'
import { isVectorGradient } from '../vector/model'
import { flattenLayers } from './tilemapOps'

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

/** Uma cor CSS (ou null = célula vazia) por célula, row-major. */
export function tilemapMinimapColors(
  tilemap: TilemapAsset,
  tileset: AnyTilesetAsset,
): Array<string | null> {
  const flat = flattenLayers(tilemap)
  const tileColors =
    tileset.kind === 'tileset'
      ? tileset.tiles.map((tile) => bitmapDominantColor(tile, tileset.paletteId))
      : tileset.tiles.map((tile) => vectorTileColor(tile))
  return Array.from(flat, (index) => (index >= 0 ? (tileColors[index] ?? null) : null))
}

/** Pinta o minimapa num canvas 1:1 (guard de contexto: happy-dom → false). */
export function paintMinimap(
  canvas: HTMLCanvasElement,
  cols: number,
  rows: number,
  colors: Array<string | null>,
): boolean {
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
