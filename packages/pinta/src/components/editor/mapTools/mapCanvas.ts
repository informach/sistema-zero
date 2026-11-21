/**
 * A pintura do palco do mapa: as camadas (por blocos guardados), as marcas de colisão, a
 * grade e o anel de "crescer o mapa". Só o pedaço que aparece na tela é pintado; o canvas
 * tem o tamanho da janela do palco e anda junto com a rolagem.
 */
import {
  type AnyTilesetAsset,
  effectiveLayer,
  isTileLayer,
  type TilemapCells,
  tileLayerTilesetId,
} from '../../../core/project'
import { cellTile } from '../../../tiles/cell'
import { type MapViewport, paintTilemapLayers, type TileChunkCache } from '../../../tiles/chunks'
import type { AuthorMap } from '../../../tiles/mapCellEdits'
import { createTileCellReader, mapCellBounds } from '../../../tiles/mapCells'

const GRID_STROKE = 'rgba(127,127,127,0.3)'
const SOLID_FILL = 'rgba(239,68,68,0.38)'
const PLATFORM_FILL = 'rgba(250,204,21,0.32)'
/** O respiro (`p-2`) em volta do papel dentro da área que rola. */
const STAGE_PADDING = 8

/** O canvas continua limitado ao viewport, mesmo quando o papel é muito maior. */
export function mapCanvasViewport(
  fullWidth: number,
  fullHeight: number,
  stage: Pick<HTMLElement, 'clientWidth' | 'clientHeight' | 'scrollLeft' | 'scrollTop'> | null,
): MapViewport {
  // O padding inicial rola para fora. Descontá-lo dos dois lados deixava uma
  // faixa de oito pixels do papel sem pintar no fim da rolagem.
  const width = Math.min(fullWidth, Math.max(1, stage?.clientWidth || 1024))
  const height = Math.min(fullHeight, Math.max(1, stage?.clientHeight || 768))
  return {
    width,
    height,
    x: Math.max(0, Math.min(fullWidth - width, (stage?.scrollLeft ?? 0) - STAGE_PADDING)),
    y: Math.max(0, Math.min(fullHeight - height, (stage?.scrollTop ?? 0) - STAGE_PADDING)),
  }
}

export interface MapCanvasOptions {
  canvas: HTMLCanvasElement
  stage: HTMLElement | null
  map: AuthorMap
  /** Casas do anel de "crescer o mapa" em volta da grade (0 ou 1). */
  pad: number
  /** Pixels de tela por casa. */
  cellPx: number
  /** Pixels do mapa por casa (o tamanho da peça padrão). */
  tileSize: number
  tilesetById: ReadonlyMap<string, AnyTilesetAsset>
  sheetOf: (id: string) => HTMLCanvasElement | null
  cache: TileChunkCache
  time: number
  showCollision: boolean
}

/** Pinta o mapa e devolve a janela pintada (em pixels de tela do papel); `null` sem canvas 2D. */
export function paintMapCanvas(options: MapCanvasOptions): MapViewport | null {
  const { canvas, stage, map, pad, cellPx, tileSize, tilesetById, showCollision } = options
  const bounds = mapCellBounds(map)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const fullWidth = (map.cols + 2 * pad) * cellPx,
    fullHeight = (map.rows + 2 * pad) * cellPx
  const { width, height, x, y } = mapCanvasViewport(fullWidth, fullHeight, stage)
  canvas.width = width
  canvas.height = height
  canvas.style.transform = `translate(${x}px, ${y}px)`
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.translate(-x, -y)
  ctx.save()
  ctx.translate((pad - bounds.col) * cellPx, (pad - bounds.row) * cellPx)
  paintTilemapLayers(
    ctx,
    map,
    tilesetById,
    options.sheetOf,
    options.cache,
    {
      x: bounds.col * tileSize + ((x - pad * cellPx) * tileSize) / cellPx,
      y: bounds.row * tileSize + ((y - pad * cellPx) * tileSize) / cellPx,
      width: (width * tileSize) / cellPx,
      height: (height * tileSize) / cellPx,
    },
    cellPx / tileSize,
    options.time,
    showCollision,
  )
  ctx.restore()
  if (showCollision) {
    for (const l of map.layers) {
      if (!isTileLayer<TilemapCells>(l)) continue
      const e = effectiveLayer(map, l),
        ts = tilesetById.get(tileLayerTilesetId(map, l))
      if (!e.visible || !ts) continue
      const reader = createTileCellReader(l.cells, bounds)
      const minC = Math.max(
          bounds.col,
          bounds.col + Math.floor((x - pad * cellPx) / cellPx - e.offsetX / tileSize),
        ),
        maxC = Math.min(
          bounds.col + map.cols,
          bounds.col + Math.ceil((x + width - pad * cellPx) / cellPx - e.offsetX / tileSize),
        )
      const minR = Math.max(
          bounds.row,
          bounds.row + Math.floor((y - pad * cellPx) / cellPx - e.offsetY / tileSize),
        ),
        maxR = Math.min(
          bounds.row + map.rows,
          bounds.row + Math.ceil((y + height - pad * cellPx) / cellPx - e.offsetY / tileSize),
        )
      for (let r = minR; r < maxR; r++)
        for (let c = minC; c < maxC; c++) {
          const tile = cellTile(reader.at(c, r))
          if (tile < 0 || (!l.collision && !ts.solid[tile] && !ts.platform[tile])) continue
          ctx.fillStyle = l.collision || ts.solid[tile] ? SOLID_FILL : PLATFORM_FILL
          ctx.fillRect(
            (c - bounds.col + pad) * cellPx + (e.offsetX * cellPx) / tileSize,
            (r - bounds.row + pad) * cellPx + (e.offsetY * cellPx) / tileSize,
            cellPx,
            cellPx,
          )
        }
    }
  }
  // Grade da área do mapa.
  ctx.strokeStyle = GRID_STROKE
  ctx.lineWidth = 1
  ctx.beginPath()
  // Keep original endpoints/order; only omit strokes outside the canvas, including
  // a conservative pixel of antialiasing reach around each viewport edge.
  const firstCol = Math.max(0, Math.ceil((x - 1.5) / cellPx - pad)),
    lastCol = Math.min(map.cols, Math.floor((x + width + 0.5) / cellPx - pad)),
    firstRow = Math.max(0, Math.ceil((y - 1.5) / cellPx - pad)),
    lastRow = Math.min(map.rows, Math.floor((y + height + 0.5) / cellPx - pad))
  for (let col = firstCol; col <= lastCol; col += 1) {
    ctx.moveTo((col + pad) * cellPx + 0.5, pad * cellPx)
    ctx.lineTo((col + pad) * cellPx + 0.5, (map.rows + pad) * cellPx)
  }
  for (let row = firstRow; row <= lastRow; row += 1) {
    ctx.moveTo(pad * cellPx, (row + pad) * cellPx + 0.5)
    ctx.lineTo((map.cols + pad) * cellPx, (row + pad) * cellPx + 0.5)
  }
  ctx.stroke()
  // Anel fantasma tracejado (só com "crescer o mapa" ligado).
  if (pad > 0) {
    ctx.strokeStyle = 'rgba(120,120,120,0.55)'
    ctx.setLineDash([5, 4])
    ctx.strokeRect(cellPx * 0.5, cellPx * 0.5, fullWidth - cellPx, fullHeight - cellPx)
    ctx.setLineDash([])
  }
  return { x, y, width, height }
}
