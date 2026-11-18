/**
 * O controlador do editor de mapa: guarda o estado da tela (camada ativa, objetos
 * escolhidos, nível, pincel), pinta o palco e liga cada ferramenta ao gesto dela. A tela
 * (`TilemapEditor`) só monta as peças com o que sai daqui.
 */
import type { PointerEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import {
  type AnyTilesetAsset,
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  type PintaAsset,
  type TilemapAsset,
  tileLayerTilesetId,
} from '../../../core/project'
import { paintSelectionOverlay } from '../../../pixel/render'
import { getPintaStorageNamespace } from '../../../state/persistence'
import type { CellPos, CellRect } from '../../../tiles/cellGeometry'
import { TileChunkCache } from '../../../tiles/chunks'
import { copyRegion, stampRegionAt } from '../../../tiles/mapSelection'
import { createMapSet } from '../../../tiles/sets'
import type { TileStamp } from '../../../tiles/stamp'
import { usePintaApp } from '../../appContext'
import { useToast } from '../../ui/Toast'
import { useEditorStores, useSession, useToolCuration } from '../editorContext'
import { DEFAULT_MAP_BRUSH } from '../MapTerrainPanel'
import type { MapTool, MapToolMode } from '../TilemapPanels'
import { useWheelZoom } from '../useWheelZoom'
import { paintMapCanvas } from './mapCanvas'
import { createMapLayerActions } from './mapLayerActions'
import {
  type MapLevel,
  mapFeaturesFor,
  mapFeaturesInUse,
  readMapLevel,
  writeMapLevel,
} from './mapLevels'
import { createMapObjectActions } from './mapObjectActions'
import { createMapSelectionController, type MapSelection } from './selectionController'
import { createTileGestures, type PanGesture, type TileGesture } from './tileGestures'
import { useMapAnimation } from './useMapAnimation'
import { useMapKeyboard } from './useMapKeyboard'
import type { MapModel } from './useMapModel'
import { useMapSheets } from './useMapSheets'

export type ReadyMapModel = MapModel & { tilemap: TilemapAsset; baseTileset: AnyTilesetAsset }

export function useTilemapController(model: ReadyMapModel) {
  const { asset, tilemap, mapTilesets, tilesetById, baseTileset, layerTilesetChoices } = model
  const { editor, session } = useEditorStores()
  const { gallery } = usePintaApp()
  const { showToast } = useToast()
  const allowTools = useToolCuration()
  const tool = useSession((state) => state.tool) as MapTool
  const selectedTile = useSession((state) => state.frameIndex)
  const zoom = useSession((state) => state.zoom)
  const stamp = useSession((state) => state.stamp)
  const autoExpand = useSession((state) => state.autoExpand)

  const [mapBrush, setMapBrush] = useState(DEFAULT_MAP_BRUSH)
  const [level, setLevelState] = useState<MapLevel>(() => readMapLevel(getPintaStorageNamespace()))
  const setLevel = useCallback((next: MapLevel): void => {
    setLevelState(next)
    writeMapLevel(getPintaStorageNamespace(), next)
  }, [])
  const [playtest, setPlaytest] = useState(false)
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([])
  const [snapObjects, setSnapObjects] = useState(true)
  const [paintTick, setPaintTick] = useState(0)
  // Retângulo de seleção ASSENTADO (dirige os botões Copiar/Apagar pedaço).
  const [selRect, setSelRect] = useState<CellRect | null>(null)
  // Marcas de colisão (vermelho sólido, amarelo plataforma) por cima do mapa.
  const [showCollision, setShowCollision] = useState(false)
  // Só para o CURSOR (mão aberta → fechada): liga e desliga apenas nas BORDAS do arrasto.
  const [panning, setPanning] = useState(false)

  const chooseObjects = (ids: string[]): void => {
    setSelectedObjectIds(ids)
    setSelectedObjectId(ids.at(-1) ?? null)
  }
  const chooseObject = (id: string | null, additive = false): void => {
    if (!id) chooseObjects([])
    else if (additive)
      chooseObjects(
        selectedObjectIds.includes(id)
          ? selectedObjectIds.filter((i) => i !== id)
          : [...selectedObjectIds, id],
      )
    else if (!selectedObjectIds.includes(id)) chooseObjects([id])
    else setSelectedObjectId(id)
  }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const animationTimeRef = useRef(0)
  const chunkCache = useMemo(() => new TileChunkCache(), [])
  const sheets = useMapSheets(mapTilesets, showToast)
  // Snapshot no início do arrasto (um desfazer por gesto) e o ponteiro dono dele.
  const gestureRef = useRef<TileGesture | null>(null)
  const previewCellsRef = useRef<CellPos[]>([])
  const panRef = useRef<PanGesture | null>(null)
  // Seleção (a mecânica mora em refs, sem redesenhar a tela durante o arrasto).
  const selRef = useRef<MapSelection | null>(null)
  const selPointerRef = useRef<number | null>(null)
  const movingRef = useRef<{ offset: CellPos } | null>(null)
  const selfCommitRef = useRef(false)
  const lastAssetRef = useRef<PintaAsset | null>(null)
  // As ações que dependem da camada ativa religam a cada render; os listeners chamam por aqui.
  const deleteSelectionRef = useRef<() => void>(() => {})
  const deleteObjectRef = useRef<() => boolean>(() => false)
  const stampPendingRef = useRef<() => void>(() => {})
  // A barra do pedaço: clicar NELA não pode desselecionar.
  const selectionBarRef = useRef<HTMLDivElement>(null)
  // A casa sob o ponteiro vai para a barra de baixo sem redesenhar a tela a cada movimento.
  const hoverRef = useRef<(cell: CellPos | null) => void>(() => {})
  // Onde o ponteiro esteve por último no palco, em pixels do mapa (colar e biblioteca usam).
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  // O ponto da forma escolhido para o Delete (quem cuida é o palco dos objetos).
  const deleteVertexRef = useRef<() => boolean>(() => false)

  const layer = tilemap.layers.find((l) => l.id === activeLayerId) ?? tilemap.layers[0] ?? null
  const layerId = layer?.id ?? ''
  const activeTileLayer = layer && isTileLayer(layer) ? layer : null
  const activeObjectLayer = layer && isObjectLayer(layer) ? layer : null
  // As peças do SELETOR: as da camada de peças ativa (cada camada pode ter as suas).
  const tileset = activeTileLayer
    ? (tilesetById.get(tileLayerTilesetId(tilemap, activeTileLayer)) ?? null)
    : null
  const tileCount = tileset?.tiles.length ?? 0
  const pad = autoExpand ? 1 : 0
  const tileSize = baseTileset.tileSize
  const cellPx = Math.max(Math.round(baseTileset.tileSize * zoom), 4)
  const toolMode: MapToolMode = activeObjectLayer ? 'objects' : 'tiles'

  const inUse = useMemo(() => mapFeaturesInUse(tilemap, mapTilesets), [tilemap, mapTilesets])
  const features = useMemo(() => mapFeaturesFor(level, inUse), [level, inUse])

  // O carimbo aponta índices das peças de AGORA: se o número de peças muda (peça criada ou
  // apagada, ou outra camada com outras peças), ele pode ficar errado, e a peça escolhida
  // tem de existir nas peças novas.
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

  /** Redesenho COMPLETO do mapa `map` (tamanho, casas, grade e anel). */
  const repaintMap = useCallback(
    (map: TilemapAsset): void => {
      const canvas = canvasRef.current
      // A folha das peças PADRÃO manda: sem ela ainda não há o que desenhar (as das outras
      // camadas entram assim que chegam).
      if (!canvas || !sheets.sheetOf(baseTileset.id)) return
      const viewport = paintMapCanvas({
        canvas,
        stage: stageRef.current,
        map,
        pad,
        cellPx,
        tileSize,
        tilesetById,
        sheetOf: sheets.sheetOf,
        cache: chunkCache,
        time: animationTimeRef.current,
        showCollision,
      })
      if (viewport) viewportRef.current = viewport
    },
    [baseTileset, pad, cellPx, tilesetById, chunkCache, tileSize, showCollision, sheets.sheetOf],
  )

  useMapAnimation(
    mapTilesets,
    useCallback(
      (time: number) => {
        animationTimeRef.current = time
        const a = editor.getState().asset
        if (a.kind === 'tilemap') repaintMap(a)
      },
      [editor, repaintMap],
    ),
  )

  const overlayRect = useCallback(
    (rect: CellRect): void => {
      const e = layer ? effectiveLayer(tilemap, layer) : { offsetX: 0, offsetY: 0 }
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

  const renderSelection = useCallback((): void => {
    if (!layer) return
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

  // Repintura completa fora de gesto (com a moldura da seleção quando houver).
  // biome-ignore lint/correctness/useExhaustiveDependencies: a folha pronta, o fim do gesto e o anel disparam
  useEffect(() => {
    if (gestureRef.current) return
    // O mapa mudou por FORA (desfazer, refazer) com um pedaço levantado: larga a seleção.
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
  }, [asset, tilemap, cellPx, sheets.version, paintTick, autoExpand, renderSelection, repaintMap])

  // Sair da ferramenta seleção CARIMBA o pedaço levantado.
  useEffect(() => {
    if (tool !== 'select') stampPendingRef.current()
  }, [tool])

  // Clicar FORA do mapa desseleciona (o pedaço levantado é carimbado); senão a barra do
  // pedaço ficaria aberta para sempre. O palco e a própria barra não contam.
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

  useMapKeyboard({
    session,
    mode: toolMode,
    level,
    allowTools,
    hasSelection: () => selRef.current !== null,
    deleteSelectionRef,
    deleteObjectRef,
  })
  useWheelZoom(stageRef, paperRef)

  // Rolar ou mudar o tamanho do palco pinta o pedaço novo que apareceu.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const paint = (): void => {
      const a = editor.getState().asset
      if (a.kind === 'tilemap') repaintMap(a)
    }
    stage.addEventListener('scroll', paint, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(paint)
    observer?.observe(stage)
    return () => {
      stage.removeEventListener('scroll', paint)
      observer?.disconnect()
    }
  }, [repaintMap, editor])

  /** Casa do MAPA sob o ponteiro (pode ser -1 ou `cols` no anel de crescer). */
  function cellFromEvent(event: PointerEvent<HTMLCanvasElement>): CellPos {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { col: 0, row: 0 }
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
  const clampCell = (cell: CellPos): CellPos => ({
    col: Math.min(Math.max(cell.col, 0), tilemap.cols - 1),
    row: Math.min(Math.max(cell.row, 0), tilemap.rows - 1),
  })

  /** Camada ativa trancada: mostra o mesmo aviso do editor de pixel e devolve `true`. */
  function isLocked(): boolean {
    const current = editor.getState().asset
    const live = current.kind === 'tilemap' ? current.layers.find((l) => l.id === layerId) : null
    if (current.kind !== 'tilemap' || !live || !effectiveLayer(current, live).locked) return false
    showToast(COPY.layers.lockedWarning)
    return true
  }

  const selection = createMapSelectionController({
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
    isLocked,
  })
  deleteSelectionRef.current = () => {
    if (!isLocked()) selection.deleteMapSelection()
  }
  stampPendingRef.current = selection.stampPending

  const tiles = createTileGestures({
    editor,
    session,
    tool,
    tilemap,
    layerId,
    tileset,
    selectedTile,
    stamp,
    brush: mapBrush,
    autoExpand,
    tileSize,
    cellPx,
    gestureRef,
    previewCellsRef,
    panRef,
    stageRef,
    hoverRef,
    cellFromEvent,
    clampCell,
    repaintMap,
    showToast,
    setPanning,
    onGestureEnd: () => setPaintTick((v) => v + 1),
    isLocked,
  })

  // A ferramenta de agora decide quem recebe o ponteiro do palco de peças.
  const canvasHandlers =
    tool === 'select'
      ? {
          onPointerDown: selection.selectDown,
          onPointerMove: selection.selectMove,
          onPointerUp: selection.selectUp,
          onPointerCancel: selection.selectUp,
          onPointerLeave: tiles.leave,
        }
      : {
          onPointerDown: tiles.down,
          onPointerMove: tiles.move,
          onPointerUp: tiles.up,
          onPointerCancel: tiles.up,
          onPointerLeave: tiles.leave,
        }

  const layers = createMapLayerActions({
    editor,
    showToast,
    activeLayerId: layerId,
    setActiveLayerId,
    baseTileset,
    layerTilesetChoices,
  })
  const objects = createMapObjectActions({
    editor,
    showToast,
    activeObjectLayer,
    selectedObjectId,
    selectedObjectIds,
    chooseObjects,
    setSelectedObjectId,
  })
  deleteObjectRef.current = () => deleteVertexRef.current() || objects.deleteSelected()

  function selectTile(index: number): void {
    const state = session.getState()
    state.setStamp(null)
    state.selectFrame(index)
    if (state.tool === 'eraser' || state.tool === 'picker') state.setTool('pencil')
  }
  function selectStamp(next: TileStamp | null): void {
    const state = session.getState()
    state.setStamp(next)
    if (state.tool === 'eraser' || state.tool === 'picker' || state.tool === 'select')
      state.setTool('pencil')
  }

  /** Guarda o ponteiro do palco em pixels do mapa (o papel é a referência). */
  function trackPointer(event: { clientX: number; clientY: number }): void {
    const rect = paperRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0 || rect.height <= 0) return
    lastPointRef.current = {
      x: ((event.clientX - rect.left) / cellPx - pad) * tileSize,
      y: ((event.clientY - rect.top) / cellPx - pad) * tileSize,
    }
  }
  /**
   * Onde pôr o que é colado ou trazido da biblioteca: o último lugar do ponteiro no palco;
   * sem ponteiro, o meio do que aparece na tela; sem tela medida, o meio do mapa.
   */
  function placementPoint(): { x: number; y: number } {
    const mapW = tilemap.cols * tileSize,
      mapH = tilemap.rows * tileSize
    const clamp = (p: { x: number; y: number }) => ({
      x: Math.max(0, Math.min(mapW, p.x)),
      y: Math.max(0, Math.min(mapH, p.y)),
    })
    if (lastPointRef.current) return clamp(lastPointRef.current)
    const stage = stageRef.current
    if (stage && stage.clientWidth > 0 && stage.clientHeight > 0)
      return clamp({
        x: ((stage.scrollLeft + stage.clientWidth / 2) / cellPx - pad) * tileSize,
        y: ((stage.scrollTop + stage.clientHeight / 2) / cellPx - pad) * tileSize,
      })
    return { x: mapW / 2, y: mapH / 2 }
  }

  /** Copia o pedaço selecionado para o carimbo. */
  function copySelection(): void {
    if (!selRect) return
    session.getState().setStamp(copyRegion(tilemap, layerId, selRect))
    session.getState().setTool('pencil')
  }
  /** Guarda o pedaço selecionado como um conjunto na biblioteca, e diz se deu certo. */
  async function saveSelectionAsSet(): Promise<void> {
    if (!selRect) return
    try {
      const saved = await gallery
        .getState()
        .createPrepared(
          createMapSet(tilemap, selRect, tileSize, COPY.scene.nomeDoConjunto(tilemap.name)),
        )
      showToast(
        saved ? COPY.scene.conjuntoGuardado(saved.name) : COPY.scene.conjuntoNaoGuardado,
      )
    } catch (error) {
      showToast(error instanceof Error ? error.message : COPY.scene.conjuntoNaoGuardado)
    }
  }
  function jumpTo(col: number, row: number): void {
    const stage = stageRef.current
    if (!stage) return
    stage.scrollLeft = (col + pad) * cellPx - stage.clientWidth / 2
    stage.scrollTop = (row + pad) * cellPx - stage.clientHeight / 2
  }
  const registerHover = useCallback((fn: (cell: CellPos | null) => void) => {
    hoverRef.current = fn
  }, [])

  return {
    // leitura
    tool,
    toolMode,
    level,
    features,
    layer,
    layerId,
    activeTileLayer,
    activeObjectLayer,
    tileset,
    selectedTile,
    stamp,
    autoExpand,
    pad,
    tileSize,
    cellPx,
    mapBrush,
    playtest,
    snapObjects,
    showCollision,
    panning,
    selRect,
    selectedObjectId,
    selectedObjectIds,
    // refs do palco
    canvasRef,
    paperRef,
    stageRef,
    selectionBarRef,
    deleteVertexRef,
    canvasHandlers,
    // ações
    setLevel,
    setPlaytest,
    setMapBrush,
    setActiveLayerId,
    chooseObject,
    chooseObjects,
    selectTool: (next: MapTool) => session.getState().setTool(next),
    toggleAutoExpand: () => session.getState().toggleAutoExpand(),
    toggleCollision: () => setShowCollision((visible) => !visible),
    toggleSnapObjects: () => setSnapObjects((snap) => !snap),
    selectTile,
    selectStamp,
    trackPointer,
    placementPoint,
    copySelection,
    saveSelectionAsSet,
    deleteSelection: () => deleteSelectionRef.current(),
    jumpTo,
    registerHover,
    layers,
    objects,
  }
}

export type TilemapController = ReturnType<typeof useTilemapController>
