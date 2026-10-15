import { type ReactNode, useEffect, useId, useState } from 'react'
import { useMediaQuery } from '../../ui/useMediaQuery'

/** Independent scroll regions; compact screens expose named tabs without unmounting forms. */
export function SceneInspectorSections({
  mode,
  overview,
  pieces,
  children,
}: {
  mode: 'model' | 'paint' | 'animation'
  overview?: ReactNode
  pieces: ReactNode
  children: ReactNode
}) {
  const compact = useMediaQuery('(max-width: 1100px)')
  const id = useId()
  const [tab, setTab] = useState<'pieces' | 'details' | 'overview'>(
    mode === 'animation' ? 'overview' : 'details',
  )
  useEffect(() => setTab(mode === 'animation' ? 'overview' : 'details'), [mode])
  return (
    <div
      className="mld-inspector-sections flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
      data-activity={mode}
    >
      {compact && (
        <div
          className="flex shrink-0 gap-1 border-b border-mld-border"
          role="tablist"
          aria-label="Painel da criação"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            const tabs = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
            )
            const index = tabs.indexOf(event.target as HTMLButtonElement)
            if (index < 0) return
            event.preventDefault()
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
            tabs[next]?.click()
            tabs[next]?.focus()
          }}
        >
          {mode === 'animation' && (
            <button
              type="button"
              role="tab"
              id={`${id}-tab-overview`}
              aria-controls={`${id}-overview`}
              tabIndex={tab === 'overview' ? 0 : -1}
              aria-selected={tab === 'overview'}
              className="min-h-11 flex-1 rounded-t-lg text-xs font-bold aria-selected:bg-mld-bg"
              onClick={() => setTab('overview')}
            >
              Movimentos
            </button>
          )}
          <button
            type="button"
            role="tab"
            id={`${id}-tab-pieces`}
            aria-controls={`${id}-pieces`}
            tabIndex={tab === 'pieces' ? 0 : -1}
            aria-selected={tab === 'pieces'}
            className="min-h-11 flex-1 rounded-t-lg text-sm font-bold aria-selected:bg-mld-bg"
            onClick={() => setTab('pieces')}
          >
            Peças
          </button>
          <button
            type="button"
            role="tab"
            id={`${id}-tab-details`}
            aria-controls={mode === 'paint' ? `${id}-overview ${id}-details` : `${id}-details`}
            tabIndex={tab === 'details' ? 0 : -1}
            aria-selected={tab === 'details'}
            className="min-h-11 flex-1 rounded-t-lg text-sm font-bold aria-selected:bg-mld-bg"
            onClick={() => setTab('details')}
          >
            {mode === 'paint' ? 'Cores' : mode === 'animation' ? 'Pose' : 'Ajustar'}
          </button>
        </div>
      )}
      {overview && (
        <section
          id={`${id}-overview`}
          role={compact ? 'tabpanel' : 'region'}
          aria-label={
            compact
              ? undefined
              : mode === 'animation'
                ? 'Movimentos e atalhos'
                : 'Cores disponíveis'
          }
          aria-labelledby={
            compact ? `${id}-tab-${mode === 'animation' ? 'overview' : 'details'}` : undefined
          }
          hidden={compact && tab !== (mode === 'animation' ? 'overview' : 'details')}
          className="mld-inspector-overview mld-scroll-y shrink-0 overflow-y-auto"
        >
          {overview}
        </section>
      )}
      <section
        id={`${id}-pieces`}
        role={compact ? 'tabpanel' : 'region'}
        aria-label={compact ? undefined : 'Lista de peças'}
        aria-labelledby={compact ? `${id}-tab-pieces` : undefined}
        hidden={compact && tab !== 'pieces'}
        className={`mld-inspector-pieces mld-scroll-y overflow-y-auto ${compact ? 'min-h-0 flex-1' : ''}`}
      >
        {pieces}
      </section>
      <section
        id={`${id}-details`}
        role={compact ? 'tabpanel' : 'region'}
        aria-label={compact ? undefined : 'Ajustes do contexto'}
        aria-labelledby={compact ? `${id}-tab-details` : undefined}
        hidden={compact && tab !== 'details'}
        className="mld-inspector-properties mld-scroll-y min-h-0 flex-1 space-y-2 overflow-y-auto"
      >
        {children}
      </section>
    </div>
  )
}
