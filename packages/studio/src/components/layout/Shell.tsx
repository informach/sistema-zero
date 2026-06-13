import type { JSX } from 'react'
import { lazy, Suspense, useEffect, useId, useMemo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import type { InstalledExtension } from '#core'
import { ErrorBoundary } from '#ui'
// Lazy imports por modo — Blockly não baixa até o aluno entrar em Blocos ou
// Ponte; Monaco não baixa até entrar em Ponte ou Código.
import { BlocksMode, BridgeMode, CodeMode } from '../../modes/lazyModes'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { BottomPanel } from './BottomPanel'
import { SectionErrorFallback } from './ErrorViews'
import { EditorSkeleton } from './LoadingViews'
import { Topbar } from './Topbar'

const ExtensionsPanel = lazy(() =>
  import('../extensions/ExtensionsPanel').then((m) => ({ default: m.ExtensionsPanel })),
)

const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []

function ModeFallback({ name }: { name: string }) {
  return <EditorSkeleton message={`Carregando modo ${name}…`} />
}

export interface ShellProps {
  /** Sai do editor (ex.: volta à lista de projetos do host). Sem ela, a Topbar esconde a navegação. */
  onExit?: () => void
  /** Mostra o toggle claro/escuro na Topbar (false quando o host fixa o tema via prop). */
  canToggleTheme?: boolean
}

export function Shell({ onExit, canToggleTheme }: ShellProps): JSX.Element {
  const { hasProject, projectId, projectMode, installedExtensions } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      projectId: s.project?.id,
      projectMode: s.project?.mode ?? 'blocks',
      installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
    })),
  )
  const showExtensions = useUIStore((s) => s.showExtensions)
  const setShowExtensions = useUIStore((s) => s.setShowExtensions)
  const config = useStudioConfig()
  const hasBottomPanel = config.console || config.terminal || config.ai
  // `autoSaveId` POR INSTÂNCIA: o react-resizable-panels persiste o layout no
  // localStorage com essa chave; um id fixo fazia instâncias no mesmo origin
  // sobrescreverem o layout uma da outra. `useId` é estável e único por
  // instância montada.
  const instanceId = useId()
  const verticalAutoSaveId = `sz-shell-vertical:${instanceId}`
  const installedExtensionKey = useMemo(
    () => installedExtensions.map((ext) => `${ext.id}@${ext.version}`).join('|'),
    [installedExtensions],
  )

  useEffect(() => {
    if (installedExtensionKey.length === 0) return
    void import('../../state/extensionsAdapter').then(({ reregisterInstalledExtensions }) => {
      reregisterInstalledExtensions({ installedExtensions })
    })
  }, [installedExtensions, installedExtensionKey])

  if (!hasProject) return <div />

  return (
    <div className="flex h-full flex-col bg-sz-bg text-sz-fg">
      <Topbar onExit={onExit} canToggleTheme={canToggleTheme} />
      <main className="flex min-h-0 flex-1 flex-col">
        <PanelGroup direction="vertical" className="h-full w-full" autoSaveId={verticalAutoSaveId}>
          <Panel defaultSize={70} minSize={30}>
            {/* `key` por projeto: ao trocar de projeto, remonta a subárvore do
                modo (e, dentro dela, Monaco e Preview) — assim os valores
                debounced e refs começam já com o conteúdo do novo projeto, sem
                mostrar/renderizar o projeto anterior no primeiro instante. */}
            <div key={projectId} className="flex h-full min-h-0 w-full">
              <ErrorBoundary
                label={`modo ${projectMode}`}
                resetKeys={[projectMode, projectId]}
                fallback={(p) => (
                  <SectionErrorFallback {...p} title="Não foi possível carregar o editor" />
                )}
              >
                {projectMode === 'blocks' && (
                  <Suspense fallback={<ModeFallback name="Blocos" />}>
                    <BlocksMode />
                  </Suspense>
                )}
                {projectMode === 'bridge' && (
                  <Suspense fallback={<ModeFallback name="Ponte" />}>
                    <BridgeMode />
                  </Suspense>
                )}
                {projectMode === 'code' && (
                  <Suspense fallback={<ModeFallback name="Código" />}>
                    <CodeMode />
                  </Suspense>
                )}
              </ErrorBoundary>
            </div>
          </Panel>
          {hasBottomPanel && (
            <>
              <PanelResizeHandle className="sz-resize-handle sz-resize-handle--horizontal" />
              <Panel defaultSize={30} minSize={10} maxSize={70}>
                <BottomPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </main>
      {showExtensions && config.extensions && (
        <ErrorBoundary
          label="extensões"
          resetKeys={[showExtensions]}
          fallback={(p) => (
            <SectionErrorFallback {...p} title="Não foi possível abrir as extensões" />
          )}
        >
          <Suspense fallback={null}>
            <ExtensionsPanel open={showExtensions} onClose={() => setShowExtensions(false)} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  )
}
