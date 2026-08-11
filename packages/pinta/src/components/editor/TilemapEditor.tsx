/**
 * Editor de MAPA: carimbo/balde/borracha/conta-gotas + linha/retângulo/seleção
 * sobre a grade, picker de peças (com carimbo multi-tile) ao lado e camadas.
 * Render = tileset empacotado num offscreen 1:1 + `drawImage` com source-rect
 * (idêntico à conta do runtime do Studio). O arrasto pinta via `replace` (sem
 * undo por célula) e fecha com `commitGesture` — desfazer volta ao antes do
 * arrasto inteiro. Com "Crescer o mapa" ligado, um anel fantasma de 1 célula
 * cerca a grade e pintar nele faz o mapa crescer (dentro da mesma jogada de
 * undo).
 */
import type { JSX, PointerEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { isTextEntryTarget } from '../../core/dom'
import { safeSetPointerCapture } from '../../core/pointer'
import {
  type AnyTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  resolveAssetPalette,
  type TilemapAsset,
} from '../../core/project'
import { bitmapToRGBA, paintSelectionOverlay } from '../../pixel/render'
import {
  type CellPos,
  type CellRect,
  lineCells,
  normalizeCellRect,
  rectCells,
} from '../../tiles/cellGeometry'
import {
  clearRegion,
  copyRegion,
  extractRegion,
  hasFilledCell,
  stampRegionAt,
} from '../../tiles/mapSelection'
import { packTileset } from '../../tiles/packTileset'
import { packVectorTileset, vectorTilesetSvg } from '../../tiles/packVectorTileset'
import { blockCells, stampCells, type TileStamp } from '../../tiles/stamp'
import {
  addLayer,
  cellAt,
  flattenLayers,
  floodFillCells,
  growTilemap,
  removeLayer,
  setCells,
  toggleLayerFront,
  toggleLayerVisible,
} from '../../tiles/tilemapOps'
import { isTileBlank } from '../../tiles/tilesetOps'
import { usePintaGallery } from '../appContext'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { MapStatusBar } from './MapStatusBar'
import { MAP_TOOLS, type MapTool, TilemapSidebar, TilemapToolbar } from './TilemapPanels'
import { toolShortcutMap, useToolShortcuts } from './useToolShortcuts'
import { useWheelZoom } from './useWheelZoom'
import { ZoomControls } from './ZoomControls'

const TOOL_SHORTCUTS = toolShortcutMap(MAP_TOOLS)

const GRID_STROKE = 'rgba(127,127,127,0.3)'

/** Estado local da ferramenta seleção (marquee → retângulo → flutuante). */
type MapSelection =
  | { kind: 'marquee'; start: CellPos; rect: CellRect | null }
  | { kind: 'rect'; rect: CellRect }
  | { kind: 'floating'; stamp: TileStamp; at: CellPos; remaining: TilemapAsset }

export function TilemapEditor(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const tool = useSession((state) => state.tool) as MapTool
  const selectedTile = useSession((state) => state.frameIndex)
  const zoom = useSession((state) => state.zoom)
  const stamp = useSession((state) => state.stamp)
  const autoExpand = useSession((state) => state.autoExpand)
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
  const [sheetVersion, setSheetVersion] = useState(0)
  const [paintTick, setPaintTick] = useState(0)
  // Retângulo de seleção ASSENTADO (dirige os botões Copiar/Apagar pedaço).
  const [selRect, setSelRect] = useState<CellRect | null>(null)
  // Overlay de colisão (vermelho sólido / âmbar plataforma) por cima do mapa.
  const [showCollision, setShowCollision] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLCanvasElement | null>(null)
  // Snapshot no início do arrasto (1 undo por gesto) + o ponteiro dono + a
  // âncora (célula inicial: alinha o padrão do carimbo e ancora as formas).
  const gestureRef = useRef<{
    base: PintaAsset
    pointerId: number
    anchor: CellPos
    lastCell: CellPos
    grew: boolean
  } | null>(null)
  const previewCellsRef = useRef<CellPos[]>([])
  const panRef = useRef<{
    pointerId: number
    startClient: { x: number; y: number }
    startScroll: { x: number; y: number }
  } | null>(null)
  // Seleção (mecânica em refs, sem re-render durante o arrasto).
  const selRef = useRef<MapSelection | null>(null)
  const selPointerRef = useRef<number | null>(null)
  const movingRef = useRef<{ offset: CellPos } | null>(null)
  const selfCommitRef = useRef(false)
  // Apagar o pedaço só é montável depois da camada ativa (abaixo das saídas
  // antecipadas); o listener de Delete chama por aqui.
  const deleteSelectionRef = useRef<() => void>(() => {})
  // Carimba o pedaço pendente ao clicar fora (idem: montado lá embaixo).
  const stampPendingRef = useRef<() => void>(() => {})
  // A barra do pedaço: clicar NELA não pode desselecionar.
  const selectionBarRef = useRef<HTMLDivElement>(null)
  const lastAssetRef = useRef<PintaAsset | null>(null)
  // Callback do hover para a barra de status (sem re-render por pointermove).
  const hoverRef = useRef<(cell: CellPos | null) => void>(() => {})

  const layer = tilemap?.layers.find((l) => l.id === activeLayerId) ?? tilemap?.layers[0] ?? null
  const tileCount = tileset?.tiles.length ?? 0
  const pad = autoExpand ? 1 : 0
  const cellPx = tileset ? Math.max(Math.round(tileset.tileSize * zoom), 4) : 4

  // Offscreen do tileset (1:1, layout row-major) — refeito quando o tileset
  // muda. Pixel monta síncrono; o vetor rasteriza a folha SVG uma vez (async).
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

  // O carimbo aponta índices do tileset ATUAL — se o número de peças muda
  // (peça criada/apagada em outro fluxo), o padrão pode ficar defasado.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só o número de peças dispara
  useEffect(() => {
    session.getState().setStamp(null)
  }, [tileCount])

  const drawCellGrid = useCallback(
    (ctx: CanvasRenderingContext2D, col: number, row: number): void => {
      ctx.strokeStyle = GRID_STROKE
      ctx.lineWidth = 1
      ctx.strokeRect((col + pad) * cellPx + 0.5, (row + pad) * cellPx + 0.5, cellPx - 1, cellPx - 1)
    },
    [pad, cellPx],
  )

  // Índices de peça sólida / plataforma do tileset (para o overlay de colisão).
  const collisionSets = useMemo(() => {
    const solid = new Set<number>()
    const platform = new Set<number>()
    if (tileset) {
      tileset.solid.forEach((s, i) => {
        if (s) solid.add(i)
      })
      tileset.platform.forEach((p, i) => {
        if (p) platform.add(i)
      })
    }
    return { solid, platform }
  }, [tileset])

  /** Overlay translúcido de colisão sobre a célula (vermelho sólido / âmbar plataforma). */
  const drawCollisionAt = useCallback(
    (ctx: CanvasRenderingContext2D, col: number, row: number, index: number): void => {
      if (!showCollision || index < 0) return
      const x = (col + pad) * cellPx
      const y = (row + pad) * cellPx
      if (collisionSets.solid.has(index)) {
        ctx.fillStyle = 'rgba(239,68,68,0.38)'
        ctx.fillRect(x, y, cellPx, cellPx)
      } else if (collisionSets.platform.has(index)) {
        ctx.fillStyle = 'rgba(250,204,21,0.32)'
        ctx.fillRect(x, y, cellPx, cellPx)
        // Faixa mais forte no TOPO: comunica "pisa aqui".
        ctx.fillStyle = 'rgba(250,204,21,0.85)'
        ctx.fillRect(x, y, cellPx, Math.max(2, Math.round(cellPx * 0.16)))
      }
    },
    [showCollision, collisionSets, pad, cellPx],
  )

  /** Redesenho COMPLETO do mapa `map` (redimensiona + células + grade + anel). */
  const repaintMap = useCallback(
    (map: TilemapAsset): void => {
      const canvas = canvasRef.current
      const sheet = sheetRef.current
      if (!canvas || !sheet || !tileset) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const ts = tileset.tileSize
      const canvasCols = map.cols + 2 * pad
      const canvasRows = map.rows + 2 * pad
      canvas.width = canvasCols * cellPx
      canvas.height = canvasRows * cellPx
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cols = Math.max(1, Math.floor(sheet.width / ts))
      const flat = flattenLayers(map)
      for (let row = 0; row < map.rows; row += 1) {
        for (let col = 0; col < map.cols; col += 1) {
          const index = flat[row * map.cols + col] ?? -1
          if (index < 0) continue
          const sx = (index % cols) * ts
          const sy = Math.floor(index / cols) * ts
          ctx.drawImage(
            sheet,
            sx,
            sy,
            ts,
            ts,
            (col + pad) * cellPx,
            (row + pad) * cellPx,
            cellPx,
            cellPx,
          )
          drawCollisionAt(ctx, col, row, index)
        }
      }
      // Grade da área do mapa.
      ctx.strokeStyle = GRID_STROKE
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= map.cols; x += 1) {
        ctx.moveTo((x + pad) * cellPx + 0.5, pad * cellPx)
        ctx.lineTo((x + pad) * cellPx + 0.5, (map.rows + pad) * cellPx)
      }
      for (let y = 0; y <= map.rows; y += 1) {
        ctx.moveTo(pad * cellPx, (y + pad) * cellPx + 0.5)
        ctx.lineTo((map.cols + pad) * cellPx, (y + pad) * cellPx + 0.5)
      }
      ctx.stroke()
      // Anel fantasma tracejado (só com auto-expandir).
      if (pad > 0) {
        ctx.strokeStyle = 'rgba(120,120,120,0.55)'
        ctx.setLineDash([5, 4])
        ctx.strokeRect(cellPx * 0.5, cellPx * 0.5, canvas.width - cellPx, canvas.height - cellPx)
        ctx.setLineDash([])
      }
    },
    [tileset, pad, cellPx, drawCollisionAt],
  )

  /** Repinta SÓ um conjunto de células do mapa `map` (incremental, no gesto). */
  const paintCells = useCallback(
    (map: TilemapAsset, cells: readonly CellPos[]): void => {
      const canvas = canvasRef.current
      const sheet = sheetRef.current
      if (!canvas || !sheet || !tileset) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const ts = tileset.tileSize
      const sheetCols = Math.max(1, Math.floor(sheet.width / ts))
      const flat = flattenLayers(map)
      ctx.imageSmoothingEnabled = false
      for (const { col, row } of cells) {
        if (col < 0 || row < 0 || col >= map.cols || row >= map.rows) continue
        const x = (col + pad) * cellPx
        const y = (row + pad) * cellPx
        ctx.clearRect(x, y, cellPx, cellPx)
        const index = flat[row * map.cols + col] ?? -1
        if (index >= 0) {
          const sx = (index % sheetCols) * ts
          const sy = Math.floor(index / sheetCols) * ts
          ctx.drawImage(sheet, sx, sy, ts, ts, x, y, cellPx, cellPx)
          drawCollisionAt(ctx, col, row, index)
        }
        drawCellGrid(ctx, col, row)
      }
    },
    [tileset, pad, cellPx, drawCellGrid, drawCollisionAt],
  )

  const overlayRect = useCallback(
    (rect: CellRect): void => {
      paintSelectionOverlay(
        canvasRef.current,
        { x: rect.col + pad, y: rect.row + pad, width: rect.cols, height: rect.rows },
        cellPx,
      )
    },
    [pad, cellPx],
  )

  const registerHover = useCallback((fn: (cell: CellPos | null) => void) => {
    hoverRef.current = fn
  }, [])

  const renderSelection = useCallback((): void => {
    if (!tilemap || !layer) return
    const sel = selRef.current
    if (sel?.kind === 'floating') {
      repaintMap(stampRegionAt(sel.remaining, layer.id, sel.at, sel.stamp))
      overlayRect({ col: sel.at.col, row: sel.at.row, cols: sel.stamp.cols, rows: sel.stamp.rows })
      return
    }
    repaintMap(tilemap)
    if (sel?.kind === 'rect') overlayRect(sel.rect)
    else if (sel?.kind === 'marquee' && sel.rect) overlayRect(sel.rect)
  }, [tilemap, layer, repaintMap, overlayRect])

  // Repaint completo fora de gesto (com overlay de seleção quando houver).
  // biome-ignore lint/correctness/useExhaustiveDependencies: sheetVersion/paintTick/autoExpand disparam
  useEffect(() => {
    if (gestureRef.current || !tilemap) return
    // Conteúdo mudou por FORA (undo/redo) enquanto flutuava: larga a seleção.
    if (selfCommitRef.current) {
      selfCommitRef.current = false
    } else if (lastAssetRef.current && lastAssetRef.current !== asset && selRef.current) {
      selRef.current = null
      movingRef.current = null
      setSelRect(null)
    }
    lastAssetRef.current = asset
    if (selRef.current) renderSelection()
    else repaintMap(tilemap)
  }, [asset, tilemap, cellPx, sheetVersion, paintTick, autoExpand, renderSelection, repaintMap])

  // Sair da ferramenta seleção CARIMBA o recorte pendente.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o gatilho é `tool`
  useEffect(() => {
    if (tool !== 'select') stampPending()
  }, [tool])

  // Delete apaga o pedaço selecionado (o mesmo que o botão "Apagar pedaço"). A
  // ação só existe depois das saídas antecipadas abaixo, então vem pelo ref.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (event.ctrlKey || event.metaKey) return
      if (isTextEntryTarget(event.target)) return
      if (!selRef.current) return
      event.preventDefault()
      deleteSelectionRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Clicar FORA do mapa desseleciona (o pedaço levantado é carimbado) — senão a
  // barra fica aberta para sempre. O palco e a própria barra não contam.
  useEffect(() => {
    function onPointerDown(event: globalThis.PointerEvent): void {
      if (!selRef.current) return
      const target = event.target as Node | null
      if (!target) return
      if (canvasRef.current?.contains(target)) return
      if (selectionBarRef.current?.contains(target)) return
      stampPendingRef.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useToolShortcuts(TOOL_SHORTCUTS, (id) => session.getState().setTool(id))
  useWheelZoom(stageRef, canvasRef)

  if (!tilemap) return null
  if (!tileset) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-base text-pin-muted">
        {COPY.tiles.missingTileset}
      </div>
    )
  }

  const activeLayer = layer
  if (!activeLayer) return null
  const layerId = activeLayer.id
  // As ações precisam da camada ativa — religam a cada render.
  deleteSelectionRef.current = deleteMapSelection
  stampPendingRef.current = stampPending

  /** Célula do MAPA sob o ponteiro (pode ser -1..cols no anel de expansão). */
  function cellFromEvent(event: PointerEvent<HTMLCanvasElement>): CellPos {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!canvas || !rect || !tilemap) return { col: 0, row: 0 }
    const canvasCols = tilemap.cols + 2 * pad
    const canvasRows = tilemap.rows + 2 * pad
    const cellW = rect.width / canvasCols
    const cellH = rect.height / canvasRows
    return {
      col: Math.floor((event.clientX - rect.left) / cellW) - pad,
      row: Math.floor((event.clientY - rect.top) / cellH) - pad,
    }
  }

  function clampCell(cell: CellPos): CellPos {
    if (!tilemap) return cell
    return {
      col: Math.min(Math.max(cell.col, 0), tilemap.cols - 1),
      row: Math.min(Math.max(cell.row, 0), tilemap.rows - 1),
    }
  }

  function inRing(cell: CellPos): boolean {
    if (!tilemap) return false
    return cell.col < 0 || cell.row < 0 || cell.col >= tilemap.cols || cell.row >= tilemap.rows
  }

  /** As células-alvo de um traço (expande em BLOCOS quando há carimbo). */
  function targetCells(cells: CellPos[], expand: boolean): CellPos[] {
    const g = gestureRef.current
    if (tool !== 'eraser' && stamp && expand && g) {
      return cells.flatMap((c) => blockCells(c, g.anchor, stamp))
    }
    return cells
  }

  function applyTiles(current: TilemapAsset, cells: CellPos[]): TilemapAsset {
    const g = gestureRef.current
    if (tool === 'eraser') return setCells(current, layerId, cells, -1)
    if (stamp && g) return stampCells(current, layerId, cells, stamp, g.anchor, tileCount)
    return setCells(current, layerId, cells, selectedTile)
  }

  /**
   * Cresce o mapa quando o ponteiro entra no anel (só lápis/borracha/carimbo).
   * Devolve a célula-alvo JÁ no mapa novo (ou `null` se bateu no teto).
   */
  function growForRing(cell: CellPos): CellPos | null {
    const g = gestureRef.current
    if (!tilemap || !g) return null
    const side: 'left' | 'right' | 'top' | 'bottom' =
      cell.col < 0 ? 'left' : cell.col >= tilemap.cols ? 'right' : cell.row < 0 ? 'top' : 'bottom'
    const grown = growTilemap(tilemap, side)
    if (grown === tilemap) {
      if (!g.grew) showToast(COPY.tiles.autoExpandLimit)
      g.grew = true
      return null
    }
    // Crescer à esquerda/topo desloca o conteúdo +1 — âncora, última célula e
    // rolagem acompanham para o mapa não "pular".
    const stage = stageRef.current
    if (side === 'left') {
      g.anchor.col += 1
      g.lastCell.col += 1
      if (stage) stage.scrollLeft += cellPx
    } else if (side === 'top') {
      g.anchor.row += 1
      g.lastCell.row += 1
      if (stage) stage.scrollTop += cellPx
    }
    editor.getState().replace(grown)
    const target: CellPos =
      side === 'left'
        ? { col: 0, row: clampCell({ col: 0, row: cell.row }).row }
        : side === 'right'
          ? { col: grown.cols - 1, row: clampCell({ col: 0, row: cell.row }).row }
          : side === 'top'
            ? { col: clampCell({ col: cell.col, row: 0 }).col, row: 0 }
            : { col: clampCell({ col: cell.col, row: 0 }).col, row: grown.rows - 1 }
    repaintMap(grown)
    return target
  }

  function paintStroke(rawCell: CellPos): void {
    const g = gestureRef.current
    if (!g) return
    let cell = rawCell
    if (inRing(cell)) {
      if (!autoExpand) return
      const grown = growForRing(cell)
      if (!grown) return
      cell = grown
    }
    const state = editor.getState()
    const current = state.asset
    if (current.kind !== 'tilemap') return
    const line = lineCells(g.lastCell, cell)
    const cells = targetCells(line, true)
    const next = applyTiles(current, cells)
    g.lastCell = cell
    if (next === current) return
    state.replace(next)
    paintCells(next, cells)
  }

  function paintShape(cell: CellPos): void {
    const g = gestureRef.current
    if (g?.base.kind !== 'tilemap' || !tilemap) return
    const target = clampCell(cell)
    const shape =
      tool === 'line'
        ? lineCells(g.anchor, target)
        : rectCells(
            normalizeCellRect(g.anchor, target, tilemap.cols, tilemap.rows) ?? {
              col: g.anchor.col,
              row: g.anchor.row,
              cols: 1,
              rows: 1,
            },
          )
    const next = applyTiles(g.base, shape)
    editor.getState().replace(next)
    const union = [...previewCellsRef.current, ...shape]
    paintCells(next, union)
    previewCellsRef.current = shape
  }

  function pickAt(cell: CellPos): void {
    const c = clampCell(cell)
    const picked = cellAt(editor.getState().asset as TilemapAsset, layerId, c.col, c.row)
    const s = session.getState()
    if (picked >= 0) {
      s.setStamp(null)
      s.selectFrame(picked)
      s.setTool('pencil')
    } else {
      s.setTool('eraser')
    }
  }

  function fillAt(cell: CellPos): void {
    const c = clampCell(cell)
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap') return
    const tile = stamp ? (stamp.tiles[0] ?? -1) : selectedTile
    const next = floodFillCells(state.asset, layerId, c.col, c.row, tile)
    if (next === state.asset) return
    state.commit(next)
  }

  // ---- Seleção (espelho do PixelCanvas em células) ----------------------

  /** Apaga o pedaço: levantado some, assentado limpa as células (Delete). */
  function deleteMapSelection(): void {
    const sel = selRef.current
    const state = editor.getState()
    if (!sel || state.asset.kind !== 'tilemap') return
    selRef.current = null
    movingRef.current = null
    setSelRect(null)
    selfCommitRef.current = true
    if (sel.kind === 'floating') state.commit(sel.remaining)
    else if (sel.kind === 'rect') state.commit(clearRegion(state.asset, layerId, sel.rect))
  }

  function stampPending(): void {
    const sel = selRef.current
    selRef.current = null
    movingRef.current = null
    setSelRect(null)
    if (sel?.kind === 'floating' && tilemap) {
      selfCommitRef.current = true
      editor.getState().commit(stampRegionAt(sel.remaining, layerId, sel.at, sel.stamp))
    }
  }

  function selectDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (!event.isPrimary || !tilemap) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    selPointerRef.current = event.pointerId
    const p = clampCell(cellFromEvent(event))
    const sel = selRef.current
    if (sel?.kind === 'floating') {
      const within =
        p.col >= sel.at.col &&
        p.col < sel.at.col + sel.stamp.cols &&
        p.row >= sel.at.row &&
        p.row < sel.at.row + sel.stamp.rows
      if (within) {
        movingRef.current = { offset: { col: p.col - sel.at.col, row: p.row - sel.at.row } }
        return
      }
    }
    if (sel?.kind === 'rect') {
      const r = sel.rect
      const within =
        p.col >= r.col && p.col < r.col + r.cols && p.row >= r.row && p.row < r.row + r.rows
      if (within) {
        const { remaining, floating } = extractRegion(tilemap, layerId, r)
        selRef.current = {
          kind: 'floating',
          stamp: floating,
          at: { col: r.col, row: r.row },
          remaining,
        }
        movingRef.current = { offset: { col: p.col - r.col, row: p.row - r.row } }
        setSelRect(null)
        renderSelection()
        return
      }
    }
    stampPending()
    selRef.current = {
      kind: 'marquee',
      start: p,
      rect: normalizeCellRect(p, p, tilemap.cols, tilemap.rows),
    }
    renderSelection()
  }

  function selectMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.pointerId !== selPointerRef.current || !tilemap) return
    const p = clampCell(cellFromEvent(event))
    const sel = selRef.current
    const moving = movingRef.current
    if (sel?.kind === 'floating' && moving) {
      sel.at = { col: p.col - moving.offset.col, row: p.row - moving.offset.row }
      renderSelection()
      return
    }
    if (sel?.kind === 'marquee') {
      sel.rect = normalizeCellRect(sel.start, p, tilemap.cols, tilemap.rows)
      renderSelection()
    }
  }

  function selectUp(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.pointerId !== selPointerRef.current) return
    selPointerRef.current = null
    if (movingRef.current) {
      movingRef.current = null
      return
    }
    const sel = selRef.current
    if (sel?.kind === 'marquee') {
      // Pedaço só de grade VAZIA não vira seleção (a grade de fundo é
      // referência, não desenho) — mesma régua do editor de pixel.
      if (sel.rect && tilemap && hasFilledCell(tilemap, layerId, sel.rect)) {
        selRef.current = { kind: 'rect', rect: sel.rect }
        setSelRect(sel.rect)
      } else {
        selRef.current = null
        setSelRect(null)
      }
      renderSelection()
    }
  }

  // ---- Ponteiro geral ---------------------------------------------------
  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (tool === 'select') {
      selectDown(event)
      return
    }
    if (!event.isPrimary || gestureRef.current || panRef.current) return
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
    const raw = cellFromEvent(event)
    if (tool === 'picker') {
      pickAt(raw)
      return
    }
    if (tool === 'fill') {
      if (inRing(raw)) return
      fillAt(raw)
      return
    }
    // Pintar com uma peça EM BRANCO não mostra nada — a criança acha que o
    // lápis quebrou. Avisa (uma vez por gesto) mas deixa pintar: quando ela
    // desenhar a peça, o mapa se preenche sozinho (a célula guarda o índice).
    if (tool === 'pencil' && !stamp && tileset && isTileBlank(tileset, selectedTile)) {
      showToast(COPY.tiles.blankTile)
    }
    const anchor = clampCell(raw)
    gestureRef.current = {
      base: editor.getState().asset,
      pointerId: event.pointerId,
      anchor: { ...anchor },
      lastCell: { ...anchor },
      grew: false,
    }
    previewCellsRef.current = []
    if (tool === 'line' || tool === 'rect') paintShape(raw)
    else paintStroke(raw)
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (tool === 'select') {
      selectMove(event)
      return
    }
    const pan = panRef.current
    if (pan && event.pointerId === pan.pointerId) {
      const stage = stageRef.current
      if (!stage) return
      stage.scrollLeft = pan.startScroll.x - (event.clientX - pan.startClient.x)
      stage.scrollTop = pan.startScroll.y - (event.clientY - pan.startClient.y)
      return
    }
    const cell = cellFromEvent(event)
    hoverRef.current(inRing(cell) ? null : cell)
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    if (tool === 'line' || tool === 'rect') paintShape(cell)
    else if (tool === 'pencil' || tool === 'eraser') paintStroke(cell)
  }

  function endGesture(event?: PointerEvent<HTMLCanvasElement>): void {
    if (tool === 'select') {
      if (event) selectUp(event)
      return
    }
    const pan = panRef.current
    if (pan && (!event || event.pointerId === pan.pointerId)) {
      panRef.current = null
      return
    }
    const gesture = gestureRef.current
    if (!gesture) return
    if (event && event.pointerId !== gesture.pointerId) return
    gestureRef.current = null
    previewCellsRef.current = []
    editor.getState().commitGesture(gesture.base)
    setPaintTick((v) => v + 1)
  }

  function handlePointerLeave(): void {
    hoverRef.current(null)
  }

  function selectTile(index: number): void {
    const state = session.getState()
    state.setStamp(null)
    state.selectFrame(index)
    if (state.tool === 'eraser' || state.tool === 'picker') state.setTool('pencil')
  }

  function selectStamp(next: TileStamp | null): void {
    const state = session.getState()
    state.setStamp(next)
    if (state.tool === 'eraser' || state.tool === 'picker' || state.tool === 'select') {
      state.setTool('pencil')
    }
  }

  function toggleMapLayerFront(id: string): void {
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap') return
    state.commit(toggleLayerFront(state.asset, id))
  }

  function toggleMapLayerVisible(id: string): void {
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap') return
    state.commit(toggleLayerVisible(state.asset, id))
  }

  function removeMapLayer(id: string): void {
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap') return
    const next = removeLayer(state.asset, id)
    if (next === state.asset) return
    state.commit(next)
    if (id === layerId) setActiveLayerId(next.layers[0]?.id ?? null)
  }

  function addMapLayer(): void {
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
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      <div className="flex min-h-0 flex-1 items-stretch gap-2">
        <TilemapToolbar
          tool={tool}
          autoExpand={autoExpand}
          showCollision={showCollision}
          onSelectTool={(nextTool) => session.getState().setTool(nextTool)}
          onToggleAutoExpand={() => session.getState().toggleAutoExpand()}
          onToggleCollision={() => setShowCollision((visible) => !visible)}
        />

        {/* A grade do mapa (centraliza quando menor; rola quando maior — com
            `safe center`, senão o que passa do topo fica inalcançável). */}
        <div className="relative flex min-h-0 min-w-0 flex-1">
          {/* Barra do pedaço FLUTUANDO sobre o palco: em fluxo ela empurrava a
              grade para baixo ao aparecer e para cima ao sumir — clicar em
              células seguidas fazia o mapa subir e descer. */}
          {selRect ? (
            <div
              ref={selectionBarRef}
              className="pin-panel absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 p-1 shadow-lg"
            >
              <Button
                onClick={() => {
                  if (!tilemap) return
                  session.getState().setStamp(copyRegion(tilemap, layerId, selRect))
                  session.getState().setTool('pencil')
                }}
              >
                {COPY.tiles.copyPiece}
              </Button>
              <Button variant="ghost" onClick={() => deleteSelectionRef.current()}>
                {COPY.tiles.clearPiece}
              </Button>
            </div>
          ) : null}
          <div
            ref={stageRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-2 [align-items:safe_center] [justify-content:safe_center]"
          >
            <div className="pin-checkerboard border-2 border-pin-border shadow-inner">
              <canvas
                ref={canvasRef}
                className="pin-pixelated block"
                style={{ touchAction: 'none', imageRendering: 'pixelated' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
                onPointerLeave={handlePointerLeave}
                aria-label={COPY.tiles.mapGrid}
                role="img"
              />
            </div>
          </div>
        </div>

        <TilemapSidebar
          tilemap={tilemap}
          tileset={tileset}
          selectedTile={selectedTile}
          stamp={stamp}
          activeLayerId={layerId}
          onSelectTile={selectTile}
          onSetStamp={selectStamp}
          onSelectLayer={setActiveLayerId}
          onToggleFront={toggleMapLayerFront}
          onToggleVisible={toggleMapLayerVisible}
          onRemoveLayer={removeMapLayer}
          onAddLayer={addMapLayer}
        />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <MapStatusBar cols={tilemap.cols} rows={tilemap.rows} register={registerHover} />
        <ZoomControls />
      </div>
    </div>
  )
}
