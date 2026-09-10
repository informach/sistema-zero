import { clsx } from 'clsx'
import { useEffect, useId, useMemo, useRef } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeshGeometry } from '../../../scene/document'
import { meshUvLayout } from '../../../scene/meshUvLayout'
import { type SceneUvCornerControl, useSceneUvCornerInput } from './useSceneUvCornerInput'

/** One demand-painted bitmap, not thousands of SVG/DOM nodes or a continuous animation loop. */
export function SceneUvCanvas({
  mesh,
  ids,
  onSelect,
  corner,
  label = COPY.scene.uvCanvas,
  controlLabel = COPY.scene.uvCanvasControl,
  activeEdge,
}: {
  mesh: SceneMeshGeometry
  ids: readonly string[]
  onSelect?(id: string, additive: boolean): void
  corner?: SceneUvCornerControl
  label?: string
  controlLabel?: string
  /** Highlight only: selecting a seam never enables the authorial UV drag controls. */
  activeEdge?: { faceId: string; corner: number }
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const layout = useMemo(() => meshUvLayout(mesh), [mesh])
  const input = useSceneUvCornerInput(mesh, layout, onSelect ? corner : undefined)
  const hint = useId()
  const faceId = activeEdge?.faceId ?? corner?.faceId,
    cornerIndex = activeEdge?.corner ?? corner?.corner,
    showEdge = activeEdge !== undefined
  const draft = input.draft?.mesh === mesh ? input.draft : null
  const outline = draft
    ? mesh.faces[draft.faceId]!.corners.map((c, i) =>
        layout.map(i === draft.corner ? draft.uv : c.uv),
      )
    : null
  useEffect(() => {
    const element = canvas.current
    const ctx = element?.getContext('2d')
    if (!ctx || !element) return
    const draw = () => {
      const style = getComputedStyle(element)
      const foreground = style.color
      const accent = style.getPropertyValue('--color-mld-accent').trim() || foreground
      ctx.clearRect(0, 0, 512, 512)
      ctx.strokeStyle = foreground
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 2
      ctx.strokeRect(
        layout.tile.min[0] * 512,
        layout.tile.min[1] * 512,
        (layout.tile.max[0] - layout.tile.min[0]) * 512,
        (layout.tile.max[1] - layout.tile.min[1]) * 512,
      )
      const selected = new Set(ids)
      for (const chosen of [false, true]) {
        ctx.strokeStyle = chosen ? accent : foreground
        ctx.fillStyle = accent
        ctx.lineWidth = chosen ? 3 : 1
        for (const face of layout.faces) {
          if (selected.has(face.id) !== chosen) continue
          ctx.beginPath()
          face.points.forEach((p, i) => {
            if (i) ctx.lineTo(p[0] * 512, p[1] * 512)
            else ctx.moveTo(p[0] * 512, p[1] * 512)
          })
          ctx.closePath()
          if (chosen) {
            ctx.globalAlpha = 0.2
            ctx.fill('evenodd')
          }
          ctx.globalAlpha = chosen ? 1 : 0.5
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      if (faceId) {
        const face = layout.faces.find((face) => face.id === faceId)
        ctx.font = `bold 12px ${style.fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        for (let i = 0; i < (face?.points.length ?? 0); i++) {
          const p = face!.points[i]!
          ctx.fillStyle = i === cornerIndex ? accent : foreground
          ctx.beginPath()
          ctx.arc(p[0] * 512, p[1] * 512, i === cornerIndex ? 7 : 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillText(String(i + 1), p[0] * 512, p[1] * 512 - 9)
        }
        if (showEdge && face && cornerIndex !== undefined) {
          const a = face.points[cornerIndex],
            b = face.points[(cornerIndex + 1) % face.points.length]
          if (a && b) {
            ctx.strokeStyle = accent
            ctx.lineWidth = 7
            ctx.beginPath()
            ctx.moveTo(a[0] * 512, a[1] * 512)
            ctx.lineTo(b[0] * 512, b[1] * 512)
            ctx.stroke()
          }
        }
      }
    }
    draw()
    const theme = element.closest('[data-molda-theme]')
    const observer = new MutationObserver(draw)
    if (theme) observer.observe(theme, { attributes: true, attributeFilter: ['data-molda-theme'] })
    return () => observer.disconnect()
  }, [layout, ids, faceId, cornerIndex, showEdge])
  const bitmap = (
    <canvas
      ref={canvas}
      width={512}
      height={512}
      role="img"
      aria-label={label}
      className="block aspect-square w-full rounded-lg bg-mld-bg text-mld-text outline outline-1 outline-mld-border"
    />
  )
  if (!onSelect) return bitmap
  return (
    <div className="space-y-2">
      <button
        ref={input.root}
        type="button"
        aria-label={controlLabel}
        aria-describedby={corner ? hint : undefined}
        className={clsx(
          'relative block min-h-11 w-full touch-none rounded-lg border-0 p-0',
          'focus-visible:outline-2 focus-visible:outline-mld-accent',
        )}
        {...input.handlers}
        onClick={(event) => {
          input.handlers.onClick(event)
          if (corner) return
          const rect = canvas.current?.getBoundingClientRect()
          if (!rect?.width || !rect.height) return
          const id = layout.pick(
            [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height],
            ids.at(-1),
          )
          if (id) onSelect(id, event.shiftKey || event.ctrlKey || event.metaKey)
        }}
      >
        {bitmap}
        {outline && draft && (
          <svg
            aria-hidden="true"
            viewBox="0 0 512 512"
            className={clsx(
              'pointer-events-none absolute inset-0 size-full overflow-hidden',
              'fill-mld-accent/10 stroke-mld-accent',
            )}
          >
            <polygon
              points={outline.map((p) => `${p[0] * 512},${p[1] * 512}`).join(' ')}
              strokeWidth={3}
            />
            <circle
              cx={outline[draft.corner]![0] * 512}
              cy={outline[draft.corner]![1] * 512}
              r={8}
              strokeWidth={3}
            />
          </svg>
        )}
      </button>
      {corner && (
        <p id={hint} className="text-xs text-mld-muted">
          {COPY.scene.uvCornerKeyboard}
        </p>
      )}
      {draft && (
        <p role="status" className="text-xs text-mld-muted">
          U: {draft.uv[0]} · V: {draft.uv[1]}
        </p>
      )}
    </div>
  )
}
