import {
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { COPY } from '../../../core/copy'
import { safeSetPointerCapture } from '../../../core/pointer'
import {
  effectiveLayer,
  isObjectLayer,
  type PintaAsset,
  type TilemapAsset,
} from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import { libraryPlacement, placeLibraryObject } from '../../../tiles/libraryPlacement'
import { pointOnMap } from './mapViewport'

type Preview = NonNullable<ReturnType<typeof libraryPlacement>> & { source: PintaAsset }
type Gesture = {
  pointerId: number
  x: number
  y: number
  moved: boolean
  map: TilemapAsset
  layerId: string
  source: PintaAsset
  snap: boolean
  tileSize: number
  pad: number
  cellPx: number
}

export function useLibraryPlacement(deps: {
  editor: PintaEditorStore
  map: TilemapAsset
  layerId: string
  assets: readonly PintaAsset[]
  tileSize: number
  cellPx: number
  pad: number
  snap: boolean
  paperRef: RefObject<HTMLDivElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  position: () => { x: number; y: number }
  showToast: (message: string) => void
  onSelect: (id: string) => void
}) {
  const latest = useRef(deps)
  latest.current = deps
  const gesture = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [message, setMessage] = useState('')
  const cancel = useCallback(() => {
    const current = gesture.current
    if (!current) return
    gesture.current = null
    suppressClick.current = current.moved
    setPreview(null)
    if (current.moved) setMessage(COPY.scene.libraryCancelled)
  }, [])
  const refused = useCallback((): void => {
    const d = latest.current
    const layer = d.map.layers.find((l) => l.id === d.layerId)
    d.showToast(
      layer && effectiveLayer(d.map, layer).locked
        ? COPY.layers.lockedWarning
        : COPY.scene.libraryUnavailable,
    )
  }, [])
  const commit = useCallback(
    (source: PintaAsset, placed: Preview, selectObject: boolean): void => {
      const d = latest.current
      if (
        d.editor.getState().asset !== d.map ||
        d.assets.find((a) => a.id === source.id) !== source
      )
        return
      const next = placeLibraryObject(d.map, d.layerId, placed.object)
      if (next === d.map) {
        refused()
        return
      }
      d.editor.getState().commit(next)
      const accepted = d.editor.getState().asset
      if (
        accepted.kind !== 'tilemap' ||
        !accepted.layers.some(
          (layer) =>
            isObjectLayer(layer) && layer.objects.some((object) => object.id === placed.object.id),
        )
      ) {
        refused()
        return
      }
      if (selectObject) d.onSelect(placed.object.id)
      setMessage(COPY.scene.libraryPlaced(source.name))
    },
    [refused],
  )
  useEffect(() => {
    function currentGesture(): Gesture | null {
      const current = gesture.current,
        d = latest.current
      if (
        current &&
        (d.editor.getState().asset !== current.map ||
          d.layerId !== current.layerId ||
          d.assets.find((a) => a.id === current.source.id) !== current.source)
      ) {
        cancel()
        return null
      }
      return current
    }
    function at(event: globalThis.PointerEvent, current: Gesture): Preview | null {
      const d = latest.current,
        paper = d.paperRef.current?.getBoundingClientRect(),
        stage = d.stageRef.current?.getBoundingClientRect()
      if (!paper || !stage) return null
      const point = pointOnMap(
        { x: event.clientX, y: event.clientY },
        {
          paper,
          stage,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          cols: d.map.cols,
          rows: d.map.rows,
          tileSize: d.tileSize,
          pad: d.pad,
        },
      )
      if (!point) return null
      const result = libraryPlacement(d.map, d.layerId, current.source, d.tileSize, point, d.snap)
      return result ? { ...result, source: current.source } : null
    }
    function move(event: globalThis.PointerEvent): void {
      const current = currentGesture()
      if (!current || current.pointerId !== event.pointerId) return
      if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6)
        return
      current.moved = true
      suppressClick.current = true
      event.preventDefault()
      setPreview(at(event, current))
      setMessage(COPY.scene.libraryDropHint)
    }
    function up(event: globalThis.PointerEvent): void {
      const current = currentGesture()
      if (!current || current.pointerId !== event.pointerId) return
      gesture.current = null
      setPreview(null)
      if (!current.moved) return
      event.preventDefault()
      const placed = at(event, current)
      if (placed) commit(current.source, placed, true)
      else setMessage(COPY.scene.libraryCancelled)
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
    const unsub = deps.editor.subscribe((state) => {
      if (gesture.current && state.asset !== gesture.current.map) cancel()
    })
    document.addEventListener('pointermove', move, { passive: false })
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', pointerCancel)
    document.addEventListener('keydown', key)
    window.addEventListener('blur', cancel)
    return () => {
      unsub()
      gesture.current = null
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', pointerCancel)
      document.removeEventListener('keydown', key)
      window.removeEventListener('blur', cancel)
    }
  }, [deps.editor, cancel, commit])
  useEffect(() => {
    const current = gesture.current
    if (
      current &&
      (current.layerId !== deps.layerId ||
        current.snap !== deps.snap ||
        current.tileSize !== deps.tileSize ||
        current.pad !== deps.pad ||
        current.cellPx !== deps.cellPx)
    )
      cancel()
  }, [deps.layerId, deps.snap, deps.tileSize, deps.pad, deps.cellPx, cancel])
  useEffect(() => {
    const current = gesture.current
    if (current && deps.assets.find((asset) => asset.id === current.source.id) !== current.source)
      cancel()
  }, [deps.assets, cancel])
  return {
    preview,
    message,
    down(source: PintaAsset, event: PointerEvent<HTMLButtonElement>): void {
      if (event.button !== 0 || event.isPrimary === false || gesture.current) return
      suppressClick.current = false
      const d = latest.current
      if (!libraryPlacement(d.map, d.layerId, source, d.tileSize, d.position(), d.snap)) {
        refused()
        return
      }
      gesture.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
        map: d.map,
        layerId: d.layerId,
        source,
        snap: d.snap,
        tileSize: d.tileSize,
        pad: d.pad,
        cellPx: d.cellPx,
      }
      safeSetPointerCapture(event.currentTarget, event.pointerId)
    },
    lost(event: PointerEvent<HTMLButtonElement>): void {
      if (gesture.current?.pointerId === event.pointerId) cancel()
    },
    click(source: PintaAsset, event: MouseEvent<HTMLButtonElement>): void {
      if (event.detail !== 0 && suppressClick.current) {
        suppressClick.current = false
        return
      }
      suppressClick.current = false
      const d = latest.current
      const placed = libraryPlacement(d.map, d.layerId, source, d.tileSize, d.position(), d.snap)
      if (placed) commit(source, { ...placed, source }, false)
      else refused()
    },
  }
}

export type LibraryPlacementController = ReturnType<typeof useLibraryPlacement>
