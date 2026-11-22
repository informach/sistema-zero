import {
  type AnyTilesetAsset,
  effectiveLayer,
  isTileLayer,
  type TilemapAsset,
  type TilemapCells,
  type TilemapTileLayer,
  tileLayerTilesetId,
} from '../core/project'
import { cellFlags, cellMatrix, cellTile } from './cell'
import { createTileCellReader, mapCellBounds, type TileCellReader } from './mapCells'

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
  origin = { col: 0, row: 0 },
): Array<{ col: number; row: number }> {
  if (
    !validView(view) ||
    !Number.isFinite(tileSize) ||
    tileSize <= 0 ||
    ![cols, rows, origin.col, origin.row].every(Number.isSafeInteger) ||
    cols < 1 ||
    rows < 1
  )
    return []
  const size = tileSize * MAP_CHUNK_SIDE
  const left = Math.max(origin.col * tileSize, view.x),
    top = Math.max(origin.row * tileSize, view.y),
    right = Math.min((origin.col + cols) * tileSize, view.x + view.width),
    bottom = Math.min((origin.row + rows) * tileSize, view.y + view.height)
  if (left >= right || top >= bottom) return []
  const out: Array<{ col: number; row: number }> = []
  for (let row = Math.floor(top / size); row < Math.ceil(bottom / size); row++)
    for (let col = Math.floor(left / size); col < Math.ceil(right / size); col++)
      out.push({ col, row })
  return out
}

function validView(view: MapViewport): boolean {
  return (
    [view.x, view.y, view.width, view.height, view.x + view.width, view.y + view.height].every(
      Number.isFinite,
    ) &&
    view.width > 0 &&
    view.height > 0
  )
}

/** A sparse world never enumerates empty logical chunks, including when zoomed out. */
function occupiedChunks(
  cells: Exclude<TilemapCells, Int16Array>,
  map: TilemapAsset<TilemapCells>,
  view: MapViewport,
  tileSize: number,
): Array<{ col: number; row: number }> {
  if (!validView(view) || !Number.isFinite(tileSize) || tileSize <= 0) return []
  const bounds = mapCellBounds(map),
    size = tileSize * MAP_CHUNK_SIDE,
    left = Math.max(bounds.col * tileSize, view.x),
    top = Math.max(bounds.row * tileSize, view.y),
    right = Math.min((bounds.col + bounds.cols) * tileSize, view.x + view.width),
    bottom = Math.min((bounds.row + bounds.rows) * tileSize, view.y + view.height)
  if (left >= right || top >= bottom) return []
  return cells.chunks
    .filter(
      ({ col, row }) =>
        col * size < right &&
        (col + 1) * size > left &&
        row * size < bottom &&
        (row + 1) * size > top,
    )
    .map(({ col, row }) => ({ col, row }))
    .sort((a, b) => a.row - b.row || a.col - b.col)
}

export { cellMatrix } from './cell'
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

interface ChunkComposition {
  values: Int16Array
  source: CanvasImageSource
  animation: string
  bytes: number
  tileCount: number
}
interface PreparedChunk extends ChunkComposition {
  animated: Map<number, number>
}
interface ChunkEntry extends ChunkComposition {
  canvas: HTMLCanvasElement
  fingerprint: number
}
function sameChunkComposition(a: ChunkComposition, b: ChunkComposition): boolean {
  return (
    a.source === b.source &&
    a.bytes === b.bytes &&
    a.tileCount === b.tileCount &&
    a.animation === b.animation &&
    a.values.every((value, i) => value === b.values[i])
  )
}
/** Lookup accelerator only: collisions must still compare every cell and atlas contract. */
export function chunkFingerprint(values: Int16Array): number {
  let hash = 0x811c9dc5
  for (const value of values) hash = Math.imul(hash ^ (value + 1), 0x01000193)
  return hash >>> 0
}
/** Bytes de um bloco pintado (RGBA) para peças deste tamanho. */
export function chunkBytes(tileSize: number): number {
  const size = MAP_CHUNK_SIDE * tileSize
  return size * size * 4
}

function prepareChunk(
  ts: AnyTilesetAsset,
  sheet: HTMLCanvasElement,
  col: number,
  row: number,
  time: number,
  reader: TileCellReader,
): PreparedChunk | null {
  const values = new Int16Array(MAP_CHUNK_SIDE * MAP_CHUNK_SIDE).fill(-1),
    animated = new Map<number, number>()
  let filled = false
  for (let r = 0; r < MAP_CHUNK_SIDE; r++)
    for (let c = 0; c < MAP_CHUNK_SIDE; c++) {
      const cell = reader.at(col * MAP_CHUNK_SIDE + c, row * MAP_CHUNK_SIDE + r)
      values[r * MAP_CHUNK_SIDE + c] = cell
      const tile = cellTile(cell)
      if (tile < 0 || tile >= ts.tiles.length) continue
      filled = true
      if (ts.animations?.[String(tile)] && !animated.has(tile))
        animated.set(tile, animatedTile(ts, tile, time))
    }
  if (!filled) return null
  return {
    values,
    animated,
    source: sheet,
    bytes: chunkBytes(ts.tileSize),
    tileCount: ts.tiles.length,
    animation: [...animated]
      .sort((a, b) => a[0] - b[0])
      .map(([tile, frame]) => `${tile}:${frame}`)
      .join(','),
  }
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
  private byFingerprint = new Map<number, Set<string>>()
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
  get capacityBytes(): number {
    return this.budget
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
    this.byFingerprint.clear()
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
    const bucket = this.byFingerprint.get(entry.fingerprint)
    bucket?.delete(key)
    if (!bucket?.size) this.byFingerprint.delete(entry.fingerprint)
    this.bytes -= entry.bytes
    if (!recycle) this.release(entry.canvas)
  }
  get(
    map: TilemapAsset<TilemapCells>,
    layer: TilemapTileLayer<TilemapCells>,
    ts: AnyTilesetAsset,
    sheet: HTMLCanvasElement,
    col: number,
    row: number,
    time = 0,
    reader = createTileCellReader(layer.cells, mapCellBounds(map)),
    prepared?: PreparedChunk | null,
  ): HTMLCanvasElement | null {
    const bounds = mapCellBounds(map)
    const key = `${layer.id}:${col}:${row}:${map.cols}:${map.rows}:${bounds.col}:${bounds.row}`
    const composition =
      prepared === undefined ? prepareChunk(ts, sheet, col, row, time, reader) : prepared
    const hit = this.entries.get(key)
    if (!composition) {
      if (hit) this.drop(key, hit)
      return null
    }
    const { values, animation, animated, bytes } = composition
    if (hit && sameChunkComposition(hit, composition)) {
      this.entries.delete(key)
      this.entries.set(key, hit)
      return hit.canvas
    }
    if (hit) this.drop(key, hit)
    const size = MAP_CHUNK_SIDE * ts.tileSize,
      fingerprint = chunkFingerprint(values)
    // A canonical canvas has one LRU owner. Other positions borrow it without
    // storing aliases, so metadata and pixel retention remain bounded together.
    for (const candidate of this.byFingerprint.get(fingerprint) ?? []) {
      const entry = this.entries.get(candidate)
      if (entry && sameChunkComposition(entry, composition)) {
        this.entries.delete(candidate)
        this.entries.set(candidate, entry)
        return entry.canvas
      }
    }
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
        tileCount: ts.tiles.length,
        fingerprint,
      })
      const bucket = this.byFingerprint.get(fingerprint) ?? new Set<string>()
      bucket.add(key)
      this.byFingerprint.set(fingerprint, bucket)
      this.bytes += bytes
    }
    return canvas
  }
}

/** As camadas de peças que entram na pintura, com o recorte de blocos de cada uma. */
export function visibleLayerChunks<Cells extends TilemapCells>(
  map: TilemapAsset<Cells>,
  tilesets: ReadonlyMap<string, AnyTilesetAsset>,
  view: MapViewport,
  includeCollision = false,
): Array<{
  layer: TilemapTileLayer<Cells>
  tileset: AnyTilesetAsset
  opacity: number
  offsetX: number
  offsetY: number
  chunks: Array<{ col: number; row: number }>
}> {
  const out: ReturnType<typeof visibleLayerChunks<Cells>> = []
  for (const layer of map.layers) {
    if (!isTileLayer(layer) || (layer.collision && !includeCollision)) continue
    const e = effectiveLayer(map, layer)
    if (!e.visible || !e.opacity) continue
    const tileset = tilesets.get(tileLayerTilesetId(map, layer))
    if (!tileset) continue
    const layerView = { ...view, x: view.x - e.offsetX, y: view.y - e.offsetY }
    out.push({
      layer,
      tileset,
      opacity: e.opacity,
      offsetX: e.offsetX,
      offsetY: e.offsetY,
      chunks:
        layer.cells instanceof Int16Array
          ? visibleChunks(layerView, tileset.tileSize, map.cols, map.rows, mapCellBounds(map))
          : occupiedChunks(layer.cells, map, layerView, tileset.tileSize),
    })
  }
  return out
}

interface FrameCompositions {
  bytes: number
  sheets?: Map<TilemapTileLayer<TilemapCells>, HTMLCanvasElement | null>
  chunks?: WeakMap<object, PreparedChunk | null>
}
/** Refine only overflowing estimates. Stop conservatively before retaining excess recipes. */
function frameCompositions(
  map: TilemapAsset<TilemapCells>,
  layers: ReturnType<typeof visibleLayerChunks<TilemapCells>>,
  sheetOf: (id: string) => HTMLCanvasElement | null,
  budget: number,
  time: number,
): FrameCompositions {
  const nominal = layers.reduce(
    (sum, l) => sum + l.chunks.length * chunkBytes(l.tileset.tileSize),
    0,
  )
  if (nominal <= budget || !Number.isFinite(budget) || budget <= 0) return { bytes: nominal }
  const sheets = new Map<TilemapTileLayer<TilemapCells>, HTMLCanvasElement | null>(),
    chunks = new WeakMap<object, PreparedChunk | null>(),
    seen = new Map<number, PreparedChunk[]>(),
    bounds = mapCellBounds(map)
  let bytes = 0
  for (const { layer, tileset, chunks: positions } of layers) {
    const sheet = sheetOf(tileLayerTilesetId(map, layer))
    sheets.set(layer, sheet)
    if (!sheet) continue
    const reader = createTileCellReader(layer.cells, bounds)
    for (const position of positions) {
      const prepared = prepareChunk(tileset, sheet, position.col, position.row, time, reader)
      if (!prepared) {
        chunks.set(position, null)
        continue
      }
      const fingerprint = chunkFingerprint(prepared.values),
        bucket = seen.get(fingerprint) ?? []
      let canonical = bucket.find((candidate) => sameChunkComposition(candidate, prepared))
      if (!canonical) {
        // Fingerprints never admit data: crowded collision buckets abandon the
        // optimization, keeping the existing pressure path and work bounded.
        if (bucket.length >= 8 || bytes + prepared.bytes > budget) return { bytes: nominal, sheets }
        canonical = prepared
        bucket.push(canonical)
        seen.set(fingerprint, bucket)
        bytes += canonical.bytes
      }
      chunks.set(position, canonical)
    }
  }
  return { bytes, sheets, chunks }
}

/** Direct cells equal scaled chunks only when their destination pixels cannot overlap. */
function directPixels(ctx: CanvasRenderingContext2D, size: number): boolean {
  if (
    !Number.isSafeInteger(size) ||
    size < 1 ||
    ctx.imageSmoothingEnabled ||
    // Backends can quantize tile and chunk blits differently with composed layer alpha.
    // Keep the canonical intermediate pixels unless layer opacity is exactly full.
    ctx.globalAlpha !== 1 ||
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
  reader: TileCellReader,
  chunks: Array<{ col: number; row: number }>,
): boolean {
  for (const { col, row } of chunks)
    for (let r = 0; r < MAP_CHUNK_SIDE; r++)
      for (let c = 0; c < MAP_CHUNK_SIDE; c++)
        if (cellFlags(reader.at(col * MAP_CHUNK_SIDE + c, row * MAP_CHUNK_SIDE + r))) return false
  return true
}

export function paintTilemapLayers(
  ctx: CanvasRenderingContext2D,
  map: TilemapAsset<TilemapCells>,
  tilesets: ReadonlyMap<string, AnyTilesetAsset>,
  sheetOf: (id: string) => HTMLCanvasElement | null,
  cache: TileChunkCache,
  view: MapViewport,
  scale = 1,
  time = 0,
  includeCollision = false,
): void {
  const layers = visibleLayerChunks(map, tilesets, view, includeCollision)
  const bounds = mapCellBounds(map)
  const frame = frameCompositions(map, layers, sheetOf, cache.capacityBytes, time)
  cache.beginFrame(frame.bytes)
  for (const { layer, tileset: ts, opacity, offsetX, offsetY, chunks } of layers) {
    const sheet = frame.sheets?.has(layer)
      ? frame.sheets.get(layer)
      : sheetOf(tileLayerTilesetId(map, layer))
    if (!sheet) continue
    ctx.save()
    ctx.globalAlpha *= opacity
    const size = ts.tileSize * scale
    const reader = createTileCellReader(layer.cells, bounds)
    const direct =
      cache.underPressure &&
      directPixels(ctx, size) &&
      // Flipping before downsampling and flipping the destination choose different samples.
      (Number.isInteger(scale) || untransformedChunks(reader, chunks)) &&
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
          firstCol = Math.max(
            0,
            bounds.col - col * MAP_CHUNK_SIDE,
            Math.floor((-transform.e - left) / size),
          ),
          firstRow = Math.max(
            0,
            bounds.row - row * MAP_CHUNK_SIDE,
            Math.floor((-transform.f - top) / size),
          ),
          endCol = Math.min(
            MAP_CHUNK_SIDE,
            bounds.col + map.cols - col * MAP_CHUNK_SIDE,
            Math.ceil((ctx.canvas.width - transform.e - left) / size),
          ),
          endRow = Math.min(
            MAP_CHUNK_SIDE,
            bounds.row + map.rows - row * MAP_CHUNK_SIDE,
            Math.ceil((ctx.canvas.height - transform.f - top) / size),
          )
        for (let r = firstRow; r < endRow; r++)
          for (let c = firstCol; c < endCol; c++) {
            const cell = reader.at(col * MAP_CHUNK_SIDE + c, row * MAP_CHUNK_SIDE + r),
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
    for (const position of chunks) {
      const { col, row } = position
      const chunk = cache.get(
        map,
        layer,
        ts,
        sheet,
        col,
        row,
        time,
        reader,
        frame.chunks?.get(position),
      )
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
