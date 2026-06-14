import type { JSX, ReactNode } from 'react'
import { Suspense, useEffect } from 'react'
import { t } from '#core'
import { ErrorBoundary } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import { type BottomTab, useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { ConsolePanel } from '../console/ConsolePanel'
import { SectionErrorFallback } from './ErrorViews'
import { AIPanel, Terminal } from './lazyPanels'
import { type TabItem, Tabs } from './TabStrip'

// Chaves de tradução AVALIADAS NO RENDER — `t()` em escopo de módulo congela
// o idioma no import, antes de a prop `locale` do <Studio> valer.
const ALL_TABS: Array<[BottomTab, string]> = [
  ['console', 'panel.console'],
  ['terminal', 'panel.terminal'],
  ['ai', 'panel.ai'],
]

function LoadingPane({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center bg-sz-panel text-xs text-sz-fg-soft">
      {children}
    </div>
  )
}

/** Render do conteúdo de uma aba do painel inferior (console/terminal/IA). */
export function renderBottomPanel(id: BottomTab): ReactNode {
  if (id === 'console') {
    return (
      <ErrorBoundary
        label="console"
        fallback={(p) => <SectionErrorFallback {...p} title="O console falhou ao carregar" />}
      >
        <ConsolePanel />
      </ErrorBoundary>
    )
  }
  if (id === 'terminal') {
    return (
      <ErrorBoundary
        label="terminal"
        fallback={(p) => <SectionErrorFallback {...p} title="O terminal falhou ao carregar" />}
      >
        <Suspense fallback={<LoadingPane>Carregando terminal…</LoadingPane>}>
          <Terminal />
        </Suspense>
      </ErrorBoundary>
    )
  }
  return (
    <ErrorBoundary
      label="ia"
      fallback={(p) => <SectionErrorFallback {...p} title="O painel de IA falhou ao carregar" />}
    >
      <Suspense fallback={<LoadingPane>Carregando IA…</LoadingPane>}>
        <AIPanel />
      </Suspense>
    </ErrorBoundary>
  )
}

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

  const items: TabItem[] = tabs.map(([k, labelKey]) => ({ id: k, label: t(labelKey) }))

  // Terminal e IA ficam MONTADOS enquanto disponíveis (Tabs mantém todos os
  // painéis montados e só alterna `hidden`) — desmontar a cada troca de aba
  // mataria o jsh e o buffer do xterm.
  return (
    <Tabs
      items={items}
      active={tab}
      onSelect={(id) => setTab(id as BottomTab)}
      renderPanel={(id) => renderBottomPanel(id as BottomTab)}
      ariaLabel="Painéis"
      className="bg-sz-panel"
    />
  )
}
