import type { JSX } from 'react'
import { lazy, Suspense, useEffect } from 'react'
import { t } from '#core'
import { ErrorBoundary } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import { type BottomTab, useUIStore } from '../../state/uiStore'
import { ConsolePanel } from '../console/ConsolePanel'
import { SectionErrorFallback } from './ErrorViews'

const Terminal = lazy(() => import('../terminal/Terminal').then((m) => ({ default: m.Terminal })))
const AIPanel = lazy(() => import('../ai/AIPanel').then((m) => ({ default: m.AIPanel })))

const ALL_TABS: Array<[BottomTab, string]> = [
  ['console', t('panel.console')],
  ['terminal', t('panel.terminal')],
  ['ai', t('panel.ai')],
]

export function BottomPanel(): JSX.Element {
  const tab = useUIStore((s) => s.bottomTab)
  const setTab = useUIStore((s) => s.setBottomTab)
  const mode = useProjectStore((s) => s.project?.mode)

  // No modo Blocos/Ponte só faz sentido ver Console — Terminal e IA são
  // ferramentas avançadas que pertencem ao fluxo de Código.
  const tabs = mode === 'code' ? ALL_TABS : ALL_TABS.filter(([k]) => k === 'console')

  // Se a aba ativa não está mais disponível no modo atual, volta para Console.
  useEffect(() => {
    if (!tabs.some(([k]) => k === tab)) setTab('console')
  }, [tab, tabs, setTab])

  return (
    <div className="flex h-full min-h-0 flex-col bg-sz-panel">
      <div className="flex border-b border-sz-border">
        {tabs.map(([k, label]) => {
          const active = tab === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={[
                'px-3 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-b-2 border-sz-accent text-sz-fg'
                  : 'border-b-2 border-transparent text-sz-fg-soft hover:text-sz-fg',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'console' && <ConsolePanel />}
        {tab === 'terminal' && mode === 'code' && (
          <ErrorBoundary
            label="terminal"
            resetKeys={[tab]}
            fallback={(p) => <SectionErrorFallback {...p} title="O terminal falhou ao carregar" />}
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-sz-panel text-xs text-sz-fg-soft">
                  Carregando terminal…
                </div>
              }
            >
              <Terminal />
            </Suspense>
          </ErrorBoundary>
        )}
        {tab === 'ai' && mode === 'code' && (
          <ErrorBoundary
            label="ia"
            resetKeys={[tab]}
            fallback={(p) => (
              <SectionErrorFallback {...p} title="O painel de IA falhou ao carregar" />
            )}
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-sz-panel text-xs text-sz-fg-soft">
                  Carregando IA…
                </div>
              }
            >
              <AIPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
