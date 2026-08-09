import type { ReactNode } from 'react'
import { Suspense, useMemo } from 'react'
import { ErrorBoundary } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import { type BottomTab, resolveConsoleVisibility, useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { useT } from '../../studio/i18n'
import { ConsolePanel } from '../console/ConsolePanel'
import { SectionErrorFallback } from './ErrorViews'
import { AIPanel, Terminal } from './lazyPanels'
import type { TabItem } from './TabStrip'

// Chaves de tradução AVALIADAS NO RENDER — `t()` em escopo de módulo congela
// o idioma no import, antes de a prop `locale` do <Studio> valer.
const BOTTOM_TAB_LABELS: Record<BottomTab, string> = {
  console: 'panel.console',
  terminal: 'panel.terminal',
  ai: 'panel.ai',
}

const BOTTOM_TAB_ORDER: readonly BottomTab[] = ['console', 'terminal', 'ai']

function LoadingPane({ children }: { children: ReactNode }) {
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

/**
 * Tabs do painel inferior VISÍVEIS no contexto atual. Cruza três filtros:
 * - features do host (`config.console/terminal/ai`);
 * - contexto de modo: sem escolha manual, Console fica oculto em Blocos/Ponte e
 *   visível em Código; Terminal e IA só aparecem em `mode === 'code'`;
 * - preferência do aluno: a escolha manual do Console prevalece entre modos e
 *   projetos na mesma instância; Terminal/IA usam seus booleanos próprios.
 *
 * Ponto único de verdade consumido pelo `BottomPanel` (wide), pelo `NarrowPanels`
 * (abas) e pelo `Shell` (decide se a barra inferior existe). Mantê-lo aqui evita
 * que os três divirjam.
 */
export function useVisibleBottomTabs(): TabItem[] {
  const t = useT()
  const config = useStudioConfig()
  const mode = useProjectStore((s) => s.project?.mode)
  const consoleVisibilityOverride = useUIStore((s) => s.consoleVisibilityOverride)
  const showTerminal = useUIStore((s) => s.showTerminal)
  const showAI = useUIStore((s) => s.showAI)

  return useMemo(() => {
    const isCode = mode === 'code'
    const showConsole = resolveConsoleVisibility(mode, consoleVisibilityOverride)
    return BOTTOM_TAB_ORDER.filter((id) => {
      if (id === 'console') return config.console && showConsole
      if (id === 'terminal') return config.terminal && showTerminal && isCode
      return config.ai && showAI && isCode
    }).map((id) => ({ id, label: t(BOTTOM_TAB_LABELS[id]) }))
  }, [
    config.console,
    config.terminal,
    config.ai,
    mode,
    consoleVisibilityOverride,
    showTerminal,
    showAI,
    t,
  ])
}
