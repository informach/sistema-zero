import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { buildWorkspaceStateFromIR, isBlocksStateEmpty } from '#blockly'
import { t } from '#core'
import { BlocklyPanel } from '../components/blocks/BlocklyPanel'
import { ModeLimitationsNotice } from '../components/layout/ModeLimitationsNotice'
import { NarrowPanels } from '../components/layout/NarrowPanels'
import { PreviewIframe } from '../components/preview/PreviewIframe'
import { getCanonicalSourceMap } from '../state/canonicalSourceMap'
import { useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { useSourcemapStore } from '../state/sourcemapStore'
import { useUIStore } from '../state/uiStore'
import { useStudioConfig } from '../studio/config'
import { useStudioLayout } from '../studio/layoutContext'
import { BRIDGE_JS_HEADER } from './bridgeReverseParse'

export function BlocksMode(): JSX.Element {
  const { hasProject, blocksState, ir, projectName, js } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      blocksState: s.project?.blocksState ?? null,
      ir: s.project?.ir ?? null,
      projectName: s.project?.name ?? 'Projeto',
      js: s.project?.files['script.js'] ?? '',
    })),
  )
  const blocksHydration = useProjectStore((s) => s.blocksHydration)
  const applyProjectState = useProjectStore((s) => s.applyProjectState)
  const projectStoreApi = useProjectStoreApi()
  const studioConfig = useStudioConfig()
  const showPreview = useUIStore((s) => s.showPreview) && studioConfig.preview
  const { isNarrow } = useStudioLayout()
  const setSourceMap = useSourcemapStore((s) => s.setMap)

  // Publica o source map canônico também no modo Blocos: o Console o usa para o
  // chip "Ver o bloco" nos erros de execução (linha do script.js → bloco). Na
  // Ponte, o BridgeMode publica um mapa mais rico (CSS posicional) por cima.
  useEffect(() => {
    if (!ir) {
      setSourceMap({})
      return
    }
    try {
      const header = js.startsWith(BRIDGE_JS_HEADER) ? BRIDGE_JS_HEADER : undefined
      setSourceMap(getCanonicalSourceMap(ir, projectName, header))
    } catch {
      // Best-effort: sem mapa, o Console só não mostra o chip.
    }
  }, [ir, js, projectName, setSourceMap])

  // Projetos antigos ou vindos do modo Código podem ter IR salvo, mas ainda não
  // ter a serialização do Blockly — ou ter um `blocksState` VAZIO (sobra de um
  // ciclo anterior). Em ambos os casos, deriva os blocos do IR para abrir direto
  // com blocos visíveis. A Ponte faz a mesma derivação por simetria.
  // ⚠️ NUNCA enquanto a partição real hidrata ('pending'): derivar aqui marcaria
  // o projeto sujo e descartaria o layout salvo prestes a chegar.
  useEffect(() => {
    if (!hasProject || !ir) return
    if (blocksHydration === 'pending') return
    if (!isBlocksStateEmpty(blocksState)) return
    if (ir.html.length === 0 && ir.css.length === 0 && ir.js.length === 0) return
    applyProjectState({ blocksState: buildWorkspaceStateFromIR(ir) })
  }, [hasProject, blocksState, ir, blocksHydration, applyProjectState])

  // REDE DE SEGURANÇA da aula só-Blocos (e recuperação de partição
  // descartada/ausente): sem IR e sem blocksState, mas COM código nos arquivos,
  // deriva os blocos do próprio código — igual à reconstrução da Ponte, só que
  // SEM sujar o projeto (hydrateProjectState), então nada é persistido por cima
  // da partição até o aluno editar de verdade. Só depois da hidratação real
  // RESOLVER ('empty'/'failed'; 'idle' = não há partição a esperar): uma
  // restauração tardia ainda vence — hydrateAfterLoad sobrepõe estado derivado
  // não-sujo. Import dinâmico: o Babel do parser não entra no chunk dos blocos.
  const derivedFromCodeRef = useRef<string | null>(null)
  useEffect(() => {
    if (!hasProject || ir) return
    if (!isBlocksStateEmpty(blocksState)) return
    if (blocksHydration !== 'empty' && blocksHydration !== 'failed' && blocksHydration !== 'idle') {
      return
    }
    const project = projectStoreApi.getState().project
    if (!project) return
    if (derivedFromCodeRef.current === project.id) return
    const files = project.files
    if (!files['index.html'].trim() && !files['style.css'].trim() && !files['script.js'].trim()) {
      return
    }
    derivedFromCodeRef.current = project.id
    let cancelled = false
    void import('#parsers')
      .then(({ parseProjectFiles }) => {
        if (cancelled) return
        // Re-checa com o estado FRESCO: a hidratação real pode ter chegado (ou o
        // projeto trocado) enquanto o chunk do parser carregava.
        const state = projectStoreApi.getState()
        const current = state.project
        if (!current || current.id !== project.id) return
        if (current.ir || !isBlocksStateEmpty(current.blocksState)) return
        if (state.blocksHydration === 'pending' || state.blocksHydration === 'restored') return
        const derived = parseProjectFiles(current.files)
        if (derived.html.length === 0 && derived.css.length === 0 && derived.js.length === 0) return
        state.hydrateProjectState({ ir: derived, blocksState: buildWorkspaceStateFromIR(derived) })
      })
      .catch((err) => {
        console.warn('[sz] não foi possível derivar os blocos do código:', err)
      })
    return () => {
      cancelled = true
    }
  }, [hasProject, blocksState, ir, blocksHydration, projectStoreApi])

  if (isNarrow) {
    return (
      <div className="flex h-full w-full min-h-0 flex-col">
        <ModeLimitationsNotice />
        <div className="min-h-0 flex-1">
          <NarrowPanels
            editorPanes={[{ id: 'blocks', label: t('tab.blocks'), content: <BlocklyPanel /> }]}
            preview={showPreview ? <PreviewIframe /> : undefined}
          />
        </div>
      </div>
    )
  }

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
