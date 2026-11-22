/**
 * Os gestos do ponteiro na camada de PEÇAS: lápis e borracha (traço), linha e retângulo
 * (forma com prévia), balde, conta-gotas e a Mão. O terreno inteligente e o "espalhar" entram
 * pelo pincel (`mapBrush.ts`). A seleção tem o próprio controlador.
 *
 * O arrasto pinta com `replace` (sem desfazer por casa) e fecha com `commitGesture`: desfazer
 * volta ao antes do arrasto inteiro. Com "Crescer o mapa" ligado, pintar no anel de fora faz
 * o mapa crescer dentro da mesma jogada.
 */
import type { PointerEvent, RefObject } from 'react'
import type { PintaMemoryAsset } from '../../../core/assetMemory'
import { COPY } from '../../../core/copy'
import { safeSetPointerCapture } from '../../../core/pointer'
import type { AnyTilesetAsset, PintaAsset, TilemapAsset } from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import type { PintaSessionStore } from '../../../state/sessionStore'
import { cellTile } from '../../../tiles/cell'
import type { CellPos } from '../../../tiles/cellGeometry'
import type { AuthorMap } from '../../../tiles/mapCellEdits'
import { mapCellBounds } from '../../../tiles/mapCells'
import type { TileStamp } from '../../../tiles/stamp'
import { cellAt, growTilemap } from '../../../tiles/tilemapOps'
import { isTileBlank } from '../../../tiles/tilesetOps'
import type { MapBrushSettings } from '../MapTerrainPanel'
import { commitIfChanged, sameAssetContent } from './commitGuard'
import {
  applyMapBrush,
  BrushStrokeBudget,
  brushTerrain,
  collectShapeBrushCells,
  collectTargetBrushCells,
  fillWithBrush,
  type MapBrushContext,
  type MapBrushResult,
} from './mapBrush'
import { mapBrushMessage } from './mapBrushMessages'

export interface TileGesture<Asset extends PintaMemoryAsset = PintaAsset> {
  base: Asset
  pointerId: number
  /** A casa inicial: alinha o desenho do carimbo e ancora as formas. */
  anchor: CellPos
  lastCell: CellPos
  produced: Asset
  budget: BrushStrokeBudget
  brush: Omit<MapBrushContext, 'anchor'>
  failed: boolean
}
export interface PanGesture {
  pointerId: number
  startClient: { x: number; y: number }
  startScroll: { x: number; y: number }
}

export interface TileGestureDeps<
  Asset extends PintaMemoryAsset = PintaAsset,
  Map extends AuthorMap = TilemapAsset,
> {
  editor: PintaEditorStore<Asset>
  session: PintaSessionStore
  tool: string
  tilemap: Map
  layerId: string
  /** As peças da camada ativa (`null` na camada de objetos). */
  tileset: AnyTilesetAsset | null
  selectedTile: number
  stamp: TileStamp | null
  brush: MapBrushSettings
  autoExpand: boolean
  tileSize: number
  cellPx: number
  gestureRef: RefObject<TileGesture<Asset> | null>
  previewCellsRef: RefObject<CellPos[]>
  panRef: RefObject<PanGesture | null>
  stageRef: RefObject<HTMLElement | null>
  hoverRef: RefObject<(cell: CellPos | null) => void>
  cellFromEvent: (event: PointerEvent<HTMLCanvasElement>) => CellPos
  clampCell: (cell: CellPos) => CellPos
  repaintMap: (map: Map) => void
  showToast: (message: string) => void
  setPanning: (panning: boolean) => void
  /** Chamado ao fim do gesto: pede a repintura completa. */
  onGestureEnd: () => void
  /** Camada trancada: avisa e devolve `true` (nada é pintado). */
  isLocked: () => boolean
}

export function createTileGestures(deps: TileGestureDeps) {
  return createMapTileGestures<PintaAsset, TilemapAsset>(deps, {
    map: (asset) => (asset.kind === 'tilemap' ? asset : null),
    asset: (_asset, map) => map,
    grow: growTilemap,
  })
}

interface TileGestureMap<Asset, Map> {
  map(asset: Asset): Map | null
  asset(previous: Asset, map: Map): Asset
  grow(map: Map, side: 'left' | 'right' | 'top' | 'bottom', tileSize: number): Map
}

export function createMapTileGestures<Asset extends PintaMemoryAsset, Map extends AuthorMap>(
  deps: TileGestureDeps<Asset, Map>,
  edits: TileGestureMap<Asset, Map>,
) {
  const { editor, session, tool, tilemap, layerId, gestureRef, previewCellsRef, panRef, stageRef } =
    deps

  const inRing = (cell: CellPos, map: AuthorMap = tilemap): boolean => {
    const { col, row, cols, rows } = mapCellBounds(map)
    return cell.col < col || cell.row < row || cell.col >= col + cols || cell.row >= row + rows
  }

  const brushContext = (): MapBrushContext =>
    gestureRef.current
      ? { ...gestureRef.current.brush, anchor: gestureRef.current.anchor }
      : {
          layerId,
          erasing: tool === 'eraser',
          selectedTile: deps.selectedTile,
          stamp: deps.stamp,
          anchor: null,
          tileset: deps.tileset,
          brush: deps.brush,
        }

  /** Pinta as casas com a ferramenta de agora; `warn` avisa quando faltam peças do terreno. */
  function applyTiles(current: Map, cells: CellPos[], warn: boolean): MapBrushResult<Map> {
    const result = applyMapBrush(current, cells, brushContext())
    if (!result.failure && result.unmatched && warn)
      deps.showToast(COPY.scene.faltamPecasDeBordaOuCantoNeste)
    return result
  }

  function repaintCurrent(): void {
    const current = edits.map(editor.getState().asset)
    if (current) deps.repaintMap(current)
  }

  function rejectGesture(g: TileGesture<Asset>, message: string | null): void {
    if (g.failed) return
    g.failed = true
    previewCellsRef.current = []
    const state = editor.getState()
    if (state.asset === g.produced && state.asset !== g.base) {
      const restored = state.replaceIfCurrent(g.produced, g.base)
      if (restored) g.produced = restored
    }
    if (message) deps.showToast(message)
    repaintCurrent()
  }

  function writeGesture(g: TileGesture<Asset>, next: Map): boolean {
    const state = editor.getState()
    if (state.asset !== g.produced) {
      cancel()
      deps.showToast(COPY.scene.brushChanged)
      return false
    }
    if (next === edits.map(state.asset)) return true
    const written = state.replaceIfCurrent(g.produced, edits.asset(state.asset, next))
    if (!written) {
      if (editor.getState().asset !== g.produced) {
        cancel()
        deps.showToast(COPY.scene.brushChanged)
      } else rejectGesture(g, null) // The host owns feedback for its admission refusal.
      return false
    }
    g.produced = written
    return true
  }

  /**
   * Cresce o mapa quando o ponteiro entra no anel. Devolve a casa-alvo JÁ no mapa novo
   * (ou `null` se bateu no teto).
   */
  function growForRing(cell: CellPos): CellPos | null {
    const g = gestureRef.current
    const current = edits.map(editor.getState().asset)
    if (!g || !current) return null
    const bounds = mapCellBounds(current)
    const side: 'left' | 'right' | 'top' | 'bottom' =
      cell.col < bounds.col
        ? 'left'
        : cell.col >= bounds.col + bounds.cols
          ? 'right'
          : cell.row < bounds.row
            ? 'top'
            : 'bottom'
    // Crescer à esquerda ou em cima empurra os objetos uma peça junto.
    const grown = edits.grow(current, side, deps.tileSize)
    if (grown === current) {
      rejectGesture(g, COPY.tiles.autoExpandLimit)
      return null
    }
    if (!writeGesture(g, grown)) return null
    // O conteúdo anda uma casa: âncora, última casa e rolagem acompanham para o mapa não pular.
    const stage = stageRef.current
    if (side === 'left') {
      if (!('origin' in grown)) {
        g.anchor.col += 1
        g.lastCell.col += 1
      }
      if (stage) stage.scrollLeft += deps.cellPx
    } else if (side === 'top') {
      if (!('origin' in grown)) {
        g.anchor.row += 1
        g.lastCell.row += 1
      }
      if (stage) stage.scrollTop += deps.cellPx
    }
    const limits = mapCellBounds(grown)
    const row = Math.min(Math.max(cell.row, bounds.row), bounds.row + bounds.rows - 1),
      col = Math.min(Math.max(cell.col, bounds.col), bounds.col + bounds.cols - 1)
    const target: CellPos =
      side === 'left'
        ? { col: limits.col, row }
        : side === 'right'
          ? { col: limits.col + limits.cols - 1, row }
          : side === 'top'
            ? { col, row: limits.row }
            : { col, row: limits.row + limits.rows - 1 }
    deps.repaintMap(grown)
    return target
  }

  // ---- Lápis e borracha -------------------------------------------------
  function paintStroke(rawCell: CellPos): void {
    const g = gestureRef.current
    if (!g || g.failed) return
    let cell = rawCell
    const live = editor.getState().asset
    if (live !== g.produced) {
      cancel()
      deps.showToast(COPY.scene.brushChanged)
      return
    }
    const before = edits.map(live)
    if (!before) return
    if (inRing(cell, before)) {
      if (!deps.autoExpand) return
      const grown = growForRing(cell)
      if (!grown) return
      cell = grown
    }
    const state = editor.getState()
    const current = edits.map(state.asset)
    if (!current) return
    const line = collectShapeBrushCells(current, 'line', g.lastCell, cell),
      collected = line.ok ? collectTargetBrushCells(line.positions, brushContext()) : line
    if (!collected.ok) {
      rejectGesture(g, mapBrushMessage({ failure: collected.reason }))
      return
    }
    const admitted = g.budget.collect(collected.positions, g.anchor)
    if (!admitted.ok) {
      rejectGesture(g, mapBrushMessage({ failure: admitted.reason }))
      return
    }
    const cells = admitted.positions
    const result = applyTiles(current, cells, true)
    if (result.failure) {
      rejectGesture(g, mapBrushMessage(result))
      return
    }
    const next = result.map
    g.lastCell = cell
    if (next === current) return
    if (!writeGesture(g, next)) return
    deps.repaintMap(next)
  }

  // ---- Linha e retângulo ------------------------------------------------
  function paintShape(cell: CellPos): void {
    const g = gestureRef.current
    const base = g && edits.map(g.base)
    if (!g || !base || g.failed) return
    const target = deps.clampCell(cell)
    const collected = collectShapeBrushCells(
      base,
      tool === 'line' ? 'line' : 'rect',
      g.anchor,
      target,
    )
    if (!collected.ok) {
      rejectGesture(g, mapBrushMessage({ failure: collected.reason }))
      return
    }
    const shape = collected.positions,
      result = applyTiles(base, shape, true)
    if (result.failure) {
      rejectGesture(g, mapBrushMessage(result))
      return
    }
    const next = result.map
    if (!writeGesture(g, next)) return
    deps.repaintMap(next)
    previewCellsRef.current = shape
  }

  // ---- Conta-gotas ------------------------------------------------------
  function pickAt(cell: CellPos): void {
    const c = deps.clampCell(cell)
    const current = edits.map(editor.getState().asset)
    if (!current) return
    const picked = cellTile(cellAt(current, layerId, c.col, c.row))
    const s = session.getState()
    if (picked >= 0) {
      s.setStamp(null)
      s.selectFrame(picked)
      s.setTool('pencil')
    } else {
      s.setTool('eraser')
    }
  }

  // ---- Balde ------------------------------------------------------------
  function fillAt(cell: CellPos): void {
    const state = editor.getState()
    const current = edits.map(state.asset)
    if (!current) return
    const result = fillWithBrush(current, deps.clampCell(cell), brushContext())
    const message = mapBrushMessage(result)
    if (message) deps.showToast(message)
    if (result.failure) return
    // Área que já está igual não vira um desfazer vazio.
    if (result.map !== current) commitIfChanged(state, edits.asset(state.asset, result.map))
  }

  function down(event: PointerEvent<HTMLCanvasElement>): void {
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
      deps.setPanning(true)
      return
    }
    const raw = deps.cellFromEvent(event)
    if (tool === 'picker') {
      pickAt(raw)
      return
    }
    // Daqui para baixo a ferramenta ESCREVE no mapa: camada trancada avisa e não muda nada.
    if (deps.isLocked()) return
    if (tool === 'fill') {
      if (!inRing(raw)) fillAt(raw)
      return
    }
    // Pintar com uma peça EM BRANCO não mostra nada, e a criança acha que o lápis quebrou.
    // Avisa mas deixa pintar: quando ela desenhar a peça, o mapa se preenche sozinho.
    if (
      tool === 'pencil' &&
      !deps.stamp &&
      !brushTerrain(brushContext()) &&
      !deps.brush.scatter &&
      deps.tileset &&
      isTileBlank(deps.tileset, deps.selectedTile)
    )
      deps.showToast(COPY.tiles.blankTile)
    const anchor = deps.clampCell(raw)
    const context = brushContext()
    gestureRef.current = {
      base: editor.getState().asset,
      pointerId: event.pointerId,
      anchor: { ...anchor },
      lastCell: { ...anchor },
      produced: editor.getState().asset,
      budget: new BrushStrokeBudget(),
      brush: context,
      failed: false,
    }
    previewCellsRef.current = []
    if (tool === 'line' || tool === 'rect') paintShape(raw)
    else paintStroke(raw)
  }

  function move(event: PointerEvent<HTMLCanvasElement>): void {
    const pan = panRef.current
    if (pan && event.pointerId === pan.pointerId) {
      const stage = stageRef.current
      if (!stage) return
      stage.scrollLeft = pan.startScroll.x - (event.clientX - pan.startClient.x)
      stage.scrollTop = pan.startScroll.y - (event.clientY - pan.startClient.y)
      return
    }
    const cell = deps.cellFromEvent(event)
    deps.hoverRef.current(inRing(cell) ? null : cell)
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) {
      // Prévia do terreno e do "espalhar" sob o ponteiro (só de tela, nada é gravado).
      const current = edits.map(editor.getState().asset)
      if (
        !gesture &&
        current &&
        (deps.brush.scatter || deps.brush.terrainId) &&
        tool === 'pencil' &&
        !inRing(cell)
      )
        deps.repaintMap(applyTiles(current, [cell], false).map)
      return
    }
    if (tool === 'line' || tool === 'rect') paintShape(cell)
    else if (tool === 'pencil' || tool === 'eraser') paintStroke(cell)
  }

  function up(event?: PointerEvent<HTMLCanvasElement>): void {
    const pan = panRef.current
    if (pan && (!event || event.pointerId === pan.pointerId)) {
      panRef.current = null
      deps.setPanning(false)
      return
    }
    const gesture = gestureRef.current
    if (!gesture) return
    if (event && event.pointerId !== gesture.pointerId) return
    gestureRef.current = null
    previewCellsRef.current = []
    const state = editor.getState()
    if (
      !gesture.failed &&
      state.asset === gesture.produced &&
      !sameAssetContent({ ...gesture.base, updatedAt: state.asset.updatedAt }, state.asset)
    )
      state.commitGesture(gesture.base)
    deps.onGestureEnd()
  }

  /** Cancelar restaura também o crescimento do mapa e não cria uma jogada no histórico. */
  function cancel(event?: PointerEvent<HTMLCanvasElement>): boolean {
    const pan = panRef.current
    if (pan && (!event || event.pointerId === pan.pointerId)) {
      panRef.current = null
      deps.setPanning(false)
      return true
    }
    const gesture = gestureRef.current
    if (!gesture || (event && event.pointerId !== gesture.pointerId)) return false
    gestureRef.current = null
    previewCellsRef.current = []
    deps.hoverRef.current(null)
    const state = editor.getState()
    // A recuperação de conflito pode ter adotado outra cópia durante o gesto.
    if (state.asset === gesture.produced && state.asset !== gesture.base)
      state.replaceIfCurrent(gesture.produced, gesture.base)
    repaintCurrent()
    deps.onGestureEnd()
    return true
  }

  function leave(): void {
    deps.hoverRef.current(null)
    if (!gestureRef.current) repaintCurrent()
  }

  return { down, move, up, cancel, leave, pickAt }
}
