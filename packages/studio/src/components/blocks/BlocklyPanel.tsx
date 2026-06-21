import * as Blockly from 'blockly/core'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import 'blockly/blocks'
import { useShallow } from 'zustand/react/shallow'
import {
  buildCoreToolbox,
  buildIRFromWorkspace,
  ensureBlocklyInitialized,
  registerClassesFlyout,
  registerFunctionsFlyout,
  setSearchProfileForWorkspace,
  szGridColourFor,
  szThemeFor,
  withWorkspaceLoad,
} from '#blockly'
import { type InstalledExtension, isCategoryAllowed, type LearningProfile } from '#core'
import { generateProjectFilesWithMap } from '#generators'
import { deepEqualIR } from '#ir'
import { findExtension } from '#official-extensions'
import { useCrossHighlight } from '../../hooks/useCrossHighlight'
import { primeCanonicalSourceMap } from '../../state/canonicalSourceMap'
import { reregisterInstalledExtensions } from '../../state/extensionsAdapter'
import { useHighlightStore } from '../../state/highlightStore'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useSourcemapStore } from '../../state/sourcemapStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioTheme } from '../../studio/theme'
import { Spinner } from '../layout/LoadingViews'

ensureBlocklyInitialized()

const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []
const BLOCKLY_REGENERATION_DELAY_MS = 120
// Cabeçalho dos arquivos gerados dos blocos. DEVE casar com `BRIDGE_JS_HEADER`
// (modes/bridgeReverseParse) para o memo de source-map por `ir` reusar o mapa
// entre o regenerate e o efeito canônico do BridgeMode (chave inclui o header).
const REGEN_JS_HEADER = '// Gerado pelo Sistema Zero Studio'
function blocklyWorkspaceConfiguration(theme: 'dark' | 'light'): Blockly.BlocklyOptions {
  return {
    theme: szThemeFor(theme),
    renderer: 'zelos',
    grid: { spacing: 24, length: 3, colour: szGridColourFor(theme), snap: true },
    zoom: { controls: true, wheel: true, startScale: 0.9, minScale: 0.4, maxScale: 1.8 },
    move: { scrollbars: true, drag: true, wheel: true },
    trashcan: true,
    // Habilita "Recolher/Expandir blocos" no menu de contexto nativo.
    collapse: true,
  }
}

/**
 * Captura a posição de cada pilha top-level por **id**, para restaurar após um
 * recarregamento programático do MESMO estado (ex.: normalização do Blockly).
 * A preservação de colunas numa reconstrução da Ponte é feita pelo próprio
 * `blocksState` (layout embutido), não aqui — por isso não há fallback por
 * categoria (que empilharia várias pilhas do mesmo tipo numa âncora só).
 */
function captureStackPositions(workspace: Blockly.Workspace): Map<string, [number, number]> {
  const byId = new Map<string, [number, number]>()
  const tops = workspace.getTopBlocks(false) as Blockly.BlockSvg[]
  for (const top of tops) {
    if (typeof top.getRelativeToSurfaceXY !== 'function') continue
    const xy = top.getRelativeToSurfaceXY()
    byId.set(top.id, [xy.x, xy.y])
  }
  return byId
}

/** Reposiciona as pilhas cujos ids casam com as posições capturadas. */
function restoreStackPositions(
  workspace: Blockly.Workspace,
  positions: Map<string, [number, number]>,
): boolean {
  const tops = workspace.getTopBlocks(false) as Blockly.BlockSvg[]
  let moved = false
  for (const top of tops) {
    if (typeof top.getRelativeToSurfaceXY !== 'function') continue
    const target = positions.get(top.id)
    if (!target) continue
    const cur = top.getRelativeToSurfaceXY()
    top.moveBy(target[0] - cur.x, target[1] - cur.y)
    moved = true
  }
  return moved
}

/**
 * Diz se o bloco já está inteiramente visível na viewport atual. Usamos para
 * só centralizar (centerOnBlock) quando o bloco está fora da tela — assim a
 * sincronização cursor→bloco não fica sacudindo o canvas a cada movimento.
 * Em caso de dúvida (não conseguimos medir), retorna false para que o fallback
 * centralize.
 */
function isBlockInView(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg): boolean {
  try {
    const metricsManager = workspace.getMetricsManager?.()
    if (!metricsManager || typeof metricsManager.getViewMetrics !== 'function') return false
    const view = metricsManager.getViewMetrics(true) // coordenadas do workspace
    const xy = block.getRelativeToSurfaceXY()
    const size = block.getHeightWidth()
    return (
      xy.x >= view.left &&
      xy.y >= view.top &&
      xy.x + size.width <= view.left + view.width &&
      xy.y + size.height <= view.top + view.height
    )
  } catch {
    return false
  }
}

function resizeBlocklyWorkspace(workspace: Blockly.WorkspaceSvg): void {
  try {
    Blockly.svgResize(workspace)
  } catch {
    // Workspace pode ter sido descartado entre o agendamento e o resize.
  }
}

function scheduleBlocklyResize(workspace: Blockly.WorkspaceSvg): void {
  const resize = () => resizeBlocklyWorkspace(workspace)
  queueMicrotask(resize)
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      resize()
      requestAnimationFrame(resize)
    })
    return
  }
  setTimeout(resize, 0)
}

export interface BlocklyPanelProps {
  className?: string
}

export function BlocklyPanel({ className }: BlocklyPanelProps): JSX.Element {
  const { blocksState, installedExtensions, projectMode } = useProjectStore(
    useShallow((s) => ({
      blocksState: s.project?.blocksState ?? null,
      installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
      projectMode: s.project?.mode ?? 'blocks',
    })),
  )
  const applyProjectState = useProjectStore((s) => s.applyProjectState)
  const projectStoreApi = useProjectStoreApi()
  const studioTheme = useStudioTheme()
  // Ref para a injeção (efeito de mount único) usar o tema vigente sem re-injetar.
  const studioThemeRef = useRef(studioTheme)
  studioThemeRef.current = studioTheme
  const setSourceMap = useSourcemapStore((s) => s.setMap)
  const selectBlock = useHighlightStore((s) => s.selectBlock)
  const editorCursorLine = useHighlightStore((s) => s.cursorLine)
  const editorCursorColumn = useHighlightStore((s) => s.cursorColumn)
  const editorCursorFile = useHighlightStore((s) => s.cursorFile)
  const highlightSource = useHighlightStore((s) => s.source)
  const cross = useCrossHighlight()

  // Cobre com um spinner o intervalo entre montar/agendar e o
  // `workspaces.load` (que renderiza TODOS os blocos de forma síncrona — caro em
  // projetos grandes). Como adiamos o load um frame, o painel e este overlay
  // pintam ANTES do trabalho pesado, então o aluno vê "carregando" em vez de uma
  // tela congelada.
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false)

  const blocklyRef = useRef<HTMLDivElement>(null)
  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null)
  const lastSerializedRef = useRef<string>('')
  const isApplyingStateRef = useRef(false)
  const isSelectingFromEditorRef = useRef(false)
  const shouldRegenerateAfterDragRef = useRef(false)
  const regenerationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRegenerationWorkspaceRef = useRef<Blockly.Workspace | null>(null)
  const appliedToolboxRef = useRef<ReturnType<typeof buildCoreToolbox> | null>(null)
  const initialToolboxRef = useRef<ReturnType<typeof buildCoreToolbox> | null>(null)
  // Posições das pilhas a restaurar após um recarregamento programático, para
  // preservar onde o aluno deixou os blocos quando a Ponte reconstrói o estado.
  const preservedPositionsRef = useRef<Map<string, [number, number]> | null>(null)

  const installedIds = useMemo(() => installedExtensions.map((e) => e.id), [installedExtensions])

  // Registra os blocos das extensões instaladas ANTES de qualquer
  // `workspaces.load(blocksState)`. Síncrono (este componente já está no chunk do
  // Blockly, com import estático) e idempotente. O efeito roda na montagem, e o
  // load é adiado um frame (requestAnimationFrame abaixo) — então as definições
  // sempre existem quando os blocos salvos são desserializados. Antes, a única
  // inscrição vinha do efeito ASSÍNCRONO do Shell (dynamic import), que perdia a
  // corrida no 1º carregamento e fazia o load lançar "Invalid block definition
  // for type: sz_g2d_*" até o aluno dar reload.
  useEffect(() => {
    reregisterInstalledExtensions({ installedExtensions })
  }, [installedExtensions])

  // Perfil de aprendizado: o professor fixa o nível (config); o aluno pode
  // revelar o avançado (settings), se o professor permitir.
  const learning = useStudioConfig().learning
  const revealAdvanced = useSettingsStore((s) => s.revealAdvanced)
  const profile = useMemo<LearningProfile>(
    () => ({
      level: learning.level,
      revealed: learning.allowLevelReveal && revealAdvanced,
      allowBlocks: learning.allowBlocks,
      allowCategories: learning.allowCategories,
    }),
    [learning, revealAdvanced],
  )

  const toolbox = useMemo(() => {
    const extras = installedIds
      .map((id) => findExtension(id))
      .filter((e): e is NonNullable<ReturnType<typeof findExtension>> => Boolean(e))
      // Gateia a categoria da extensão pelo nível (ex.: game-2d = 'intermediario',
      // game-3d = 'avancado'). Default 'intermediario': extensões NUNCA aparecem
      // na paleta do iniciante, mesmo que esqueçam de declarar minLevel.
      .filter((e) =>
        isCategoryAllowed(e.blockly.toolboxCategory.name, e.minLevel ?? 'intermediario', profile),
      )
      .map((e) => e.blockly.toolboxCategory)
    return buildCoreToolbox(extras, profile)
  }, [installedIds, profile])
  initialToolboxRef.current ??= toolbox

  // Regenera arquivos/IR a partir dos blocos. Só deve ser chamada para edições
  // REAIS do aluno nos blocos (ver o listener abaixo) — nunca durante uma carga
  // programática, senão sobrescreveria o código escrito à mão.
  const regenerateFromBlocks = useCallback(
    (workspace: Blockly.Workspace, options: { force?: boolean } = {}) => {
      const state = Blockly.serialization.workspaces.save(workspace)
      const serialized = JSON.stringify(state)
      if (!options.force && serialized === lastSerializedRef.current) return
      lastSerializedRef.current = serialized

      const built = buildIRFromWorkspace(workspace)
      // Lê o projeto mais recente do store (evita closure obsoleta) e preserva a
      // casca do documento (head/doctype) que os blocos não representam.
      const current = projectStoreApi.getState().project
      const ir = current?.ir?.htmlShell ? { ...built, htmlShell: current.ir.htmlShell } : built
      const projectNameForGen = current?.name ?? 'Projeto'
      const { files, sourceMap } = generateProjectFilesWithMap({
        ir,
        projectName: projectNameForGen,
        jsHeader: REGEN_JS_HEADER,
      })
      // Semeia o memo por `ir`: na Ponte, o efeito canônico do BridgeMode reusa
      // este mapa em vez de regerar o projeto de novo com o MESMO `ir`.
      primeCanonicalSourceMap(ir, projectNameForGen, REGEN_JS_HEADER, sourceMap)
      // Modo Ponte: ao CARREGAR os blocos (force), NUNCA reescrever os arquivos do
      // aluno com o canônico — "código é sagrado". Só sincronizamos o IR (para os
      // ids/__declIds e o sourcemap de HTML/JS ficarem completos) e o blocksState
      // (posições restauradas). A formatação do CSS do aluno é preservada e o
      // realce bloco↔código funciona via sourcemap posicional (ver BridgeMode).
      // Edições REAIS de bloco (sem `force`) continuam gerando os arquivos abaixo.
      if (options.force && current?.mode === 'bridge') {
        // NÃO definimos o sourcemap aqui: na Ponte, o BridgeMode é a ÚNICA
        // autoridade do sourcemap — ele deriva o cabeçalho do JS do TEXTO EXIBIDO
        // (código do aluno pode não ter o cabeçalho canônico) e usa o CSS
        // posicional. Definir o canônico (cabeçalho fixo) aqui sobrescrevia o do
        // BridgeMode e deslocava as linhas do realce/seleção bloco↔código.
        applyProjectState({ ir, blocksState: state })
        return
      }
      if (
        options.force &&
        current &&
        JSON.stringify(current.blocksState) === serialized &&
        // Comparação ESTRUTURAL do IR (uma só varredura) no lugar de
        // `JSON.stringify(a) === JSON.stringify(b)` (duas serializações O(N) do
        // projeto inteiro) — caminho de carga, mas sem desperdiçar duas strings.
        deepEqualIR(current.ir, ir) &&
        current.files['index.html'] === files['index.html'] &&
        current.files['style.css'] === files['style.css'] &&
        current.files['script.js'] === files['script.js']
      ) {
        setSourceMap(sourceMap)
        return
      }
      applyProjectState({ ir, blocksState: state, files })
      setSourceMap(sourceMap)
    },
    [applyProjectState, setSourceMap, projectStoreApi],
  )

  const flushScheduledRegeneration = useCallback(() => {
    if (regenerationTimerRef.current) {
      clearTimeout(regenerationTimerRef.current)
      regenerationTimerRef.current = null
    }
    const pending = pendingRegenerationWorkspaceRef.current
    pendingRegenerationWorkspaceRef.current = null
    if (pending) regenerateFromBlocks(pending)
  }, [regenerateFromBlocks])

  const scheduleRegenerateFromBlocks = useCallback(
    (targetWorkspace: Blockly.Workspace) => {
      pendingRegenerationWorkspaceRef.current = targetWorkspace
      if (regenerationTimerRef.current) return
      regenerationTimerRef.current = setTimeout(() => {
        regenerationTimerRef.current = null
        const pending = pendingRegenerationWorkspaceRef.current
        pendingRegenerationWorkspaceRef.current = null
        if (pending) regenerateFromBlocks(pending)
      }, BLOCKLY_REGENERATION_DELAY_MS)
    },
    [regenerateFromBlocks],
  )

  // O primeiro resize precisa acontecer depois que o SVG foi injetado e o
  // painel já recebeu tamanho real. Sem isso, o Blockly pode montar com
  // viewport 0 e só pintar depois de uma troca de modo ou resize global.
  useEffect(() => {
    if (!workspace) return
    scheduleBlocklyResize(workspace as Blockly.WorkspaceSvg)
  }, [workspace])

  // Categorias dinâmicas "Funções" e "Classes": registra os flyouts assim que o
  // workspace existe.
  useEffect(() => {
    if (!workspace) return
    registerFunctionsFlyout(workspace as Blockly.WorkspaceSvg)
    registerClassesFlyout(workspace as Blockly.WorkspaceSvg)
  }, [workspace])

  // Regeneração código a partir dos blocos. Filtra eventos para reagir apenas a
  // edições reais (criar/apagar/mover/alterar bloco). Eventos disparados durante
  // uma carga programática são ignorados via `isApplyingStateRef`; ao terminar a
  // carga (`FINISHED_LOADING`), zera o guard e ressincroniza o snapshot com o
  // estado REAL salvo — assim normalizações do Blockly não regeneram nem
  // sobrescrevem o código (bug de perda de código ao entrar na Ponte).
  // biome-ignore lint/correctness/useExhaustiveDependencies: o listener captura estado via refs de propósito (não re-subscrever a cada edição)
  useEffect(() => {
    if (!workspace) return
    const listener = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.FINISHED_LOADING) {
        isApplyingStateRef.current = false
        // Se havia posições a preservar (recarregamento durante edição), as
        // pilhas voltam para onde o aluno as deixou. Carregar um blocksState
        // salvo nunca auto-organiza: x/y persistidos são a fonte da verdade.
        const preserved = preservedPositionsRef.current
        preservedPositionsRef.current = null
        if (preserved && preserved.size > 0) {
          Blockly.Events.disable()
          try {
            restoreStackPositions(workspace, preserved)
          } finally {
            Blockly.Events.enable()
          }
        }
        lastSerializedRef.current = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
        // Regenera o IR/sourcemap a partir dos blocos recém-carregados também
        // em modo Ponte. Sem isso, um projeto salvo antes da introdução de
        // `ctorId`/`__declIds` no IR continuaria com o sourcemap incompleto
        // (construtor/método/declarações CSS sem entrada) até a primeira
        // edição em blocos. O guard interno de `regenerateFromBlocks` evita
        // sobrescrever files quando a estrutura visual não mudou.
        regenerateFromBlocks(workspace, { force: true })
        scheduleBlocklyResize(workspace as Blockly.WorkspaceSvg)
        return
      }
      if (event.type === Blockly.Events.BLOCK_DRAG) {
        const dragEvent = event as Blockly.Events.BlockDrag
        if (dragEvent.isStart) {
          shouldRegenerateAfterDragRef.current = false
        } else if (shouldRegenerateAfterDragRef.current) {
          shouldRegenerateAfterDragRef.current = false
          scheduleRegenerateFromBlocks(workspace)
        }
        return
      }
      if (isApplyingStateRef.current || event.isUiEvent) return
      if (
        event.type !== Blockly.Events.BLOCK_CREATE &&
        event.type !== Blockly.Events.BLOCK_DELETE &&
        event.type !== Blockly.Events.BLOCK_CHANGE &&
        event.type !== Blockly.Events.BLOCK_MOVE
      ) {
        return
      }
      const svgWorkspace = workspace as Blockly.WorkspaceSvg
      if (typeof svgWorkspace.isDragging === 'function' && svgWorkspace.isDragging()) {
        shouldRegenerateAfterDragRef.current = true
        return
      }
      scheduleRegenerateFromBlocks(workspace)
    }
    workspace.addChangeListener(listener)
    return () => {
      workspace.removeChangeListener(listener)
      flushScheduledRegeneration()
    }
  }, [
    workspace,
    projectMode,
    regenerateFromBlocks,
    scheduleRegenerateFromBlocks,
    flushScheduledRegeneration,
  ])

  // Publica seleção de bloco no store de highlight — o painel Monaco escuta
  // para rolar até a linha mapeada.
  useEffect(() => {
    if (!workspace) return
    const listener = (event: Blockly.Events.Abstract) => {
      if (event.type !== Blockly.Events.SELECTED) return
      if (isSelectingFromEditorRef.current) return
      const selectedId = (event as Blockly.Events.Selected).newElementId ?? null
      selectBlock(selectedId)
    }
    workspace.addChangeListener(listener)
    return () => workspace.removeChangeListener(listener)
  }, [workspace, selectBlock])

  // Após eventos de toolbox/clique, o flyout pode fechar e deixar scrollbar
  // órfã visível. Forçamos um reflow do SVG para o Blockly recomputar o
  // viewport e esconder scrollbars que não correspondem mais a conteúdo.
  useEffect(() => {
    if (!workspace) return
    const svgWorkspace = workspace as Blockly.WorkspaceSvg
    const reflow = () => {
      resizeBlocklyWorkspace(svgWorkspace)
    }
    const listener = (event: Blockly.Events.Abstract) => {
      if (
        event.type === Blockly.Events.TOOLBOX_ITEM_SELECT ||
        event.type === Blockly.Events.CLICK
      ) {
        queueMicrotask(reflow)
      }
    }
    workspace.addChangeListener(listener)
    return () => workspace.removeChangeListener(listener)
  }, [workspace])

  // O Blockly não escuta mudanças de tamanho do container por conta própria —
  // se o painel é redimensionado (ex.: arrastar o handle do PanelGroup), o SVG
  // fica com o tamanho antigo até algum evento global de resize. ResizeObserver
  // garante que o workspace sempre acompanhe o container.
  useEffect(() => {
    if (!workspace || !blocklyRef.current) return
    const svgWorkspace = workspace as Blockly.WorkspaceSvg
    const observer = new ResizeObserver(() => {
      resizeBlocklyWorkspace(svgWorkspace)
    })
    observer.observe(blocklyRef.current)
    return () => observer.disconnect()
  }, [workspace])

  // O react-blockly reexecutava `workspace.updateToolbox(toolbox)` logo após a
  // injeção inicial, mesmo a toolbox já tendo sido passada ao `Blockly.inject`.
  // Essa segunda montagem recriava os nós da toolbox e fechava o flyout aberto
  // pelo primeiro clique do aluno. Controlamos a injeção aqui para atualizar a
  // toolbox somente quando a lista de categorias realmente mudar.
  useEffect(() => {
    if (!workspace) return
    if (appliedToolboxRef.current === toolbox) return
    workspace.updateToolbox(toolbox)
    appliedToolboxRef.current = toolbox
    scheduleBlocklyResize(workspace)
  }, [workspace, toolbox])

  // Publica o perfil deste workspace para a busca de blocos filtrar a oferta por
  // nível (a categoria de busca é um registro GLOBAL e não conhece o perfil por
  // instância; sem isto, a busca vazaria Funções/Classes acima do nível fixado).
  useEffect(() => {
    if (workspace) setSearchProfileForWorkspace(workspace, profile)
  }, [workspace, profile])

  // Reage a mudança de cursor no Monaco: encontra o bloco que gerou aquela
  // linha e o seleciona/centraliza no workspace.
  useEffect(() => {
    if (!workspace) return
    if (highlightSource !== 'editor') return
    if (!editorCursorFile || editorCursorLine == null) return
    const id = cross.lookupLine(editorCursorFile, editorCursorLine, editorCursorColumn ?? undefined)
    if (!id) return
    const block = workspace.getBlockById(id)
    if (!block) return
    isSelectingFromEditorRef.current = true
    try {
      block.select()
      // centerOnBlock só existe em WorkspaceSvg. Só recentraliza quando o bloco
      // está fora da viewport, para não sacudir o canvas a cada sincronização.
      const svgWorkspace = workspace as Blockly.WorkspaceSvg
      if (
        typeof svgWorkspace.centerOnBlock === 'function' &&
        !isBlockInView(svgWorkspace, block as Blockly.BlockSvg)
      ) {
        svgWorkspace.centerOnBlock(id, false)
      }
    } finally {
      queueMicrotask(() => {
        isSelectingFromEditorRef.current = false
      })
    }
  }, [workspace, editorCursorFile, editorCursorLine, editorCursorColumn, highlightSource, cross])

  // Restaura blocksState quando trocar de projeto ou quando a Ponte gerar
  // blocos a partir do código.
  // biome-ignore lint/correctness/useExhaustiveDependencies: restaura só quando workspace/blocksState mudam; demais leituras via ref são intencionais
  useEffect(() => {
    if (!workspace) return
    if (!blocksState) {
      isApplyingStateRef.current = true
      // Cerca de carga: `clear()` emite um BLOCK_DELETE por bloco; sem a cerca,
      // cada bloco-mutador varreria o workspace a cada remoção (O(N·M)).
      withWorkspaceLoad(() => workspace.clear())
      lastSerializedRef.current = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
      scheduleBlocklyResize(workspace as Blockly.WorkspaceSvg)
      queueMicrotask(() => {
        isApplyingStateRef.current = false
      })
      return
    }
    const serialized = JSON.stringify(blocksState)
    if (serialized === lastSerializedRef.current) return
    setIsLoadingWorkspace(true)

    // Adia o `workspaces.load` (render síncrono de TODOS os blocos) um frame,
    // para o overlay de "carregando" pintar primeiro e a aba não congelar antes
    // do feedback.
    //
    // ⚠️ Os efeitos colaterais (snapshot `lastSerializedRef`, guard
    // `isApplyingStateRef`, captura de posições) ficam DENTRO do rAF, NÃO antes.
    // Antes, `lastSerializedRef = serialized` era setado ANTES do load; se o efeito
    // re-rodasse e CANCELASSE este rAF (cleanup) antes do frame, o workspace nunca
    // era carregado, mas o snapshot já "mentia" que aquele estado estava aplicado —
    // então a re-execução caía no early-return (serialized === snapshot) e os blocos
    // NUNCA carregavam, com o spinner preso para sempre ("loading na área de blocos,
    // mas não carrega"). Mantendo tudo no rAF, um rAF cancelado é um no-op total e a
    // próxima execução recarrega corretamente; o cleanup ainda solta o spinner.
    let cancelled = false
    const handle = requestAnimationFrame(() => {
      if (cancelled) return
      // Guarda onde estão as pilhas antes de recarregar; restauradas no FINISHED_LOADING.
      preservedPositionsRef.current = captureStackPositions(workspace)
      isApplyingStateRef.current = true
      lastSerializedRef.current = serialized
      try {
        // Cerca de carga: o `load` emite N BLOCK_CREATE antes do FINISHED_LOADING
        // final. A cerca faz os blocos-mutador ignorarem os eventos
        // intermediários (deixando passar só o FINISHED_LOADING, onde resolvem a
        // assinatura uma única vez) — evita o O(N·M) ao abrir projetos grandes.
        withWorkspaceLoad(() =>
          Blockly.serialization.workspaces.load(blocksState as Record<string, unknown>, workspace),
        )
        scheduleBlocklyResize(workspace as Blockly.WorkspaceSvg)
        // `FINISHED_LOADING` é quem normalmente zera o guard e ressincroniza o
        // snapshot com o estado REAL salvo. O microtask é só um fallback (caso o
        // evento não dispare): também ressincroniza para que o dedup do listener
        // continue confiável e nenhuma normalização regenere/sobrescreva o código.
        queueMicrotask(() => {
          if (!isApplyingStateRef.current) return
          // Fallback caso FINISHED_LOADING não dispare: restaura posições aqui.
          const preserved = preservedPositionsRef.current
          preservedPositionsRef.current = null
          if (preserved && preserved.size > 0) {
            Blockly.Events.disable()
            try {
              restoreStackPositions(workspace, preserved)
            } finally {
              Blockly.Events.enable()
            }
          }
          lastSerializedRef.current = JSON.stringify(
            Blockly.serialization.workspaces.save(workspace),
          )
          // Idem ao listener de FINISHED_LOADING: regenerar também em modo
          // Ponte garante que o IR no store contenha os ids do construtor,
          // métodos e declarações CSS — sem isso o sourcemap ficaria incompleto
          // até a primeira edição.
          regenerateFromBlocks(workspace, { force: true })
          isApplyingStateRef.current = false
          scheduleBlocklyResize(workspace as Blockly.WorkspaceSvg)
        })
      } catch (e) {
        isApplyingStateRef.current = false
        console.warn('Não foi possível restaurar blocksState:', e)
      } finally {
        setIsLoadingWorkspace(false)
      }
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(handle)
      // rAF cancelado antes de rodar: solta o spinner (o `finally` dentro do rAF
      // nunca correrá). Sem isto o overlay "carregando" ficava preso.
      setIsLoadingWorkspace(false)
    }
  }, [workspace, blocksState, projectMode, regenerateFromBlocks])

  useEffect(() => {
    const container = blocklyRef.current
    if (!container) return
    const initialToolbox = initialToolboxRef.current
    if (!initialToolbox) return

    const injected = Blockly.inject(container, {
      ...blocklyWorkspaceConfiguration(studioThemeRef.current),
      toolbox: initialToolbox,
    })
    appliedToolboxRef.current = initialToolbox
    // Acessor POR INSTÂNCIA dos assets do projeto, lido pelo FieldAssetPicker ao
    // abrir o seletor de imagem (multi-instância: nada de global). `projectStoreApi`
    // é estável (store desta instância), então o efeito segue rodando uma vez.
    ;(injected as unknown as { __szAssets?: () => unknown }).__szAssets = () =>
      projectStoreApi.getState().project?.assets ?? []
    setWorkspace(injected)

    return () => {
      if (pendingRegenerationWorkspaceRef.current === injected) {
        pendingRegenerationWorkspaceRef.current = null
      }
      injected.dispose()
      appliedToolboxRef.current = null
    }
  }, [projectStoreApi])

  // Troca de tema ao vivo (toggle do Topbar/host): o Theme cobre workspace,
  // toolbox e flyout; só a cor da grade fica da injeção inicial (detalhe sutil).
  useEffect(() => {
    if (!workspace) return
    workspace.setTheme(szThemeFor(studioTheme))
  }, [workspace, studioTheme])

  return (
    <div className={['relative h-full w-full', className].filter(Boolean).join(' ')}>
      <div ref={blocklyRef} className="h-full w-full" />
      {isLoadingWorkspace && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-sz-bg/60">
          <Spinner />
        </div>
      )}
    </div>
  )
}
