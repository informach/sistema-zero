import {
  type AnyTilesetAsset,
  effectiveLayer,
  isTileLayer,
  type TilemapAsset,
  type TilemapTileLayer,
  tileLayerTilesetId,
} from '../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellFlags, cellTile } from './cell'

export const MAP_CHUNK_SIDE = 32
export interface MapViewport {
  x: number
  y: number
  width: number
  height: number
}
export function visibleChunks(
  view: MapViewport,
  tileSize: number,
  cols: number,
  rows: number,
): Array<{ col: number; row: number }> {
  const size = tileSize * MAP_CHUNK_SIDE
  const out: Array<{ col: number; row: number }> = []
  for (
    let row = Math.max(0, Math.floor(view.y / size));
    row < Math.min(Math.ceil(rows / MAP_CHUNK_SIDE), Math.ceil((view.y + view.height) / size));
    row++
  )
    for (
      let col = Math.max(0, Math.floor(view.x / size));
      col < Math.min(Math.ceil(cols / MAP_CHUNK_SIDE), Math.ceil((view.x + view.width) / size));
      col++
    )
      out.push({ col, row })
  return out
}

/** Matriz Tiled: troca x/y primeiro, depois espelha horizontal e verticalmente. */
export function cellMatrix(cell: number): [number, number, number, number] {
  const f = cellFlags(cell),
    h = f & CELL_FLIP_H ? -1 : 1,
    v = f & CELL_FLIP_V ? -1 : 1
  return f & CELL_FLIP_D ? [0, v, h, 0] : [h, 0, 0, v]
}
export function animatedTile(ts: AnyTilesetAsset, tile: number, time: number): number {
  const frames = ts.animations?.[String(tile)]
  if (!frames?.length) return tile
  const total = frames.reduce((s, f) => s + f.duration, 0)
  let at = ((time % total) + total) % total
  for (const frame of frames) {
    if (at < frame.duration) return frame.tile
    at -= frame.duration
  }
  return tile
}
export function drawCellImage(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  sheetWidth: number,
  tileSize: number,
  cell: number,
  x: number,
  y: number,
  size: number,
  tile = cellTile(cell),
): void {
  if (tile < 0) return
  const columns = Math.max(1, Math.floor(sheetWidth / tileSize))
  const sx = (tile % columns) * tileSize,
    sy = Math.floor(tile / columns) * tileSize
  if (!cellFlags(cell)) {
    ctx.drawImage(sheet, sx, sy, tileSize, tileSize, x, y, size, size)
    return
  }
  ctx.save()
  ctx.translate(x + size / 2, y + size / 2)
  ctx.transform(...cellMatrix(cell), 0, 0)
  ctx.drawImage(sheet, sx, sy, tileSize, tileSize, -size / 2, -size / 2, size, size)
  ctx.restore()
}

interface ChunkEntry {
  canvas: HTMLCanvasElement
  values: Int16Array
  source: CanvasImageSource
  animation: string
  bytes: number
}
/** LRU com orçamento em bytes: o histórico de mapas não segura cópias dos canvases. */
export class TileChunkCache {
  private entries = new Map<string, ChunkEntry>()
  private bytes = 0
  constructor(private budget = 32 * 1024 * 1024) {}
  clear(): void {
    this.entries.clear()
    this.bytes = 0
  }
  get(
    map: TilemapAsset,
    layer: TilemapTileLayer,
    ts: AnyTilesetAsset,
    sheet: HTMLCanvasElement,
    col: number,
    row: number,
    time = 0,
  ): HTMLCanvasElement | null {
    const key = `${layer.id}:${col}:${row}:${map.cols}:${map.rows}`
    const values = new Int16Array(MAP_CHUNK_SIDE * MAP_CHUNK_SIDE).fill(-1)
    for (let r = 0; r < MAP_CHUNK_SIDE; r++)
      for (let c = 0; c < MAP_CHUNK_SIDE; c++) {
        const x = col * MAP_CHUNK_SIDE + c,
          y = row * MAP_CHUNK_SIDE + r
        if (x < map.cols && y < map.rows)
          values[r * MAP_CHUNK_SIDE + c] = layer.cells[y * map.cols + x] ?? -1
      }
    const animation = Object.keys(ts.animations ?? {})
      .map((t) => `${t}:${animatedTile(ts, Number(t), time)}`)
      .join(',')
    const hit = this.entries.get(key)
    if (
      hit &&
      hit.source === sheet &&
      hit.animation === animation &&
      hit.values.every((v, i) => v === values[i])
    ) {
      this.entries.delete(key)
      this.entries.set(key, hit)
      return hit.canvas
    }
    if (hit) {
      this.entries.delete(key)
      this.bytes -= hit.bytes
    }
    const canvas = document.createElement('canvas'),
      size = MAP_CHUNK_SIDE * ts.tileSize
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.imageSmoothingEnabled = false
    for (let r = 0; r < MAP_CHUNK_SIDE; r++)
      for (let c = 0; c < MAP_CHUNK_SIDE; c++) {
        const cell = values[r * MAP_CHUNK_SIDE + c] ?? -1,
          tile = cellTile(cell)
        if (tile < 0 || tile >= ts.tiles.length) continue
        drawCellImage(
          ctx,
          sheet,
          sheet.width,
          ts.tileSize,
          cell,
          c * ts.tileSize,
          r * ts.tileSize,
          ts.tileSize,
          animatedTile(ts, tile, time),
        )
      }
    const bytes = size * size * 4
    while (this.bytes + bytes > this.budget && this.entries.size) {
      const first = this.entries.entries().next().value
      if (!first) break
      this.entries.delete(first[0])
      this.bytes -= first[1].bytes
    }
    if (bytes <= this.budget) {
      this.entries.set(key, { canvas, source: sheet, values, animation, bytes })
      this.bytes += bytes
    }
    return canvas
  }
}

export function paintTilemapLayers(
  ctx: CanvasRenderingContext2D,
  map: TilemapAsset,
  tilesets: ReadonlyMap<string, AnyTilesetAsset>,
  sheetOf: (id: string) => HTMLCanvasElement | null,
  cache: TileChunkCache,
  view: MapViewport,
  scale = 1,
  time = 0,
  includeCollision = false,
): void {
  for (const layer of map.layers) {
    if (!isTileLayer(layer) || (layer.collision && !includeCollision)) continue
    const e = effectiveLayer(map, layer)
    if (!e.visible || !e.opacity) continue
    const id = tileLayerTilesetId(map, layer),
      ts = tilesets.get(id),
      sheet = sheetOf(id)
    if (!ts || !sheet) continue
    const shifted = { ...view, x: view.x - e.offsetX, y: view.y - e.offsetY }
    ctx.save()
    ctx.globalAlpha *= e.opacity
    for (const { col, row } of visibleChunks(shifted, ts.tileSize, map.cols, map.rows)) {
      const chunk = cache.get(map, layer, ts, sheet, col, row, time)
      if (chunk)
        ctx.drawImage(
          chunk,
          (col * MAP_CHUNK_SIDE * ts.tileSize + e.offsetX) * scale,
          (row * MAP_CHUNK_SIDE * ts.tileSize + e.offsetY) * scale,
          chunk.width * scale,
          chunk.height * scale,
        )
    }
    ctx.restore()
  }
}
