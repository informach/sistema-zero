/**
 * Editor de MAPA: carimbo/balde/borracha/conta-gotas sobre a grade, picker de
 * peças ao lado e camadas. Render = tileset empacotado num offscreen 1:1 +
 * `drawImage` com source-rect (idêntico à conta do runtime do Studio). O
 * arrasto pinta via `replace` (sem undo por célula) e fecha com
 * `commitGesture` — desfazer volta ao antes do arrasto inteiro.
 */
import type { JSX, PointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import type { PintaAsset, TilesetAsset } from '../../core/project'
import { bitmapToRGBA } from '../../pixel/render'
import { packTileset } from '../../tiles/packTileset'
import {
  addLayer,
  cellAt,
  flattenLayers,
  floodFillCells,
  removeLayer,
  setCell,
  toggleLayerVisible,
} from '../../tiles/tilemapOps'
import { usePintaGallery } from '../appContext'
import { Button, IconButton } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { ZoomControls } from './ZoomControls'

type MapTool = 'pencil' | 'fill' | 'eraser' | 'picker'

const MAP_TOOLS: Array<{ id: MapTool; emoji: string; label: string }> = [
  { id: 'pencil', emoji: '✏️', label: COPY.tools.pencil },
  { id: 'fill', emoji: '🪣', label: COPY.tools.fill },
  { id: 'eraser', emoji: '🧽', label: COPY.tools.eraser },
  { id: 'picker', emoji: '💧', label: COPY.tools.picker },
]

/** Miniatura de UMA peça no picker (canvas 1:1, CSS pixelated). */
function PickerTile({
  tileset,
  index,
  selected,
  onSelect,
}: {
  tileset: TilesetAsset
  index: number
  selected: boolean
  onSelect: () => void
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bitmap = tileset.tiles[index]
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !bitmap) return
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    ctx.putImageData(
      new ImageData(bitmapToRGBA(bitmap, tileset.paletteId), bitmap.width, bitmap.height),
      0,
      0,
    )
  }, [bitmap, tileset.paletteId])
  return (
    <button
      type="button"
      aria-label={`Peça ${index}`}
      aria-pressed={selected}
      onClick={onSelect}
      className={`pin-checkerboard relative h-12 w-12 overflow-hidden rounded-xl border-2 transition ${
        selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="pin-pixelated h-full w-full object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
      {tileset.solid[index] === true ? (
        <span aria-hidden="true" className="absolute right-0 bottom-0 text-[10px]">
          🧱
        </span>
      ) : null}
    </button>
  )
}

export function TilemapEditor(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const tool = useSession((state) => state.tool)
  const selectedTile = useSession((state) => state.frameIndex)
  const zoom = useSession((state) => state.zoom)
  const tilesets = usePintaGallery((state) => state.assets)

  const tilemap = asset.kind === 'tilemap' ? asset : null
  const tileset = useMemo(
    () =>
      tilemap
        ? (tilesets.find(
            (a): a is TilesetAsset => a.kind === 'tileset' && a.id === tilemap.tilesetId,
          ) ?? null)
        : null,
    [tilemap, tilesets],
  )

  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sheetRef = useRef<HTMLCanvasElement | null>(null)
  // Snapshot no início do arrasto (1 entrada de undo por gesto).
  const gestureBaseRef = useRef<PintaAsset | null>(null)

  const layer = tilemap?.layers.find((l) => l.id === activeLayerId) ?? tilemap?.layers[0] ?? null

  // Offscreen do tileset (1:1, layout row-major da folha) — refeito quando o
  // tileset muda. É a MESMA conta do runtime: sx=(i%cols)*ts, sy=floor(i/cols)*ts.
  useEffect(() => {
    if (!tileset) return
    const pack = packTileset(tileset)
    const sheet = document.createElement('canvas')
    sheet.width = pack.columns * pack.tileSize
    sheet.height = pack.rows * pack.tileSize
    const ctx = sheet.getContext('2d')
    if (!ctx) return
    for (const cell of pack.cells) {
      ctx.putImageData(
        new ImageData(
          bitmapToRGBA(cell.bitmap, tileset.paletteId),
          cell.bitmap.width,
          cell.bitmap.height,
        ),
        cell.col * pack.tileSize,
        cell.row * pack.tileSize,
      )
    }
    sheetRef.current = sheet
  }, [tileset])

  // Repinta o mapa (flatten das camadas visíveis + grade por CÉLULA). O
  // sheetRef é preenchido pelo efeito acima (a dep `tileset` já cobre).
  useEffect(() => {
    const canvas = canvasRef.current
    const sheet = sheetRef.current
    if (!canvas || !sheet || !tilemap || !tileset) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ts = tileset.tileSize
    const scale = Math.max(zoom / 4, 0.5)
    const cellPx = Math.max(Math.round(ts * scale), 4)
    canvas.width = tilemap.cols * cellPx
    canvas.height = tilemap.rows * cellPx
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const cols = Math.max(1, Math.floor(sheet.width / ts))
    const flat = flattenLayers(tilemap)
    for (let row = 0; row < tilemap.rows; row += 1) {
      for (let col = 0; col < tilemap.cols; col += 1) {
        const index = flat[row * tilemap.cols + col] ?? -1
        if (index < 0) continue
        const sx = (index % cols) * ts
        const sy = Math.floor(index / cols) * ts
        ctx.drawImage(sheet, sx, sy, ts, ts, col * cellPx, row * cellPx, cellPx, cellPx)
      }
    }
    // Grade por célula (sempre — é um editor de mapa).
    ctx.strokeStyle = 'rgba(127,127,127,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 1; x < tilemap.cols; x += 1) {
      ctx.moveTo(x * cellPx + 0.5, 0)
      ctx.lineTo(x * cellPx + 0.5, canvas.height)
    }
    for (let y = 1; y < tilemap.rows; y += 1) {
      ctx.moveTo(0, y * cellPx + 0.5)
      ctx.lineTo(canvas.width, y * cellPx + 0.5)
    }
    ctx.stroke()
  }, [tilemap, tileset, zoom])

  if (!tilemap) return null
  if (!tileset) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-base text-pin-muted">
        {COPY.tiles.missingTileset}
      </div>
    )
  }

  function cellFromEvent(event: PointerEvent<HTMLCanvasElement>): { col: number; row: number } {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!canvas || !rect || !tilemap) return { col: 0, row: 0 }
    const cellW = rect.width / tilemap.cols
    const cellH = rect.height / tilemap.rows
    return {
      col: Math.min(Math.max(Math.floor((event.clientX - rect.left) / cellW), 0), tilemap.cols - 1),
      row: Math.min(Math.max(Math.floor((event.clientY - rect.top) / cellH), 0), tilemap.rows - 1),
    }
  }

  function applyAt(col: number, row: number): void {
    const state = editor.getState()
    const current = state.asset
    if (current.kind !== 'tilemap' || !layer) return
    if (tool === 'picker') {
      const picked = cellAt(current, layer.id, col, row)
      const s = session.getState()
      if (picked >= 0) {
        s.selectFrame(picked)
        s.setTool('pencil')
      } else {
        s.setTool('eraser')
      }
      return
    }
    const tile = tool === 'eraser' ? -1 : selectedTile
    const next =
      tool === 'fill'
        ? floodFillCells(current, layer.id, col, row, tile)
        : setCell(current, layer.id, col, row, tile)
    if (next !== current) state.replace(next)
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (!event.isPrimary) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    gestureBaseRef.current = editor.getState().asset
    const { col, row } = cellFromEvent(event)
    applyAt(col, row)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (!gestureBaseRef.current) return
    if (tool !== 'pencil' && tool !== 'eraser') return
    const { col, row } = cellFromEvent(event)
    applyAt(col, row)
  }

  function endGesture(): void {
    const base = gestureBaseRef.current
    gestureBaseRef.current = null
    if (base) editor.getState().commitGesture(base)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
      <div className="flex min-h-0 flex-1 items-stretch gap-3">
        {/* Ferramentas do mapa */}
        <div className="flex flex-col items-center gap-1 rounded-3xl border-2 border-pin-border bg-pin-surface p-2">
          {MAP_TOOLS.map((entry) => (
            <IconButton
              key={entry.id}
              active={tool === entry.id}
              aria-label={entry.label}
              aria-pressed={tool === entry.id}
              title={entry.label}
              onClick={() => session.getState().setTool(entry.id)}
            >
              <span aria-hidden="true">{entry.emoji}</span>
            </IconButton>
          ))}
        </div>

        {/* A grade do mapa */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2">
          <div className="pin-checkerboard rounded-lg border-2 border-pin-border shadow-inner">
            <canvas
              ref={canvasRef}
              className="pin-pixelated block"
              style={{ touchAction: 'none', imageRendering: 'pixelated' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              aria-label="Grade do mapa"
              role="img"
            />
          </div>
        </div>

        {/* Picker de peças + camadas */}
        <div className="flex w-48 shrink-0 flex-col gap-3 overflow-y-auto">
          <section
            aria-label={COPY.tiles.pickTile}
            className="rounded-3xl border-2 border-pin-border bg-pin-surface p-3"
          >
            <span className="mb-2 block text-sm font-bold text-pin-muted">
              {COPY.tiles.pickTile}
            </span>
            <div className="flex flex-wrap gap-1">
              {tileset.tiles.map((_, index) => (
                <PickerTile
                  // biome-ignore lint/suspicious/noArrayIndexKey: o índice É a identidade da peça
                  key={index}
                  tileset={tileset}
                  index={index}
                  selected={selectedTile === index && tool !== 'eraser'}
                  onSelect={() => {
                    const s = session.getState()
                    s.selectFrame(index)
                    if (s.tool === 'eraser' || s.tool === 'picker') s.setTool('pencil')
                  }}
                />
              ))}
            </div>
          </section>

          <section
            aria-label={COPY.tiles.layers}
            className="rounded-3xl border-2 border-pin-border bg-pin-surface p-3"
          >
            <span className="mb-2 block text-sm font-bold text-pin-muted">{COPY.tiles.layers}</span>
            <div className="flex flex-col gap-1">
              {tilemap.layers.map((l) => {
                const active = l.id === layer?.id
                return (
                  <div key={l.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveLayerId(l.id)}
                      className={`min-h-11 flex-1 truncate rounded-2xl border-2 px-3 text-left text-sm font-bold transition ${
                        active
                          ? 'border-pin-accent bg-pin-accent/10'
                          : 'border-pin-border hover:border-pin-accent'
                      }`}
                    >
                      {l.name}
                    </button>
                    <IconButton
                      aria-label={`${l.visible ? COPY.tiles.hide : COPY.tiles.show}: ${l.name}`}
                      aria-pressed={l.visible}
                      title={l.visible ? COPY.tiles.hide : COPY.tiles.show}
                      onClick={() => {
                        const state = editor.getState()
                        if (state.asset.kind !== 'tilemap') return
                        state.commit(toggleLayerVisible(state.asset, l.id))
                      }}
                    >
                      <span aria-hidden="true">{l.visible ? '👁️' : '🙈'}</span>
                    </IconButton>
                    {tilemap.layers.length > 1 ? (
                      <IconButton
                        aria-label={`${COPY.tiles.removeLayer}: ${l.name}`}
                        title={COPY.tiles.removeLayer}
                        onClick={() => {
                          const state = editor.getState()
                          if (state.asset.kind !== 'tilemap') return
                          const next = removeLayer(state.asset, l.id)
                          if (next === state.asset) return
                          state.commit(next)
                          if (l.id === layer?.id) setActiveLayerId(next.layers[0]?.id ?? null)
                        }}
                      >
                        <span aria-hidden="true">🗑️</span>
                      </IconButton>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <Button
              className="mt-2 w-full"
              onClick={() => {
                const state = editor.getState()
                if (state.asset.kind !== 'tilemap') return
                const next = addLayer(state.asset, `Camada ${state.asset.layers.length + 1}`)
                if (next === state.asset) {
                  showToast(COPY.tiles.layerLimit)
                  return
                }
                state.commit(next)
                setActiveLayerId(next.layers[next.layers.length - 1]?.id ?? null)
              }}
            >
              ＋ {COPY.tiles.addLayer}
            </Button>
          </section>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ZoomControls />
      </div>
    </div>
  )
}
