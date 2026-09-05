/**
 * O palco (canvas) e a faixa de baixo: vistas, Enquadrar, Grade e o status
 * "N/128 peças · T triângulos". Sem WebGL, o recado no lugar do canvas.
 */
import type { JSX, RefObject } from 'react'
import { COPY } from '../../../core/copy'
import type { ViewName } from '../../../viewport/types'
import { Button, ToolButton } from '../../ui/Button'
import { Focus, Grid3x3 } from '../../ui/icons'

const VIEWS: Exclude<ViewName, 'frame'>[] = ['front', 'back', 'left', 'right', 'top']

export function ViewportPane({
  canvasRef,
  unsupported,
  onView,
  gridVisible,
  onToggleGrid,
  status,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  unsupported: boolean
  onView: (view: ViewName) => void
  gridVisible: boolean
  onToggleGrid: () => void
  status: string
}): JSX.Element {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklab,var(--color-mld-surface)_70%,var(--color-mld-bg)),var(--color-mld-bg))]">
        {unsupported ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="max-w-sm text-base text-mld-text">{COPY.editor.model.unsupported}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            aria-label={COPY.a11y.viewport}
            className="mld-viewport block size-full"
          />
        )}
      </div>
      <div className="mld-scroll-x flex items-center gap-1 overflow-x-auto border-t-2 border-mld-border bg-mld-surface px-2 py-1">
        {VIEWS.map((view) => (
          <Button
            key={view}
            variant="ghost"
            onClick={() => onView(view)}
            className="min-h-11 px-2 text-sm"
            disabled={unsupported}
          >
            {COPY.editor.model.views[view]}
          </Button>
        ))}
        <ToolButton
          icon={Focus}
          label={COPY.editor.model.views.frame}
          onClick={() => onView('frame')}
          disabled={unsupported}
          className="min-h-11 min-w-11"
        />
        <ToolButton
          icon={Grid3x3}
          label={COPY.editor.model.grid}
          active={gridVisible}
          onClick={onToggleGrid}
          disabled={unsupported}
          className="min-h-11 min-w-11"
        />
        <span className="ml-auto shrink-0 px-2 text-xs font-bold text-mld-muted" role="status">
          {status}
        </span>
      </div>
    </div>
  )
}
