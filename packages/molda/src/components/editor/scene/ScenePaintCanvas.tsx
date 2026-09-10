import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { Texel } from '../../../paint/skinPaint'
import type { ScenePixelRegion, SceneRgba } from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import { sceneImageTexel } from '../../../scene/imagePaint'
import type { ScenePaintDraft } from '../../../state/scenePaintShapeGesture'
import { SceneImagePreview } from './SceneImagePreview'
import { ScenePaintOverlay } from './ScenePaintOverlay'
import type { ScenePaintActions } from './useScenePaint'

export function ScenePaintCanvas({
  image,
  palette,
  base,
  drawing,
  actions,
  twoPoint = false,
  draft,
  scope,
}: {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
  drawing: boolean
  actions: ScenePaintActions
  twoPoint?: boolean
  draft?: ScenePaintDraft | null
  scope?: ScenePixelRegion
}) {
  const { width, height } = image
  const root = useRef<HTMLButtonElement>(null)
  const pointer = useRef<number | null>(null)
  const keyboard = useRef(false)
  const live = useRef(actions)
  live.current = actions
  const [savedCursor, setCursor] = useState<Texel>([0, 0])
  const cursor: Texel = [Math.min(savedCursor[0], width - 1), Math.min(savedCursor[1], height - 1)]
  const hint = useId()
  const finish = useCallback((commit: boolean) => {
    const id = pointer.current
    const keyed = keyboard.current
    pointer.current = null
    keyboard.current = false
    if (id === null && !keyed) return
    live.current.end(commit)
    if (id !== null && root.current?.hasPointerCapture?.(id)) root.current.releasePointerCapture(id)
  }, [])
  useEffect(() => {
    if (!drawing) finish(false)
  }, [drawing, finish])
  useEffect(
    () => () => {
      if (pointer.current !== null || keyboard.current) live.current.end(false)
    },
    [],
  )
  function point(clientX: number, clientY: number) {
    const rect = root.current?.querySelector('canvas')?.getBoundingClientRect()
    if (!rect?.width || !rect.height) return null
    const x = (clientX - rect.left) / rect.width
    const y = 1 - (clientY - rect.top) / rect.height
    return x < 0 || y < 0 || x > 1 || y > 1 ? null : sceneImageTexel({ width, height }, [x, y])
  }
  function activate() {
    if (keyboard.current) {
      finish(true)
      return
    }
    if (drawing || !actions.begin({ point: cursor, region: 'image' })) return
    if (twoPoint) keyboard.current = true
    else actions.end(true)
  }
  return (
    <div className="space-y-2">
      <button
        ref={root}
        type="button"
        aria-label={COPY.scene.paintCanvas}
        aria-describedby={hint}
        className="block w-full touch-none rounded-lg border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
        onPointerDown={(event) => {
          if (keyboard.current) finish(false)
          if (pointer.current !== null) {
            if (pointer.current !== event.pointerId) finish(false)
            return
          }
          if (event.button !== 0) return
          const selected = point(event.clientX, event.clientY)
          if (!selected || !actions.begin({ point: selected, region: 'image' })) return
          event.preventDefault()
          event.currentTarget.focus()
          setCursor(selected)
          pointer.current = event.pointerId
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            finish(false)
          }
        }}
        onPointerMove={(event) => {
          if (pointer.current !== event.pointerId) return
          const selected = point(event.clientX, event.clientY)
          if (selected) setCursor(selected)
          actions.move(selected ? { point: selected, region: 'image' } : null)
        }}
        onPointerUp={(event) => {
          if (pointer.current !== event.pointerId) return
          const selected = point(event.clientX, event.clientY)
          if (selected) setCursor(selected)
          actions.move(selected ? { point: selected, region: 'image' } : null)
          finish(true)
        }}
        onPointerCancel={(event) => {
          if (pointer.current === event.pointerId) finish(false)
        }}
        onLostPointerCapture={(event) => {
          if (pointer.current === event.pointerId) finish(false)
        }}
        onClick={(event) => {
          if (event.detail === 0) activate()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && (pointer.current !== null || keyboard.current)) {
            event.preventDefault()
            finish(false)
            return
          }
          if ((drawing && !keyboard.current) || event.ctrlKey || event.metaKey || event.altKey)
            return
          const steps: Record<string, Texel> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, 1],
            ArrowDown: [0, -1],
          }
          const step = steps[event.key]
          if (step) {
            event.preventDefault()
            const next: Texel = [
              Math.max(0, Math.min(width - 1, cursor[0] + step[0])),
              Math.max(0, Math.min(height - 1, cursor[1] + step[1])),
            ]
            setCursor(next)
            if (keyboard.current) actions.move({ point: next, region: 'image' })
          } else if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault()
            activate()
          }
        }}
      >
        <span className="relative block" style={{ maxWidth: (256 * width) / height }}>
          <SceneImagePreview image={image} palette={palette} base={base} />
          {(draft || scope) && (
            <ScenePaintOverlay width={width} height={height} draft={draft} scope={scope} />
          )}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute border border-white outline outline-1 outline-black"
            style={{
              left: `${(cursor[0] / width) * 100}%`,
              bottom: `${(cursor[1] / height) * 100}%`,
              width: `${100 / width}%`,
              height: `${100 / height}%`,
            }}
          />
        </span>
      </button>
      <p id={hint} className="text-xs text-mld-muted">
        {twoPoint ? COPY.scene.paintShapeKeyboard : COPY.scene.paintCanvasHint}
      </p>
      <p role="status" className="text-xs text-mld-muted">
        {COPY.scene.paintCursor(cursor[0] + 1, cursor[1] + 1)}
      </p>
    </div>
  )
}
