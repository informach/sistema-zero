import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { moldaPreferenceKey } from '../../../state/interfacePreferences'
import {
  TIMELINE_COLLAPSED,
  TIMELINE_DEFAULT,
  TIMELINE_STORAGE,
  timelineHeight,
  timelineReleasedHeight,
  timelineStoredHeight,
} from './timelineLayout'

/** Session preference, never document/history. Parent resize clamps only the rendered height. */
export function useTimelineHeight() {
  const element = useRef<HTMLElement>(null)
  const [storageKey] = useState(() => moldaPreferenceKey(TIMELINE_STORAGE))
  const [initial] = useState(() => {
    try {
      return {
        height: timelineStoredHeight(
          typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey),
        ),
        unavailable: false,
      }
    } catch {
      return { height: TIMELINE_DEFAULT, unavailable: true }
    }
  })
  const [preferred, setPreferred] = useState(initial.height),
    [center, setCenter] = useState(900),
    [draft, setDraft] = useState<number | null>(null)
  const [unavailable, setUnavailable] = useState(initial.unavailable)
  const gesture = useRef<{
    id: number
    y: number
    start: number
    raw: number
    target: HTMLElement
  } | null>(null)
  const frame = useRef<number | null>(null)
  const height = timelineHeight(draft ?? preferred, center)
  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    const active = gesture.current
    gesture.current = null
    if (active?.target.hasPointerCapture?.(active.id))
      active.target.releasePointerCapture(active.id)
    setDraft(null)
  }, [])
  const remember = (value: number) => {
    setPreferred(value)
    try {
      localStorage.setItem(storageKey, String(value))
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    }
  }
  useLayoutEffect(() => {
    const parent = element.current?.parentElement
    if (!parent) return
    const measure = () => {
      const height = parent.getBoundingClientRect().height
      const fixed = [...parent.children]
        .filter(
          (child) => child !== element.current && !child.classList.contains('mld-stage-workbench'),
        )
        .reduce((sum, child) => sum + child.getBoundingClientRect().height, 0)
      const workbench = parent.querySelector('.mld-stage-workbench')
      const canvas = parent.querySelector('.mld-stage-viewport canvas')
      const viewportChrome =
        workbench && canvas
          ? Math.max(
              0,
              workbench.getBoundingClientRect().height - canvas.getBoundingClientRect().height,
            )
          : 0
      if (height > 0) setCenter(Math.max(0, height - fixed - viewportChrome))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    // Named workspaces can add/wrap a toolbar without resizing the outer stage.
    for (const child of parent.children) observer.observe(child)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      const active = gesture.current
      gesture.current = null
      if (active?.target.hasPointerCapture?.(active.id))
        active.target.releasePointerCapture(active.id)
    }
  }, [cancel])
  return {
    element,
    height,
    maximum: Math.max(TIMELINE_COLLAPSED, center - 240),
    collapsed: height === TIMELINE_COLLAPSED,
    unavailable,
    separator: {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return
        if (gesture.current) {
          cancel()
          return
        }
        event.preventDefault()
        // preventDefault prevents the browser's normal focus transfer. The
        // separator must own keyboard cancellation for the drag it just began.
        event.currentTarget.focus({ preventScroll: true })
        event.currentTarget.setPointerCapture(event.pointerId)
        gesture.current = {
          id: event.pointerId,
          y: event.clientY,
          start: height,
          raw: height,
          target: event.currentTarget,
        }
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const active = gesture.current
        if (!active || active.id !== event.pointerId) return
        active.raw = active.start + active.y - event.clientY
        if (frame.current === null)
          frame.current = requestAnimationFrame(() => {
            frame.current = null
            if (gesture.current) setDraft(Math.max(162, gesture.current.raw))
          })
      },
      onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
        const active = gesture.current
        if (!active || active.id !== event.pointerId) return
        const raw = active.start + active.y - event.clientY
        cancel()
        remember(timelineReleasedHeight(raw, center))
      },
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
      onDoubleClick: () => {
        cancel()
        remember(preferred === TIMELINE_DEFAULT ? TIMELINE_COLLAPSED : TIMELINE_DEFAULT)
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (!['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) return
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'Escape') {
          cancel()
          return
        }
        if (event.key === 'Enter')
          remember(height === TIMELINE_COLLAPSED ? TIMELINE_DEFAULT : TIMELINE_COLLAPSED)
        else remember(timelineReleasedHeight(height + (event.key === 'ArrowUp' ? 36 : -36), center))
      },
    },
  }
}
