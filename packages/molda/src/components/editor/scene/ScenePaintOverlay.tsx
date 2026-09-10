import type { ScenePixelRegion } from '../../../scene/composite'
import { imagePointRegion, intersectImageRegions } from '../../../scene/imageRegion'
import { sceneStampBounds } from '../../../scene/imageStamp'
import type { ScenePaintDraft } from '../../../state/scenePaintShapeGesture'

export function ScenePaintOverlay({
  width,
  height,
  draft,
  scope,
}: {
  width: number
  height: number
  draft?: ScenePaintDraft | null
  scope?: ScenePixelRegion
}) {
  const bounds = draft
    ? draft.tool === 'stamp' && draft.stampSize
      ? intersectImageRegions(
          sceneStampBounds(draft.to, draft.stampSize),
          scope ?? { x0: 0, y0: 0, x1: width - 1, y1: height - 1 },
        )
      : imagePointRegion(draft.from, draft.to)
    : null
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
    >
      <g
        transform={`translate(0 ${height}) scale(1 -1)`}
        className="fill-mld-accent/10 stroke-mld-accent"
      >
        {scope && (
          <rect
            x={scope.x0}
            y={scope.y0}
            width={scope.x1 - scope.x0 + 1}
            height={scope.y1 - scope.y0 + 1}
            fill="none"
            strokeDasharray="4 3"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {draft &&
          bounds &&
          (draft.tool === 'line' || draft.tool === 'gradient' ? (
            <line
              x1={draft.from[0] + 0.5}
              y1={draft.from[1] + 0.5}
              x2={draft.to[0] + 0.5}
              y2={draft.to[1] + 0.5}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ) : draft.tool === 'ellipse' ? (
            <ellipse
              cx={(bounds.x0 + bounds.x1 + 1) / 2}
              cy={(bounds.y0 + bounds.y1 + 1) / 2}
              rx={(bounds.x1 - bounds.x0 + 1) / 2}
              ry={(bounds.y1 - bounds.y0 + 1) / 2}
              fill={draft.filled ? undefined : 'none'}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <rect
              x={bounds.x0}
              y={bounds.y0}
              width={bounds.x1 - bounds.x0 + 1}
              height={bounds.y1 - bounds.y0 + 1}
              fill={draft.filled && draft.tool !== 'select' ? undefined : 'none'}
              strokeWidth={2}
              strokeDasharray={draft.tool === 'select' ? '4 3' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </g>
    </svg>
  )
}
