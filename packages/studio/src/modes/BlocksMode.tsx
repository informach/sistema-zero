import type { JSX } from 'react'
import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { buildWorkspaceStateFromIR, isBlocksStateEmpty } from '#blockly'
import { hasBehaviorStatements, normalizeSZIR } from '#ir'
import { BlocksWorkspaceEditor } from '../components/blocks/BlocksWorkspaceEditor'
import { ModeLimitationsNotice } from '../components/layout/ModeLimitationsNotice'
import { NarrowPanels } from '../components/layout/NarrowPanels'
import { PreviewIframe } from '../components/preview/PreviewIframe'
import { getCanonicalSourceMap } from '../state/canonicalSourceMap'
import { useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { useSourcemapStore } from '../state/sourcemapStore'
import { useUIStore } from '../state/uiStore'
import { useStudioConfig } from '../studio/config'
import { useT } from '../studio/i18n'
import { useStudioLayout } from '../studio/layoutContext'
import { BRIDGE_JS_HEADER } from './bridgeReverseParse'

export function BlocksMode(): JSX.Element {
  const t = useT()
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
  // Blocos DEFASADOS: o aluno editou código na Ponte e trocou p/ cá antes de o
  // reverse-parse assentar (o worker morre com a Ponte). Ver o recovery abaixo.
  const filesAheadOfBlocks = useProjectStore(
    (s) => s.bridgeCodeEditEpoch > s.bridgeBlocksSyncedEpoch,
  )
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

  // RECOVERY da corrida da Ponte: o aluno digitou código e trocou p/ Blocos
  // dentro da janela do reverse-parse (~0,9s de debounce + worker, que morre
  // com a Ponte). Os blocos no store estão DEFASADOS — a fonte mais nova é o
  // CÓDIGO, então derivamos os blocos dele (parse no main thread, import
  // dinâmico como a rede de segurança abaixo). Enquanto a época não fecha, o
  // BlocklyPanel PULA o force do FINISHED_LOADING (não regenera arquivos de
  // blocos velhos) e os dois efeitos de derivação abaixo ficam dormentes.
  // Parse falhou (código quebrado no meio da digitação)? Mantém blocos antigos
  // e a trava: os arquivos ficam intactos; uma edição REAL de blocos retoma a
  // autoridade deles (mesma precedência de sempre).
  useEffect(() => {
    if (!hasProject || !filesAheadOfBlocks) return
    const project = projectStoreApi.getState().project
    if (!project) return
    let cancelled = false
    void import('#parsers')
      .then(({ parseProjectFiles }) => {
        if (cancelled) return
        const state = projectStoreApi.getState()
        const current = state.project
        if (!current || current.id !== project.id) return
        if (state.bridgeCodeEditEpoch <= state.bridgeBlocksSyncedEpoch) return
        // Época capturada ANTES do parse: no modo Blocos não há editor de
        // código, então nenhuma edição avança a época durante o parse.
        const epoch = state.bridgeCodeEditEpoch
        const derived = parseProjectFiles(current.files)
        state.applyProjectState({
          ir: derived,
          // HTML/CSS vazios não ressuscitam num projeto só-JS (ver BridgeMode).
          blocksState: buildWorkspaceStateFromIR(derived, { omitEmptyAuxFrames: true }),
        })
        state.markBridgeBlocksSynced(epoch)
      })
      .catch((err) => {
        console.warn('[sz] não foi possível derivar os blocos do código digitado:', err)
      })
    return () => {
      cancelled = true
    }
  }, [hasProject, filesAheadOfBlocks, projectStoreApi])

  // Projetos antigos ou vindos do modo Código podem ter IR salvo, mas ainda não
  // ter a serialização do Blockly — ou ter um `blocksState` VAZIO (sobra de um
  // ciclo anterior). Em ambos os casos, deriva os blocos do IR para abrir direto
  // com blocos visíveis. A Ponte faz a mesma derivação por simetria.
  // ⚠️ NUNCA enquanto a partição real hidrata ('pending'): derivar aqui marcaria
  // o projeto sujo e descartaria o layout salvo prestes a chegar. Nem com blocos
  // DEFASADOS: o IR também está velho — o recovery acima deriva do código.
  useEffect(() => {
    if (!hasProject || !ir) return
    if (blocksHydration === 'pending') return
    if (filesAheadOfBlocks) return
    if (!isBlocksStateEmpty(blocksState)) return
    const behavior = normalizeSZIR(ir).behavior
    if (ir.html.length === 0 && ir.css.length === 0 && !hasBehaviorStatements(behavior)) return
    applyProjectState({ blocksState: buildWorkspaceStateFromIR(ir, { omitEmptyAuxFrames: true }) })
  }, [hasProject, blocksState, ir, blocksHydration, filesAheadOfBlocks, applyProjectState])

  // REDE DE SEGURANÇA da aula só-Blocos (e recuperação de partição
  // descartada/ausente): sem IR e sem blocksState, mas COM código nos arquivos,
  // deriva os blocos do próprio código — igual à reconstrução da Ponte, só que
  // SEM sujar o projeto (hydrateProjectState), então nada é persistido por cima
  // da partição até o aluno editar de verdade. Só depois da hidratação real
  // RESOLVER ('empty'/'failed'; 'idle' = não há partição a esperar): uma
  // restauração tardia ainda vence — hydrateAfterLoad sobrepõe estado derivado
  // não-sujo. Import dinâmico: o Babel do parser não entra no chunk dos blocos.
  useEffect(() => {
    if (!hasProject || ir) return
    // Blocos defasados = o recovery acima já deriva do código (e MARCA a época);
    // rodar as duas derivações em paralelo desperdiçaria um parse.
    if (filesAheadOfBlocks) return
    if (!isBlocksStateEmpty(blocksState)) return
    if (blocksHydration !== 'empty' && blocksHydration !== 'failed' && blocksHydration !== 'idle') {
      return
    }
    const project = projectStoreApi.getState().project
    if (!project) return
    const files = project.files
    if (!files['index.html'].trim() && !files['style.css'].trim() && !files['script.js'].trim()) {
      return
    }
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
        const behavior = derived.behavior
        if (
          derived.html.length === 0 &&
          derived.css.length === 0 &&
          !hasBehaviorStatements(behavior)
        )
          return
        state.hydrateProjectState({
          ir: derived,
          blocksState: buildWorkspaceStateFromIR(derived, { omitEmptyAuxFrames: true }),
        })
      })
      .catch((err) => {
        console.warn('[sz] não foi possível derivar os blocos do código:', err)
      })
    return () => {
      cancelled = true
    }
  }, [hasProject, blocksState, ir, blocksHydration, filesAheadOfBlocks, projectStoreApi])

  if (isNarrow) {
    return (
      <div className="flex h-full w-full min-h-0 flex-col">
        <ModeLimitationsNotice />
        <div className="min-h-0 flex-1">
          <NarrowPanels
            editorPanes={[
              { id: 'blocks', label: t('tab.blocks'), content: <BlocksWorkspaceEditor /> },
            ]}
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
        <Panel id="blocks-workspace" order={1} defaultSize={showPreview ? 65 : 100} minSize={30}>
          <BlocksWorkspaceEditor />
        </Panel>
        {showPreview && (
          <>
            <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
            <Panel id="blocks-preview" order={2} defaultSize={35} minSize={20}>
              <PreviewIframe />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  )
}
