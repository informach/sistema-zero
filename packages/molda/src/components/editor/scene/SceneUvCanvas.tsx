import { clsx } from 'clsx'
import { useEffect, useId, useMemo, useRef } from 'react'
import { COPY } from '../../../core/copy'
import { compositeSceneImage, type SceneRgba } from '../../../scene/composite'
import type { SceneImage, SceneMeshGeometry } from '../../../scene/document'
import { meshUvLayout, meshUvTextureLayout } from '../../../scene/meshUvLayout'
import { SceneTextureGrid } from './SceneTextureGrid'
import { SceneUvOutlines, uvOutlinePath } from './SceneUvOutlines'
import { SceneUvScaleHandles } from './SceneUvScaleHandles'
import { type SceneUvCornerControl, useSceneUvCornerInput } from './useSceneUvCornerInput'

export interface SceneUvTexture {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
}

/** One demand-painted bitmap, not thousands of SVG/DOM nodes or a continuous animation loop. */
export function SceneUvCanvas({
  mesh,
  ids,
  onSelect,
  corner,
  texture,
  visibleIds,
  label = COPY.scene.uvCanvas,
  controlLabel = COPY.scene.uvCanvasControl,
  activeEdge,
  sheetScale,
  cancelKey,
  sheetAspect,
  sheetSize,
}: {
  mesh: SceneMeshGeometry
  ids: readonly string[]
  onSelect?(id: string, additive: boolean): void
  corner?: SceneUvCornerControl
  texture?: SceneUvTexture
  visibleIds?: string[]
  label?: string
  controlLabel?: string
  /** Highlight only: selecting a seam never enables the authorial UV drag controls. */
  activeEdge?: { faceId: string; corner: number }
  sheetScale?: number
  sheetAspect?: number
  sheetSize?: { width: number; height: number }
  cancelKey?: number
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const sheet = sheetScale !== undefined
  const aspect = texture ? texture.image.width / texture.image.height : (sheetAspect ?? 1)
  const frameAspect = sheet ? aspect : Math.max(0.25, Math.min(4, aspect))
  const width = sheet ? (sheetSize?.width ?? texture?.image.width ?? 512) : 512
  const height = sheet
    ? (sheetSize?.height ?? texture?.image.height ?? Math.max(1, Math.round(width / frameAspect)))
    : Math.max(1, Math.round(width / frameAspect))
  const layout = useMemo(
    () =>
      sheet
        ? meshUvTextureLayout(mesh, visibleIds)
        : meshUvLayout(mesh, aspect / frameAspect, visibleIds),
    [mesh, aspect, frameAspect, visibleIds, sheet],
  )
  const input = useSceneUvCornerInput(mesh, layout, onSelect ? corner : undefined, cancelKey, sheet)
  const screenScale = sheetScale ?? 1
  const hint = useId()
  const faceId = activeEdge?.faceId ?? corner?.faceId,
    cornerIndex = activeEdge?.corner ?? corner?.corner,
    showEdge = activeEdge !== undefined
  const draft = input.draft?.mesh === mesh ? input.draft : null
  const outlines = draft
    ? (draft.corner === null ? draft.ids : [draft.faceId]).map((id) => ({
        id,
        points: mesh.faces[id]!.corners.map((c, i) =>
          layout.map(
            draft.corner === null
              ? [c.uv[0] + draft.uv[0], c.uv[1] + draft.uv[1]]
              : i === draft.corner
                ? draft.uv
                : c.uv,
          ),
        ),
      }))
    : []
  const pixels = useMemo(
    () => (texture ? compositeSceneImage(texture.image, texture.palette, texture.base) : null),
    [texture],
  )
  useEffect(() => {
    const element = canvas.current
    const ctx = element?.getContext('2d')
    if (!ctx || !element) return
    let raster: HTMLCanvasElement | null = null
    if (texture && pixels) {
      const { width, height } = texture.image
      const bitmap = document.createElement('canvas')
      bitmap.width = width
      bitmap.height = height
      const context = bitmap.getContext('2d')
      if (context) {
        const data = context.createImageData(width, height)
        for (let row = 0; row < height; row++)
          data.data.set(
            pixels.subarray(row * width * 4, (row + 1) * width * 4),
            (height - 1 - row) * width * 4,
          )
        context.putImageData(data, 0, 0)
        raster = bitmap
      }
    }
    const draw = () => {
      const style = getComputedStyle(element)
      const foreground = style.color
      const accent = style.getPropertyValue('--color-mld-accent').trim() || foreground
      ctx.clearRect(0, 0, width, height)
      const min = layout.tile.min,
        max = layout.tile.max
      if (raster) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(
          raster,
          min[0] * width,
          min[1] * height,
          (max[0] - min[0]) * width,
          (max[1] - min[1]) * height,
        )
        if (sheet) return
        ctx.strokeStyle = foreground
        ctx.globalAlpha = 0.15
        ctx.lineWidth = 1
        ctx.beginPath()
        const stride = Math.max(1, Math.ceil(raster.width / ((max[0] - min[0]) * 128)))
        for (let x = stride; x < raster.width; x += stride) {
          const px = (min[0] + ((max[0] - min[0]) * x) / raster.width) * width
          ctx.moveTo(px, min[1] * height)
          ctx.lineTo(px, max[1] * height)
        }
        for (let y = stride; y < raster.height; y += stride) {
          const py = (min[1] + ((max[1] - min[1]) * y) / raster.height) * height
          ctx.moveTo(min[0] * width, py)
          ctx.lineTo(max[0] * width, py)
        }
        ctx.stroke()
      }
      ctx.strokeStyle = foreground
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 2
      ctx.strokeRect(
        layout.tile.min[0] * width,
        layout.tile.min[1] * height,
        (layout.tile.max[0] - layout.tile.min[0]) * width,
        (layout.tile.max[1] - layout.tile.min[1]) * height,
      )
      if (sheet) return
      const selected = new Set(ids)
      for (const chosen of [false, true]) {
        ctx.strokeStyle = chosen ? accent : foreground
        ctx.fillStyle = accent
        ctx.lineWidth = chosen ? 3 : 1
        for (const face of layout.faces) {
          if (selected.has(face.id) !== chosen) continue
          ctx.beginPath()
          face.points.forEach((p, i) => {
            if (i) ctx.lineTo(p[0] * width, p[1] * height)
            else ctx.moveTo(p[0] * width, p[1] * height)
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
          ctx.arc(p[0] * width, p[1] * height, i === cornerIndex ? 7 : 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillText(String(i + 1), p[0] * width, p[1] * height - 9)
        }
        if (showEdge && face && cornerIndex !== undefined) {
          const a = face.points[cornerIndex],
            b = face.points[(cornerIndex + 1) % face.points.length]
          if (a && b) {
            ctx.strokeStyle = accent
            ctx.lineWidth = 7
            ctx.beginPath()
            ctx.moveTo(a[0] * width, a[1] * height)
            ctx.lineTo(b[0] * width, b[1] * height)
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
  }, [layout, ids, faceId, cornerIndex, showEdge, pixels, texture, width, height, sheet])
  const bitmap = (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className={clsx(
        'mld-pixelated block w-full bg-mld-bg text-mld-text',
        !sheet && 'rounded-lg outline outline-1 outline-mld-border',
      )}
      style={{ aspectRatio: frameAspect }}
    />
  )
  if (!onSelect) return bitmap
  return (
    <div className={sheet ? 'mld-sheet-uv-canvas' : 'space-y-2'}>
      <button
        ref={input.root}
        type="button"
        aria-label={controlLabel}
        aria-describedby={corner ? hint : undefined}
        className={clsx(
          'relative block w-full touch-none border-0 p-0',
          !sheet && 'min-h-11 rounded-lg',
          sheet ? 'outline-none' : 'focus-visible:outline-2 focus-visible:outline-mld-accent',
        )}
        {...input.handlers}
        onClick={(event) => {
          if (input.handlers.onClick(event)) return
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
        {sheet && texture && (
          <SceneTextureGrid
            image={texture.image}
            scale={(screenScale * width) / texture.image.width}
          />
        )}
        {sheet && (
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${width} ${height}`}
            className="mld-uv-sheet-outlines"
          >
            <SceneUvOutlines
              faces={layout.faces}
              ids={ids}
              width={width}
              height={height}
              scale={screenScale}
              interactive
            />
            {faceId &&
              layout.faces
                .find((face) => face.id === faceId)
                ?.points.map((p, i) => (
                  <g key={mesh.faces[faceId]!.corners[i]!.vertexId}>
                    <circle
                      cx={p[0] * width}
                      cy={p[1] * height}
                      r={(i === cornerIndex ? 6 : 4) / screenScale}
                      fill={
                        i === cornerIndex ? 'var(--color-mld-accent)' : 'var(--color-mld-surface)'
                      }
                      stroke="var(--color-mld-accent)"
                      strokeWidth={2 / screenScale}
                    />
                    <circle
                      cx={p[0] * width}
                      cy={p[1] * height}
                      r={22 / screenScale}
                      fill="transparent"
                      pointerEvents="all"
                    />
                  </g>
                ))}
          </svg>
        )}
        {outlines.length > 0 && draft && (
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${width} ${height}`}
            className={clsx(
              'pointer-events-none absolute inset-0 size-full',
              sheet ? 'overflow-visible' : 'overflow-hidden',
              'fill-mld-accent/10 stroke-mld-accent',
            )}
          >
            {sheet ? (
              <path
                d={outlines.map(({ points }) => uvOutlinePath(points, width, height)).join('')}
                strokeWidth={3 / screenScale}
              />
            ) : (
              outlines.map(({ id, points }) => (
                <polygon
                  key={id}
                  points={points.map((p) => `${p[0] * width},${p[1] * height}`).join(' ')}
                  strokeWidth={3 / screenScale}
                />
              ))
            )}
            {draft.corner !== null && (
              <circle
                cx={outlines[0]!.points[draft.corner]![0] * width}
                cy={outlines[0]!.points[draft.corner]![1] * height}
                r={8 / screenScale}
                strokeWidth={3 / screenScale}
              />
            )}
          </svg>
        )}
      </button>
      {sheet && corner?.onScale && (
        <SceneUvScaleHandles
          mesh={mesh}
          layout={layout}
          control={corner}
          width={width}
          height={height}
          screenScale={screenScale}
          cancelKey={cancelKey}
        />
      )}
      {corner && (
        <p id={hint} className={sheet ? 'sr-only' : 'text-xs text-mld-muted'}>
          {sheet
            ? 'Enter começa ou confirma o ajuste. As setas movem o ponto. Esc cancela. Segure Espaço e arraste para mover a visualização.'
            : COPY.scene.uvCornerKeyboard}
        </p>
      )}
      {draft && !corner?.pixelStep && (
        <p role="status" className="text-xs text-mld-muted">
          U: {Number(draft.uv[0].toFixed(3))} · V: {Number(draft.uv[1].toFixed(3))}
        </p>
      )}
    </div>
  )
}
