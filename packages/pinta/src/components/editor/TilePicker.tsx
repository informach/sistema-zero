/**
 * Picker de peças do editor de mapa. Além de escolher UMA peça (clique), a
 * criança pode ARRASTAR sobre a grade para pegar um BLOCO retangular de peças
 * (carimbo multi-tile, à la MapperMate). A grade usa a MESMA geometria da
 * folha empacotada (`columns = min(count, 8)`), então o retângulo arrastado
 * corresponde 1:1 ao layout do tileset.
 */
import type { JSX, PointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { safeSetPointerCapture } from '../../core/pointer'
import {
  type AnyTilesetAsset,
  resolveAssetPalette,
  type TilesetAsset,
  type VectorFrame,
} from '../../core/project'
import { bitmapToRGBA } from '../../pixel/render'
import type { CellPos, CellRect } from '../../tiles/cellGeometry'
import { normalizeCellRect } from '../../tiles/cellGeometry'
import { stampFromTileset, type TileStamp } from '../../tiles/stamp'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { BrickWall, X } from '../ui/icons'

const TILE_PX = 48
const GAP_PX = 2
const PITCH = TILE_PX + GAP_PX
/** A folha empacota em no máximo 8 colunas (paridade com `packTileset`). */
const MAX_PICKER_COLUMNS = 8

/** Célula da grade do picker sob o ponteiro (helper puro, testável). */
export function pickerCellFromPoint(
  rect: { left: number; top: number },
  columns: number,
  rows: number,
  clientX: number,
  clientY: number,
): CellPos {
  const col = Math.min(Math.max(Math.floor((clientX - rect.left) / PITCH), 0), columns - 1)
  const row = Math.min(Math.max(Math.floor((clientY - rect.top) / PITCH), 0), rows - 1)
  return { col, row }
}

/** Miniatura de UMA peça pixel no picker (canvas 1:1, CSS pixelated). */
function PixelPickerThumb({
  tileset,
  index,
}: {
  tileset: TilesetAsset
  index: number
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bitmap = tileset.tiles[index]
  const colors = useMemo(() => resolveAssetPalette(tileset), [tileset])
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !bitmap) return
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    ctx.putImageData(new ImageData(bitmapToRGBA(bitmap, colors), bitmap.width, bitmap.height), 0, 0)
  }, [bitmap, colors])
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export function TilePicker({
  tileset,
  selectedTile,
  stamp,
  onSelectTile,
  onSetStamp,
}: {
  tileset: AnyTilesetAsset
  selectedTile: number
  stamp: TileStamp | null
  onSelectTile: (index: number) => void
  onSetStamp: (stamp: TileStamp) => void
}): JSX.Element {
  const count = tileset.tiles.length
  const columns = Math.max(1, Math.min(count, MAX_PICKER_COLUMNS))
  const rows = Math.max(1, Math.ceil(count / columns))
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; start: CellPos } | null>(null)
  const [dragRect, setDragRect] = useState<CellRect | null>(null)

  function handleDown(event: PointerEvent<HTMLDivElement>): void {
    if (!event.isPrimary) return
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    const start = pickerCellFromPoint(rect, columns, rows, event.clientX, event.clientY)
    dragRef.current = { pointerId: event.pointerId, start }
    setDragRect(normalizeCellRect(start, start, columns, rows))
  }

  function handleMove(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    const cur = pickerCellFromPoint(rect, columns, rows, event.clientX, event.clientY)
    setDragRect(normalizeCellRect(drag.start, cur, columns, rows))
  }

  function handleUp(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    setDragRect(null)
    // Recalcula o retângulo do EVENTO (não do estado `dragRect`, que pode não
    // ter re-renderizado entre o move e o up num arrasto muito rápido).
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    const end = pickerCellFromPoint(rect, columns, rows, event.clientX, event.clientY)
    const cr = normalizeCellRect(drag.start, end, columns, rows)
    if (!cr) return
    if (cr.cols === 1 && cr.rows === 1) {
      const index = cr.row * columns + cr.col
      if (index < count) onSelectTile(index)
      return
    }
    onSetStamp(stampFromTileset(count, columns, cr))
  }

  return (
    <section aria-label={COPY.tiles.pickTile} className="pin-panel p-3">
      <span className="mb-2 block text-sm font-bold text-pin-muted">{COPY.tiles.pickTile}</span>
      {stamp ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-pin-accent/10 px-2 py-1">
          <span className="text-sm font-bold text-pin-text">
            {COPY.tiles.stampBlock(stamp.cols, stamp.rows)}
          </span>
          <button
            type="button"
            aria-label={COPY.tiles.stampClear}
            title={COPY.tiles.stampClear}
            onClick={() => onSelectTile(selectedTile)}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-pin-text hover:bg-pin-border/40"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
      <div
        ref={gridRef}
        className="relative w-fit touch-none select-none"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, ${TILE_PX}px)`,
          gap: `${GAP_PX}px`,
        }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
      >
        {tileset.tiles.map((_, index) => {
          const selected = !stamp && selectedTile === index
          return (
            <button
              type="button"
              // biome-ignore lint/suspicious/noArrayIndexKey: o índice É a identidade da peça
              key={index}
              aria-label={COPY.tiles.tileLabel(index)}
              aria-pressed={selected}
              // O clique só dispara pelo TECLADO — no ponteiro o container
              // captura (arrasto multi-tile) e resolve a seleção no up.
              onClick={() => onSelectTile(index)}
              className={`pin-checkerboard relative overflow-hidden rounded-lg border-2 ${
                selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
              }`}
              style={{ width: TILE_PX, height: TILE_PX }}
            >
              {tileset.kind === 'tileset' ? (
                <PixelPickerThumb tileset={tileset} index={index} />
              ) : (
                <VectorFrameSvg
                  width={tileset.tileSize}
                  height={tileset.tileSize}
                  shapes={(tileset.tiles[index] ?? []) as VectorFrame}
                  className="h-full w-full"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 rounded-br-lg bg-pin-surface/85 px-1 text-[10px] font-bold text-pin-muted"
              >
                {index}
              </span>
              {tileset.solid[index] === true ? (
                <span
                  aria-hidden="true"
                  className="absolute right-0 bottom-0 rounded-tl-lg bg-pin-surface/85 p-0.5 text-pin-text"
                >
                  <BrickWall className="size-3" />
                </span>
              ) : null}
            </button>
          )
        })}
        {dragRect ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-md border-2 border-pin-accent bg-pin-accent/20"
            style={{
              left: dragRect.col * PITCH,
              top: dragRect.row * PITCH,
              width: dragRect.cols * PITCH - GAP_PX,
              height: dragRect.rows * PITCH - GAP_PX,
            }}
          />
        ) : null}
      </div>
    </section>
  )
}
