/**
 * Root do Pensa: seta [data-pensa-theme] (tema fixado pelo host; ausente =
 * 'light'), cria a store POR INSTÂNCIA com o transport injetado e navega por
 * ESTADO entre lista ⇄ projeto (sem router — navegação externa é do host).
 * Com `adapter.stateKey` (07/2026), LEMBRA o projeto aberto em localStorage e
 * o reabre no próximo mount ("continuar de onde parou") — antes um refresh
 * jogava a criança de volta na lista.
 */
import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from 'zustand'
import { getCopy } from '../core/copy'
import type { PensaHostAdapter } from '../core/types'
import { createProjectStore } from '../state/projectStore'
import { PensaAppProvider } from './appContext'
import { type PensaTheme, PensaThemeProvider } from './PensaThemeScope'
import { ProjectList } from './project/ProjectList'
import { ProjectView } from './project/ProjectView'

const RESUME_PREFIX = 'pensa:resume:'

function readResume(stateKey: string): string | null {
  try {
    return window.localStorage.getItem(RESUME_PREFIX + stateKey)
  } catch {
    return null
  }
}

function writeResume(stateKey: string, projectId: string | null): void {
  try {
    if (projectId) window.localStorage.setItem(RESUME_PREFIX + stateKey, projectId)
    else window.localStorage.removeItem(RESUME_PREFIX + stateKey)
  } catch {
    // storage indisponível: segue sem lembrar (comportamento antigo)
  }
}

export function PensaApp({ adapter }: { adapter: PensaHostAdapter }): JSX.Element {
  // Store por instância, latchada no primeiro render (como o StudioCore faz
  // com os adapters: trocar o transport depois exige remontar o componente).
  const [store] = useState(() => createProjectStore(adapter.transport))
  const copy = getCopy(adapter.mode)
  const theme: PensaTheme = adapter.theme ?? 'light'
  const contextValue = useMemo(() => ({ adapter, copy, store }), [adapter, copy, store])
  const activeProjectId = useStore(store, (s) => s.activeProjectId)

  // Continuar de onde parou: restaura o projeto salvo 1x no mount e passa a
  // ESPELHAR toda mudança (abrir grava; fechar/arquivar limpa). Projeto que
  // sumiu (arquivado em outro aparelho) cai na tela de erro gentil do
  // ProjectView, cujo "voltar" limpa a chave via closeProject.
  const stateKey = adapter.stateKey
  useEffect(() => {
    if (!stateKey) return
    const saved = readResume(stateKey)
    if (saved && !store.getState().activeProjectId) void store.getState().openProject(saved)
    return store.subscribe((state, prev) => {
      if (state.activeProjectId !== prev.activeProjectId) {
        writeResume(stateKey, state.activeProjectId)
      }
    })
  }, [stateKey, store])

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
