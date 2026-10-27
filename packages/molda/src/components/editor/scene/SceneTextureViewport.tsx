import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import {
  fitTextureCamera,
  fitTextureCameraBounds,
  type TextureBounds,
  type TextureCamera,
  type TextureFrame,
  textureZoomStep,
  zoomTextureCamera,
} from '../../../scene/textureViewport'
import { Button, ToolButton } from '../../ui/Button'
import { Focus, Hand, Minus, Plus, Scan } from '../../ui/icons'

export interface SceneTextureView {
  key: string
  camera: TextureCamera
}

/** A shared view for painting and UV editing, with navigation captured before either tool. */
export function SceneTextureViewport({
  image,
  imageKey,
  view,
  onView,
  bounds,
  contentBounds,
  onCancel,
  children,
}: {
  image: TextureFrame
  imageKey: string
  view: SceneTextureView | null
  onView(view: SceneTextureView): void
  bounds?: TextureBounds
  contentBounds?: TextureBounds
  onCancel(): void
  children(scale: number): ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const measuredFrame = useRef<TextureFrame | null>(null)
  const [frame, setFrame] = useState<TextureFrame>({ width: 0, height: 0 })
  const [hand, setHand] = useState(false)
  const space = useRef(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const navigation = useRef(false)
  const navigationAnchor = useRef<{
    camera: TextureCamera
    points: Map<number, { x: number; y: number }>
    x: number
    y: number
  } | null>(null)
  const consumed = useRef(false)
  const latest = useRef({ view, onView, onCancel })
  latest.current = { view, onView, onCancel }
  const camera =
    view?.key === imageKey
      ? view.camera
      : contentBounds
        ? fitTextureCameraBounds(frame, image, contentBounds)
        : fitTextureCamera(frame, image)
  const liveCamera = useRef(camera)
  liveCamera.current = camera
  function publish(next: TextureCamera) {
    liveCamera.current = next
    latest.current.onView({ key: imageKey, camera: next })
  }
  const anchorNavigation = useCallback(() => {
    const rect = root.current?.getBoundingClientRect()
    if (!rect || !pointers.current.size) {
      navigationAnchor.current = null
      return
    }
    navigationAnchor.current = {
      camera: liveCamera.current,
      points: new Map(pointers.current),
      x: rect.left,
      y: rect.top,
    }
  }, [])
  function moveNavigation(id: number, x: number, y: number) {
    const anchor = navigationAnchor.current
    if (!anchor || !pointers.current.has(id)) return
    pointers.current.set(id, { x, y })
    const origins = [...anchor.points.entries()].slice(0, 2)
    const first = origins[0],
      second = origins[1]
    if (!first) return
    const currentFirst = pointers.current.get(first[0])
    if (!currentFirst) return
    if (!second) {
      publish({
        ...anchor.camera,
        x: anchor.camera.x + currentFirst.x - first[1].x,
        y: anchor.camera.y + currentFirst.y - first[1].y,
      })
      return
    }
    const currentSecond = pointers.current.get(second[0])
    if (!currentSecond) return
    const initialDistance = Math.hypot(first[1].x - second[1].x, first[1].y - second[1].y)
    if (!initialDistance) return
    const distance = Math.hypot(currentFirst.x - currentSecond.x, currentFirst.y - currentSecond.y)
    const initialCenter = { x: (first[1].x + second[1].x) / 2, y: (first[1].y + second[1].y) / 2 }
    const next = zoomTextureCamera(
      anchor.camera,
      (anchor.camera.scale * distance) / initialDistance,
      { x: initialCenter.x - anchor.x, y: initialCenter.y - anchor.y },
    )
    publish({
      ...next,
      x: next.x + (currentFirst.x + currentSecond.x) / 2 - initialCenter.x,
      y: next.y + (currentFirst.y + currentSecond.y) / 2 - initialCenter.y,
    })
  }
  useEffect(() => {
    const element = root.current
    if (!element) return
    const measure = () => {
      const measured = { width: element.clientWidth, height: element.clientHeight }
      setFrame(measured)
      if (measured.width > 0 && measured.height > 0 && latest.current.view?.key !== imageKey) {
        const initialImage = { width: image.width, height: image.height }
        const initial = contentBounds
          ? fitTextureCameraBounds(measured, initialImage, contentBounds)
          : fitTextureCamera(measured, initialImage)
        liveCamera.current = initial
        latest.current.onView({ key: imageKey, camera: initial })
      } else if (measured.width > 0 && measured.height > 0 && measuredFrame.current) {
        const before = measuredFrame.current
        if (before.width !== measured.width || before.height !== measured.height) {
          const centered = {
            ...liveCamera.current,
            x: liveCamera.current.x + (measured.width - before.width) / 2,
            y: liveCamera.current.y + (measured.height - before.height) / 2,
          }
          liveCamera.current = centered
          latest.current.onView({ key: imageKey, camera: centered })
        }
      }
      if (measured.width > 0 && measured.height > 0) measuredFrame.current = measured
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [imageKey, image.width, image.height, contentBounds])
  useEffect(() => {
    const element = root.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      latest.current.onCancel()
      const rect = element.getBoundingClientRect()
      const before = liveCamera.current
      const scale = event.deltaY === 0 ? before.scale : textureZoomStep(before.scale, -event.deltaY)
      const next = zoomTextureCamera(before, scale, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
      liveCamera.current = next
      latest.current.onView({ key: imageKey, camera: next })
      // Subsequent drag samples start from the zoomed camera, rather than undoing the wheel.
      if (navigation.current) anchorNavigation()
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [imageKey, anchorNavigation])
  useEffect(() => {
    const reset = () => {
      space.current = false
      pointers.current.clear()
      navigation.current = false
    }
    window.addEventListener('blur', reset)
    return () => window.removeEventListener('blur', reset)
  }, [])
  function fitSelection() {
    if (!bounds) return
    publish(fitTextureCameraBounds(frame, image, bounds))
  }
  return (
    <div className="mld-texture-view">
      <div
        ref={root}
        role="application"
        className="mld-texture-viewport"
        data-hand={hand}
        aria-label="Visualização da folha de pintura"
        onKeyDownCapture={(event) => {
          if (event.target instanceof Element && event.target.closest('[data-paint-canvas]')) return
          if (event.key === ' ' && !event.ctrlKey && !event.metaKey) {
            space.current = true
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        onKeyUpCapture={(event) => {
          if (event.key === ' ') {
            space.current = false
            if (event.target instanceof Element && event.target.closest('[data-paint-canvas]'))
              return
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) space.current = false
        }}
        onPointerDownCapture={(event) => {
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
          if (!hand && !space.current && event.button !== 1 && pointers.current.size < 2) return
          event.preventDefault()
          event.stopPropagation()
          onCancel()
          navigation.current = true
          anchorNavigation()
          consumed.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMoveCapture={(event) => {
          if (!pointers.current.has(event.pointerId) || !navigation.current) return
          event.preventDefault()
          event.stopPropagation()
          moveNavigation(event.pointerId, event.clientX, event.clientY)
        }}
        onPointerUpCapture={(event) => {
          if (!navigation.current) {
            pointers.current.delete(event.pointerId)
            return
          }
          moveNavigation(event.pointerId, event.clientX, event.clientY)
          pointers.current.delete(event.pointerId)
          anchorNavigation()
          event.stopPropagation()
          event.preventDefault()
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
          if (!pointers.current.size) navigation.current = false
        }}
        onPointerCancelCapture={(event) => {
          pointers.current.delete(event.pointerId)
          anchorNavigation()
          if (navigation.current) event.stopPropagation()
          if (!pointers.current.size) navigation.current = false
          onCancel()
        }}
        onClickCapture={(event) => {
          if (hand || consumed.current) {
            consumed.current = false
            event.preventDefault()
            event.stopPropagation()
          }
        }}
      >
        <div
          className="mld-texture-content"
          style={{
            width: image.width,
            height: image.height,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          }}
        >
          {children(camera.scale)}
        </div>
      </div>
      <nav className="mld-texture-navigation" aria-label="Navegação da folha">
        <ToolButton
          icon={Hand}
          label="Mover visualização"
          active={hand}
          onClick={() => {
            onCancel()
            setHand(!hand)
          }}
        />
        <ToolButton
          icon={Minus}
          label="Diminuir zoom da folha"
          onClick={() => {
            onCancel()
            publish(
              zoomTextureCamera(camera, textureZoomStep(camera.scale, -1), {
                x: frame.width / 2,
                y: frame.height / 2,
              }),
            )
          }}
        />
        <output aria-label="Zoom da folha">{Math.round(camera.scale * 100)}%</output>
        <ToolButton
          icon={Plus}
          label="Aumentar zoom da folha"
          onClick={() => {
            onCancel()
            publish(
              zoomTextureCamera(camera, textureZoomStep(camera.scale, 1), {
                x: frame.width / 2,
                y: frame.height / 2,
              }),
            )
          }}
        />
        <Button
          variant="ghost"
          className="px-2 text-xs"
          onClick={() => {
            onCancel()
            publish(fitTextureCamera(frame, image))
          }}
        >
          <Scan className="size-4" aria-hidden="true" />
          {contentBounds ? 'Folha inteira' : 'Ajustar'}
        </Button>
        {contentBounds && (
          <Button
            variant="ghost"
            className="px-2 text-xs"
            onClick={() => {
              onCancel()
              publish(fitTextureCameraBounds(frame, image, contentBounds))
            }}
          >
            <Focus className="size-4" aria-hidden="true" />
            Ver mapa
          </Button>
        )}
        {bounds && (
          <ToolButton
            icon={Focus}
            label="Ver seleção"
            onClick={() => {
              onCancel()
              fitSelection()
            }}
          />
        )}
      </nav>
    </div>
  )
}
