import type { JSX } from 'react'
import { useEffect } from 'react'
import { type BottomTab, useUIStore } from '../../state/uiStore'
import { renderBottomPanel, useVisibleBottomTabs } from './bottomTabs'
import { Tabs } from './TabStrip'

export function BottomPanel(): JSX.Element {
  const tab = useUIStore((s) => s.bottomTab)
  const setTab = useUIStore((s) => s.setBottomTab)
  const items = useVisibleBottomTabs()

  // Se a aba ativa não está mais disponível no contexto atual (mudou o modo, ou
  // o aluno escondeu aquele painel), volta para a primeira aba disponível.
  useEffect(() => {
    if (items.length === 0) return
    if (!items.some((i) => i.id === tab)) setTab((items[0]?.id as BottomTab) ?? 'console')
  }, [tab, items, setTab])

  // Terminal e IA ficam MONTADOS enquanto visíveis (Tabs mantém todos os painéis
  // montados e só alterna `hidden`) — desmontar a cada troca de aba mataria o jsh
  // e o buffer do xterm.
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
