import { useCallback, useEffect, useRef } from 'react'

/** One captured pointer; frame-coalesced previews and a single release/cancel boundary. */
export function SceneAnimationCurveHandle({
  x,
  y,
  value,
  time,
  duration,
  valueSpan,
  disabled,
  owner,
  onPreview,
  onEnd,
}: {
  x: number
  y: number
  value: number
  time: number
  duration: number
  valueSpan: number
  disabled: boolean
  owner: object
  onPreview(time: number, value: number): void
  onEnd(commit: boolean): void
}) {
  const active = useRef<{
    id: number
    target: HTMLButtonElement
    x: number
    y: number
    time: number
    value: number
    width: number
    height: number
    duration: number
    span: number
    moved: boolean
    next: [number, number]
  } | null>(null)
  const frame = useRef<number | null>(null)
  const live = useRef({ onPreview, onEnd })
  live.current = { onPreview, onEnd }
  const finish = useCallback((commit: boolean) => {
    const drag = active.current
    active.current = null
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    if (!drag) return
    if (commit && drag.moved) live.current.onPreview(...drag.next)
    live.current.onEnd(commit && drag.moved)
    if (drag.target.hasPointerCapture?.(drag.id)) drag.target.releasePointerCapture(drag.id)
  }, [])
  useEffect(() => {
    const cancel = () => finish(false)
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !active.current) return
      event.preventDefault()
      event.stopPropagation()
      cancel()
    }
    const hidden = () => {
      if (document.hidden) cancel()
    }
    const anotherPointer = (event: PointerEvent) => {
      if (active.current && active.current.id !== event.pointerId) cancel()
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', onEscape, true)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('pointerdown', anotherPointer, true)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('pointerdown', anotherPointer, true)
      cancel()
    }
  }, [finish])
  useEffect(() => {
    void owner
    return () => finish(false)
  }, [owner, finish])
  return (
    <button
      type="button"
      aria-label="Arrastar valor da pose na curva"
      disabled={disabled}
      className="mld-curve-handle"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      title="Arraste para mudar tempo e valor. Escape cancela. Os campos abaixo permitem edição por teclado."
      onPointerDown={(event) => {
        if (event.button !== 0 || active.current) return
        const rect = event.currentTarget.parentElement!.getBoundingClientRect()
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        active.current = {
          id: event.pointerId,
          target: event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          time,
          value,
          width: rect.width,
          height: rect.height,
          duration,
          span: valueSpan,
          moved: false,
          next: [time, value],
        }
      }}
      onPointerMove={(event) => {
        const drag = active.current
        if (!drag || drag.id !== event.pointerId) return
        const dx = event.clientX - drag.x,
          dy = event.clientY - drag.y
        if (!drag.moved && Math.hypot(dx, dy) < 3) return
        drag.moved = true
        drag.next = [
          Math.abs(dx) < 3
            ? drag.time
            : Math.round((drag.time + (dx / Math.max(1, drag.width)) * drag.duration) * 20) / 20,
          Math.abs(dy) < 3 ? drag.value : drag.value - (dy / Math.max(1, drag.height)) * drag.span,
        ]
        if (frame.current === null)
          frame.current = requestAnimationFrame(() => {
            frame.current = null
            if (active.current) live.current.onPreview(...active.current.next)
          })
      }}
      onPointerUp={() => finish(true)}
      onPointerCancel={() => finish(false)}
      onLostPointerCapture={() => finish(false)}
    />
  )
}
