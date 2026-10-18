import { useCallback, useEffect, useRef, useState } from 'react'
import type { SceneMeshGeometry, Vec2 } from '../../../scene/document'
import { meshUvBounds } from '../../../scene/meshUv'
import type { meshUvLayout } from '../../../scene/meshUvLayout'
import { uvOutlinePath } from './SceneUvOutlines'
import type { SceneUvCornerControl } from './useSceneUvCornerInput'

export function SceneUvScaleHandles({
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
  const selectionKey = ids.join('\0')
  const svg = useRef<SVGSVGElement>(null)
  const active = useRef<{
    pointer: number
    origin: Vec2
    from: Vec2
    anchor: Vec2
    scale: Vec2
    target: HTMLButtonElement
    commit: NonNullable<SceneUvCornerControl['onScale']>
    mesh: SceneMeshGeometry
    sourceKey: string
    faceId: string
    cancelKey?: number
    selectionKey: string
  } | null>(null)
  const [preview, setPreview] = useState<{ scale: Vec2; origin: Vec2 } | null>(null)
  const cancel = useCallback(() => {
    const gesture = active.current
    active.current = null
    setPreview(null)
    if (gesture?.target.hasPointerCapture?.(gesture.pointer))
      gesture.target.releasePointerCapture(gesture.pointer)
  }, [])
  useEffect(() => {
    const current = active.current
    if (
      current &&
      (current.mesh !== mesh ||
        current.sourceKey !== control.sourceKey ||
        current.faceId !== control.faceId ||
        current.cancelKey !== cancelKey ||
        current.selectionKey !== selectionKey)
    )
      cancel()
  }, [mesh, control.sourceKey, control.faceId, cancelKey, selectionKey, cancel])
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel()
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', onEscape)
      const gesture = active.current
      active.current = null
      if (gesture?.target.hasPointerCapture?.(gesture.pointer))
        gesture.target.releasePointerCapture(gesture.pointer)
    }
  }, [cancel])
  function point(x: number, y: number): Vec2 | null {
    const rect = svg.current?.getBoundingClientRect()
    return rect?.width && rect.height
      ? layout.unmap([(x - rect.left) / rect.width, (y - rect.top) / rect.height])
      : null
  }
  function move(x: number, y: number) {
    const gesture = active.current,
      next = point(x, y)
    if (!gesture || !next) return
    let target: Vec2 = [
      gesture.from[0] + next[0] - gesture.anchor[0],
      gesture.from[1] + next[1] - gesture.anchor[1],
    ]
    const scale: Vec2 = [1, 1]
    if (control.pixelStep)
      target = [
        Math.round(target[0] / control.pixelStep[0]) * control.pixelStep[0],
        Math.round(target[1] / control.pixelStep[1]) * control.pixelStep[1],
      ]
    for (const axis of [0, 1] as const) {
      const span = gesture.from[axis] - gesture.origin[axis]
      if (span !== 0) scale[axis] = Math.max(0.001, (target[axis] - gesture.origin[axis]) / span)
    }
    if (control.proportional !== false) {
      const ratio = Math.abs(scale[0] - 1) >= Math.abs(scale[1] - 1) ? scale[0] : scale[1]
      scale[0] = ratio
      scale[1] = ratio
    }
    gesture.scale = scale
    setPreview({ scale, origin: gesture.origin })
  }
  if (!control.onScale || !ids.length || bounds.min.some((n) => !Number.isFinite(n))) return null
  const corners: Vec2[] = [
    [bounds.min[0], bounds.min[1]],
    [bounds.max[0], bounds.min[1]],
    [bounds.max[0], bounds.max[1]],
    [bounds.min[0], bounds.max[1]],
  ]
  // Scaling handles sit beyond the selection, leaving the face's own corner points reachable.
  const offset = 32 / screenScale
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${width} ${height}`}
      className="mld-uv-scale-handles"
      aria-label="Alças de tamanho do mapa"
    >
      {preview && (
        <path
          d={ids
            .map((id) =>
              uvOutlinePath(
                mesh.faces[id]!.corners.map((corner) =>
                  layout.map([
                    preview.origin[0] + (corner.uv[0] - preview.origin[0]) * preview.scale[0],
                    preview.origin[1] + (corner.uv[1] - preview.origin[1]) * preview.scale[1],
                  ]),
                ),
                width,
                height,
              ),
            )
            .join('')}
          fill="currentColor"
          fillOpacity={0.12}
          stroke="currentColor"
          strokeWidth={2 / screenScale}
        />
      )}
      {corners.map((corner, index) => {
        const p = layout.map(corner)
        const x = p[0] * width + (index === 0 || index === 3 ? -offset : offset)
        const y = p[1] * height + (index < 2 ? offset : -offset)
        return (
          <g key={`${corner[0]}:${corner[1]}`}>
            <rect
              x={x - 4 / screenScale}
              y={y - 4 / screenScale}
              width={8 / screenScale}
              height={8 / screenScale}
              fill="var(--color-mld-surface)"
              stroke="currentColor"
              strokeWidth={1.5 / screenScale}
            />
            <foreignObject
              x={x - 22 / screenScale}
              y={y - 22 / screenScale}
              width={44 / screenScale}
              height={44 / screenScale}
              className="mld-uv-scale-target"
            >
              <button
                type="button"
                aria-label={`Redimensionar mapa, canto ${index + 1}`}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  padding: 0,
                  border: 0,
                  background: 'transparent',
                }}
                className="mld-uv-scale-target"
                data-uv-scale={index}
                onPointerDown={(event) => {
                  if (event.button !== 0 || active.current || !control.onScale) return
                  const anchor = point(event.clientX, event.clientY)
                  if (!anchor) return
                  event.preventDefault()
                  event.stopPropagation()
                  event.currentTarget.focus()
                  active.current = {
                    mesh,
                    sourceKey: control.sourceKey,
                    faceId: control.faceId,
                    selectionKey,
                    cancelKey,
                    pointer: event.pointerId,
                    origin: corners[(index + 2) % 4]!,
                    from: corner,
                    anchor,
                    scale: [1, 1],
                    target: event.currentTarget,
                    commit: control.onScale,
                  }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  if (active.current?.pointer === event.pointerId) {
                    event.stopPropagation()
                    move(event.clientX, event.clientY)
                  }
                }}
                onPointerUp={(event) => {
                  if (active.current?.pointer !== event.pointerId) return
                  event.stopPropagation()
                  move(event.clientX, event.clientY)
                  const gesture = active.current
                  cancel()
                  if (gesture.scale.some((n) => n !== 1))
                    gesture.commit(gesture.scale, gesture.origin)
                }}
                onPointerCancel={cancel}
                onLostPointerCapture={cancel}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && active.current) {
                    event.preventDefault()
                    event.stopPropagation()
                    cancel()
                    return
                  }
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                  event.preventDefault()
                  const span = bounds.max[0] - bounds.min[0]
                  if (span <= 0) return
                  const factor = Math.max(
                    0.001,
                    1 +
                      ((event.key === 'ArrowRight' ? 1 : -1) *
                        (control.pixelStep?.[0] ?? control.step)) /
                        span,
                  )
                  control.onScale?.(
                    [factor, control.proportional === false ? 1 : factor],
                    corners[(index + 2) % 4]!,
                  )
                }}
              />
            </foreignObject>
          </g>
        )
      })}
    </svg>
  )
}
