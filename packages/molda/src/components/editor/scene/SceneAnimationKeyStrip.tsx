import { clsx } from 'clsx'
import { useEffect, useRef } from 'react'
import { COPY } from '../../../core/copy'
import { nearestSceneAnimationKey } from '../../../scene/animationKeySelection'

/** One demand-painted bitmap per channel, independent of the number of authorial keys. */
export function SceneAnimationKeyStrip({
  times,
  duration,
  time,
  label,
  onSeek,
}: {
  times: readonly number[]
  duration: number
  time: number
  label: string
  onSeek(time: number): void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current,
      context = element?.getContext('2d')
    if (!element || !context) return
    const draw = () => {
      context.clearRect(0, 0, 1024, 88)
      const style = getComputedStyle(element)
      context.fillStyle = style.color
      context.globalAlpha = 0.15
      context.fillRect(0, 43, 1024, 2)
      context.globalAlpha = 1
      // Overlapping times share a visual pixel; the exact times remain available to keyboard/numeric input.
      const columns = new Set<number>()
      for (const time of times) columns.add(Math.round((time / duration) * 1012) + 6)
      for (const x of columns) {
        context.beginPath()
        context.moveTo(x, 34)
        context.lineTo(x + 5, 44)
        context.lineTo(x, 54)
        context.lineTo(x - 5, 44)
        context.closePath()
        context.fill()
      }
    }
    draw()
    const theme = element.closest('[data-molda-theme]'),
      observer = new MutationObserver(draw)
    if (theme) observer.observe(theme, { attributes: true, attributeFilter: ['data-molda-theme'] })
    return () => observer.disconnect()
  }, [times, duration])
  const nearest = nearestSceneAnimationKey(times, time)
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs font-bold">{label}</span>
      <button
        type="button"
        disabled={!times.length}
        aria-label={COPY.scene.animationStrip(label, times.length)}
        title={COPY.scene.animationStripHint}
        className={clsx(
          'relative block min-h-11 min-w-0 flex-1 overflow-hidden rounded-lg border border-mld-border bg-mld-bg p-0 text-mld-accent',
          'focus-visible:outline-2 focus-visible:outline-mld-accent disabled:opacity-40',
        )}
        onKeyDown={(event) => {
          const position = nearest === undefined ? -1 : times.indexOf(nearest)
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
          if (target !== undefined) onSeek(target)
        }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const at =
            event.detail === 0
              ? time
              : rect.width > 0
                ? Math.max(
                    0,
                    Math.min(1, (((event.clientX - rect.left) / rect.width) * 1024 - 6) / 1012),
                  ) * duration
                : time
          const target = nearestSceneAnimationKey(times, at)
          if (target !== undefined) onSeek(target)
        }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={COPY.scene.animationStrip(label, times.length)}
          width={1024}
          height={88}
          className="block h-11 w-full"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 w-0.5 bg-mld-text"
          style={{ left: `${((6 + (time / duration) * 1012) / 1024) * 100}%` }}
        />
      </button>
    </div>
  )
}
