import { createContext, type JSX, type ReactNode, useContext } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ExtraFile } from '#core'
import type { TerminalProjectSnapshot } from '../../components/terminal/terminalProjectFiles'
import { useProjectStore } from '../../state/projectStore'
import { type UseWebContainerSyncResult, useWebContainerSync } from './useWebContainerSync'

const ProWebContainerContext = createContext<UseWebContainerSyncResult | null>(null)

const EMPTY_EXTRA_FILES: ExtraFile[] = []

/**
 * Provê o sincronizador ÚNICO (`useWebContainerSync`) para a subárvore do modo
 * profissional. Montado por `CodeMode` quando `project.kind === 'pro'`; ProPreview
 * e Terminal consomem via `useProWebContainer()` para compartilhar o MESMO
 * container singleton sem disputar a escrita no FS.
 */
export function ProWebContainerProvider({ children }: { children: ReactNode }): JSX.Element {
  const snapshot = useProjectStore(
    useShallow(
      (s): TerminalProjectSnapshot => ({
        id: s.project?.id ?? null,
        name: s.project?.name ?? 'sz-project',
        files: s.project?.files ?? null,
        extraFiles: s.project?.extraFiles ?? EMPTY_EXTRA_FILES,
        kind: s.project?.kind === 'pro' ? 'pro' : undefined,
        tree: s.project?.tree,
      }),
    ),
  )
  const sync = useWebContainerSync(snapshot)
  return <ProWebContainerContext.Provider value={sync}>{children}</ProWebContainerContext.Provider>
}

export function useProWebContainer(): UseWebContainerSyncResult {
  const ctx = useContext(ProWebContainerContext)
  if (!ctx) {
    throw new Error('useProWebContainer deve ser usado dentro de <ProWebContainerProvider>.')
  }
  return ctx
}
