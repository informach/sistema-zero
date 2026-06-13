import type { JSX, ReactNode } from 'react'
import { lazy, Suspense, useEffect } from 'react'
import { t } from '#core'
import { ErrorBoundary } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import { type BottomTab, useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { ConsolePanel } from '../console/ConsolePanel'
import { SectionErrorFallback } from './ErrorViews'

const Terminal = lazy(() => import('../terminal/Terminal').then((m) => ({ default: m.Terminal })))
const AIPanel = lazy(() => import('../ai/AIPanel').then((m) => ({ default: m.AIPanel })))

// Chaves de tradução AVALIADAS NO RENDER — `t()` em escopo de módulo congela
// o idioma no import, antes de a prop `locale` do <Studio> valer.
const ALL_TABS: Array<[BottomTab, string]> = [
  ['console', 'panel.console'],
  ['terminal', 'panel.terminal'],
  ['ai', 'panel.ai'],
]

export function BottomPanel(): JSX.Element {
  const tab = useUIStore((s) => s.bottomTab)
  const setTab = useUIStore((s) => s.setBottomTab)
  const mode = useProjectStore((s) => s.project?.mode)
  const config = useStudioConfig()

  // No modo Blocos/Ponte só faz sentido ver Console — Terminal e IA são
  // ferramentas avançadas que pertencem ao fluxo de Código. As features do
  // host cortam por cima.
  const tabs = ALL_TABS.filter(([k]) => {
    if (k === 'console') return config.console
    if (k === 'terminal') return config.terminal && mode === 'code'
    return config.ai && mode === 'code'
  })

  // Se a aba ativa não está mais disponível no modo atual, volta para a
  // primeira aba disponível.
  useEffect(() => {
    if (tabs.length === 0) return
    if (!tabs.some(([k]) => k === tab)) setTab(tabs[0]?.[0] ?? 'console')
  }, [tab, tabs, setTab])

  const showTerminal = mode === 'code' && config.terminal
  const showAI = mode === 'code' && config.ai

  return (
    <div className="flex h-full min-h-0 flex-col bg-sz-panel">
      <div role="tablist" className="flex border-b border-sz-border">
        {tabs.map(([k, labelKey]) => {
          const active = tab === k
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(k)}
              className={[
                'px-3 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-b-2 border-sz-accent text-sz-fg'
                  : 'border-b-2 border-transparent text-sz-fg-soft hover:text-sz-fg',
              ].join(' ')}
            >
              {t(labelKey)}
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {config.console && (
          <TabPane active={tab === 'console'}>
            <ErrorBoundary
              label="console"
              fallback={(p) => <SectionErrorFallback {...p} title="O console falhou ao carregar" />}
            >
              <ConsolePanel />
            </ErrorBoundary>
          </TabPane>
        )}
        {/* Terminal e IA ficam MONTADOS enquanto disponíveis no modo Código e só
            alternam visibilidade — desmontar a cada troca de aba mataria o jsh
            e o buffer do xterm (scrollback + processo em execução perdidos). */}
        {showTerminal && (
          <TabPane active={tab === 'terminal'}>
            <ErrorBoundary
              label="terminal"
              resetKeys={[tab]}
              fallback={(p) => (
                <SectionErrorFallback {...p} title="O terminal falhou ao carregar" />
              )}
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
          </TabPane>
        )}
        {showAI && (
          <TabPane active={tab === 'ai'}>
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
          </TabPane>
        )}
      </div>
    </div>
  )
}

/**
 * Container de aba: mantém o filho montado e só alterna a visibilidade via
 * `hidden`. Preserva o estado do Terminal (shell do WebContainer + scrollback)
 * e da IA ao trocar de aba.
 */
function TabPane({ active, children }: { active: boolean; children: ReactNode }): JSX.Element {
  return <div className={active ? 'h-full' : 'hidden'}>{children}</div>
}
