import { type PointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { timelineSeekTime, timelineSnappedTime } from './timelineLayout'

export function SceneAnimationRuler({
  duration,
  time,
  times,
  onSeek,
}: {
  duration: number
  time: number
  times: readonly number[]
  onSeek(time: number): void
}) {
  const ruler = useRef<HTMLDivElement>(null)
  const pointer = useRef<{
    id: number
    start: number
    target: HTMLElement
    duration: number
    times: readonly number[]
  } | null>(null)
  const seek = useRef(onSeek)
  seek.current = onSeek
  const end = useCallback((restore = false) => {
    const active = pointer.current
    pointer.current = null
    if (active?.target.hasPointerCapture?.(active.id))
      active.target.releasePointerCapture(active.id)
    if (active && restore) seek.current(active.start)
  }, [])
  useEffect(() => {
    const cancel = () => end(true)
    const hidden = () => {
      if (document.hidden) cancel()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pointer.current) {
        event.preventDefault()
        event.stopPropagation()
        cancel()
      }
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', onEscape, true)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('visibilitychange', hidden)
      end()
    }
  }, [end])
  useEffect(() => {
    if (
      pointer.current &&
      (pointer.current.duration !== duration || pointer.current.times !== times)
    )
      end()
  }, [duration, times, end])
  const [width, setWidth] = useState(812)
  useLayoutEffect(() => {
    const element = ruler.current
    if (!element) return
    const measure = () => setWidth(Math.max(1, element.getBoundingClientRect().width))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
      const active = pointer.current
      pointer.current = null
      if (active?.target.hasPointerCapture?.(active.id))
        active.target.releasePointerCapture(active.id)
    }
  }, [])
  const seekAt = (event: PointerEvent<HTMLElement>) => {
    const rect = ruler.current?.getBoundingClientRect()
    if (!rect || rect.width <= 28) return
    onSeek(timelineSeekTime(event.clientX - rect.left, rect.width, duration, times))
  }
  const events = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return
      event.preventDefault()
      event.currentTarget.focus({ preventScroll: true })
      if (pointer.current) {
        end()
        return
      }
      pointer.current = {
        id: event.pointerId,
        start: time,
        target: event.currentTarget,
        duration,
        times,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      seekAt(event)
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (pointer.current?.id === event.pointerId) seekAt(event)
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (pointer.current?.id === event.pointerId) {
        seekAt(event)
        end()
      }
    },
    onPointerCancel() {
      end(true)
    },
    onLostPointerCapture() {
      end(true)
    },
  }
  const major =
    0.5 * 2 ** Math.max(0, Math.ceil(Math.log2(duration / Math.max(1, (width - 28) / 65) / 0.5)))
  const ticks = Array.from(
    { length: Math.floor(duration / (major / 2)) + 1 },
    (_, i) => (i * major) / 2,
  )
  if (ticks.at(-1) !== duration) ticks.push(duration)
  return (
    <>
      <div ref={ruler} className="mld-timeline-ruler">
        <div aria-hidden="true" className="absolute inset-x-[14px] inset-y-0">
          {ticks.map((at, i) => (
            <span
              key={at}
              className="mld-ruler-tick"
              data-major={i % 2 === 0 || at === duration}
              style={{ left: `${(at / duration) * 100}%` }}
            >
              {i % 2 === 0 || at === duration ? (
                <span
                  style={{
                    transform:
                      at === duration
                        ? 'translateX(-100%)'
                        : at === 0
                          ? 'none'
                          : 'translateX(-50%)',
                  }}
                >
                  {at.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} s
                </span>
              ) : null}
            </span>
          ))}
        </div>
        <input
          type="range"
          name="animationPlayhead"
          min={0}
          max={duration}
          step="any"
          value={time}
          aria-label={COPY.scene.animationTime}
          aria-valuetext={COPY.scene.animationTimeValue(time, duration)}
          className="absolute inset-0 h-full w-full opacity-0"
          {...events}
          onKeyDown={(event) => {
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? duration
                  : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                    ? time - 0.05
                    : event.key === 'ArrowRight' || event.key === 'ArrowUp'
                      ? time + 0.05
                      : null
            if (next === null) return
            event.preventDefault()
            event.stopPropagation()
            onSeek(timelineSnappedTime(next, duration))
          }}
          onChange={(event) => onSeek(timelineSnappedTime(Number(event.target.value), duration))}
        />
      </div>
      <div className="mld-timeline-playhead-area" aria-hidden="true">
        <button
          type="button"
          tabIndex={-1}
          className="mld-timeline-playhead"
          style={{ left: `calc(${14 - (28 * time) / duration}px + ${(time / duration) * 100}%)` }}
          {...events}
        >
          <span />
        </button>
      </div>
    </>
  )
}
