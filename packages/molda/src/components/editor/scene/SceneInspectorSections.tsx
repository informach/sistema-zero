import { type ReactNode, useEffect, useId, useState } from 'react'
import { useMediaQuery } from '../../ui/useMediaQuery'

/** As abas do painel compacto: o mesmo segmentado em pílula das abas Modelar/Pintar/Animar. */
const INSPECTOR_TAB =
  'min-h-10 flex-1 rounded-full px-2 text-[0.8125rem] font-extrabold text-mld-muted transition hover:text-mld-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent aria-selected:bg-mld-surface aria-selected:text-mld-accent aria-selected:shadow-sm'

/** The hierarchy stays first in every mode; compact screens expose separate named tabs. */
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
    mode === 'model' ? 'details' : 'overview',
  )
  useEffect(() => setTab(mode === 'model' ? 'details' : 'overview'), [mode])
  return (
    <div
      className="mld-inspector-sections flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-1.5 pt-3 pb-2"
      data-activity={mode}
    >
      {compact && (
        <div
          className="mx-1.5 flex shrink-0 gap-1 rounded-full bg-mld-bg p-1"
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
          <button
            type="button"
            role="tab"
            id={`${id}-tab-pieces`}
            aria-controls={`${id}-pieces`}
            tabIndex={tab === 'pieces' ? 0 : -1}
            aria-selected={tab === 'pieces'}
            className={INSPECTOR_TAB}
            onClick={() => setTab('pieces')}
          >
            Peças
          </button>
          {mode !== 'model' && (
            <button
              type="button"
              role="tab"
              id={`${id}-tab-overview`}
              aria-controls={`${id}-overview`}
              tabIndex={tab === 'overview' ? 0 : -1}
              aria-selected={tab === 'overview'}
              className={INSPECTOR_TAB}
              onClick={() => setTab('overview')}
            >
              {mode === 'paint' ? 'Cores' : 'Movimentos'}
            </button>
          )}
          <button
            type="button"
            role="tab"
            id={`${id}-tab-details`}
            aria-controls={`${id}-details`}
            tabIndex={tab === 'details' ? 0 : -1}
            aria-selected={tab === 'details'}
            className={INSPECTOR_TAB}
            onClick={() => setTab('details')}
          >
            {mode === 'paint' ? 'Ajustes' : mode === 'animation' ? 'Pose' : 'Ajustar'}
          </button>
        </div>
      )}
      <div className="contents">
        <section
          id={`${id}-pieces`}
          role={compact ? 'tabpanel' : 'region'}
          aria-label={compact ? undefined : 'Lista de peças'}
          aria-labelledby={compact ? `${id}-tab-pieces` : undefined}
          hidden={compact && tab !== 'pieces'}
          className={`mld-inspector-pieces mld-scroll-y overflow-y-auto border-b border-mld-border px-1.5 pb-2 ${compact ? 'min-h-0 flex-1' : ''}`}
        >
          {pieces}
        </section>
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
            aria-labelledby={compact ? `${id}-tab-overview` : undefined}
            hidden={compact && tab !== 'overview'}
            className="mld-inspector-overview mld-scroll-y min-h-0 overflow-y-auto border-b border-mld-border px-1.5 pb-2"
          >
            {overview}
          </section>
        )}
        <section
          id={`${id}-details`}
          role={compact ? 'tabpanel' : 'region'}
          aria-label={compact ? undefined : 'Ajustes do contexto'}
          aria-labelledby={compact ? `${id}-tab-details` : undefined}
          hidden={compact && tab !== 'details'}
          className="mld-inspector-properties mld-scroll-y min-h-0 flex-1 space-y-2 overflow-y-auto px-1.5"
        >
          {children}
        </section>
      </div>
    </div>
  )
}
