/**
 * MODO MISSÃO (split, desktop ≥1024px): overlay de tela cheia com o card da
 * missão à esquerda (w-80, colapsável em gaveta) e o Estúdio embarcado
 * (adapter.renderStudio) preenchendo a direita. A11y na mecânica do Dialog
 * interno: foco entra no container (e volta ao acionador ao sair), Esc volta
 * às missões, aria-modal + trap de Tab. Renderiza INLINE (sem portal), então
 * permanece dentro do escopo [data-pensa-theme] do root.
 */
import type { JSX, KeyboardEvent, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { usePensaApp } from '../appContext'
import { trapTabKey } from '../common/focusTrap'

export function MissionMode({
  title,
  studio,
  onBack,
  children,
}: {
  /** Título da missão aberta (aria-label do overlay). */
  title: string
  /** `adapter.renderStudio(studioProjectId)` do host. */
  studio: ReactNode
  onBack: () => void
  /** Miolo da missão (MissionSheet). */
  children: ReactNode
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageR
  const rootRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  // Foca o overlay ao abrir e devolve o foco ao acionador ao sair.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    rootRef.current?.focus()
    return () => {
      previous?.focus()
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onBack()
      return
    }
    trapTabKey(event, rootRef.current)
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-pz-bg outline-none"
    >
      <header className="flex items-center gap-3 border-b-2 border-pz-border bg-pz-surface px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-text transition hover:border-pz-accent"
        >
          <span aria-hidden="true">←</span>
          {c.backToBoard}
        </button>
        <h3 className="min-w-0 flex-1 truncate text-lg font-extrabold text-pz-text">{title}</h3>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="min-h-11 shrink-0 rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent"
        >
          {collapsed ? c.showMission : c.hideMission}
        </button>
      </header>
      <div className="flex min-h-0 flex-1">
        {collapsed ? null : (
          <aside className="w-80 shrink-0 overflow-y-auto border-r-2 border-pz-border bg-pz-surface p-4">
            {children}
          </aside>
        )}
        <div data-mission-studio="" className="min-w-0 flex-1 overflow-hidden">
          {studio}
        </div>
      </div>
    </div>
  )
}
