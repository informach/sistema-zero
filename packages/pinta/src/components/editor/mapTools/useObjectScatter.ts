import { type PointerEvent, type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { isTextEntryTarget } from '../../../core/dom'
import { newId } from '../../../core/id'
import { safeSetPointerCapture } from '../../../core/pointer'
import {
  effectiveLayer,
  isObjectLayer,
  type TilemapAsset,
  type TilemapObject,
} from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import { type CellPos, lineCells } from '../../../tiles/cellGeometry'
import {
  type ObjectScatterResult,
  type ObjectScatterSettings,
  scatterMapObjects,
} from '../../../tiles/objectScatter'
import { isPintaModalOpen } from '../useActionShortcuts'
import { pointOnMap } from './mapViewport'

type Gesture = {
  id: string
  pointerId: number
  map: TilemapAsset
  layerId: string
  source: TilemapObject
  settings: ObjectScatterSettings
  tileSize: number
  pad: number
  cellPx: number
  positions: Map<number, CellPos>
  last: CellPos | null
  result: ObjectScatterResult | null
}

export function useObjectScatter(deps: {
  editor: PintaEditorStore
  map: TilemapAsset
  layerId: string
  source: TilemapObject | null
  active: boolean
  settings: ObjectScatterSettings
  tileSize: number
  cellPx: number
  pad: number
  paperRef: RefObject<HTMLDivElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  showToast: (message: string) => void
}) {
  const latest = useRef(deps)
  latest.current = deps
  const gesture = useRef<Gesture | null>(null)
  const [preview, setPreview] = useState<ObjectScatterResult | null>(null)
  const [message, setMessage] = useState('')
  const cancel = useCallback(() => {
    if (!gesture.current) return
    gesture.current = null
    setPreview(null)
    setMessage(COPY.scene.scatterCancelled)
  }, [])
  const point = useCallback(
    (event: { clientX: number; clientY: number }, map: TilemapAsset): CellPos | null => {
      const d = latest.current,
        paper = d.paperRef.current?.getBoundingClientRect(),
        stage = d.stageRef.current?.getBoundingClientRect()
      if (!paper || !stage) return null
      const p = pointOnMap(
        { x: event.clientX, y: event.clientY },
        {
          paper,
          stage,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          cols: map.cols,
          rows: map.rows,
          tileSize: d.tileSize,
          pad: d.pad,
        },
      )
      return p ? { col: Math.floor(p.x / d.tileSize), row: Math.floor(p.y / d.tileSize) } : null
    },
    [],
  )
  const paint = useCallback((current: Gesture, at: CellPos): ObjectScatterResult => {
    const before = current.positions.size
    const radius = Math.floor(Math.max(1, Math.min(9, current.settings.width)) / 2)
    for (const center of lineCells(current.last ?? at, at))
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue
          const col = center.col + dx,
            row = center.row + dy
          if (col < 0 || row < 0 || col >= current.map.cols || row >= current.map.rows) continue
          current.positions.set(row * current.map.cols + col, { col, row })
        }
    current.last = at
    if (current.positions.size !== before || !current.result)
      current.result = scatterMapObjects(
        current.map,
        current.layerId,
        current.source,
        current.tileSize,
        [...current.positions.values()],
        current.settings,
        current.id,
      )
    setPreview(current.result)
    setMessage(
      current.result.overflow
        ? COPY.scene.scatterLimit
        : COPY.scene.scatterPreviewCount(current.result.addedIds.length),
    )
    return current.result
  }, [])
  useEffect(() => {
    function valid(): Gesture | null {
      const current = gesture.current,
        d = latest.current
      if (
        current &&
        (!d.active ||
          d.editor.getState().asset !== current.map ||
          d.layerId !== current.layerId ||
          isPintaModalOpen())
      ) {
        cancel()
        return null
      }
      return current
    }
    function move(event: globalThis.PointerEvent): void {
      const current = valid()
      if (!current || current.pointerId !== event.pointerId) return
      event.preventDefault()
      const at = point(event, current.map)
      if (at) paint(current, at)
      else {
        current.last = null
        setPreview(null)
      }
    }
    function up(event: globalThis.PointerEvent): void {
      const current = valid()
      if (!current || current.pointerId !== event.pointerId) return
      const at = point(event, current.map)
      if (!at) {
        cancel()
        return
      }
      event.preventDefault()
      const result = paint(current, at)
      gesture.current = null
      setPreview(null)
      const d = latest.current
      if (result.overflow) {
        d.showToast(COPY.scene.scatterLimit)
        return
      }
      if (result.map === current.map) {
        setMessage(COPY.scene.scatterEmpty)
        return
      }
      d.editor.getState().commit(result.map)
      const accepted = d.editor.getState().asset
      if (accepted.kind !== 'tilemap' || accepted.layers !== result.map.layers) {
        d.showToast(COPY.scene.scatterRefused)
        setMessage(COPY.scene.scatterRefused)
        return
      }
      setMessage(COPY.scene.scatterPlacedCount(result.addedIds.length))
    }
    function pointerCancel(event: globalThis.PointerEvent): void {
      if (gesture.current?.pointerId === event.pointerId) cancel()
    }
    function key(event: KeyboardEvent): void {
      if (event.key === 'Escape' && gesture.current) {
        event.preventDefault()
        cancel()
      }
    }
    const unsubscribe = deps.editor.subscribe((state) => {
      if (gesture.current && state.asset !== gesture.current.map) cancel()
    })
    document.addEventListener('pointermove', move, { passive: false })
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', pointerCancel)
    document.addEventListener('keydown', key)
    window.addEventListener('blur', cancel)
    return () => {
      unsubscribe()
      gesture.current = null
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', pointerCancel)
      document.removeEventListener('keydown', key)
      window.removeEventListener('blur', cancel)
    }
  }, [deps.editor, cancel, paint, point])
  useEffect(() => {
    const current = gesture.current
    if (
      current &&
      (!deps.active ||
        deps.map !== current.map ||
        deps.source !== current.source ||
        deps.settings !== current.settings ||
        deps.layerId !== current.layerId ||
        deps.cellPx !== current.cellPx ||
        deps.pad !== current.pad ||
        deps.tileSize !== current.tileSize)
    )
      cancel()
  }, [
    deps.active,
    deps.map,
    deps.source,
    deps.settings,
    deps.layerId,
    deps.cellPx,
    deps.pad,
    deps.tileSize,
    cancel,
  ])
  return {
    preview,
    message,
    cancel,
    down(event: PointerEvent<HTMLCanvasElement>): void {
      if (
        !latest.current.active ||
        event.button !== 0 ||
        event.isPrimary === false ||
        gesture.current ||
        isPintaModalOpen()
      )
        return
      const focused = document.activeElement
      if (focused instanceof HTMLElement && isTextEntryTarget(focused)) focused.blur()
      const d = latest.current,
        map = d.editor.getState().asset
      if (map.kind !== 'tilemap') return
      const layer = map.layers.find((l) => l.id === d.layerId)
      if (!layer || !isObjectLayer(layer)) return
      if (effectiveLayer(map, layer).locked) {
        d.showToast(COPY.layers.lockedWarning)
        return
      }
      const source = layer.objects.find((o) => o.id === d.source?.id)
      if (!source || (!source.art && !source.setId)) {
        d.showToast(COPY.scene.scatterChoose)
        return
      }
      const at = point(event, map)
      if (!at) return
      event.preventDefault()
      const current: Gesture = {
        id: newId(),
        pointerId: event.pointerId,
        map,
        layerId: d.layerId,
        source,
        settings: d.settings,
        tileSize: d.tileSize,
        cellPx: d.cellPx,
        pad: d.pad,
        positions: new Map(),
        last: null,
        result: null,
      }
      gesture.current = current
      safeSetPointerCapture(event.currentTarget, event.pointerId)
      paint(current, at)
    },
    lost(event: PointerEvent<HTMLCanvasElement>): void {
      if (gesture.current?.pointerId === event.pointerId) cancel()
    },
  }
}
