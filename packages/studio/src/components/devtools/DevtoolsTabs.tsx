import { type JSX, lazy, Suspense, useEffect } from 'react'
import { ErrorBoundary } from '#ui'
import { type ClassicDockTab, useUIStore, useUIStoreApi } from '../../state/uiStore'
import { useT } from '../../studio/i18n'
import { SectionErrorFallback } from '../layout/ErrorViews'
import { InvestigatePanel } from './InvestigatePanel'
import { PerformancePanel } from './PerformancePanel'

// O painel de Meus testes traz o executor e o analisador do script (Babel): baixa só quando a aba
// abre, para Investigar e Desempenho não pagarem por ele.
const StudentTestsPanel = lazy(async () => ({
  default: (await import('./StudentTestsPanel')).StudentTestsPanel,
}))

/**
 * Os painéis das abas Investigar, Desempenho e Meus testes dentro da gaveta (proposta aprovada em
 * 20/11/2026), baixados só quando a criança abre uma das abas. A investigação e a medida param
 * quando a gaveta fecha (a frase de cada aba promete) e quando a gaveta sai de cena; a rodada dos
 * testes também (o painel dela sai de cena junto).
 */
export default function DevtoolsTabs({
  id,
  active,
  open,
}: {
  id: string
  active: ClassicDockTab
  open: boolean
}): JSX.Element {
  const t = useT()
  const ui = useUIStoreApi()
  const on = useUIStore((s) => s.measuring || s.investigating)
  useEffect(() => {
    if (!open && on) ui.setState({ measuring: false, investigating: false })
  }, [open, on, ui])
  useEffect(() => () => ui.setState({ measuring: false, investigating: false }), [ui])
  const panel = (tab: 'investigate' | 'performance' | 'tests', content: JSX.Element) => (
    <div
      id={`${id}-${tab}`}
      role="tabpanel"
      aria-labelledby={`${id}-tab-${tab}`}
      hidden={active !== tab}
      className="h-full overflow-auto p-3"
    >
      <ErrorBoundary
        label={tab}
        fallback={(props) => <SectionErrorFallback {...props} title={t(`pro.dock.${tab}`)} />}
      >
        {content}
      </ErrorBoundary>
    </div>
  )
  return (
    <>
      {panel('investigate', <InvestigatePanel />)}
      {panel('performance', <PerformancePanel />)}
      {active === 'tests'
        ? panel(
            'tests',
            <Suspense fallback={null}>
              <StudentTestsPanel />
            </Suspense>,
          )
        : null}
    </>
  )
}
