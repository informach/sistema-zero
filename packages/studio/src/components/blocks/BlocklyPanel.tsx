import * as Blockly from 'blockly/core'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import 'blockly/blocks'
import { useShallow } from 'zustand/react/shallow'
import {
  buildCoreToolbox,
  buildIRFromWorkspace,
  ensureBlocklyInitialized,
  normalizeBlocksStateToFrames,
  type PasteTargetHandlers,
  registerClassesFlyout,
  registerFunctionsFlyout,
  registerPasteTarget,
  setSearchProfileForWorkspace,
  szGridColourFor,
  szThemeFor,
  unregisterPasteTarget,
  withWorkspaceLoad,
} from '#blockly'
import { type InstalledExtension, isCategoryAllowed, type LearningProfile } from '#core'
import { extensionMinLevel } from '#extensions'
import { generateProjectFilesWithMap } from '#generators'
import { deepEqualIR } from '#ir'
import { findExtension } from '#official-extensions'
import {
  attachAnimationNameWatcher,
  refreshAnimationNames,
} from '../../blockly/fields/FieldAnimationPicker'
import {
  attachSpriteThumbWatcher,
  refreshSpriteThumbs,
} from '../../blockly/fields/FieldSpritePicker'
import { useCrossHighlight } from '../../hooks/useCrossHighlight'
import { primeCanonicalSourceMap } from '../../state/canonicalSourceMap'
import { installExtension, reregisterInstalledExtensions } from '../../state/extensionsAdapter'
import { useHighlightStore } from '../../state/highlightStore'
import { isBlockTypeKnown, useProjectStore, useProjectStoreApi } from '../../state/projectStore'
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
    // `sounds:false` DESLIGA o preload automático do Blockly, que — sem `media`
    // configurado — baixaria click/disconnect/delete .mp3 do servidor demo
    // (blockly-demo.appspot.com) → bloqueado pela CSP do host, sujando o console.
    // Os sons VOLTAM servidos pelo próprio app (mesma origem) via `preloadBlockSounds`
    // após a injeção (ver abaixo); `hasSounds` só gateia o preload, `play()` sempre toca.
    sounds: false,
  }
}

// Caminho (MESMA ORIGEM) onde cada app que embarca o Estúdio serve os 3 sons do
// Blockly (copiados de `blockly/media` → `public/studio-sounds/`). Mesma origem passa
// na CSP `media-src 'self'` de todos os apps — diferente de deixar o Blockly baixá-los
// do servidor demo externo (bloqueado). App que não sirva os arquivos fica só sem som.
const STUDIO_SOUNDS_PATH = '/studio-sounds/'

/**
 * Recarrega os sons de ENCAIXAR (`click`)/DESCONECTAR (`disconnect`)/DESCARTAR
 * (`delete`) bloco a partir dos arquivos servidos pelo HOST, já que a config tem
 * `sounds:false` (que impede o preload do servidor demo). Espelha o próprio preload do
 * Blockly (`load(['<media>click.mp3'], 'click')` etc.), só trocando a origem. Defensivo:
 * sem audio manager ou com 404 (app sem os arquivos) → fica em silêncio, nunca quebra.
 */
function preloadBlockSounds(workspace: Blockly.WorkspaceSvg): void {
  try {
    const audio = workspace.getAudioManager?.() as unknown as
      | { load(filenames: string[], name: string): void }
      | undefined
    if (!audio) return
    audio.load([`${STUDIO_SOUNDS_PATH}click.mp3`], 'click')
    audio.load([`${STUDIO_SOUNDS_PATH}disconnect.mp3`], 'disconnect')
    audio.load([`${STUDIO_SOUNDS_PATH}delete.mp3`], 'delete')
  } catch {
    // Sem som se algo faltar — nunca derruba a injeção.
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

/**
 * Re-renderiza TODOS os blocos do workspace. Após uma carga programática, blocos
 * com filhos aninhados (tomadas de valor / corpos) às vezes desenham COLAPSADOS —
 * o valor/corpo encaixado só aparece após um re-layout, e o aluno precisava usar
 * "Organizar blocos" (que faz exatamente este `ws.render()`) toda vez. Chamamos
 * uma vez no `FINISHED_LOADING`: um re-render do workspace inteiro conserta todos
 * de uma vez (mais geral que remendar bloco a bloco). Agendado também em rAF para
 * cobrir o caso de a 1ª medição (fonte/layout) ainda não estar pronta no load.
 */
function rerenderBlocklyWorkspace(workspace: Blockly.WorkspaceSvg): void {
  try {
    workspace.render?.()
  } catch {
    // Workspace pode ter sido descartado entre o agendamento e o render.
  }
}

function scheduleBlocklyRerender(workspace: Blockly.WorkspaceSvg): void {
  const render = () => rerenderBlocklyWorkspace(workspace)
  render()
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(render)
    return
  }
  setTimeout(render, 0)
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

/**
 * Algum bloco top-level INTERSECTA a viewport atual? (Diferente do
 * `isBlockInView`, que exige o bloco INTEIRO visível — um frame mais alto que a
 * tela nunca passaria e o recentro dispararia em todo load.) Erro de medição →
 * false: recentrar é inofensivo; ficar com o canvas "vazio" não é.
 */
function isAnyTopBlockInViewport(workspace: Blockly.WorkspaceSvg): boolean {
  try {
    const metricsManager = workspace.getMetricsManager?.()
    if (!metricsManager || typeof metricsManager.getViewMetrics !== 'function') return false
    const view = metricsManager.getViewMetrics(true)
    const tops = workspace.getTopBlocks(false) as Blockly.BlockSvg[]
    for (const top of tops) {
      if (typeof top.getRelativeToSurfaceXY !== 'function') continue
      const xy = top.getRelativeToSurfaceXY()
      const size = top.getHeightWidth()
      if (
        xy.x < view.left + view.width &&
        xy.x + size.width > view.left &&
        xy.y < view.top + view.height &&
        xy.y + size.height > view.top
      ) {
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Traz o conteúdo para a viewport quando NENHUM bloco está visível após um
 * load. É a raiz do "blocos não renderizam ao reabrir": o x/y salvo é a fonte
 * da verdade do layout, mas um arranjo salvo longe da origem renderizava FORA
 * da tela — canvas aparentemente vazio até a Ponte reconstruir perto da origem.
 * Não é guiado por listener (só pós-load), então não briga com o scroll do
 * aluno nem entra em loop.
 */
function scrollWorkspaceIntoViewIfHidden(workspace: Blockly.WorkspaceSvg): void {
  try {
    if (workspace.getTopBlocks(false).length === 0) return
    if (isAnyTopBlockInViewport(workspace)) return
    workspace.scrollCenter()
  } catch {
    // Workspace descartado entre o agendamento e o scroll.
  }
}

/**
 * Repaint pós-load ROBUSTO: resize + re-render + recentro-se-invisível, agora e
 * de novo num double-rAF (depois do layout/fonte assentarem). Substitui o par
 * resize/rerender que era insuficiente quando o container já estava estável
 * (o ResizeObserver só re-dispara em MUDANÇA de tamanho — nunca após um load
 * num painel já dimensionado).
 */
function schedulePostLoadRepaint(workspace: Blockly.WorkspaceSvg): void {
  const repaint = () => {
    resizeBlocklyWorkspace(workspace)
    rerenderBlocklyWorkspace(workspace)
    scrollWorkspaceIntoViewIfHidden(workspace)
  }
  repaint()
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(repaint))
    return
  }
  setTimeout(repaint, 0)
}

export interface BlocklyPanelProps {
  className?: string
  onWorkspaceReady?: (workspace: Blockly.WorkspaceSvg | null) => void
}

export function BlocklyPanel({ className, onWorkspaceReady }: BlocklyPanelProps): JSX.Element {
  const { blocksState, installedExtensions, projectMode, blocksHydration } = useProjectStore(
    useShallow((s) => ({
      blocksState: s.project?.blocksState ?? null,
      installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
      projectMode: s.project?.mode ?? 'blocks',
      blocksHydration: s.blocksHydration,
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
  const onWorkspaceReadyRef = useRef(onWorkspaceReady)
  onWorkspaceReadyRef.current = onWorkspaceReady
  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null)
  const lastSerializedRef = useRef<string>('')
  const isApplyingStateRef = useRef(false)
  const isSelectingFromEditorRef = useRef(false)
  const shouldRegenerateAfterDragRef = useRef(false)
  const regenerationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRegenerationWorkspaceRef = useRef<Blockly.Workspace | null>(null)
  const appliedToolboxRef = useRef<ReturnType<typeof buildCoreToolbox> | null>(null)
  // Após uma carga de blocosState, pede UM re-render quando o painel ganhar tamanho
  // real. No Estúdio Completo o workspace injeta ANTES do blocksState chegar (async) e
  // o render de carga pode rodar num container ainda não dimensionado → blocos
  // colapsados/invisíveis até alternar de modo. O ResizeObserver dispara o re-render
  // no 1º tamanho > 0 (o mesmo que a remontagem da Ponte fazia).
  const needsPostLoadRenderRef = useRef(false)

  // Aviso gentil do copiar/colar de blocos entre projetos (toast efêmero).
  const [pasteNotice, setPasteNotice] = useState<string | null>(null)
  const pasteNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notifyPaste = useCallback((message: string) => {
    setPasteNotice(message)
    if (pasteNoticeTimerRef.current) clearTimeout(pasteNoticeTimerRef.current)
    pasteNoticeTimerRef.current = setTimeout(() => setPasteNotice(null), 4500)
  }, [])
  useEffect(() => {
    return () => {
      if (pasteNoticeTimerRef.current) clearTimeout(pasteNoticeTimerRef.current)
    }
  }, [])
  const initialToolboxRef = useRef<ReturnType<typeof buildCoreToolbox> | null>(null)
  // Posições das pilhas a restaurar após um recarregamento programático, para
  // preservar onde o aluno deixou os blocos quando a Ponte reconstrói o estado.
  const preservedPositionsRef = useRef<Map<string, [number, number]> | null>(null)

  // Chave PRIMITIVA (conteúdo, não identidade — padrão do `allowedModesKey` do
  // StudioCore): a hidratação/sanitização do projeto recria o array
  // `installedExtensions` sem mudar o conteúdo. Keiar a toolbox pela identidade
  // fazia `updateToolbox` re-rodar segundos após o load e FECHAVA o flyout que o
  // aluno tinha acabado de abrir (regressão guardada no e2e/smoke).
  const installedIdsKey = useMemo(
    () => installedExtensions.map((e) => e.id).join('\n'),
    [installedExtensions],
  )

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
    const ids = installedIdsKey === '' ? [] : installedIdsKey.split('\n')
    const extras = ids
      .map((id) => findExtension(id))
      .filter((e): e is NonNullable<ReturnType<typeof findExtension>> => Boolean(e))
      // Gateia a categoria da extensão pelo seu `minLevel` (Kits de Jogo facilitam →
      // 2D no iniciante-2d, 3D no iniciante-3d). O default de extensão sem minLevel
      // vive em `extensionMinLevel` (fonte única).
      .filter((e) =>
        isCategoryAllowed(e.blockly.toolboxCategory.name, extensionMinLevel(e), profile),
      )
      .map((e) => e.blockly.toolboxCategory)
    return buildCoreToolbox(extras, profile)
  }, [installedIdsKey, profile])
  initialToolboxRef.current ??= toolbox

  // Regenera arquivos/IR a partir dos blocos. Só deve ser chamada para edições
  // REAIS do aluno nos blocos (ver o listener abaixo) — nunca durante uma carga
  // programática, senão sobrescreveria o código escrito à mão.
  const regenerateFromBlocks = useCallback(
    (workspace: Blockly.Workspace, options: { force?: boolean } = {}) => {
      // Blocos DEFASADOS em relação aos arquivos (o aluno editou CÓDIGO na Ponte
      // e o reverse-parse não assentou — trocou de modo dentro da janela, e o
      // worker morre com a Ponte): uma CARGA (force) nunca pode regenerar
      // arquivos/IR a partir deles — perderia o código digitado. O BlocksMode
      // deriva os blocos do código (recovery) e o reload subsequente re-dispara
      // este force já com blocos frescos. Edição REAL de bloco (sem force) segue
      // valendo: o aluno agiu — os blocos viram a autoridade (semântica de
      // precedência já documentada no epoch do BridgeMode).
      {
        const s = projectStoreApi.getState()
        if (options.force && s.bridgeCodeEditEpoch > s.bridgeBlocksSyncedEpoch) return
      }
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
      // Os arquivos acabaram de ser gerados DESTES blocos — eles refletem a
      // época corrente de edição de código (autoridade retomada).
      const storeState = projectStoreApi.getState()
      storeState.markBridgeBlocksSynced(storeState.bridgeCodeEditEpoch)
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
        // Repaint robusto: resize + re-render (conserta filhos COLAPSADOS, o
        // mesmo que "Organizar blocos" faz) + recentro quando o arranjo salvo
        // ficou fora da viewport — agora e num double-rAF.
        schedulePostLoadRepaint(workspace as Blockly.WorkspaceSvg)
        // Se o painel ainda não tinha tamanho (inject antes do blocksState async),
        // repinta quando o ResizeObserver ver o 1º tamanho real.
        needsPostLoadRenderRef.current = true
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
    const container = blocklyRef.current
    const observer = new ResizeObserver(() => {
      resizeBlocklyWorkspace(svgWorkspace)
      // Blocos carregados enquanto o painel tinha tamanho 0 (inject antes do
      // blocksState async, no Estúdio Completo) desenham colapsados/invisíveis. No
      // 1º tamanho REAL, repinta uma vez — mesmo efeito da remontagem da Ponte.
      if (
        needsPostLoadRenderRef.current &&
        container.clientWidth > 0 &&
        container.clientHeight > 0
      ) {
        needsPostLoadRenderRef.current = false
        scheduleBlocklyRerender(svgWorkspace)
      }
    })
    observer.observe(container)
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
    // Migração transparente p/ o modelo CONTAINER: um projeto LEGADO (blocos
    // soltos, sem frames) é re-embrulhado nos 3 frames preservando a saída.
    // Idempotente (no-op se já tem frame). As extensões já foram re-registradas no
    // efeito acima, então o load headless da migração enxerga os blocos delas.
    const stateToLoad = normalizeBlocksStateToFrames(blocksState)
    const serialized = JSON.stringify(stateToLoad)
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
          Blockly.serialization.workspaces.load(stateToLoad as Record<string, unknown>, workspace),
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
          // Fallback sem FINISHED_LOADING: mesmo repaint robusto do caminho
          // principal (resize + re-render + recentro-se-invisível) + agenda o
          // re-render pós-tamanho.
          schedulePostLoadRepaint(workspace as Blockly.WorkspaceSvg)
          needsPostLoadRenderRef.current = true
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
    // Miniaturas de sprite NO BLOCO: refresh automático quando um declarador de
    // sprite muda (watcher de eventos do workspace) e quando os ASSETS do projeto
    // mudam (renomear/trocar imagem no painel Imagens não gera evento Blockly —
    // observa a identidade de project.assets no store da instância).
    const detachSpriteThumbs = attachSpriteThumbWatcher(injected)
    // Nome da animação no bloco "Animar sprite": campo de exibição NÃO
    // serializado — re-derivado de FROM/TO/FPS + metadado do asset a cada
    // carga/reconstrução (senão a seleção "some" ao reabrir ou voltar da Ponte).
    const detachAnimNames = attachAnimationNameWatcher(injected)
    let prevAssets = projectStoreApi.getState().project?.assets
    const unsubscribeAssetsWatch = projectStoreApi.subscribe((state) => {
      const assets = state.project?.assets
      if (assets === prevAssets) return
      prevAssets = assets
      refreshSpriteThumbs(injected)
      // Assets chegam DEPOIS do blocksState (hidratação async): re-deriva os
      // nomes quando o metadado do Pinta aparecer/mudar.
      refreshAnimationNames(injected)
    })
    // Sons de encaixar/desconectar/descartar bloco, servidos pelo host (mesma origem).
    preloadBlockSounds(injected)
    // Corrida de fonte web: o Blockly mede a geometria dos blocos com a fonte
    // vigente NO RENDER; se Baloo 2/Nunito ainda não aplicaram, o texto mede
    // errado e os blocos saem tortos/colapsados — e o load da fonte NÃO muda o
    // tamanho do container, então o ResizeObserver nunca socorre. Um re-render
    // ÚNICO quando as fontes assentam (mesmo padrão do ensureFontsReady do
    // screenshot.ts). `.then` único — não loopa.
    let fontsRepaintDisposed = false
    const fontsReady = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts
      ?.ready
    if (fontsReady && typeof fontsReady.then === 'function') {
      void fontsReady
        .then(() => {
          if (fontsRepaintDisposed) return
          resizeBlocklyWorkspace(injected)
          rerenderBlocklyWorkspace(injected)
        })
        .catch(() => {
          // Fontes bloqueadas/indisponíveis: segue com a fonte de fallback.
        })
    }
    setWorkspace(injected)
    onWorkspaceReadyRef.current?.(injected)

    // Handlers POR INSTÂNCIA do colar de blocos (os itens de menu são GLOBAIS):
    // mapeia o workspace de volta ao projectStore desta instância + ao aviso.
    const pasteHandlers: PasteTargetHandlers = {
      getInstalledExtensions: () =>
        projectStoreApi.getState().project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
      installExtensionById: (id) => {
        const ext = findExtension(id)
        if (!ext) return false
        installExtension(ext, projectStoreApi)
        return true
      },
      isBlockTypeKnown: (type) =>
        isBlockTypeKnown(
          type,
          projectStoreApi.getState().project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
        ),
      notify: notifyPaste,
    }
    registerPasteTarget(injected, pasteHandlers)

    // O Blockly 12 escuta o pointerup do arrasto no DOCUMENTO (sem pointer
    // capture). Soltar o botão com o cursor sobre o <iframe> do preview (outro
    // documento) ou fora da janela faz esse pointerup NUNCA chegar aqui — o pan
    // fica "grudado" no mouse até um clique com o botão direito (que cancela o
    // gesto pelo menu de contexto). Guarda: movimento SEM nenhum botão apertado
    // durante um arrasto = o soltar foi perdido → encerra o gesto na posição
    // atual. Fase de captura para enxergar o evento antes de stopPropagation.
    const releaseLostPointerUp = (e: PointerEvent) => {
      if (e.buttons === 0 && injected.isDragging()) injected.cancelCurrentGesture()
    }
    document.addEventListener('pointermove', releaseLostPointerUp, true)

    return () => {
      fontsRepaintDisposed = true
      document.removeEventListener('pointermove', releaseLostPointerUp, true)
      if (pendingRegenerationWorkspaceRef.current === injected) {
        pendingRegenerationWorkspaceRef.current = null
      }
      unsubscribeAssetsWatch()
      detachAnimNames()
      detachSpriteThumbs()
      unregisterPasteTarget(injected)
      onWorkspaceReadyRef.current?.(null)
      injected.dispose()
      appliedToolboxRef.current = null
    }
  }, [projectStoreApi, notifyPaste])

  // Troca de tema ao vivo (toggle do Topbar/host): o Theme cobre workspace,
  // toolbox e flyout; só a cor da grade fica da injeção inicial (detalhe sutil).
  useEffect(() => {
    if (!workspace) return
    workspace.setTheme(szThemeFor(studioTheme))
  }, [workspace, studioTheme])

  // Enquanto a partição de blocos hidrata em 2º plano (reabertura rápida), o
  // canvas está VAZIO mas os blocos salvos estão a caminho: cobre com o overlay
  // BLOQUEANDO interação — uma edição nessa janela viraria "trabalho vivo" e
  // (se criasse blocos) descartaria a restauração. O timeout do service
  // ('pending'→'failed' em ~10s) garante que o overlay nunca prende.
  const isHydrationPending = blocksState == null && blocksHydration === 'pending'

  return (
    <div className={['relative h-full w-full', className].filter(Boolean).join(' ')}>
      <div ref={blocklyRef} className="h-full w-full" />
      {(isLoadingWorkspace || isHydrationPending) && (
        <div
          aria-busy="true"
          className={[
            isHydrationPending ? 'pointer-events-auto' : 'pointer-events-none',
            'absolute inset-0 z-10 flex items-center justify-center bg-sz-bg/60',
          ].join(' ')}
        >
          <Spinner />
        </div>
      )}
      {pasteNotice && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
          <output className="pointer-events-auto max-w-md rounded-2xl border-2 border-sz-border bg-sz-panel px-4 py-2.5 text-center font-medium text-sm text-sz-fg shadow-lg">
            {pasteNotice}
          </output>
        </div>
      )}
    </div>
  )
}
