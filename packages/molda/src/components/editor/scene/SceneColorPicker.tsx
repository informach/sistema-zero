import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeHex, rgbToHex } from '../../../core/color'
import { hsvToRgb, rgbToHsv } from '../../../core/hsv'
import type { ScenePaintRgba } from '../../../scene/imagePaint'

export function SceneColorPicker({
  ink,
  disabled,
  change,
}: {
  ink: ScenePaintRgba
  disabled: boolean
  change(hex: string): void
}) {
  const [hue, setHue] = useState(() => rgbToHsv(ink[0], ink[1], ink[2])[0])
  const [h, s, v] = rgbToHsv(ink[0], ink[1], ink[2], hue)
  const hex = rgbToHex(ink[0], ink[1], ink[2])
  const [hexDraft, setHexDraft] = useState(hex)
  const [invalid, setInvalid] = useState(false)
  const latest = useRef(change)
  latest.current = change
  const drag = useRef<{ element: HTMLElement; id: number; before: string } | null>(null)
  const set = (h: number, s: number, v: number) => {
    setHue(h)
    const rgb = hsvToRgb(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, v)))
    change(rgbToHex(...rgb))
  }
  const finish = useCallback((commit: boolean) => {
    const owner = drag.current
    drag.current = null
    if (!owner) return
    if (owner.element.hasPointerCapture(owner.id)) owner.element.releasePointerCapture(owner.id)
    if (!commit) latest.current(owner.before)
  }, [])
  useEffect(() => {
    setHexDraft(hex)
    setInvalid(false)
  }, [hex])
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
      cancel()
    }
  }, [finish])
  const point = (element: HTMLElement, x: number, y: number) => {
    const bounds = element.getBoundingClientRect()
    if (bounds.width && bounds.height)
      set(h, (x - bounds.left) / bounds.width, 1 - (y - bounds.top) / bounds.height)
  }
  const commitHex = () => {
    const value = normalizeHex(hexDraft)
    setInvalid(!value)
    if (value) change(value)
  }
  return (
    <div className="mld-color-picker">
      <div
        role="slider"
        aria-label="Saturação e luminosidade"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(s * 100)}
        aria-valuetext={`Saturação ${Math.round(s * 100)}%, luminosidade ${Math.round(v * 100)}%. Setas horizontais mudam a saturação; verticais, a luminosidade.`}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className="mld-color-sv"
        style={{ backgroundColor: `hsl(${h} 100% 50%)` }}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0) return
          if (drag.current) {
            finish(false)
            return
          }
          event.preventDefault()
          event.currentTarget.focus()
          drag.current = { element: event.currentTarget, id: event.pointerId, before: hex }
          event.currentTarget.setPointerCapture(event.pointerId)
          point(event.currentTarget, event.clientX, event.clientY)
        }}
        onPointerMove={(event) => {
          if (drag.current?.id === event.pointerId)
            point(event.currentTarget, event.clientX, event.clientY)
        }}
        onPointerUp={(event) => {
          if (drag.current?.id === event.pointerId) {
            point(event.currentTarget, event.clientX, event.clientY)
            finish(true)
          }
        }}
        onPointerCancel={() => finish(false)}
        onLostPointerCapture={() => finish(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            finish(false)
            return
          }
          if (
            disabled ||
            !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
          )
            return
          event.preventDefault()
          const step = event.shiftKey ? 0.1 : 0.01
          set(
            h,
            event.key === 'ArrowLeft'
              ? s - step
              : event.key === 'ArrowRight'
                ? s + step
                : event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? 1
                    : s,
            event.key === 'ArrowUp' ? v + step : event.key === 'ArrowDown' ? v - step : v,
          )
        }}
      >
        <span
          className="mld-color-sv-marker"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hex }}
        />
      </div>
      <input
        aria-label="Matiz"
        name="paintHue"
        type="range"
        min={0}
        max={359}
        step={1}
        value={h}
        disabled={disabled}
        className="mld-color-hue"
        onChange={(event) => set(Number(event.target.value), s, v)}
      />
      <label className="flex items-center gap-2 text-xs text-mld-muted">
        Hexadecimal
        <input
          aria-label="Cor hexadecimal"
          name="paintHex"
          className="min-w-0 flex-1 rounded-md border border-mld-border bg-mld-bg px-2 py-1 font-mono text-mld-text uppercase"
          value={hexDraft}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => setHexDraft(event.target.value)}
          onBlur={commitHex}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitHex()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              setHexDraft(hex)
              setInvalid(false)
            }
          }}
        />
      </label>
      {invalid && (
        <p role="status" className="text-xs text-mld-danger">
          Use uma cor como #F0352B.
        </p>
      )}
    </div>
  )
}
