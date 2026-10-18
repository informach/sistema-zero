import { createContext, type JSX, type ReactNode, useContext } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ExtraFile } from '#core'
import type { TerminalProjectSnapshot } from '../../components/terminal/terminalProjectFiles'
import { javaScriptProject } from '../../core/editableProject'
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
        id: javaScriptProject(s.project)?.id ?? null,
        name: javaScriptProject(s.project)?.name ?? 'sz-project',
        files: javaScriptProject(s.project)?.files ?? null,
        extraFiles: javaScriptProject(s.project)?.extraFiles ?? EMPTY_EXTRA_FILES,
        kind: javaScriptProject(s.project)?.kind === 'pro' ? 'pro' : undefined,
        tree: javaScriptProject(s.project)?.tree,
        assets: javaScriptProject(s.project)?.assets,
      }),
    ),
  )
  const sync = useWebContainerSync(snapshot)
  return (
    <ProWebContainerContext.Provider value={sync}>
      <div className="flex h-full min-h-0 flex-col">
        {(sync.syncError || sync.error) && (
          <div
            role="alert"
            className="shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs"
          >
            {sync.syncError || sync.error}
          </div>
        )}
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </ProWebContainerContext.Provider>
  )
}

export function useProWebContainer(): UseWebContainerSyncResult {
  const ctx = useContext(ProWebContainerContext)
  if (!ctx) {
    throw new Error('useProWebContainer deve ser usado dentro de <ProWebContainerProvider>.')
  }
  return ctx
}
