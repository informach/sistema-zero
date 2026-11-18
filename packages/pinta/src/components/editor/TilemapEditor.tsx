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
  effectiveLayer,
  isCompatibleMapTileset,
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  type PintaAsset,
  type TilemapAsset,
  type TilemapObjectPropertyValue,
  tileLayerTilesetId,
  tilemapTilesetIds,
} from '../../core/project'
import { shortcut } from '../../core/shortcuts'
import { paintSelectionOverlay } from '../../pixel/render'
import { isMapObjectTool } from '../../state/sessionStore'
import { cellTile } from '../../tiles/cell'
import {
  type CellPos,
  type CellRect,
  lineCells,
  normalizeCellRect,
  rectCells,
} from '../../tiles/cellGeometry'
import { paintTilemapLayers, TileChunkCache } from '../../tiles/chunks'
import {
  type MapObjectPatch,
  nextPropertyKey,
  objectLayerById,
  removeMapObject,
  updateMapObject,
  withObjectProperty,
  withoutObjectProperty,
} from '../../tiles/mapObjects'
import { copyRegion, stampRegionAt } from '../../tiles/mapSelection'
import { collectTilesetsByIds } from '../../tiles/mapTilesets'
import { scatterTiles } from '../../tiles/scatter'
import { createMapSet } from '../../tiles/sets'
import { loadVectorSheet, pixelSheetCanvas } from '../../tiles/sheetCanvas'
import { blockCells, stampCells, type TileStamp } from '../../tiles/stamp'
import { paintTerrain, terrainRegion } from '../../tiles/terrain'
import {
  addLayer,
  addObjectLayer,
  cellAt,
  floodFillCells,
  growTilemap,
  removeLayer,
  setCells,
  setLayerTileset,
  toggleLayerFront,
  toggleLayerVisible,
} from '../../tiles/tilemapOps'
import { isTileBlank } from '../../tiles/tilesetOps'
import { usePintaApp, usePintaGallery } from '../appContext'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { MapLibraryPanel } from './MapLibraryPanel'
import { MapMinimapPanel } from './MapMinimapPanel'
import { MapObjectPanel } from './MapObjectPanel'
import { MapObjectSelectionPanel } from './MapObjectSelectionPanel'
import { MapObjectsOverlay } from './MapObjectsOverlay'
import { MapPlaytestDialog } from './MapPlaytestDialog'
import { MapStatusBar } from './MapStatusBar'
import { DEFAULT_MAP_BRUSH, MapTerrainPanel } from './MapTerrainPanel'
import { commitIfChanged } from './mapTools/commitGuard'
import { createMapSelectionController, type MapSelection } from './mapTools/selectionController'
import { stageCursor } from './stageCursor'
import {
  MAP_TOOLS,
  type MapTool,
  mapToolsFor,
  TilemapSidebar,
  TilemapToolbar,
} from './TilemapPanels'
import { isPintaModalOpen, useActionShortcuts } from './useActionShortcuts'
import { useMediaQuery } from './useMediaQuery'
import { toolShortcutMap, useToolShortcuts } from './useToolShortcuts'
import { useWheelZoom } from './useWheelZoom'
import { ZoomControls } from './ZoomControls'

const TOOL_SHORTCUTS = toolShortcutMap(MAP_TOOLS)

/** O zoom com que o mapa abre (`sessionDefaultsFor`) — o "Ctrl+0" volta para ele. */
const DEFAULT_TILEMAP_ZOOM = 2

const GRID_STROKE = 'rgba(127,127,127,0.3)'

/** Estado local da ferramenta seleção (marquee → retângulo → flutuante). */

export function TilemapEditor({
  setEditor = false,
}: {
  setEditor?: boolean
} = {}): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { gallery } = usePintaApp()
  const { showToast } = useToast()
  const wide = useMediaQuery('(min-width: 768px)')
  const asset = useEditor((state) => state.asset)
  const tool = useSession((state) => state.tool) as MapTool
  const selectedTile = useSession((state) => state.frameIndex)
  const zoom = useSession((state) => state.zoom)
  const stamp = useSession((state) => state.stamp)
  const autoExpand = useSession((state) => state.autoExpand)
  const savedGalleryAssets = usePintaGallery((state) => state.assets)
  const linkedAssets = useEditor((state) => state.linkedAssets)
  const galleryAssets = useMemo(() => {
    const byId = new Map(savedGalleryAssets.map((a) => [a.id, a]))
    for (const a of linkedAssets ?? []) byId.set(a.id, a)
    return [...byId.values()]
  }, [savedGalleryAssets, linkedAssets])
  const [mapBrush, setMapBrush] = useState(DEFAULT_MAP_BRUSH)
  const [mapLevel, setMapLevel] = useState<'start' | 'create' | 'advanced'>('advanced')
  const [playtest, setPlaytest] = useState(false)

  // Zoom pelo teclado (Ctrl+= / Ctrl+- / Ctrl+0), como nos outros dois editores.
  useActionShortcuts([
    { combo: shortcut('zoomIn'), run: () => session.getState().zoomIn(), repeat: true },
    { combo: shortcut('zoomOut'), run: () => session.getState().zoomOut(), repeat: true },
    { combo: shortcut('zoomReset'), run: () => session.getState().setZoom(DEFAULT_TILEMAP_ZOOM) },
  ])

  const tilemap = asset.kind === 'tilemap' ? asset : null
  // As peças do mapa (a padrão primeiro, só as compatíveis). Memoizadas pela LISTA de ids:
  // o mapa muda a cada pincelada, os tilesets que ele usa quase nunca.
  const tilesetKey = tilemap ? tilemapTilesetIds(tilemap).join('\n') : ''
  const mapTilesets = useMemo(() => {
    if (!tilesetKey) return []
    const byId = new Map(galleryAssets.map((a) => [a.id, a]))
    return collectTilesetsByIds(tilesetKey.split('\n'), (id) => byId.get(id))
  }, [tilesetKey, galleryAssets])
  const tilesetById = useMemo(() => new Map(mapTilesets.map((t) => [t.id, t])), [mapTilesets])
  /** As peças PADRÃO do mapa: tamanho da célula, estilo e o que a ponte leva. */
  const baseTileset = mapTilesets[0] ?? null
  /** Tilesets que uma camada pode escolher (mesmo estilo e tamanho de peça). */
  const layerTilesetChoices = useMemo(
    () =>
      baseTileset
        ? galleryAssets.filter(
            (a): a is AnyTilesetAsset => isTilesetKind(a) && isCompatibleMapTileset(baseTileset, a),
          )
        : [],
    [galleryAssets, baseTileset],
  )

  const animationTimeRef = useRef(0)
  const chunkCache = useMemo(() => new TileChunkCache(), [])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([])
  const chooseObjects = (ids: string[]): void => {
    setSelectedObjectIds(ids)
    setSelectedObjectId(ids.at(-1) ?? null)
  }
  const chooseObject = (id: string | null, additive = false): void => {
    if (!id) {
      chooseObjects([])
      return
    }
    if (additive) {
      const ids = selectedObjectIds.includes(id)
        ? selectedObjectIds.filter((i) => i !== id)
        : [...selectedObjectIds, id]
      chooseObjects(ids)
    } else if (!selectedObjectIds.includes(id)) chooseObjects([id])
    else setSelectedObjectId(id)
  }
  const [snapObjects, setSnapObjects] = useState(true)
  const [sheetVersion, setSheetVersion] = useState(0)
  const [paintTick, setPaintTick] = useState(0)
  // Retângulo de seleção ASSENTADO (dirige os botões Copiar/Apagar pedaço).
  const [selRect, setSelRect] = useState<CellRect | null>(null)
  // Overlay de colisão (vermelho sólido / âmbar plataforma) por cima do mapa.
  const [showCollision, setShowCollision] = useState(false)
  // Só para o CURSOR (mão aberta → fechada): o pan mora num ref de propósito,
  // então este estado liga e desliga apenas nas BORDAS do arrasto.
  const [panning, setPanning] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  // Uma folha 1:1 por tileset do mapa, guardada com o tileset que a gerou (refeita só
  // quando ESSE tileset muda; `canvas: null` = ainda carregando ou sem canvas).
  const sheetsRef = useRef(
    new Map<string, { source: AnyTilesetAsset; canvas: HTMLCanvasElement | null }>(),
  )
  // Apagar o objeto escolhido pelo Delete (montado depois das saídas antecipadas).
  const deleteObjectRef = useRef<() => boolean>(() => false)
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
  const activeTileLayer = layer && isTileLayer(layer) ? layer : null
  const activeObjectLayer = layer && isObjectLayer(layer) ? layer : null
  // As peças do PICKER: as da camada de peças ativa (cada camada pode ter as suas).
  const tileset =
    tilemap && activeTileLayer
      ? (tilesetById.get(tileLayerTilesetId(tilemap, activeTileLayer)) ?? null)
      : null
  const tileCount = tileset?.tiles.length ?? 0
  const pad = autoExpand ? 1 : 0
  const tileSize = baseTileset?.tileSize ?? 16
  const cellPx = baseTileset ? Math.max(Math.round(baseTileset.tileSize * zoom), 4) : 4

  // Offscreens dos tilesets do mapa (1:1, layout row-major) — cada um refeito quando
  // o SEU tileset muda. Pixel monta síncrono; o vetor rasteriza a folha SVG uma vez
  // (async). Carregamento cancelado esquece a entrada, para a próxima rodada recomeçar.
  useEffect(() => {
    const sheets = sheetsRef.current
    const wanted = new Set(mapTilesets.map((t) => t.id))
    for (const id of [...sheets.keys()]) if (!wanted.has(id)) sheets.delete(id)
    const cleanups: Array<() => void> = []
    let built = false
    for (const source of mapTilesets) {
      if (sheets.get(source.id)?.source === source) continue
      if (source.kind === 'tileset') {
        sheets.set(source.id, { source, canvas: pixelSheetCanvas(source) })
        built = true
        continue
      }
      sheets.set(source.id, { source, canvas: null })
      const stop = loadVectorSheet(
        source,
        (canvas) => {
          const entry = sheets.get(source.id)
          if (entry?.source !== source) return
          entry.canvas = canvas
          setSheetVersion((v) => v + 1)
        },
        () => showToast(COPY.tiles.sheetError),
      )
      cleanups.push(() => {
        stop()
        const entry = sheets.get(source.id)
        if (entry?.source === source && !entry.canvas) sheets.delete(source.id)
      })
    }
    if (built) setSheetVersion((v) => v + 1)
    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }, [mapTilesets, showToast])

  // O carimbo aponta índices do tileset ATUAL — se o número de peças muda
  // (peça criada/apagada em outro fluxo, ou outra camada com outras peças), o
  // padrão pode ficar defasado; e a peça escolhida tem de existir nas peças novas.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só o número de peças dispara
  useEffect(() => {
    const state = session.getState()
    state.setStamp(null)
    if (tileCount > 0 && state.frameIndex >= tileCount) state.selectFrame(0)
  }, [tileCount, tileset?.id])

  // Trocar de camada larga o objeto escolhido (ele é da camada de antes).
  // biome-ignore lint/correctness/useExhaustiveDependencies: o gatilho é a camada ativa
  useEffect(() => {
    setSelectedObjectId(null)
    setSelectedObjectIds([])
  }, [layer?.id])

  /** Redesenho COMPLETO do mapa `map` (redimensiona + células + grade + anel). */
  const repaintMap = useCallback(
    (map: TilemapAsset): void => {
      const canvas = canvasRef.current
      // A folha das peças PADRÃO manda: sem ela ainda não há o que desenhar (as de
      // outras camadas entram assim que chegam — o `sheetVersion` repinta).
      if (!canvas || !baseTileset || !sheetsRef.current.get(baseTileset.id)?.canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const canvasCols = map.cols + 2 * pad
      const canvasRows = map.rows + 2 * pad
      const fullWidth = canvasCols * cellPx,
        fullHeight = canvasRows * cellPx
      const stage = stageRef.current
      const width = Math.min(fullWidth, Math.max(1, (stage?.clientWidth || 1024) - 16))
      const height = Math.min(fullHeight, Math.max(1, (stage?.clientHeight || 768) - 16))
      const x = Math.max(0, Math.min(fullWidth - width, (stage?.scrollLeft ?? 0) - 8))
      const y = Math.max(0, Math.min(fullHeight - height, (stage?.scrollTop ?? 0) - 8))
      viewportRef.current = { x, y, width, height }
      canvas.width = width
      canvas.height = height
      canvas.style.transform = `translate(${x}px, ${y}px)`
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.translate(-x, -y)
      ctx.save()
      ctx.translate(pad * cellPx, pad * cellPx)
      paintTilemapLayers(
        ctx,
        map,
        tilesetById,
        (id) => sheetsRef.current.get(id)?.canvas ?? null,
        chunkCache,
        {
          x: ((x - pad * cellPx) * tileSize) / cellPx,
          y: ((y - pad * cellPx) * tileSize) / cellPx,
          width: (width * tileSize) / cellPx,
          height: (height * tileSize) / cellPx,
        },
        cellPx / tileSize,
        animationTimeRef.current,
        showCollision,
      )
      ctx.restore()
      if (showCollision) {
        for (const l of map.layers) {
          if (!isTileLayer(l)) continue
          const e = effectiveLayer(map, l),
            ts = tilesetById.get(tileLayerTilesetId(map, l))
          if (!e.visible || !ts) continue
          const minC = Math.max(0, Math.floor((x - pad * cellPx) / cellPx - e.offsetX / tileSize)),
            maxC = Math.min(
              map.cols,
              Math.ceil((x + width - pad * cellPx) / cellPx - e.offsetX / tileSize),
            )
          const minR = Math.max(0, Math.floor((y - pad * cellPx) / cellPx - e.offsetY / tileSize)),
            maxR = Math.min(
              map.rows,
              Math.ceil((y + height - pad * cellPx) / cellPx - e.offsetY / tileSize),
            )
          for (let r = minR; r < maxR; r++)
            for (let c = minC; c < maxC; c++) {
              const tile = cellTile(cellAt(map, l.id, c, r))
              if (tile < 0 || (!l.collision && !ts.solid[tile] && !ts.platform[tile])) continue
              ctx.fillStyle =
                l.collision || ts.solid[tile] ? 'rgba(239,68,68,0.38)' : 'rgba(250,204,21,0.32)'
              ctx.fillRect(
                (c + pad) * cellPx + (e.offsetX * cellPx) / tileSize,
                (r + pad) * cellPx + (e.offsetY * cellPx) / tileSize,
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
        ctx.strokeRect(cellPx * 0.5, cellPx * 0.5, fullWidth - cellPx, fullHeight - cellPx)
        ctx.setLineDash([])
      }
    },
    [baseTileset, pad, cellPx, tilesetById, chunkCache, tileSize, showCollision],
  )

  useEffect(() => {
    if (!mapTilesets.some((t) => t.animations && Object.keys(t.animations).length)) return
    let frame = 0,
      last = ''
    const tick = (time: number): void => {
      const key = mapTilesets
        .flatMap((t) =>
          Object.values(t.animations ?? {}).map((frames) => {
            let at = time % frames.reduce((s, f) => s + f.duration, 0)
            for (let i = 0; i < frames.length; i++) {
              at -= frames[i]!.duration
              if (at < 0) return i
            }
            return 0
          }),
        )
        .join(',')
      if (key !== last) {
        last = key
        animationTimeRef.current = time
        const a = editor.getState().asset
        if (a.kind === 'tilemap') repaintMap(a)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mapTilesets, repaintMap, editor])

  /** Repinta SÓ um conjunto de células do mapa `map` (incremental, no gesto). */
  const paintCells = useCallback(
    (map: TilemapAsset, cells: readonly CellPos[]): void => {
      const canvas = canvasRef.current
      if (!canvas || !baseTileset || !sheetsRef.current.get(baseTileset.id)?.canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = false
      // Camadas podem ser translúcidas ou deslocadas: compor todas evita apagar as de baixo.
      // O cache refaz somente os blocos que mudaram.
      if (cells.length) repaintMap(map)
    },
    [baseTileset, repaintMap],
  )

  const overlayRect = useCallback(
    (rect: CellRect): void => {
      const e = tilemap && layer ? effectiveLayer(tilemap, layer) : { offsetX: 0, offsetY: 0 }
      paintSelectionOverlay(
        canvasRef.current,
        {
          x: rect.col + pad + e.offsetX / tileSize,
          y: rect.row + pad + e.offsetY / tileSize,
          width: rect.cols,
          height: rect.rows,
        },
        cellPx,
      )
    },
    [pad, cellPx, tilemap, layer, tileSize],
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
  useEffect(() => {
    if (tool !== 'select') stampPendingRef.current()
  }, [tool])

  // Delete apaga o pedaço selecionado (o mesmo que o botão "Apagar pedaço"). A
  // ação só existe depois das saídas antecipadas abaixo, então vem pelo ref.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (event.ctrlKey || event.metaKey) return
      if (isTextEntryTarget(event.target)) return
      // Com uma janela do Pinta aberta, o desenho atrás dela fica quieto (o mesmo portão dos
      // outros atalhos): o Delete não apaga o objeto nem o pedaço escolhido lá atrás.
      if (isPintaModalOpen()) return
      if (!selRef.current) {
        // Sem pedaço de peças: o objeto escolhido (camada de objetos) sai.
        if (deleteObjectRef.current()) event.preventDefault()
        return
      }
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

  const toolMode = activeObjectLayer ? 'objects' : 'tiles'
  // A letra só vale para as ferramentas da caixa da camada ativa (o "O" do ponto não
  // pode ligar uma ferramenta de objeto numa camada de peças).
  useToolShortcuts(TOOL_SHORTCUTS, (id) => {
    if (mapToolsFor(toolMode).some((entry) => entry.id === id)) session.getState().setTool(id)
  })
  useWheelZoom(stageRef, paperRef)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !tilemap) return
    const paint = (): void => repaintMap(editor.getState().asset as TilemapAsset)
    stage.addEventListener('scroll', paint, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(paint)
    observer?.observe(stage)
    return () => {
      stage.removeEventListener('scroll', paint)
      observer?.disconnect()
    }
  }, [tilemap, repaintMap, editor])

  if (!tilemap) return null
  if (!baseTileset) {
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
  deleteObjectRef.current = () => {
    if (!activeObjectLayer || !selectedObjectId) return false
    const s = editor.getState()
    if (s.asset.kind !== 'tilemap') return false
    if (effectiveLayer(s.asset, activeObjectLayer).locked) {
      showToast(COPY.layers.lockedWarning)
      return true
    }
    const removed = commitIfChanged(
      s,
      selectedObjectIds.reduce((m, id) => removeMapObject(m, activeObjectLayer.id, id), s.asset),
    )
    chooseObjects([])
    return removed
  }

  /** Célula do MAPA sob o ponteiro (pode ser -1..cols no anel de expansão). */
  function cellFromEvent(event: PointerEvent<HTMLCanvasElement>): CellPos {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!canvas || !rect || !tilemap) return { col: 0, row: 0 }
    const e = activeTileLayer
      ? effectiveLayer(tilemap, activeTileLayer)
      : { offsetX: 0, offsetY: 0 }
    return {
      col:
        Math.floor(
          (event.clientX - rect.left + viewportRef.current.x) / cellPx - e.offsetX / tileSize,
        ) - pad,
      row:
        Math.floor(
          (event.clientY - rect.top + viewportRef.current.y) / cellPx - e.offsetY / tileSize,
        ) - pad,
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

  function applyTiles(current: TilemapAsset, cells: CellPos[], warn = false): TilemapAsset {
    const g = gestureRef.current
    const terrain = tileset?.terrains?.find((t) => t.id === mapBrush.terrainId)
    if (terrain) {
      const result = paintTerrain(
        current,
        layerId,
        terrain,
        tool === 'eraser' ? 0 : mapBrush.color,
        cells,
        mapBrush.seed,
      )
      if (result.unmatched && (warn || gestureRef.current))
        showToast(COPY.scene.faltamPecasDeBordaOuCantoNeste)
      return result.map
    }
    if (mapBrush.scatter && tool !== 'eraser')
      return scatterTiles(
        current,
        layerId,
        cells,
        mapBrush.tiles.length ? mapBrush.tiles : [selectedTile],
        mapBrush.density,
        mapBrush.seed,
      )
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
    // Crescer à esquerda/em cima empurra os objetos uma peça junto.
    const grown = growTilemap(tilemap, side, tileSize)
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
    const pickedCell = cellAt(editor.getState().asset as TilemapAsset, layerId, c.col, c.row)
    const picked = cellTile(pickedCell)
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
    const c = clampCell(cell),
      state = editor.getState()
    if (state.asset.kind !== 'tilemap') return
    const terrain = tileset?.terrains?.find((t) => t.id === mapBrush.terrainId)
    // O balde usa a casa do carimbo COM os bits de virar e girar (a peça virada pinta virada).
    const fillCell = stamp ? (stamp.tiles[0] ?? -1) : selectedTile
    commitIfChanged(
      state,
      terrain || mapBrush.scatter
        ? applyTiles(state.asset, terrainRegion(state.asset, layerId, c, terrain), true)
        : floodFillCells(state.asset, layerId, c.col, c.row, fillCell),
    )
  }

  // ---- Seleção (espelho do PixelCanvas em células) ----------------------

  const { deleteMapSelection, stampPending, selectDown, selectMove, selectUp } =
    createMapSelectionController({
      tilemap,
      layerId,
      editor,
      selRef,
      movingRef,
      selPointerRef,
      selfCommitRef,
      setSelRect,
      cellFromEvent,
      clampCell,
      renderSelection,
    })
  deleteSelectionRef.current = deleteMapSelection
  stampPendingRef.current = stampPending

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
      setPanning(true)
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
    if (!gesture || event.pointerId !== gesture.pointerId) {
      const current = editor.getState().asset
      if (
        !gesture &&
        current.kind === 'tilemap' &&
        (mapBrush.scatter || mapBrush.terrainId) &&
        tool === 'pencil' &&
        !inRing(cell)
      )
        repaintMap(applyTiles(current, [cell]))
      return
    }
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
      setPanning(false)
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
    const current = editor.getState().asset
    if (!gestureRef.current && current.kind === 'tilemap') repaintMap(current)
  }

  function selectMapTool(nextTool: MapTool): void {
    session.getState().setTool(nextTool)
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
    commitIfChanged(state, toggleLayerFront(state.asset, id))
  }

  function toggleMapLayerVisible(id: string): void {
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap') return
    commitIfChanged(state, toggleLayerVisible(state.asset, id))
  }

  function removeMapLayer(id: string): void {
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap') return
    const next = removeLayer(state.asset, id)
    if (next === state.asset) {
      // O único "não" possível com mais de uma camada: era a última de PEÇAS.
      if (state.asset.layers.length > 1) showToast(COPY.tiles.lastTileLayer)
      return
    }
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

  function addMapObjectLayer(): void {
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap') return
    const count = state.asset.layers.filter(isObjectLayer).length
    const next = addObjectLayer(
      state.asset,
      count === 0
        ? COPY.tiles.objectLayerNamePrefix
        : `${COPY.tiles.objectLayerNamePrefix} ${count + 1}`,
    )
    if (next === state.asset) {
      showToast(COPY.tiles.layerLimit)
      return
    }
    state.commit(next)
    setActiveLayerId(next.layers[next.layers.length - 1]?.id ?? null)
  }

  function setMapLayerTileset(id: string, tilesetId: string): void {
    const state = editor.getState()
    const chosen = layerTilesetChoices.find((choice) => choice.id === tilesetId)
    if (state.asset.kind !== 'tilemap' || !chosen || !baseTileset) return
    const next = setLayerTileset(state.asset, id, chosen, baseTileset)
    if (next !== state.asset) state.commit(next)
  }

  // ---- Objetos (camada de objetos ativa) --------------------------------

  /** Commita uma edição do objeto na camada de objetos ativa (nada muda = nada commita). */
  function commitObjectEdit(
    edit: (map: TilemapAsset, objectLayerId: string) => TilemapAsset,
  ): void {
    const state = editor.getState()
    if (state.asset.kind !== 'tilemap' || !activeObjectLayer) return
    const next = edit(state.asset, activeObjectLayer.id)
    if (next !== state.asset) state.commit(next)
  }

  function updateObject(id: string, patch: MapObjectPatch): void {
    commitObjectEdit((map, objectLayerId) => updateMapObject(map, objectLayerId, id, patch))
  }

  function removeObject(id: string): void {
    commitObjectEdit((map, objectLayerId) => removeMapObject(map, objectLayerId, id))
    if (id === selectedObjectId) setSelectedObjectId(null)
  }

  /** Propriedades do objeto como estão AGORA no editor (não no último render). */
  function liveProperties(id: string): Record<string, TilemapObjectPropertyValue> | null {
    const current = editor.getState().asset
    if (current.kind !== 'tilemap' || !activeObjectLayer) return null
    const object = objectLayerById(current, activeObjectLayer.id)?.objects.find((o) => o.id === id)
    return object ? object.properties : null
  }

  function setObjectProperty(
    id: string,
    key: string,
    value: TilemapObjectPropertyValue,
    previousKey?: string,
  ): void {
    const properties = liveProperties(id)
    if (!properties) return
    // Mudar ou renomear uma propriedade que já saiu (o rascunho gravado ao desmontar o campo
    // da linha apagada) não a traz de volta.
    if (previousKey !== undefined && !Object.hasOwn(properties, previousKey)) return
    const result = withObjectProperty(properties, key, value, previousKey)
    if (!result.ok) {
      showToast(
        result.reason === 'limit'
          ? COPY.tiles.propertyLimit
          : result.reason === 'duplicate-key'
            ? COPY.tiles.propertyDuplicateKey
            : COPY.tiles.propertyInvalidKey,
      )
      return
    }
    updateObject(id, { properties: result.properties })
  }

  function removeObjectProperty(id: string, key: string): void {
    const properties = liveProperties(id)
    if (properties) updateObject(id, { properties: withoutObjectProperty(properties, key) })
  }

  function addObjectProperty(id: string): void {
    const properties = liveProperties(id)
    if (properties) setObjectProperty(id, nextPropertyKey(properties), '')
  }

  return (
    // A área da tela-modelo (11/09/2026): a coluna branca das ferramentas, o palco claro, a coluna
    // branca das peças e camadas, e a faixa azul com as medidas do mapa e o zoom.
    <div className="pin-work flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-stretch md:flex-row">
        <TilemapToolbar
          orientation={wide ? 'vertical' : 'horizontal'}
          tool={tool}
          level={mapLevel}
          mode={toolMode}
          autoExpand={autoExpand}
          showCollision={showCollision}
          snapObjects={snapObjects}
          onSelectTool={selectMapTool}
          onToggleAutoExpand={() => session.getState().toggleAutoExpand()}
          onToggleCollision={() => setShowCollision((visible) => !visible)}
          onToggleSnapObjects={() => setSnapObjects((snap) => !snap)}
        />

        {/* A grade do mapa (centraliza quando menor; rola quando maior — com
            `safe center`, senão o que passa do topo fica inalcançável). */}
        <div className="pin-stage relative flex min-h-0 min-w-0 flex-1">
          {/* Barra do pedaço FLUTUANDO sobre o palco: em fluxo ela empurrava a
              grade para baixo ao aparecer e para cima ao sumir — clicar em
              células seguidas fazia o mapa subir e descer. */}
          {selRect ? (
            <div
              ref={selectionBarRef}
              className="pin-float absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 p-1.5"
            >
              <Button
                variant="barOutline"
                onClick={() => {
                  if (!tilemap) return
                  session.getState().setStamp(copyRegion(tilemap, layerId, selRect))
                  session.getState().setTool('pencil')
                }}
              >
                {COPY.tiles.copyPiece}
              </Button>
              <Button
                variant="barOutline"
                onClick={() => {
                  try {
                    if (tilemap && selRect)
                      void gallery
                        .getState()
                        .createPrepared(
                          createMapSet(tilemap, selRect, tileSize, `conjunto-${tilemap.name}`),
                        )
                  } catch (error) {
                    showToast(error instanceof Error ? error.message : String(error))
                  }
                }}
              >
                {COPY.scene.guardarConjunto}
              </Button>
              <Button variant="barOutline" onClick={() => deleteSelectionRef.current()}>
                {COPY.tiles.clearPiece}
              </Button>
            </div>
          ) : null}
          <div
            ref={stageRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-2 [align-items:safe_center] [justify-content:safe_center]"
          >
            <div
              ref={paperRef}
              className="pin-checkerboard pin-paper relative shrink-0"
              style={{
                width: (tilemap.cols + 2 * pad) * cellPx,
                height: (tilemap.rows + 2 * pad) * cellPx,
              }}
            >
              <canvas
                ref={canvasRef}
                className="pin-pixelated absolute top-0 left-0 block"
                style={{
                  touchAction: 'none',
                  imageRendering: 'pixelated',
                  cursor: stageCursor({ handTool: tool === 'pan', panning }),
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
                onPointerLeave={handlePointerLeave}
                aria-label={COPY.tiles.mapGrid}
                role="img"
              />
              {/* Os objetos por cima da grade (desenhados sempre; tocáveis só na
                  camada de objetos, com uma ferramenta de objeto). */}
              <MapObjectsOverlay
                tilemap={tilemap}
                activeLayerId={activeObjectLayer?.id ?? null}
                interactive={activeObjectLayer !== null && isMapObjectTool(tool)}
                tool={isMapObjectTool(tool) ? tool : null}
                tileSize={tileSize}
                pad={pad}
                scale={cellPx / tileSize}
                snap={snapObjects}
                selectedObjectId={selectedObjectId}
                selectedObjectIds={selectedObjectIds}
                onSelectObject={chooseObject}
                onSelectObjects={chooseObjects}
              />
            </div>
          </div>
        </div>

        <details
          open={wide}
          className="shrink-0 border-t border-pin-border bg-pin-surface md:contents"
        >
          <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-bold md:hidden">
            {COPY.scene.mapPanels}
          </summary>
          <TilemapSidebar
            compact={!wide}
            tilemap={tilemap}
            extras={
              <>
                <Panel title={COPY.scene.criarDoMeuJeito}>
                  <select
                    aria-label={COPY.scene.nivelDasFerramentas}
                    className="min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm"
                    value={mapLevel}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === 'start' || v === 'create' || v === 'advanced') setMapLevel(v)
                    }}
                  >
                    <option value="start">{COPY.scene.comecar}</option>
                    <option value="create">{COPY.scene.criarMais}</option>
                    <option value="advanced">{COPY.scene.avancado}</option>
                  </select>
                  <Button
                    variant="barOutline"
                    className="mt-2 w-full"
                    onClick={() => setPlaytest(true)}
                  >
                    {COPY.scene.testarComPersonagem}
                  </Button>
                </Panel>
                <MapMinimapPanel
                  map={tilemap}
                  tilesets={mapTilesets}
                  onJump={(col, row) => {
                    const stage = stageRef.current
                    if (stage) {
                      stage.scrollLeft = (col + pad) * cellPx - stage.clientWidth / 2
                      stage.scrollTop = (row + pad) * cellPx - stage.clientHeight / 2
                    }
                  }}
                />
              </>
            }
            tileset={tileset}
            layerTilesetChoices={layerTilesetChoices}
            selectedTile={selectedTile}
            stamp={stamp}
            activeLayerId={layerId}
            objectPanel={
              activeObjectLayer ? (
                <>
                  <MapObjectPanel
                    layer={activeObjectLayer}
                    selectedObjectId={selectedObjectId}
                    onSelectObject={chooseObject}
                    onUpdateObject={updateObject}
                    onRemoveObject={removeObject}
                    onSetProperty={setObjectProperty}
                    onRemoveProperty={removeObjectProperty}
                    onAddProperty={addObjectProperty}
                  />
                  <MapObjectSelectionPanel
                    layerId={activeObjectLayer.id}
                    ids={selectedObjectIds}
                    onSelect={chooseObjects}
                  />
                  <MapLibraryPanel
                    layerId={activeObjectLayer.id}
                    selectedId={selectedObjectId}
                    allowSets={!setEditor}
                  />
                </>
              ) : tileset ? (
                <MapTerrainPanel
                  tileset={tileset}
                  tile={selectedTile}
                  settings={mapBrush}
                  onChange={setMapBrush}
                />
              ) : activeTileLayer && !tileset ? (
                // Camada de peças cujas peças sumiram da galeria: diz, em vez de um vazio.
                <p className="p-3 text-sm text-pin-muted">{COPY.tiles.missingTileset}</p>
              ) : null
            }
            onSelectTile={selectTile}
            onSetStamp={selectStamp}
            onSelectLayer={setActiveLayerId}
            onToggleFront={toggleMapLayerFront}
            onToggleVisible={toggleMapLayerVisible}
            onRemoveLayer={removeMapLayer}
            onAddLayer={addMapLayer}
            onAddObjectLayer={addMapObjectLayer}
            onSetLayerTileset={setMapLayerTileset}
          />
        </details>
      </div>
      {playtest ? (
        <MapPlaytestDialog
          map={tilemap}
          assets={galleryAssets}
          onClose={() => setPlaytest(false)}
        />
      ) : null}
      <div className="pin-band flex shrink-0 items-center justify-between gap-2 px-4 py-2">
        <MapStatusBar cols={tilemap.cols} rows={tilemap.rows} register={registerHover} />
        <ZoomControls />
      </div>
    </div>
  )
}
