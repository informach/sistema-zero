import type { KeyboardEvent, RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { effectiveLayer, type TilemapAsset } from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import { type CellPos, type CellRect, normalizeCellRect } from '../../../tiles/cellGeometry'
import { isTileBlank } from '../../../tiles/tilesetOps'
import type { MapTool } from '../TilemapPanels'
import { isPintaModalOpen } from '../useActionShortcuts'
import { commitIfChanged } from './commitGuard'
import { keyboardCellBounds, keyboardPaintCandidate } from './keyboardPainting'
import { brushTerrain, type MapBrushContext } from './mapBrush'
import { mapBrushMessage } from './mapBrushMessages'

export type KeyboardMapPreview = { base: TilemapAsset; map: TilemapAsset }
interface Options {
  editor: PintaEditorStore
  map: TilemapAsset
  layerId: string
  enabled: boolean
  isAvailable: (tool: MapTool) => boolean
  getTool: () => MapTool
  getBrush: () => MapBrushContext
  canUse: () => boolean
  tool: MapTool
  brush: MapBrushContext
  tileSize: number
  previewRef: RefObject<KeyboardMapPreview | null>
  cursorRef: RefObject<HTMLDivElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  position: () => { x: number; y: number }
  onCursor: (cell: CellPos | null) => void
  repaint: (map: TilemapAsset) => void
  showToast: (message: string) => void
  pickCell: (cell: CellPos) => void
  selectRect: (rect: CellRect) => void
  cancelSelection: () => void
}

function sameBrush(a: MapBrushContext, b: MapBrushContext): boolean {
  return (
    a.layerId === b.layerId &&
    a.selectedTile === b.selectedTile &&
    a.stamp === b.stamp &&
    a.brush === b.brush &&
    a.tileset === b.tileset
  )
}

/** O teclado escolhe casas; os mesmos algoritmos do ponteiro calculam a edição. */
export function useKeyboardPainting(options: Options) {
  const latest = useRef(options)
  latest.current = options
  const available = options.isAvailable(options.tool)
  const contract = useMemo(
    () => ({
      map: options.map,
      layerId: options.layerId,
      enabled: options.enabled,
      tool: options.tool,
      available,
      tileSize: options.tileSize,
      brush: options.brush.brush,
      stamp: options.brush.stamp,
      selectedTile: options.brush.selectedTile,
      tileset: options.brush.tileset,
    }),
    [
      options.map,
      options.layerId,
      options.enabled,
      options.tool,
      available,
      options.tileSize,
      options.brush.brush,
      options.brush.stamp,
      options.brush.selectedTile,
      options.brush.tileset,
    ],
  )
  const [cursor, setCursor] = useState<CellPos>({ col: 0, row: 0 })
  const cellRef = useRef(cursor)
  const [focused, setFocused] = useState(false)
  const [anchor, setAnchor] = useState<CellPos | null>(null)
  const pending = useRef<{
    base: TilemapAsset
    layerId: string
    tool: MapTool
    at: CellPos
    brush: MapBrushContext
  } | null>(null)
  const pointerFocus = useRef(false)

  const cancel = useCallback((): boolean => {
    const d = latest.current
    const changed = pending.current !== null || d.previewRef.current !== null
    pending.current = null
    d.previewRef.current = null
    setAnchor(null)
    if (changed) {
      const live = d.editor.getState().asset
      if (live.kind === 'tilemap') d.repaint(live)
    }
    return changed
  }, [])

  // A gesture belongs to one revision, layer, tool and brush. Recovery or changing
  // settings must never confirm a preview created under the previous contract.
  useEffect(() => {
    const gesture = pending.current,
      d = latest.current
    if (
      gesture &&
      (gesture.base !== d.editor.getState().asset ||
        gesture.layerId !== contract.layerId ||
        !contract.enabled ||
        !d.isAvailable(gesture.tool) ||
        gesture.tool !== d.getTool() ||
        !sameBrush(gesture.brush, d.getBrush()))
    )
      cancel()
  }, [contract, cancel])
  useEffect(
    () => () => {
      latest.current.previewRef.current = null
    },
    [],
  )

  function liveMap(): TilemapAsset | null {
    const d = latest.current,
      asset = d.editor.getState().asset
    return d.enabled &&
      d.isAvailable(d.getTool()) &&
      d.canUse() &&
      asset.kind === 'tilemap' &&
      asset.id === d.map.id
      ? asset
      : null
  }
  function clamped(at: CellPos, map: TilemapAsset): CellPos {
    return {
      col: Math.max(0, Math.min(map.cols - 1, at.col)),
      row: Math.max(0, Math.min(map.rows - 1, at.row)),
    }
  }
  function move(at: CellPos, map: TilemapAsset): void {
    const d = latest.current,
      next = clamped(at, map),
      tool = d.getTool(),
      gesture = pending.current
    const brush = d.getBrush()
    cellRef.current = next
    setCursor(next)
    setFocused(true)
    d.onCursor(next)
    if (gesture && (gesture.tool !== tool || !sameBrush(gesture.brush, brush))) cancel()
    else if (
      gesture &&
      gesture.base === map &&
      gesture.layerId === d.layerId &&
      gesture.tool === tool &&
      gesture.tool !== 'select'
    ) {
      const candidate = keyboardPaintCandidate(map, tool, next, gesture.at, brush)
      d.previewRef.current = candidate ? { base: map, map: candidate.map } : null
      d.repaint(map)
    }
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: a casa move o elemento antes de medir a caixa real
  useEffect(() => {
    if (!focused || !options.enabled) return
    const stage = options.stageRef.current,
      target = options.cursorRef.current
    if (!stage || !target || stage.clientWidth <= 0 || stage.clientHeight <= 0) return
    const box = target.getBoundingClientRect(),
      viewport = stage.getBoundingClientRect()
    stage.scrollLeft +=
      box.left < viewport.left
        ? box.left - viewport.left
        : box.right > viewport.right
          ? box.right - viewport.right
          : 0
    stage.scrollTop +=
      box.top < viewport.top
        ? box.top - viewport.top
        : box.bottom > viewport.bottom
          ? box.bottom - viewport.bottom
          : 0
  }, [cursor, focused, options.enabled, options.cursorRef, options.stageRef])

  function onKeyDown(event: KeyboardEvent<HTMLCanvasElement>): void {
    if (event.defaultPrevented || isPintaModalOpen() || event.altKey) return
    const d = latest.current,
      tool = d.getTool(),
      map = liveMap()
    const brush = d.getBrush()
    if (!map) {
      cancel()
      return
    }
    const control = event.ctrlKey || event.metaKey
    if (control && event.key !== 'Home' && event.key !== 'End') return
    const at = clamped(cellRef.current, map)
    let next: CellPos | null = null
    if (event.key === 'ArrowLeft') next = { ...at, col: at.col - 1 }
    if (event.key === 'ArrowRight') next = { ...at, col: at.col + 1 }
    if (event.key === 'ArrowUp') next = { ...at, row: at.row - 1 }
    if (event.key === 'ArrowDown') next = { ...at, row: at.row + 1 }
    if (event.key === 'Home') next = { col: 0, row: control ? 0 : at.row }
    if (event.key === 'End') next = { col: map.cols - 1, row: control ? map.rows - 1 : at.row }
    if (next) {
      event.preventDefault()
      move(next, map)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      if (!cancel()) d.cancelSelection()
      return
    }
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    if (event.repeat) return
    setFocused(true)
    const layer = map.layers.find((l) => l.id === d.layerId)
    if (!layer) return
    if (!keyboardCellBounds(map, d.layerId, at, d.tileSize)) {
      cancel()
      d.showToast(COPY.scene.libraryUnavailable)
      return
    }
    if (tool === 'picker') {
      cancel()
      d.pickCell(at)
      return
    }
    if (tool !== 'select' && effectiveLayer(map, layer).locked) {
      cancel()
      d.showToast(COPY.layers.lockedWarning)
      return
    }
    const twoPoints = tool === 'line' || tool === 'rect' || tool === 'select'
    let gesture = pending.current
    if (gesture && (gesture.base !== map || gesture.layerId !== d.layerId)) {
      cancel()
      return
    }
    if (gesture && !sameBrush(gesture.brush, brush)) {
      cancel()
      return
    }
    if (gesture && gesture.tool !== tool) {
      cancel()
      gesture = null
    }
    if (twoPoints && !gesture) {
      pending.current = { base: map, layerId: d.layerId, tool, at, brush }
      setAnchor(at)
      move(at, map)
      return
    }
    if (tool === 'select' && gesture) {
      const rect = normalizeCellRect(gesture.at, at, map.cols, map.rows)
      cancel()
      if (rect) d.selectRect(rect)
      return
    }
    const candidate = keyboardPaintCandidate(map, tool, at, gesture?.at ?? null, brush)
    cancel()
    if (!candidate) return
    const message = mapBrushMessage(candidate)
    if (message) d.showToast(message)
    if (candidate.failure) return
    if (
      tool !== 'eraser' &&
      tool !== 'fill' &&
      !brushTerrain(brush) &&
      brush.tileset &&
      isTileBlank(brush.tileset, brush.selectedTile)
    )
      d.showToast(COPY.tiles.blankTile)
    commitIfChanged(d.editor.getState(), candidate.map)
  }

  return {
    cursor: focused && options.enabled ? clamped(cursor, options.map) : null,
    anchor: focused && options.enabled ? anchor : null,
    cancel,
    onKeyDown,
    onFocus: () => {
      if (pointerFocus.current) {
        pointerFocus.current = false
        return
      }
      const d = latest.current,
        map = liveMap(),
        layer = d.map.layers.find((l) => l.id === d.layerId)
      if (!map || !layer) return
      const point = d.position(),
        offset = effectiveLayer(map, layer)
      move(
        {
          col: Math.floor((point.x - offset.offsetX) / d.tileSize),
          row: Math.floor((point.y - offset.offsetY) / d.tileSize),
        },
        map,
      )
    },
    onBlur: () => {
      latest.current.onCursor(null)
      pointerFocus.current = false
      setFocused(false)
      cancel()
    },
    onPointerDownCapture: () => {
      latest.current.onCursor(null)
      pointerFocus.current = true
      setFocused(false)
      cancel()
    },
  }
}
