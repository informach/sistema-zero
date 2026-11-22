/**
 * Aproximar/afastar em degraus fixos (os `zoomLevels` da sessão — pixel e
 * vetor usam escalas diferentes) + o valor atual. Desde a tela-modelo
 * (11/09/2026) é a pílula branca da faixa azul ("⊖ 8× ⊕", `.pin-zoom`).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../core/copy'
import type { PintaSessionStore } from '../../state/sessionStore'
import { ToolButton } from '../ui/Button'
import { ZoomIn, ZoomOut } from '../ui/icons'
import { useEditorStores } from './editorContext'

export function ZoomControls({ className }: { className?: string }): JSX.Element {
  const { session } = useEditorStores()
  return <SessionZoomControls session={session} className={className} />
}

export function SessionZoomControls({
  className,
  session,
}: {
  className?: string
  session: PintaSessionStore
}): JSX.Element {
  const zoom = useStore(session, (state) => state.zoom)
  const levels = useStore(session, (state) => state.zoomLevels)
  const min = levels[0]
  const max = levels[levels.length - 1]

  return (
    <div className={clsx('pin-zoom', className)}>
      <ToolButton
        icon={ZoomOut}
        label={COPY.editor.zoomOut}
        disabled={min !== undefined && zoom <= min}
        onClick={() => session.getState().zoomOut()}
      />
      {/* Arredonda a exibição: o "Ajustar" do vetor grava zoom fracionário. */}
      <span className="min-w-9 text-center text-sm font-extrabold text-pin-text">
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
