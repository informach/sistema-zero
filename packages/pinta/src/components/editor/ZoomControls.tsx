/**
 * Aproximar/afastar em degraus fixos (ZOOM_LEVELS) + o valor atual.
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { ZOOM_LEVELS } from '../../state/sessionStore'
import { IconButton } from '../ui/Button'
import { useEditorStores, useSession } from './editorContext'

export function ZoomControls(): JSX.Element {
  const { session } = useEditorStores()
  const zoom = useSession((state) => state.zoom)
  const min = ZOOM_LEVELS[0]
  const max = ZOOM_LEVELS[ZOOM_LEVELS.length - 1]

  return (
    <div className="flex items-center gap-1 rounded-3xl border-2 border-pin-border bg-pin-surface px-2 py-1">
      <IconButton
        aria-label={COPY.editor.zoomOut}
        title={COPY.editor.zoomOut}
        disabled={min !== undefined && zoom <= min}
        onClick={() => session.getState().zoomOut()}
      >
        <span aria-hidden="true">➖</span>
      </IconButton>
      <span className="min-w-12 text-center text-sm font-bold text-pin-muted">{zoom}×</span>
      <IconButton
        aria-label={COPY.editor.zoomIn}
        title={COPY.editor.zoomIn}
        disabled={max !== undefined && zoom >= max}
        onClick={() => session.getState().zoomIn()}
      >
        <span aria-hidden="true">➕</span>
      </IconButton>
    </div>
  )
}
