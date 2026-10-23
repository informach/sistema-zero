import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { nearestSceneAnimationKey } from '../../../scene/animationKeySelection'
import { Move3d, Rotate3d, Scaling } from '../../ui/icons'
import { timelineSeekTime, timelineSnappedTime, timelineTimeAt } from './timelineLayout'

/** Picking and painting use CSS pixels and the ruler's exact 14px inset. */
export function SceneAnimationKeyStrip({
  times,
  seekTimes = times,
  duration,
  time,
  label,
  onSeek,
  onSelect,
  onKeySelect,
  onMove,
  selectedTime,
  channel,
  leading,
  copyTime,
}: {
  times: readonly number[]
  seekTimes?: readonly number[]
  duration: number
  time: number
  label: string
  onSeek(time: number): void
  onSelect?(): void
  onKeySelect?(time: number): void
  onMove?(from: number, to: number): void
  selectedTime?: number
  channel?: 'translation' | 'rotation' | 'scale'
  leading?: ReactNode
  copyTime?: number
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const seek = useRef(onSeek)
  seek.current = onSeek
  const drag = useRef<{
    kind: 'key' | 'seek'
    id: number
    x: number
    left: number
    from: number
    width: number
    to: number
    moved: boolean
    valid: boolean
    target: HTMLElement
    times: readonly number[]
    seekTimes: readonly number[]
    duration: number
  } | null>(null)
  const [ghost, setGhost] = useState<{ time: number; valid: boolean } | null>(null)
  const cancel = useCallback((restore = true) => {
    const active = drag.current
    drag.current = null
    if (active?.target.hasPointerCapture?.(active.id))
      active.target.releasePointerCapture(active.id)
    setGhost(null)
    if (restore && active?.kind === 'seek') seek.current(active.from)
  }, [])
  useEffect(() => {
    const element = canvas.current,
      context = element?.getContext('2d')
    if (!element || !context) return
    const draw = () => {
      const width = element.getBoundingClientRect().width,
        dpr = window.devicePixelRatio || 1
      element.width = Math.max(1, Math.round(width * dpr))
      element.height = Math.round(36 * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      const style = getComputedStyle(element),
        xAt = (at: number) => 14 + (at / duration) * Math.max(1, width - 28)
      context.strokeStyle = style.color
      context.globalAlpha = 0.33
      context.lineWidth = 2
      if (channel && times.length > 1) {
        context.beginPath()
        context.moveTo(xAt(times[0]!), 18)
        context.lineTo(xAt(times[times.length - 1]!), 18)
        context.stroke()
      }
      context.globalAlpha = 1
      const columns = new Set<number>()
      const diamond = (at: number, chosen: boolean, preview = false, valid = true) => {
        const x = xAt(at)
        if (!chosen && !preview && columns.has(Math.round(x))) return
        columns.add(Math.round(x))
        context.fillStyle =
          preview && !valid ? style.getPropertyValue('--color-mld-danger') : style.color
        context.globalAlpha = preview ? 0.5 : 1
        const size = chosen ? 9 : channel ? 7 : 5
        context.beginPath()
        context.moveTo(x, 18 - size)
        context.lineTo(x + size, 18)
        context.lineTo(x, 18 + size)
        context.lineTo(x - size, 18)
        context.closePath()
        context.fill()
        context.strokeStyle = chosen
          ? style.getPropertyValue('--color-mld-text')
          : style.getPropertyValue('--color-mld-surface')
        context.lineWidth = chosen ? 2.5 : 1.5
        context.stroke()
      }
      for (const at of times) if (at !== selectedTime) diamond(at, false)
      if (selectedTime !== undefined && times.includes(selectedTime)) diamond(selectedTime, true)
      if (ghost) diamond(ghost.time, false, true, ghost.valid)
      if (
        copyTime !== undefined &&
        Number.isFinite(copyTime) &&
        copyTime >= 0 &&
        copyTime <= duration
      )
        diamond(copyTime, false, true, !times.includes(copyTime))
    }
    draw()
    const resize = new ResizeObserver(draw)
    resize.observe(element)
    const theme = element.closest('[data-molda-theme]'),
      observer = new MutationObserver(draw)
    if (theme) observer.observe(theme, { attributes: true, attributeFilter: ['data-molda-theme'] })
    window.addEventListener('resize', draw)
    return () => {
      resize.disconnect()
      observer.disconnect()
      window.removeEventListener('resize', draw)
    }
  }, [times, duration, selectedTime, ghost, copyTime, channel])
  useEffect(() => {
    const active = drag.current
    if (active && (active.times !== times || active.duration !== duration)) cancel(false)
  }, [times, duration, cancel])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) {
        event.preventDefault()
        event.stopPropagation()
        cancel()
      }
    }
    window.addEventListener('keydown', onEscape, true)
    const blur = () => cancel()
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('keydown', onEscape, true)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', hidden)
      const active = drag.current
      drag.current = null
      if (active?.target.hasPointerCapture?.(active.id))
        active.target.releasePointerCapture(active.id)
    }
  }, [cancel])
  const choose = (at: number) => (onKeySelect ? onKeySelect(at) : onSeek(at))
  const ChannelIcon =
    channel === 'translation' ? Move3d : channel === 'rotation' ? Rotate3d : Scaling
  return (
    <div className="mld-timeline-row" data-channel={channel ?? 'summary'}>
      <div className="flex min-w-0 items-center">
        {leading ?? (
          <span className="mld-timeline-leading mld-channel-icon grid shrink-0 place-items-center">
            {channel && <ChannelIcon aria-hidden="true" className="size-4" />}
          </span>
        )}
        {onSelect ? (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-xs font-bold"
            aria-label={`Escolher ${label} na linha do tempo`}
            onClick={onSelect}
          >
            {label}
          </button>
        ) : (
          <span className="truncate text-xs font-bold">{label}</span>
        )}
      </div>
      <button
        type="button"
        className="mld-key-strip"
        aria-label={`${COPY.scene.animationStrip(label, times.length)}${selectedTime === undefined ? '' : ` · Pose em ${selectedTime.toLocaleString('pt-BR', { maximumFractionDigits: 12 })} segundos`}`}
        title="Clique em uma pose. Arraste uma pose de canal para mudar seu tempo."
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            cancel()
            return
          }
          const nearest = nearestSceneAnimationKey(times, selectedTime ?? time),
            position = nearest === undefined ? -1 : times.indexOf(nearest)
          let target: number | undefined
          if (event.key === 'Home') target = times[0]
          else if (event.key === 'End') target = times.at(-1)
          else if (event.key === 'ArrowLeft')
            target =
              nearest !== undefined && nearest < time ? nearest : times[Math.max(0, position - 1)]
          else if (event.key === 'ArrowRight')
            target =
              nearest !== undefined && nearest > time
                ? nearest
                : times[Math.min(times.length - 1, position + 1)]
          else return
          event.preventDefault()
          event.stopPropagation()
          if (target !== undefined) choose(target)
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          if (drag.current) {
            cancel()
            return
          }
          const rect = event.currentTarget.getBoundingClientRect(),
            at = timelineTimeAt(event.clientX - rect.left, rect.width, duration),
            nearest = nearestSceneAnimationKey(times, at)
          if (
            nearest !== undefined &&
            (Math.abs(at - nearest) / duration) * Math.max(1, rect.width - 28) <= 6
          ) {
            choose(nearest)
            if (onMove) {
              event.currentTarget.setPointerCapture(event.pointerId)
              drag.current = {
                kind: 'key',
                id: event.pointerId,
                x: event.clientX,
                left: rect.left,
                from: nearest,
                to: nearest,
                width: rect.width,
                moved: false,
                valid: true,
                target: event.currentTarget,
                times,
                seekTimes,
                duration,
              }
            }
          } else {
            event.currentTarget.setPointerCapture(event.pointerId)
            const to = timelineSeekTime(event.clientX - rect.left, rect.width, duration, seekTimes)
            drag.current = {
              kind: 'seek',
              id: event.pointerId,
              x: event.clientX,
              left: rect.left,
              from: time,
              to,
              width: rect.width,
              moved: false,
              valid: true,
              target: event.currentTarget,
              times,
              seekTimes,
              duration,
            }
            onSeek(to)
          }
        }}
        onPointerMove={(event) => {
          const active = drag.current
          if (active?.kind === 'seek' && active.id === event.pointerId) {
            active.to = timelineSeekTime(
              event.clientX - active.left,
              active.width,
              active.duration,
              active.seekTimes,
            )
            onSeek(active.to)
            return
          }
          if (
            !active ||
            active.id !== event.pointerId ||
            (Math.abs(event.clientX - active.x) < 3 && !active.moved)
          )
            return
          active.moved = true
          const at =
            active.from + ((event.clientX - active.x) / Math.max(1, active.width - 28)) * duration
          active.to =
            (Math.abs(at - time) / duration) * (active.width - 28) <= 6
              ? time
              : timelineSnappedTime(at, duration)
          const i = times.indexOf(active.from),
            before = times[i - 1],
            after = times[i + 1]
          active.valid =
            active.to >= 0 &&
            active.to <= duration &&
            (before === undefined || active.to > before) &&
            (after === undefined || active.to < after)
          setGhost({ time: active.to, valid: active.valid })
        }}
        onPointerUp={(event) => {
          const active = drag.current
          if (active?.id !== event.pointerId) return
          cancel(false)
          if (active.kind === 'seek') {
            onSeek(
              timelineSeekTime(
                event.clientX - active.left,
                active.width,
                active.duration,
                active.seekTimes,
              ),
            )
            return
          }
          if (active.moved && active.valid && active.to !== active.from)
            onMove?.(active.from, active.to)
        }}
        onPointerCancel={() => cancel()}
        onLostPointerCapture={() => cancel()}
        onClick={(event) => {
          if (event.detail === 0) {
            const target = nearestSceneAnimationKey(times, time)
            if (target !== undefined) choose(target)
          }
        }}
      >
        <canvas ref={canvas} tabIndex={-1} aria-hidden="true" className="block h-9 w-full" />
        <span
          aria-hidden="true"
          className="mld-key-playhead"
          style={{ left: `calc(${14 - 28 * (time / duration)}px + ${(time / duration) * 100}%)` }}
        />
      </button>
    </div>
  )
}
