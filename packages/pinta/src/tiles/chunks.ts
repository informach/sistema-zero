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
  frame: number
}
/** Bytes de um bloco pintado (RGBA) para peças deste tamanho. */
export function chunkBytes(tileSize: number): number {
  const size = MAP_CHUNK_SIDE * tileSize
  return size * size * 4
}
/**
 * Guarda os blocos já pintados (o menos usado sai primeiro), com um teto em bytes: o histórico de
 * mapas não segura cópias dos canvases.
 *
 * - Bloco VAZIO não gasta canvas nem conta no teto.
 * - O bloco só é refeito quando uma casa dele muda, quando a folha das peças muda ou quando
 *   uma peça animada QUE ESTÁ NELE troca de quadro.
 * - `beginFrame` diz quantos bytes a tela de agora precisa: o teto cresce até lá, e um bloco
 *   usado nesta pintura nunca é jogado fora por outro da mesma pintura (senão cada repintura
 *   refaria tudo).
 */
export class TileChunkCache {
  private entries = new Map<string, ChunkEntry>()
  private bytes = 0
  private frame = 0
  private frameBudget = 0
  /** Quantos blocos foram pintados de novo desde o começo (para medir e testar). */
  rebuilds = 0
  constructor(
    private budget = 32 * 1024 * 1024,
    private createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
  ) {}
  get size(): number {
    return this.entries.size
  }
  get usedBytes(): number {
    return this.bytes
  }
  clear(): void {
    this.entries.clear()
    this.bytes = 0
  }
  /** Começa uma pintura da tela que vai precisar de `neededBytes` em blocos. */
  beginFrame(neededBytes = 0): void {
    this.frame += 1
    this.frameBudget = neededBytes
  }
  private drop(key: string, entry: ChunkEntry): void {
    this.entries.delete(key)
    this.bytes -= entry.bytes
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
    let filled = false
    // Só as peças animadas que aparecem NESTE bloco entram na chave da animação.
    const animated = new Map<number, number>()
    for (let r = 0; r < MAP_CHUNK_SIDE; r++)
      for (let c = 0; c < MAP_CHUNK_SIDE; c++) {
        const x = col * MAP_CHUNK_SIDE + c,
          y = row * MAP_CHUNK_SIDE + r
        if (x >= map.cols || y >= map.rows) continue
        const cell = layer.cells[y * map.cols + x] ?? -1
        values[r * MAP_CHUNK_SIDE + c] = cell
        const tile = cellTile(cell)
        if (tile < 0 || tile >= ts.tiles.length) continue
        filled = true
        if (ts.animations?.[String(tile)] && !animated.has(tile))
          animated.set(tile, animatedTile(ts, tile, time))
      }
    const hit = this.entries.get(key)
    if (!filled) {
      if (hit) this.drop(key, hit)
      return null
    }
    const animation = [...animated]
      .sort((a, b) => a[0] - b[0])
      .map(([tile, frame]) => `${tile}:${frame}`)
      .join(',')
    if (
      hit &&
      hit.source === sheet &&
      hit.animation === animation &&
      hit.values.every((v, i) => v === values[i])
    ) {
      this.entries.delete(key)
      hit.frame = this.frame
      this.entries.set(key, hit)
      return hit.canvas
    }
    if (hit) this.drop(key, hit)
    const canvas = this.createCanvas(),
      size = MAP_CHUNK_SIDE * ts.tileSize
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    this.rebuilds += 1
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
          animated.get(tile) ?? tile,
        )
      }
    const bytes = chunkBytes(ts.tileSize),
      budget = Math.max(this.budget, this.frameBudget)
    while (this.bytes + bytes > budget && this.entries.size) {
      const first = this.entries.entries().next().value
      // Os usados nesta pintura ficam no fim da fila: chegando neles, não há mais o que tirar.
      if (!first || first[1].frame === this.frame) break
      this.drop(first[0], first[1])
    }
    if (this.bytes + bytes <= budget) {
      this.entries.set(key, {
        canvas,
        source: sheet,
        values,
        animation,
        bytes,
        frame: this.frame,
      })
      this.bytes += bytes
    }
    return canvas
  }
}

/** As camadas de peças que entram na pintura, com o recorte de blocos de cada uma. */
export function visibleLayerChunks(
  map: TilemapAsset,
  tilesets: ReadonlyMap<string, AnyTilesetAsset>,
  view: MapViewport,
  includeCollision = false,
): Array<{
  layer: TilemapTileLayer
  tileset: AnyTilesetAsset
  opacity: number
  offsetX: number
  offsetY: number
  chunks: Array<{ col: number; row: number }>
}> {
  const out: ReturnType<typeof visibleLayerChunks> = []
  for (const layer of map.layers) {
    if (!isTileLayer(layer) || (layer.collision && !includeCollision)) continue
    const e = effectiveLayer(map, layer)
    if (!e.visible || !e.opacity) continue
    const tileset = tilesets.get(tileLayerTilesetId(map, layer))
    if (!tileset) continue
    out.push({
      layer,
      tileset,
      opacity: e.opacity,
      offsetX: e.offsetX,
      offsetY: e.offsetY,
      chunks: visibleChunks(
        { ...view, x: view.x - e.offsetX, y: view.y - e.offsetY },
        tileset.tileSize,
        map.cols,
        map.rows,
      ),
    })
  }
  return out
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
  const layers = visibleLayerChunks(map, tilesets, view, includeCollision)
  // O teto desta pintura: todos os blocos à vista, de todas as camadas, cabem juntos.
  cache.beginFrame(
    layers.reduce((sum, l) => sum + l.chunks.length * chunkBytes(l.tileset.tileSize), 0),
  )
  for (const { layer, tileset: ts, opacity, offsetX, offsetY, chunks } of layers) {
    const sheet = sheetOf(tileLayerTilesetId(map, layer))
    if (!sheet) continue
    ctx.save()
    ctx.globalAlpha *= opacity
    for (const { col, row } of chunks) {
      const chunk = cache.get(map, layer, ts, sheet, col, row, time)
      if (chunk)
        ctx.drawImage(
          chunk,
          (col * MAP_CHUNK_SIDE * ts.tileSize + offsetX) * scale,
          (row * MAP_CHUNK_SIDE * ts.tileSize + offsetY) * scale,
          chunk.width * scale,
          chunk.height * scale,
        )
    }
    ctx.restore()
  }
}
