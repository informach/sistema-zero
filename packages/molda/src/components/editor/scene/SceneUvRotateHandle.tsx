import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SceneMeshGeometry, Vec2 } from '../../../scene/document'
import { meshUvBounds } from '../../../scene/meshUv'
import type { meshUvLayout } from '../../../scene/meshUvLayout'
import { prepareUvRotation } from '../../../scene/uvRotation'
import { RotateCw } from '../../ui/icons'
import { uvOutlinePath } from './SceneUvOutlines'
import type { SceneUvCornerControl } from './useSceneUvCornerInput'

/** A rotation changes only UV corners; preview and commit use the same pixel-space transform. */
export function SceneUvRotateHandle({
  mesh,
  layout,
  control,
  width,
  height,
  screenScale,
  cancelKey,
}: {
  mesh: SceneMeshGeometry
  layout: ReturnType<typeof meshUvLayout>
  control: SceneUvCornerControl
  width: number
  height: number
  screenScale: number
  cancelKey?: number
}) {
  const ids = control.ids ?? [control.faceId]
  const bounds = meshUvBounds(mesh, ids)
  const origin: Vec2 = [
    bounds.min[0] / 2 + bounds.max[0] / 2,
    bounds.min[1] / 2 + bounds.max[1] / 2,
  ]
  const owner = JSON.stringify([control.sourceKey, control.faceId, ids, width, height, cancelKey])
  const svg = useRef<SVGSVGElement>(null)
  const active = useRef<{
    owner: string
    mesh: SceneMeshGeometry
    pointer: number | null
    target: HTMLButtonElement
    lastAngle: number | null
    rawDegrees: number
    degrees: number
    commit: NonNullable<SceneUvCornerControl['onRotate']>
  } | null>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const finish = useCallback((commit: boolean, notify = true) => {
    const gesture = active.current
    active.current = null
    if (notify) setPreview(null)
    if (!gesture) return
    if (gesture.pointer !== null && gesture.target.hasPointerCapture?.(gesture.pointer))
      gesture.target.releasePointerCapture(gesture.pointer)
    const turn = Math.abs(gesture.degrees % 360)
    if (commit && turn > 1e-9 && Math.abs(turn - 360) > 1e-9) gesture.commit(gesture.degrees)
  }, [])
  useLayoutEffect(() => {
    if (active.current && (active.current.owner !== owner || active.current.mesh !== mesh))
      finish(false)
  }, [owner, mesh, finish])
  useEffect(() => {
    const cancel = () => finish(false)
    const hidden = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
      finish(false, false)
    }
  }, [finish])
  function angle(x: number, y: number) {
    const rect = svg.current?.getBoundingClientRect()
    const uv =
      rect?.width && rect.height
        ? layout.unmap([(x - rect.left) / rect.width, (y - rect.top) / rect.height])
        : null
    if (!uv) return null
    const dx = (uv[0] - origin[0]) * width
    const dy = (uv[1] - origin[1]) * height
    return dx === 0 && dy === 0 ? null : Math.atan2(dy, dx)
  }
  function begin(target: HTMLButtonElement, pointer: number | null, first: number | null) {
    if (active.current || !control.onRotate) return false
    active.current = {
      owner,
      mesh,
      target,
      pointer,
      lastAngle: first,
      rawDegrees: 0,
      degrees: 0,
      commit: control.onRotate,
    }
    setPreview(0)
    return true
  }
  function move(x: number, y: number, snap: boolean) {
    const gesture = active.current
    const next = angle(x, y)
    if (!gesture || next === null || gesture.lastAngle === null) return
    const delta = next - gesture.lastAngle
    gesture.rawDegrees += (Math.atan2(Math.sin(delta), Math.cos(delta)) * 180) / Math.PI
    gesture.lastAngle = next
    gesture.degrees = snap ? Math.round(gesture.rawDegrees / 15) * 15 : gesture.rawDegrees
    setPreview(gesture.degrees)
  }
  if (!ids.length || !control.onRotate || !origin.every(Number.isFinite)) return null
  const top = layout.map([origin[0], bounds.max[1]])
  const x = top[0] * width
  const y = top[1] * height - 32 / screenScale
  const rotate = preview === null ? null : prepareUvRotation(preview, origin, { width, height })
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${width} ${height}`}
      className="mld-uv-rotate-handle"
      aria-label="Alça de giro do mapa"
    >
      {rotate && (
        <path
          d={ids
            .map((id) =>
              uvOutlinePath(
                mesh.faces[id]!.corners.map((corner) => layout.map(rotate(corner.uv))),
                width,
                height,
              ),
            )
            .join('')}
          fill="currentColor"
          fillOpacity={0.12}
          stroke="currentColor"
          strokeWidth={2 / screenScale}
          data-uv-rotation-preview
        />
      )}
      <line
        x1={x}
        y1={top[1] * height}
        x2={x}
        y2={y}
        stroke="currentColor"
        strokeWidth={1 / screenScale}
      />
      <circle
        cx={x}
        cy={y}
        r={10 / screenScale}
        fill="var(--color-mld-surface)"
        stroke="currentColor"
        strokeWidth={(focused ? 3 : 1.5) / screenScale}
      />
      <RotateCw
        x={x - 6 / screenScale}
        y={y - 6 / screenScale}
        width={12 / screenScale}
        height={12 / screenScale}
        strokeWidth={3}
        aria-hidden="true"
      />
      {preview !== null && (
        <text
          x={x + 16 / screenScale}
          y={y + 4 / screenScale}
          fontSize={11 / screenScale}
          fill="currentColor"
        >
          {Math.round(preview * 10) / 10}°
        </text>
      )}
      <foreignObject
        x={x - 22 / screenScale}
        y={y - 22 / screenScale}
        width={44 / screenScale}
        height={44 / screenScale}
        className="mld-uv-rotate-target"
      >
        <button
          type="button"
          className="mld-uv-rotate-target"
          aria-label="Girar mapa livremente"
          title="Arraste para girar. Shift encaixa de 15 em 15 graus. Pelo teclado, use as setas e Enter."
          onFocus={() => setFocused(true)}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            const first = angle(event.clientX, event.clientY)
            if (first === null) return
            finish(false)
            if (!begin(event.currentTarget, event.pointerId, first)) return
            event.preventDefault()
            event.stopPropagation()
            event.currentTarget.focus()
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              finish(false)
            }
          }}
          onPointerMove={(event) => {
            if (active.current?.pointer !== event.pointerId) return
            event.stopPropagation()
            move(event.clientX, event.clientY, event.shiftKey)
          }}
          onPointerUp={(event) => {
            if (active.current?.pointer !== event.pointerId) return
            event.stopPropagation()
            move(event.clientX, event.clientY, event.shiftKey)
            finish(true)
          }}
          onPointerCancel={() => finish(false)}
          onLostPointerCapture={() => finish(false)}
          onBlur={() => {
            setFocused(false)
            finish(false)
          }}
          onClick={(event) => {
            event.stopPropagation()
            if (event.detail === 0) {
              if (active.current?.pointer === null) finish(true)
              else begin(event.currentTarget, null, null)
            }
          }}
          onKeyDown={(event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return
            if (event.key === 'Escape' && active.current) {
              event.preventDefault()
              event.stopPropagation()
              finish(false)
            } else if (event.key === 'Enter' && !event.repeat) {
              event.preventDefault()
              event.stopPropagation()
              if (active.current?.pointer === null) finish(true)
              else if (!active.current) begin(event.currentTarget, null, null)
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              if (active.current?.pointer !== null && active.current) return
              event.preventDefault()
              event.stopPropagation()
              if (!active.current) begin(event.currentTarget, null, null)
              const gesture = active.current
              if (!gesture) return
              gesture.rawDegrees +=
                (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 15 : 1)
              gesture.degrees = gesture.rawDegrees
              setPreview(gesture.degrees)
            }
          }}
        />
      </foreignObject>
    </svg>
  )
}
