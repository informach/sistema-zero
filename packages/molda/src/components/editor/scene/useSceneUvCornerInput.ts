import { useCallback, useEffect, useRef, useState } from 'react'
import type { SceneMeshGeometry, Vec2 } from '../../../scene/document'
import type { meshUvLayout } from '../../../scene/meshUvLayout'

export interface SceneUvCornerControl {
  sourceKey: string
  faceId: string
  corner: number
  step: number
  onChoose(corner: number): void
  onApply(corner: number, uv: Vec2): void
}
interface CornerDraft {
  sourceKey: string
  mesh: SceneMeshGeometry
  faceId: string
  corner: number
  from: Vec2
  uv: Vec2
  pointer: number | null
  anchor: Vec2 | null
  step: number
  commit(uv: Vec2): void
}

/** Session-only placement over a frozen view. Captured commit belongs to the source mesh, not a later render. */
export function useSceneUvCornerInput(
  mesh: SceneMeshGeometry,
  layout: ReturnType<typeof meshUvLayout>,
  control?: SceneUvCornerControl,
) {
  const root = useRef<HTMLButtonElement>(null)
  const active = useRef<CornerDraft | null>(null)
  const [draft, setDraft] = useState<CornerDraft | null>(null)
  const finish = useCallback((commit: boolean, notify = true) => {
    const current = active.current
    active.current = null
    if (!current) return
    if (notify) setDraft(null)
    if (current.pointer !== null && root.current?.hasPointerCapture?.(current.pointer))
      root.current.releasePointerCapture(current.pointer)
    if (commit) current.commit(current.uv)
  }, [])
  useEffect(() => {
    const current = active.current
    if (
      current &&
      (current.mesh !== mesh ||
        current.sourceKey !== control?.sourceKey ||
        current.faceId !== control?.faceId ||
        current.corner !== control?.corner)
    )
      finish(false)
  }, [mesh, control?.faceId, control?.corner, control?.sourceKey, finish])
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
  function point(clientX: number, clientY: number): Vec2 | null {
    const rect = root.current?.querySelector('canvas')?.getBoundingClientRect()
    if (!rect?.width || !rect.height) return null
    const value: Vec2 = [(clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height]
    return value.every((n) => n >= 0 && n <= 1) ? value : null
  }
  function begin(corner: number, pointer: number | null, anchor: Vec2 | null) {
    if (!control || active.current || !Number.isFinite(control.step) || control.step <= 0)
      return false
    const from = mesh.faces[control.faceId]?.corners[corner]?.uv
    if (!from) return false
    const current: CornerDraft = {
      sourceKey: control.sourceKey,
      mesh,
      faceId: control.faceId,
      corner,
      from: [...from],
      uv: [...from],
      pointer,
      anchor,
      step: control.step,
      commit: (uv) => control.onApply(corner, uv),
    }
    active.current = current
    setDraft(current)
    control.onChoose(corner)
    return true
  }
  function update(uv: Vec2 | null) {
    const current = active.current
    if (!current) return
    if (!uv?.every(Number.isFinite)) {
      finish(false)
      return
    }
    const next = { ...current, uv }
    active.current = next
    setDraft(next)
  }
  function move(clientX: number, clientY: number) {
    const current = active.current,
      next = point(clientX, clientY)
    if (!current?.anchor) return
    update(
      next
        ? layout.translate(current.from, [next[0] - current.anchor[0], next[1] - current.anchor[1]])
        : null,
    )
  }
  function activate() {
    if (active.current?.pointer === null) finish(true)
    else if (control && !active.current) begin(control.corner, null, null)
  }
  return {
    root,
    draft,
    handlers: {
      onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
        if (active.current) {
          if (active.current.pointer !== event.pointerId) finish(false)
          return
        }
        if (!control || event.button !== 0) return
        const origin = point(event.clientX, event.clientY)
        const rect = root.current?.querySelector('canvas')?.getBoundingClientRect()
        const face = layout.faces.find((face) => face.id === control.faceId)
        if (!origin || !rect || !face) return
        let corner = -1,
          distance = 22 * 22
        // The chosen handle wins an exact tie; overlapping corners remain individually reachable by the select.
        const candidates = [
          control.corner,
          ...face.points.map((_, i) => i).filter((i) => i !== control.corner),
        ]
        for (const i of candidates) {
          const p = face.points[i]!
          const d = ((p[0] - origin[0]) * rect.width) ** 2 + ((p[1] - origin[1]) * rect.height) ** 2
          if (d < distance) {
            corner = i
            distance = d
          }
        }
        if (corner < 0 || !begin(corner, event.pointerId, origin)) return
        event.preventDefault()
        event.currentTarget.focus()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          finish(false)
        }
      },
      onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
        if (active.current?.pointer === event.pointerId) move(event.clientX, event.clientY)
      },
      onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
        if (active.current?.pointer !== event.pointerId) return
        move(event.clientX, event.clientY)
        finish(true)
      },
      onPointerCancel(event: React.PointerEvent<HTMLButtonElement>) {
        if (active.current?.pointer === event.pointerId) finish(false)
      },
      onLostPointerCapture(event: React.PointerEvent<HTMLButtonElement>) {
        if (active.current?.pointer === event.pointerId) finish(false)
      },
      onBlur: () => finish(false),
      onClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (control && event.detail === 0) activate()
      },
      onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
        if (!control || event.ctrlKey || event.metaKey || event.altKey) return
        if (event.key === 'Escape' && active.current) {
          event.preventDefault()
          finish(false)
          return
        }
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault()
          activate()
          return
        }
        if (active.current?.pointer !== null) return
        const directions: Record<string, Vec2> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowDown: [0, -1],
          ArrowUp: [0, 1],
        }
        const step = directions[event.key]
        if (!step) return
        event.preventDefault()
        const current = active.current
        update([current.uv[0] + step[0] * current.step, current.uv[1] + step[1] * current.step])
      },
    },
  }
}
