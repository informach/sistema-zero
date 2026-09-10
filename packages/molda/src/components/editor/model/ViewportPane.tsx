/**
 * O palco (canvas) e a faixa de baixo: vistas, Enquadrar, Grade e o status
 * "N/128 peças · T triângulos". Sem WebGL, o recado no lugar do canvas.
 */
import type { JSX, ReactNode, RefObject } from 'react'
import { COPY } from '../../../core/copy'
import { CAMERA_VIEWS, type CameraView, type ViewName } from '../../../viewport/types'
import { Button, ToolButton } from '../../ui/Button'
import { Eye, Focus, Frame, Grid3x3 } from '../../ui/icons'

import { ReferenceImageGuide } from './ReferenceImageGuide'

export function ViewportPane({
  canvasRef,
  unsupported,
  onView,
  cameraView,
  hasSelection,
  gridVisible,
  onToggleGrid,
  edgesVisible,
  onToggleEdges,
  isolated,
  onToggleIsolation,
  status,
  snapInstruction,
  adjustment,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  unsupported: boolean
  onView: (view: ViewName) => void
  cameraView: CameraView
  hasSelection: boolean
  gridVisible: boolean
  onToggleGrid: () => void
  edgesVisible: boolean
  onToggleEdges: () => void
  isolated: boolean
  onToggleIsolation: () => void
  status: string
  snapInstruction?: string
  /** Bandeja contextual entre o canvas e os controles de vista. */
  adjustment?: ReactNode
}): JSX.Element {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ReferenceImageGuide view={cameraView} disabled={unsupported}>
        {isolated ? (
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-mld-border bg-mld-surface/95 px-3 text-sm text-mld-text">
            <span>{COPY.editor.model.isolation.active}</span>
            <Button
              variant="ghost"
              onClick={onToggleIsolation}
              className="min-h-11 px-2 text-sm underline"
            >
              {COPY.editor.model.isolation.showAll}
            </Button>
          </div>
        ) : null}
        {snapInstruction ? (
          <p
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-mld-border bg-mld-surface/95 px-4 py-2 text-center text-sm font-bold text-mld-text shadow-sm"
          >
            {snapInstruction}
          </p>
        ) : null}
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
      </ReferenceImageGuide>
      {adjustment}
      <fieldset
        aria-label={COPY.editor.model.viewControls}
        className="flex flex-wrap items-center gap-1 border-t border-mld-border bg-mld-surface px-2 py-1"
      >
        {CAMERA_VIEWS.map((view) => (
          <Button
            key={view}
            variant="ghost"
            aria-pressed={cameraView === view}
            title={
              view === 'free' ? COPY.editor.model.viewHint.free : COPY.editor.model.viewHint.flat
            }
            onClick={() => onView(view)}
            className="min-h-11 px-2 text-sm aria-pressed:bg-mld-accent/15 aria-pressed:underline aria-pressed:underline-offset-4"
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
        <Button
          variant="ghost"
          onClick={() => onView('selection')}
          disabled={unsupported || !hasSelection}
          className="min-h-11 px-2 text-sm"
        >
          {COPY.editor.model.views.selection}
        </Button>
        <ToolButton
          icon={Grid3x3}
          label={COPY.editor.model.grid}
          active={gridVisible}
          onClick={onToggleGrid}
          disabled={unsupported}
          className="min-h-11 min-w-11"
        />
        <ToolButton
          icon={Eye}
          label={COPY.editor.model.isolation.toggle}
          active={isolated}
          onClick={onToggleIsolation}
          disabled={unsupported || !hasSelection}
        />
        <ToolButton
          icon={Frame}
          label={COPY.editor.model.edges}
          active={edgesVisible}
          onClick={onToggleEdges}
          disabled={unsupported}
          className="min-h-11 min-w-11"
        />
        <span className="ml-auto shrink-0 px-2 text-xs font-bold text-mld-muted" role="status">
          {status}
        </span>
      </fieldset>
    </div>
  )
}
