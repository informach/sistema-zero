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
import { COPY } from '../../../core/copy'
import { safeSetPointerCapture } from '../../../core/pointer'
import type { AnyTilesetAsset, PintaAsset, TilemapAsset } from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import type { PintaSessionStore } from '../../../state/sessionStore'
import { cellTile } from '../../../tiles/cell'
import { type CellPos, lineCells } from '../../../tiles/cellGeometry'
import type { TileStamp } from '../../../tiles/stamp'
import { cellAt, growTilemap } from '../../../tiles/tilemapOps'
import { isTileBlank } from '../../../tiles/tilesetOps'
import type { MapBrushSettings } from '../MapTerrainPanel'
import { commitIfChanged } from './commitGuard'
import {
  applyMapBrush,
  brushTerrain,
  fillWithBrush,
  type MapBrushContext,
  shapeBrushCells,
  targetBrushCells,
} from './mapBrush'

export interface TileGesture {
  base: PintaAsset
  pointerId: number
  /** A casa inicial: alinha o desenho do carimbo e ancora as formas. */
  anchor: CellPos
  lastCell: CellPos
  grew: boolean
}
export interface PanGesture {
  pointerId: number
  startClient: { x: number; y: number }
  startScroll: { x: number; y: number }
}

export interface TileGestureDeps {
  editor: PintaEditorStore
  session: PintaSessionStore
  tool: string
  tilemap: TilemapAsset
  layerId: string
  /** As peças da camada ativa (`null` na camada de objetos). */
  tileset: AnyTilesetAsset | null
  selectedTile: number
  stamp: TileStamp | null
  brush: MapBrushSettings
  autoExpand: boolean
  tileSize: number
  cellPx: number
  gestureRef: RefObject<TileGesture | null>
  previewCellsRef: RefObject<CellPos[]>
  panRef: RefObject<PanGesture | null>
  stageRef: RefObject<HTMLElement | null>
  hoverRef: RefObject<(cell: CellPos | null) => void>
  cellFromEvent: (event: PointerEvent<HTMLCanvasElement>) => CellPos
  clampCell: (cell: CellPos) => CellPos
  repaintMap: (map: TilemapAsset) => void
  showToast: (message: string) => void
  setPanning: (panning: boolean) => void
  /** Chamado ao fim do gesto: pede a repintura completa. */
  onGestureEnd: () => void
  /** Camada trancada: avisa e devolve `true` (nada é pintado). */
  isLocked: () => boolean
}

export function createTileGestures(deps: TileGestureDeps) {
  const { editor, session, tool, tilemap, layerId, gestureRef, previewCellsRef, panRef, stageRef } =
    deps

  const inRing = (cell: CellPos): boolean =>
    cell.col < 0 || cell.row < 0 || cell.col >= tilemap.cols || cell.row >= tilemap.rows

  const brushContext = (): MapBrushContext => ({
    layerId,
    erasing: tool === 'eraser',
    selectedTile: deps.selectedTile,
    stamp: deps.stamp,
    anchor: gestureRef.current?.anchor ?? null,
    tileset: deps.tileset,
    brush: deps.brush,
  })

  /** Pinta as casas com a ferramenta de agora; `warn` avisa quando faltam peças do terreno. */
  function applyTiles(current: TilemapAsset, cells: CellPos[], warn: boolean): TilemapAsset {
    const result = applyMapBrush(current, cells, brushContext())
    if (result.unmatched && warn) deps.showToast(COPY.scene.faltamPecasDeBordaOuCantoNeste)
    return result.map
  }

  /** As casas-alvo de um traço (o carimbo pinta em BLOCOS encaixados). */
  function targetCells(cells: CellPos[]): CellPos[] {
    return targetBrushCells(cells, brushContext())
  }

  /**
   * Cresce o mapa quando o ponteiro entra no anel. Devolve a casa-alvo JÁ no mapa novo
   * (ou `null` se bateu no teto).
   */
  function growForRing(cell: CellPos): CellPos | null {
    const g = gestureRef.current
    const current = editor.getState().asset
    if (!g || current.kind !== 'tilemap') return null
    const side: 'left' | 'right' | 'top' | 'bottom' =
      cell.col < 0 ? 'left' : cell.col >= current.cols ? 'right' : cell.row < 0 ? 'top' : 'bottom'
    // Crescer à esquerda ou em cima empurra os objetos uma peça junto.
    const grown = growTilemap(current, side, deps.tileSize)
    if (grown === current) {
      if (!g.grew) deps.showToast(COPY.tiles.autoExpandLimit)
      g.grew = true
      return null
    }
    // O conteúdo anda uma casa: âncora, última casa e rolagem acompanham para o mapa não pular.
    const stage = stageRef.current
    if (side === 'left') {
      g.anchor.col += 1
      g.lastCell.col += 1
      if (stage) stage.scrollLeft += deps.cellPx
    } else if (side === 'top') {
      g.anchor.row += 1
      g.lastCell.row += 1
      if (stage) stage.scrollTop += deps.cellPx
    }
    editor.getState().replace(grown)
    const row = Math.min(Math.max(cell.row, 0), current.rows - 1),
      col = Math.min(Math.max(cell.col, 0), current.cols - 1)
    const target: CellPos =
      side === 'left'
        ? { col: 0, row }
        : side === 'right'
          ? { col: grown.cols - 1, row }
          : side === 'top'
            ? { col, row: 0 }
            : { col, row: grown.rows - 1 }
    deps.repaintMap(grown)
    return target
  }

  // ---- Lápis e borracha -------------------------------------------------
  function paintStroke(rawCell: CellPos): void {
    const g = gestureRef.current
    if (!g) return
    let cell = rawCell
    const before = editor.getState().asset
    if (before.kind !== 'tilemap') return
    if (cell.col < 0 || cell.row < 0 || cell.col >= before.cols || cell.row >= before.rows) {
      if (!deps.autoExpand) return
      const grown = growForRing(cell)
      if (!grown) return
      cell = grown
    }
    const state = editor.getState()
    const current = state.asset
    if (current.kind !== 'tilemap') return
    const cells = targetCells(lineCells(g.lastCell, cell))
    const next = applyTiles(current, cells, true)
    g.lastCell = cell
    if (next === current) return
    state.replace(next)
    deps.repaintMap(next)
  }

  // ---- Linha e retângulo ------------------------------------------------
  function paintShape(cell: CellPos): void {
    const g = gestureRef.current
    if (g?.base.kind !== 'tilemap') return
    const target = deps.clampCell(cell)
    const shape = shapeBrushCells(tilemap, tool === 'line' ? 'line' : 'rect', g.anchor, target)
    const next = applyTiles(g.base, shape, true)
    editor.getState().replace(next)
    deps.repaintMap(next)
    previewCellsRef.current = shape
  }

  // ---- Conta-gotas ------------------------------------------------------
  function pickAt(cell: CellPos): void {
    const c = deps.clampCell(cell)
    const current = editor.getState().asset
    if (current.kind !== 'tilemap') return
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
    if (state.asset.kind !== 'tilemap') return
    const result = fillWithBrush(state.asset, deps.clampCell(cell), brushContext())
    if (result.unmatched) deps.showToast(COPY.scene.faltamPecasDeBordaOuCantoNeste)
    // Área que já está igual não vira um desfazer vazio.
    commitIfChanged(state, result.map)
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
      const current = editor.getState().asset
      if (
        !gesture &&
        current.kind === 'tilemap' &&
        (deps.brush.scatter || deps.brush.terrainId) &&
        tool === 'pencil' &&
        !inRing(cell)
      )
        deps.repaintMap(applyTiles(current, [cell], false))
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
    editor.getState().commitGesture(gesture.base)
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
    if (state.asset.id === gesture.base.id) state.replace(gesture.base)
    const current = editor.getState().asset
    if (current.kind === 'tilemap') deps.repaintMap(current)
    deps.onGestureEnd()
    return true
  }

  function leave(): void {
    deps.hoverRef.current(null)
    const current = editor.getState().asset
    if (!gestureRef.current && current.kind === 'tilemap') deps.repaintMap(current)
  }

  return { down, move, up, cancel, leave, pickAt }
}
