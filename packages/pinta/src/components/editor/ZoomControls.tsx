/**
 * Aproximar/afastar em degraus fixos (os `zoomLevels` da sessão — pixel e
 * vetor usam escalas diferentes) + o valor atual.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { ToolButton } from '../ui/Button'
import { ZoomIn, ZoomOut } from '../ui/icons'
import { useEditorStores, useSession } from './editorContext'

export function ZoomControls({ className }: { className?: string }): JSX.Element {
  const { session } = useEditorStores()
  const zoom = useSession((state) => state.zoom)
  const levels = useSession((state) => state.zoomLevels)
  const min = levels[0]
  const max = levels[levels.length - 1]

  return (
    <div className={clsx('pin-panel flex shrink-0 items-center gap-1 px-2 py-1', className)}>
      <ToolButton
        icon={ZoomOut}
        label={COPY.editor.zoomOut}
        disabled={min !== undefined && zoom <= min}
        onClick={() => session.getState().zoomOut()}
      />
      {/* Arredonda a exibição: o "Ajustar" do vetor grava zoom fracionário. */}
      <span className="min-w-12 text-center text-sm font-bold text-pin-muted">
        {Math.round(zoom * 10) / 10}×
      </span>
      <ToolButton
        icon={ZoomIn}
        label={COPY.editor.zoomIn}
        disabled={max !== undefined && zoom >= max}
        onClick={() => session.getState().zoomIn()}
      />
    </div>
  )
}
