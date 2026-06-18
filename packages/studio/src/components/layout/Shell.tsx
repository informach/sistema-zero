import type { JSX } from 'react'
import { lazy, Suspense, useId, useRef } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { ErrorBoundary } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { StudioLayoutProvider, useStudioWidth } from '../../studio/layoutContext'
import { ActivityPanel } from './ActivityPanel'
import { BottomPanel } from './BottomPanel'
import { useVisibleBottomTabs } from './bottomTabs'
import { ConvertLegacyPrompt } from './ConvertLegacyPrompt'
import { SectionErrorFallback } from './ErrorViews'
import { ModeArea } from './ModeArea'
import { NarrowLayout } from './NarrowLayout'
import { Topbar } from './Topbar'

const ExtensionsPanel = lazy(() =>
  import('../extensions/ExtensionsPanel').then((m) => ({ default: m.ExtensionsPanel })),
)

export interface ShellProps {
  /** Sai do editor (ex.: volta à lista de projetos do host). Sem ela, a Topbar esconde a navegação. */
  onExit?: () => void
  /** Mostra o toggle claro/escuro na Topbar (false quando o host fixa o tema via prop). */
  canToggleTheme?: boolean
}

export function Shell({ onExit, canToggleTheme }: ShellProps): JSX.Element {
  const { hasProject, projectId, projectMode } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      projectId: s.project?.id,
      projectMode: s.project?.mode ?? 'blocks',
    })),
  )
  const showExtensions = useUIStore((s) => s.showExtensions)
  const setShowExtensions = useUIStore((s) => s.setShowExtensions)
  const config = useStudioConfig()
  // A barra inferior (wide) só existe quando há ALGUMA aba inferior visível — as
  // features do host cruzadas com o contexto de modo e com as preferências de
  // mostrar/esconder do aluno. Some por completo quando o aluno esconde tudo.
  const hasBottomPanel = useVisibleBottomTabs().length > 0
  // `autoSaveId` POR INSTÂNCIA: o react-resizable-panels persiste o layout no
  // localStorage com essa chave; um id fixo fazia instâncias no mesmo origin
  // sobrescreverem o layout uma da outra. `useId` é estável e único por
  // instância montada.
  const instanceId = useId()
  const verticalAutoSaveId = `sz-shell-vertical:${instanceId}`

  // Mede a largura do PRÓPRIO Studio (embarcado em largura variável) e expõe os
  // tiers de layout (isNarrow/isCompact) para a Topbar e o branch wide/narrow.
  const rootRef = useRef<HTMLDivElement>(null)
  const layout = useStudioWidth(rootRef)

  if (!hasProject) return <div />

  return (
    <StudioLayoutProvider value={layout}>
      <div ref={rootRef} className="flex h-full flex-col bg-sz-bg text-sz-fg">
        {/* Só monta o layout DEPOIS de medir a largura. `width` começa em 0 (que
            cai no branch wide); pintar o wide e trocar para o narrow no frame
            seguinte REMONTARIA os editores pesados (Blockly/Monaco) e abria
            corrida na injeção do Blockly ("Can't change mode"). A medição é
            síncrona (useLayoutEffect, antes do paint), então este estado
            não-medido nunca chega à tela; o ResizeObserver cobre o caso de o
            Studio só ganhar tamanho depois (ex.: montado oculto). */}
        {layout.width > 0 && (
          <>
            <Topbar onExit={onExit} canToggleTheme={canToggleTheme} />
            {layout.isNarrow ? (
              <NarrowLayout projectMode={projectMode} projectId={projectId} />
            ) : (
              <main className="flex min-h-0 flex-1 flex-col">
                <PanelGroup
                  direction="vertical"
                  className="h-full w-full"
                  autoSaveId={verticalAutoSaveId}
                >
                  {/* `key` por projeto: ao trocar de projeto, remonta a subárvore do
                  modo (e, dentro dela, Monaco e Preview) — assim os valores
                  debounced e refs começam já com o conteúdo do novo projeto, sem
                  mostrar/renderizar o projeto anterior no primeiro instante. */}
                  <Panel id="sz-editor" order={1} defaultSize={70} minSize={30}>
                    {/* ActivityPanel é self-gating (null sem atividade): no
                        <StudioEditor> e nas aulas sem exercício não acrescenta
                        DOM, então o split do editor fica idêntico ao de antes.
                        Quando a fase de auto-correção ligar a atividade, a raiz
                        do modo é `w-full` — envolver o ModeArea em `flex-1 min-w-0`
                        para ele dividir a largura com o painel (`w-72 shrink-0`). */}
                    <div key={projectId} className="flex h-full min-h-0 w-full">
                      <ActivityPanel />
                      <ModeArea projectMode={projectMode} projectId={projectId} />
                    </div>
                  </Panel>
                  {hasBottomPanel && (
                    <>
                      <PanelResizeHandle className="sz-resize-handle sz-resize-handle--horizontal" />
                      <Panel id="sz-bottom" order={2} defaultSize={30} minSize={10} maxSize={70}>
                        <BottomPanel />
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </main>
            )}
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
            <ConvertLegacyPrompt />
          </>
        )}
      </div>
    </StudioLayoutProvider>
  )
}
