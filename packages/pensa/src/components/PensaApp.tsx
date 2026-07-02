/**
 * Root do Pensa: seta [data-pensa-theme] (tema fixado pelo host; ausente =
 * 'light'), cria a store POR INSTÂNCIA com o transport injetado e navega por
 * ESTADO entre lista ⇄ projeto (sem router — navegação externa é do host).
 */
import type { JSX } from 'react'
import { useMemo, useState } from 'react'
import { useStore } from 'zustand'
import { getCopy } from '../core/copy'
import type { PensaHostAdapter } from '../core/types'
import { createProjectStore } from '../state/projectStore'
import { PensaAppProvider } from './appContext'
import { type PensaTheme, PensaThemeProvider } from './PensaThemeScope'
import { ProjectList } from './project/ProjectList'
import { ProjectView } from './project/ProjectView'

export function PensaApp({ adapter }: { adapter: PensaHostAdapter }): JSX.Element {
  // Store por instância, latchada no primeiro render (como o StudioCore faz
  // com os adapters: trocar o transport depois exige remontar o componente).
  const [store] = useState(() => createProjectStore(adapter.transport))
  const copy = getCopy(adapter.mode)
  const theme: PensaTheme = adapter.theme ?? 'light'
  const contextValue = useMemo(() => ({ adapter, copy, store }), [adapter, copy, store])
  const activeProjectId = useStore(store, (s) => s.activeProjectId)

  return (
    <PensaThemeProvider value={theme}>
      <PensaAppProvider value={contextValue}>
        <div
          data-pensa-theme={theme}
          className="flex min-h-full w-full flex-col bg-pz-bg text-pz-text antialiased"
        >
          {activeProjectId ? <ProjectView /> : <ProjectList />}
        </div>
      </PensaAppProvider>
    </PensaThemeProvider>
  )
}
