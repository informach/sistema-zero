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
 * - O teto não cresce com a tela. Canvas de blocos descartados são reciclados antes de alocar.
 * - `get` empresta o canvas até a próxima chamada: o consumidor deve desenhá-lo imediatamente.
 * - Se nem um bloco cabe no teto, usa um único canvas de trabalho, sem guardar entradas.
 *   A memória RGBA é limitada a max(teto, bytes de um bloco), inclusive nesse caso.
 */
export class TileChunkCache {
  private entries = new Map<string, ChunkEntry>()
  private bytes = 0
  private scratch: HTMLCanvasElement | null = null
  /** Estimativa do conjunto visível, sem ampliar o orçamento de retenção. */
  workingSetBytes = 0
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
    return this.bytes + (this.scratch ? this.scratch.width * this.scratch.height * 4 : 0)
  }
  get underPressure(): boolean {
    return this.workingSetBytes > this.budget
  }
  clear(): void {
    for (const entry of this.entries.values()) this.release(entry.canvas)
    this.entries.clear()
    this.bytes = 0
    if (this.scratch) this.release(this.scratch)
    this.scratch = null
    this.workingSetBytes = 0
  }
  /** Começa uma pintura da tela que vai precisar de `neededBytes` em blocos. */
  beginFrame(neededBytes = 0): void {
    this.workingSetBytes = neededBytes
  }
  private release(canvas: HTMLCanvasElement): void {
    // Canvas não DOM (inclusive o motor de testes) podem restaurar o tamanho padrão com zero.
    canvas.width = 1
    canvas.height = 1
  }
  private drop(key: string, entry: ChunkEntry, recycle = false): void {
    this.entries.delete(key)
    this.bytes -= entry.bytes
    if (!recycle) this.release(entry.canvas)
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
      hit.bytes === chunkBytes(ts.tileSize) &&
      hit.animation === animation &&
      hit.values.every((v, i) => v === values[i])
    ) {
      this.entries.delete(key)
      this.entries.set(key, hit)
      return hit.canvas
    }
    if (hit) this.drop(key, hit)
    const bytes = chunkBytes(ts.tileSize),
      size = MAP_CHUNK_SIDE * ts.tileSize
    let recycled: HTMLCanvasElement | null = null
    while (this.bytes + bytes > this.budget && this.entries.size) {
      const first = this.entries.entries().next().value
      if (!first) break
      if (!recycled && first[1].bytes === bytes) {
        recycled = first[1].canvas
        this.drop(first[0], first[1], true)
      } else this.drop(first[0], first[1])
    }
    if (bytes <= this.budget && this.scratch) {
      this.release(this.scratch)
      this.scratch = null
    }
    const canvas = recycled ?? this.scratch ?? this.createCanvas()
    if (bytes > this.budget) this.scratch = canvas
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size
      canvas.height = size
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      this.release(canvas)
      return null
    }
    this.rebuilds += 1
    ctx.clearRect(0, 0, size, size)
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
    if (this.bytes + bytes <= this.budget) {
      this.entries.set(key, {
        canvas,
        source: sheet,
        values,
        animation,
        bytes,
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

/** Direct cells equal scaled chunks only when their destination pixels cannot overlap. */
function directPixels(ctx: CanvasRenderingContext2D, size: number): boolean {
  if (
    !Number.isSafeInteger(size) ||
    size < 1 ||
    ctx.imageSmoothingEnabled ||
    ctx.globalCompositeOperation !== 'source-over' ||
    (ctx.filter !== undefined && ctx.filter !== 'none') ||
    ctx.shadowColor !== 'rgba(0, 0, 0, 0)'
  )
    return false
  const matrix = ctx.getTransform()
  return (
    matrix.a === 1 &&
    matrix.b === 0 &&
    matrix.c === 0 &&
    matrix.d === 1 &&
    Number.isSafeInteger(matrix.e) &&
    Number.isSafeInteger(matrix.f)
  )
}

function untransformedChunks(
  map: TilemapAsset,
  layer: TilemapTileLayer,
  chunks: Array<{ col: number; row: number }>,
): boolean {
  for (const { col, row } of chunks)
    for (let r = 0; r < MAP_CHUNK_SIDE && row * MAP_CHUNK_SIDE + r < map.rows; r++)
      for (let c = 0; c < MAP_CHUNK_SIDE && col * MAP_CHUNK_SIDE + c < map.cols; c++)
        if (
          cellFlags(
            layer.cells[(row * MAP_CHUNK_SIDE + r) * map.cols + col * MAP_CHUNK_SIDE + c] ?? -1,
          )
        )
          return false
  return true
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
  // Mede a pressão da tela; o cache mantém o teto mesmo quando ela é maior.
  cache.beginFrame(
    layers.reduce((sum, l) => sum + l.chunks.length * chunkBytes(l.tileset.tileSize), 0),
  )
  for (const { layer, tileset: ts, opacity, offsetX, offsetY, chunks } of layers) {
    const sheet = sheetOf(tileLayerTilesetId(map, layer))
    if (!sheet) continue
    ctx.save()
    ctx.globalAlpha *= opacity
    const size = ts.tileSize * scale
    const direct =
      cache.underPressure &&
      directPixels(ctx, size) &&
      // Flipping before downsampling and flipping the destination choose different samples.
      (Number.isInteger(scale) || untransformedChunks(map, layer, chunks)) &&
      chunks.every(
        ({ col, row }) =>
          Number.isSafeInteger((col * MAP_CHUNK_SIDE * ts.tileSize + offsetX) * scale) &&
          Number.isSafeInteger((row * MAP_CHUNK_SIDE * ts.tileSize + offsetY) * scale),
      )
    if (direct) {
      // The real canvas bounds may cull cells; the supplied viewport is not an implicit clip.
      const frames = new Map<number, number>()
      const transform = ctx.getTransform()
      for (const { col, row } of chunks) {
        const left = (col * MAP_CHUNK_SIDE * ts.tileSize + offsetX) * scale,
          top = (row * MAP_CHUNK_SIDE * ts.tileSize + offsetY) * scale,
          firstCol = Math.max(0, Math.floor((-transform.e - left) / size)),
          firstRow = Math.max(0, Math.floor((-transform.f - top) / size)),
          endCol = Math.min(
            MAP_CHUNK_SIDE,
            map.cols - col * MAP_CHUNK_SIDE,
            Math.ceil((ctx.canvas.width - transform.e - left) / size),
          ),
          endRow = Math.min(
            MAP_CHUNK_SIDE,
            map.rows - row * MAP_CHUNK_SIDE,
            Math.ceil((ctx.canvas.height - transform.f - top) / size),
          )
        for (let r = firstRow; r < endRow; r++)
          for (let c = firstCol; c < endCol; c++) {
            const cell =
                layer.cells[(row * MAP_CHUNK_SIDE + r) * map.cols + col * MAP_CHUNK_SIDE + c] ?? -1,
              tile = cellTile(cell)
            if (tile < 0 || tile >= ts.tiles.length) continue
            let frame = frames.get(tile)
            if (frame === undefined) {
              frame = animatedTile(ts, tile, time)
              frames.set(tile, frame)
            }
            drawCellImage(
              ctx,
              sheet,
              sheet.width,
              ts.tileSize,
              cell,
              left + c * size,
              top + r * size,
              size,
              frame,
            )
          }
      }
      ctx.restore()
      continue
    }
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
