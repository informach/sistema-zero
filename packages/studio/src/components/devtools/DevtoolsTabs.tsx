import { type JSX, useEffect } from 'react'
import { ErrorBoundary } from '#ui'
import { type ClassicDockTab, useUIStore, useUIStoreApi } from '../../state/uiStore'
import { useT } from '../../studio/i18n'
import { SectionErrorFallback } from '../layout/ErrorViews'
import { InvestigatePanel } from './InvestigatePanel'
import { PerformancePanel } from './PerformancePanel'

/**
 * Os painéis das abas Investigar e Desempenho dentro da gaveta (proposta aprovada em
 * 20/11/2026), baixados só quando a criança abre uma das abas. A investigação e a medida param
 * quando a gaveta fecha (a frase de cada aba promete) e quando a gaveta sai de cena.
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
  const panel = (tab: 'investigate' | 'performance', content: JSX.Element) => (
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
    </>
  )
}
