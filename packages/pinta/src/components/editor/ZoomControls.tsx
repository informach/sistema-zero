/**
 * Aproximar/afastar em degraus fixos (os `zoomLevels` da sessão — pixel e
 * vetor usam escalas diferentes) + o valor atual.
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { IconButton } from '../ui/Button'
import { useEditorStores, useSession } from './editorContext'

export function ZoomControls(): JSX.Element {
  const { session } = useEditorStores()
  const zoom = useSession((state) => state.zoom)
  const levels = useSession((state) => state.zoomLevels)
  const min = levels[0]
  const max = levels[levels.length - 1]

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
      {/* Arredonda a exibição: o "Ajustar" do vetor grava zoom fracionário. */}
      <span className="min-w-12 text-center text-sm font-bold text-pin-muted">
        {Math.round(zoom * 10) / 10}×
      </span>
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
