import { type ReactNode, useEffect, useId, useState } from 'react'
import { useMediaQuery } from '../../ui/useMediaQuery'

/** As abas do painel compacto: o mesmo segmentado em pílula das abas Modelar/Pintar/Animar. */
const INSPECTOR_TAB =
  'min-h-10 flex-1 rounded-full px-2 text-[0.8125rem] font-extrabold text-mld-muted transition hover:text-mld-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent aria-selected:bg-mld-surface aria-selected:text-mld-accent aria-selected:shadow-sm'

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
  const joinedScroll = compact && mode === 'paint'
  const id = useId()
  const [tab, setTab] = useState<'pieces' | 'details' | 'overview'>(
    mode === 'animation' ? 'overview' : 'details',
  )
  useEffect(() => setTab(mode === 'animation' ? 'overview' : 'details'), [mode])
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
          {mode === 'animation' && (
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
            className={INSPECTOR_TAB}
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
            className={INSPECTOR_TAB}
            onClick={() => setTab('details')}
          >
            {mode === 'paint' ? 'Cores' : mode === 'animation' ? 'Pose' : 'Ajustar'}
          </button>
        </div>
      )}
      <div
        className={
          joinedScroll
            ? 'mld-inspector-content mld-scroll-y min-h-0 flex-1 overflow-y-auto'
            : 'contents'
        }
      >
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
            className={`mld-inspector-overview shrink-0 px-1.5 ${joinedScroll ? '' : 'mld-scroll-y overflow-y-auto'}`}
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
          className={`mld-inspector-pieces mld-scroll-y overflow-y-auto px-1.5 ${compact ? 'min-h-0 flex-1' : ''}`}
        >
          {pieces}
        </section>
        <section
          id={`${id}-details`}
          role={compact ? 'tabpanel' : 'region'}
          aria-label={compact ? undefined : 'Ajustes do contexto'}
          aria-labelledby={compact ? `${id}-tab-details` : undefined}
          hidden={compact && tab !== 'details'}
          className={`mld-inspector-properties min-h-0 flex-1 space-y-2 px-1.5 ${joinedScroll ? '' : 'mld-scroll-y overflow-y-auto'}`}
        >
          {children}
        </section>
      </div>
    </div>
  )
}
