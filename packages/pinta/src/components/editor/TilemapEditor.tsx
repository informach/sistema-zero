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
import { safeSetPointerCapture } from '../../core/pointer'
import {
  type AnyTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  resolveAssetPalette,
  type TilesetAsset,
  type VectorFrame,
} from '../../core/project'
import { bitmapToRGBA } from '../../pixel/render'
import { packTileset } from '../../tiles/packTileset'
import { packVectorTileset, vectorTilesetSvg } from '../../tiles/packVectorTileset'
import {
  addLayer,
  cellAt,
  flattenLayers,
  floodFillCells,
  removeLayer,
  setCell,
  toggleLayerVisible,
} from '../../tiles/tilemapOps'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { usePintaGallery } from '../appContext'
import { Button, IconButton, ToolButton } from '../ui/Button'
import {
  BrickWall,
  Eraser,
  Eye,
  EyeOff,
  Hand,
  type LucideIcon,
  PaintBucket,
  Pencil,
  Pipette,
  Plus,
  Trash2,
} from '../ui/icons'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { ZoomControls } from './ZoomControls'

type MapTool = 'pencil' | 'fill' | 'eraser' | 'picker' | 'pan'

const MAP_TOOLS: Array<{ id: MapTool; icon: LucideIcon; label: string }> = [
  { id: 'pencil', icon: Pencil, label: COPY.tools.pencil },
  { id: 'fill', icon: PaintBucket, label: COPY.tools.fill },
  { id: 'eraser', icon: Eraser, label: COPY.tools.eraser },
  { id: 'picker', icon: Pipette, label: COPY.tools.picker },
  // Em touch o palco tem touch-action:none (todo toque pinta) — a Mão é o
  // jeito de navegar um mapa maior que a tela.
  { id: 'pan', icon: Hand, label: COPY.vector.pan },
]

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

/** Miniatura de UMA peça no picker (pixel = canvas; vetor = SVG inline). */
function PickerTile({
  tileset,
  index,
  selected,
  onSelect,
}: {
  tileset: AnyTilesetAsset
  index: number
  selected: boolean
  onSelect: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={COPY.tiles.tileLabel(index)}
      aria-pressed={selected}
      onClick={onSelect}
      className={`pin-checkerboard relative h-12 w-12 overflow-hidden rounded-xl border-2 transition ${
        selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
      }`}
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
      {/* O NÚMERO da peça é o que aparece na grade colável do Estúdio. */}
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
            (a): a is AnyTilesetAsset => isTilesetKind(a) && a.id === tilemap.tilesetId,
          ) ?? null)
        : null,
    [tilemap, tilesets],
  )

  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  // Incrementa quando o offscreen do tileset fica pronto (o vetor chega ASYNC).
  const [sheetVersion, setSheetVersion] = useState(0)
  // Incrementa no fim do gesto: força a passada COMPLETA de repaint.
  const [paintTick, setPaintTick] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLCanvasElement | null>(null)
  // Snapshot no início do arrasto (1 entrada de undo por gesto) + o ponteiro
  // dono do gesto (um segundo dedo/palma não pode pintar no gesto do primeiro).
  const gestureBaseRef = useRef<{ base: PintaAsset; pointerId: number } | null>(null)
  // Gesto da ferramenta Mão (navegação, fora do undo).
  const panRef = useRef<{
    pointerId: number
    startClient: { x: number; y: number }
    startScroll: { x: number; y: number }
  } | null>(null)

  const layer = tilemap?.layers.find((l) => l.id === activeLayerId) ?? tilemap?.layers[0] ?? null

  // Offscreen do tileset (1:1, layout row-major da folha) — refeito quando o
  // tileset muda. É a MESMA conta do runtime: sx=(i%cols)*ts, sy=floor(i/cols)*ts.
  // Pixel monta síncrono; o vetor rasteriza a folha SVG uma vez (async, com
  // flag de cancelamento — trocar de tileset no meio do load não pinta errado).
  useEffect(() => {
    if (!tileset) return
    sheetRef.current = null
    if (tileset.kind === 'tileset') {
      const pack = packTileset(tileset)
      const colors = resolveAssetPalette(tileset)
      const sheet = document.createElement('canvas')
      sheet.width = pack.columns * pack.tileSize
      sheet.height = pack.rows * pack.tileSize
      const ctx = sheet.getContext('2d')
      if (!ctx) return
      for (const cell of pack.cells) {
        ctx.putImageData(
          new ImageData(bitmapToRGBA(cell.bitmap, colors), cell.bitmap.width, cell.bitmap.height),
          cell.col * pack.tileSize,
          cell.row * pack.tileSize,
        )
      }
      sheetRef.current = sheet
      setSheetVersion((v) => v + 1)
      return
    }
    // happy-dom: canvas 2D é null e o load do Image nunca dispara — a MESMA
    // guarda do rasterize.ts, ANTES de criar Blob URL (senão vaza sem revoke).
    if (typeof Image === 'undefined' || !document.createElement('canvas').getContext('2d')) {
      return
    }
    let cancelled = false
    const pack = packVectorTileset(tileset)
    const svg = vectorTilesetSvg(tileset)
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (cancelled) return
      const sheet = document.createElement('canvas')
      sheet.width = pack.columns * pack.tileSize
      sheet.height = pack.rows * pack.tileSize
      const ctx = sheet.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      sheetRef.current = sheet
      setSheetVersion((v) => v + 1)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      if (!cancelled) showToast(COPY.tiles.sheetError)
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [tileset, showToast])

  // Repinta o mapa (flatten das camadas visíveis + grade por CÉLULA). O
  // O zoom da sessão é o FATOR real de escala do tile (níveis próprios do
  // tilemap via sessionDefaults — o mostrador de zoom diz a verdade).
  const cellPx = tileset ? Math.max(Math.round(tileset.tileSize * zoom), 4) : 4

  // sheetRef é preenchido pelo efeito acima (sheetVersion sinaliza o async).
  // Durante o ARRASTO de lápis/borracha o repaint completo (até 10k drawImage
  // num mapa 100×100) é pulado — o applyAt pinta só a célula tocada e o fim do
  // gesto força a passada completa via paintTick.
  // biome-ignore lint/correctness/useExhaustiveDependencies: sheetVersion/paintTick disparam o repaint
  useEffect(() => {
    if (gestureBaseRef.current) return
    const canvas = canvasRef.current
    const sheet = sheetRef.current
    if (!canvas || !sheet || !tilemap || !tileset) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ts = tileset.tileSize
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
  }, [tilemap, tileset, cellPx, sheetVersion, paintTick])

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

  /** Pinta SÓ a célula tocada (o repaint completo fica para o fim do gesto). */
  function paintCellNow(
    next: Extract<PintaAsset, { kind: 'tilemap' }>,
    col: number,
    row: number,
  ): void {
    const canvas = canvasRef.current
    const sheet = sheetRef.current
    if (!canvas || !sheet || !tileset) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ts = tileset.tileSize
    const cols = Math.max(1, Math.floor(sheet.width / ts))
    const flat = flattenLayers(next)
    const index = flat[row * next.cols + col] ?? -1
    const x = col * cellPx
    const y = row * cellPx
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(x, y, cellPx, cellPx)
    if (index >= 0) {
      const sx = (index % cols) * ts
      const sy = Math.floor(index / cols) * ts
      ctx.drawImage(sheet, sx, sy, ts, ts, x, y, cellPx, cellPx)
    }
    // Redesenha as bordas da célula (a grade é parte do editor).
    ctx.strokeStyle = 'rgba(127,127,127,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, cellPx - 1, cellPx - 1)
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
    if (next === current) return
    state.replace(next)
    if ((tool === 'pencil' || tool === 'eraser') && next.kind === 'tilemap') {
      paintCellNow(next, col, row)
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (!event.isPrimary || gestureBaseRef.current || panRef.current) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    if (tool === 'pan') {
      const stage = stageRef.current
      if (!stage) return
      panRef.current = {
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startScroll: { x: stage.scrollLeft, y: stage.scrollTop },
      }
      return
    }
    gestureBaseRef.current = { base: editor.getState().asset, pointerId: event.pointerId }
    const { col, row } = cellFromEvent(event)
    applyAt(col, row)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const pan = panRef.current
    if (pan && event.pointerId === pan.pointerId) {
      const stage = stageRef.current
      if (!stage) return
      stage.scrollLeft = pan.startScroll.x - (event.clientX - pan.startClient.x)
      stage.scrollTop = pan.startScroll.y - (event.clientY - pan.startClient.y)
      return
    }
    const gesture = gestureBaseRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    if (tool !== 'pencil' && tool !== 'eraser') return
    const { col, row } = cellFromEvent(event)
    applyAt(col, row)
  }

  function endGesture(event?: PointerEvent<HTMLCanvasElement>): void {
    const pan = panRef.current
    if (pan && (!event || event.pointerId === pan.pointerId)) {
      panRef.current = null
      return
    }
    const gesture = gestureBaseRef.current
    if (!gesture) return
    if (event && event.pointerId !== gesture.pointerId) return
    gestureBaseRef.current = null
    editor.getState().commitGesture(gesture.base)
    // Passada completa depois do arrasto (o incremental cobriu só as tocadas).
    setPaintTick((v) => v + 1)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      <div className="flex min-h-0 flex-1 items-stretch gap-2">
        {/* Ferramentas do mapa */}
        <div
          role="toolbar"
          aria-label="Ferramentas"
          aria-orientation="vertical"
          className="pin-panel flex shrink-0 flex-col items-center gap-1 overflow-y-auto p-2"
        >
          {MAP_TOOLS.map((entry) => (
            <ToolButton
              key={entry.id}
              icon={entry.icon}
              label={entry.label}
              active={tool === entry.id}
              onClick={() => session.getState().setTool(entry.id)}
            />
          ))}
        </div>

        {/* A grade do mapa (centraliza quando menor; rola quando maior) */}
        <div ref={stageRef} className="flex min-h-0 min-w-0 flex-1 overflow-auto p-2">
          <div className="pin-checkerboard m-auto rounded-lg border-2 border-pin-border shadow-inner">
            <canvas
              ref={canvasRef}
              className="pin-pixelated block"
              style={{ touchAction: 'none', imageRendering: 'pixelated' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              aria-label={COPY.tiles.mapGrid}
              role="img"
            />
          </div>
        </div>

        {/* Picker de peças + camadas */}
        <div className="flex min-h-0 w-56 shrink-0 flex-col gap-2 overflow-y-auto">
          <section aria-label={COPY.tiles.pickTile} className="pin-panel p-3">
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

          <section aria-label={COPY.tiles.layers} className="pin-panel p-3">
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
                      className={`min-h-11 flex-1 truncate rounded-xl border-2 px-3 text-left text-sm font-bold transition ${
                        active
                          ? 'border-pin-accent bg-pin-accent/10'
                          : 'border-pin-border hover:border-pin-accent'
                      }`}
                    >
                      {l.name}
                    </button>
                    <IconButton
                      aria-label={`${COPY.tiles.show} ou ${COPY.tiles.hide.toLowerCase()}: ${l.name}`}
                      aria-pressed={l.visible}
                      title={l.visible ? COPY.tiles.hide : COPY.tiles.show}
                      onClick={() => {
                        const state = editor.getState()
                        if (state.asset.kind !== 'tilemap') return
                        state.commit(toggleLayerVisible(state.asset, l.id))
                      }}
                    >
                      {l.visible ? (
                        <Eye aria-hidden="true" className="size-5" />
                      ) : (
                        <EyeOff aria-hidden="true" className="size-5" />
                      )}
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
                        <Trash2 aria-hidden="true" className="size-5" />
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
                const next = addLayer(
                  state.asset,
                  `${COPY.tiles.layerNamePrefix} ${state.asset.layers.length + 1}`,
                )
                if (next === state.asset) {
                  showToast(COPY.tiles.layerLimit)
                  return
                }
                state.commit(next)
                setActiveLayerId(next.layers[next.layers.length - 1]?.id ?? null)
              }}
            >
              <Plus aria-hidden="true" className="size-4" />
              {COPY.tiles.addLayer}
            </Button>
          </section>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end">
        <ZoomControls />
      </div>
    </div>
  )
}
