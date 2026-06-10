import type { JSX } from 'react'
import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { buildWorkspaceStateFromIR, isBlocksStateEmpty } from '#blockly'
import { BlocklyPanel } from '../components/blocks/BlocklyPanel'
import { ModeLimitationsNotice } from '../components/layout/ModeLimitationsNotice'
import { PreviewIframe } from '../components/preview/PreviewIframe'
import { useProjectStore } from '../state/projectStore'
import { useUIStore } from '../state/uiStore'
import { useStudioConfig } from '../studio/config'

export function BlocksMode(): JSX.Element {
  const { hasProject, blocksState, ir } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      blocksState: s.project?.blocksState ?? null,
      ir: s.project?.ir ?? null,
    })),
  )
  const applyProjectState = useProjectStore((s) => s.applyProjectState)
  const studioConfig = useStudioConfig()
  const showPreview = useUIStore((s) => s.showPreview) && studioConfig.preview

  // Projetos antigos ou vindos do modo Código podem ter IR salvo, mas ainda não
  // ter a serialização do Blockly — ou ter um `blocksState` VAZIO (sobra de um
  // ciclo anterior). Em ambos os casos, deriva os blocos do IR para abrir direto
  // com blocos visíveis. A Ponte faz a mesma derivação por simetria.
  useEffect(() => {
    if (!hasProject || !ir) return
    if (!isBlocksStateEmpty(blocksState)) return
    if (ir.html.length === 0 && ir.css.length === 0 && ir.js.length === 0) return
    applyProjectState({ blocksState: buildWorkspaceStateFromIR(ir) })
  }, [hasProject, blocksState, ir, applyProjectState])

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <ModeLimitationsNotice />
      <PanelGroup direction="horizontal" className="min-h-0 w-full flex-1">
        <Panel defaultSize={showPreview ? 65 : 100} minSize={30}>
          <BlocklyPanel />
        </Panel>
        {showPreview && (
          <>
            <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
            <Panel defaultSize={35} minSize={20}>
              <PreviewIframe />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  )
}
