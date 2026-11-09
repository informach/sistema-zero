import * as Blockly from 'blockly/core'
import * as PtBr from 'blockly/msg/pt-br'
import { useEffect, useMemo, useRef, useState } from 'react'
import { installCornerSpacer } from '../../blockly/cornerSpacer'
import { blocklyPortalsInside } from '../../blockly/dialogPortals'
import {
  MORE_BLOCKS_KIND,
  type MoreBlocksWorkspace,
  registerMoreBlocksItem,
} from '../../blockly/moreBlocksItem'
import {
  revealBlockInWorkspace,
  runtimeErrorBlockId,
  setRuntimeErrorBlock,
} from '../../blockly/runtimeMark'
import {
  registerPtSearchCategory,
  type SearchResolverWorkspace,
} from '../../blockly/searchCategory'
import { SearchAwareHorizontalFlyout } from '../../blockly/searchHorizontalFlyout'
import { szGridColourFor, szThemeFor } from '../../blockly/theme'
import { isPythonProject } from '../../core/editableProject'
import {
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
  registerPythonBlocks,
} from '../../python/blocks/blockly'
import { commitPythonWorkspaceGesture } from '../../python/blocks/commitWorkspace'
import type { PythonBlockCodec } from '../../python/blocks/contract'
import { attachPythonLiteralTint, tintPythonLiterals } from '../../python/blocks/literalTint'
import { nodes } from '../../python/blocks/nodes'
import { pythonPaletteBlockState } from '../../python/blocks/paletteBlocks'
import {
  PYTHON_PALETTE_GROUPS,
  pythonCategoryColour,
  pythonCategoryLabel,
} from '../../python/blocks/paletteGroups'
import {
  ensurePythonProgramArea,
  PYTHON_PROGRAM,
  pythonProgramArea,
  pythonScratchRoots,
  registerPythonProgramArea,
} from '../../python/blocks/programArea'
import {
  createPythonProgramNavigation,
  type PythonProgramNavigationState,
} from '../../python/blocks/programNavigation'
import { type PythonBlockProjection, pythonASTToVisual } from '../../python/blocks/projection'
import { pythonProjectModules } from '../../python/blocks/projectModules'
import {
  bindPythonVisualOrigins,
  type PythonWorkspaceOrigins,
} from '../../python/blocks/provenance'
import { attachPythonCallLabels } from '../../python/blocks/pythonCallLabels'
import { pythonResolverOptionsOf } from '../../python/blocks/resolverOptions'
import {
  preparePythonScratchRestore,
  preparePythonWorkspaceRestore,
} from '../../python/blocks/restoreWorkspace'
import type { PythonProjectModules } from '../../python/blocks/scope'
import { type PythonPaletteSelection, searchPythonPalette } from '../../python/blocks/selection'
import {
  capturePythonWorkspace,
  type PythonWorkspaceDraft,
  pendingPythonWorkspaceDraft,
  readPythonScratchWorkspace,
  readPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from '../../python/blocks/workspaceDraft'
import {
  orderPythonWorkspaceRoots,
  updatePythonWorkspacePresentation,
} from '../../python/blocks/workspacePresentation'
import {
  rebasePythonWorkspaceState,
  samePythonWorkspaceProgram,
  savePythonWorkspace,
} from '../../python/blocks/workspaceState'
import { createPythonAnalysisController } from '../../python/language/controller'
import type { PythonAnalysisSession } from '../../python/language/session'
import { pythonPositionToOffset } from '../../python/language/sourceEdits'
import type {
  PythonNode,
  PythonParsedDocument,
  PythonSourceRange,
} from '../../python/language/types'
import { useHighlightStore, useHighlightStoreApi } from '../../state/highlightStore'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import {
  useEditorHistory,
  usePendingEditorEdits,
  useStudioPersistence,
} from '../../state/studioStores'
import { useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { useT } from '../../studio/i18n'
import { useStudioExecution } from '../../studio/observation'
import { useStudioPortalContainer } from '../../studio/portal-container'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { useStudioTheme } from '../../studio/theme'
import {
  type StudioTutorBlockReference,
  type StudioTutorClassicEditorContext,
  useStudioTutor,
} from '../../studio/tutor'
import { studioTutorSourceHash } from '../../studio/tutorSafety'
import { STUDIO_COMPACT_MAX_PX } from '../layout/layoutBreakpoints'
import { createBlocklyHistory, forgetBlocklyHistory } from './blocklyHistory'
import { PythonBlocksHeader } from './PythonBlocksHeader'
import { openTutorCategory } from './tutorCategory'

type TutorTarget = Pick<
  StudioTutorBlockReference,
  'blockId' | 'blockType' | 'category' | 'subcategory'
>

interface View {
  phase: 'loading' | 'ready' | 'saving' | 'recovery' | 'syntax' | 'error'
  message: string
}
export interface PythonBlocklyEditorProps {
  path: string
  /** Complete installed codec registry; palette curation controls insertion. */
  codecs: readonly PythonBlockCodec[]
  palette: PythonPaletteSelection
  /** Installed and approved modules that are not shadowed by project files. */
  officialModules?: ReadonlySet<string>
  sourceCursor?: { source: string; offset: number; nonce: number }
  onSelectRange?: (range: PythonSourceRange) => void
  onWorkspaceReady?: (workspace: Blockly.WorkspaceSvg | null) => void
  /** Os .py do projeto (o cabeçalho troca de arquivo quando há mais de um). */
  files?: readonly string[]
  onChangeFile?: (path: string) => void
}

/** O bloco de uma entrada da paleta, com o estado que o codec pede (o mesmo na busca). */
function paletteBlockInfo(
  entryId: string,
  registry: ReadonlyMap<string, PythonBlockCodec>,
  codecs: readonly PythonBlockCodec[],
): Blockly.utils.toolbox.BlockInfo {
  const codec = registry.get(entryId)
  return codec
    ? (pythonPaletteBlockState(codec, codecs) as Blockly.utils.toolbox.BlockInfo)
    : { kind: 'block', type: entryId }
}

/**
 * Os resultados de "Procurar um bloco", agrupados pelo caminho da paleta (redesenho do clássico,
 * 11/2026): a categoria de busca do Estúdio chama isto pelo resolvedor do workspace.
 */
function pythonSearchItems(
  palette: PythonPaletteSelection,
  query: string,
  codecs: readonly PythonBlockCodec[],
) {
  const registry = new Map(codecs.map((codec) => [codec.id, codec]))
  const groups = new Map<string, Blockly.utils.toolbox.BlockInfo[]>()
  for (const entry of searchPythonPalette(palette, query)) {
    const label = [entry.path[0], pythonCategoryLabel(entry.owner, entry.path[1]!)].join(' › ')
    const list = groups.get(label) ?? []
    list.push(paletteBlockInfo(entry.id, registry, codecs))
    groups.set(label, list)
  }
  return [...groups].flatMap(([text, blocks]) => [{ kind: 'label', text }, ...blocks])
}

function toolbox(
  palette: PythonPaletteSelection,
  codecs: readonly PythonBlockCodec[],
  search: boolean,
): Blockly.utils.toolbox.ToolboxInfo {
  const registry = new Map(codecs.map((codec) => [codec.id, codec]))
  const groups = new Map<string, Blockly.utils.toolbox.StaticCategoryInfo>()
  const categories = new Map<string, Blockly.utils.toolbox.StaticCategoryInfo>()
  for (const entry of palette.entries) {
    const groupName = entry.path[0]!
    const category = entry.path[1]!
    let group = groups.get(groupName)
    if (!group) {
      group = {
        kind: 'category',
        name: groupName,
        contents: [],
        id: undefined,
        colour: PYTHON_PALETTE_GROUPS[entry.owner].colour,
        categorystyle: undefined,
        cssconfig: undefined,
        hidden: undefined,
      }
      groups.set(groupName, group)
    }
    const key = entry.path.join(' › ')
    let target = categories.get(key)
    if (!target) {
      target = {
        kind: 'category',
        name: pythonCategoryLabel(entry.owner, category),
        colour: pythonCategoryColour(entry.owner, category),
        contents: [],
        id: undefined,
        categorystyle: undefined,
        cssconfig: undefined,
        hidden: undefined,
      }
      categories.set(key, target)
      group.contents.push(target)
    }
    target.contents.push(paletteBlockInfo(entry.id, registry, codecs))
  }
  // Blockly decides category mode from the entries, even for categoryToolbox.
  // Keep that mode when curation leaves no insertable blocks.
  if (!groups.size)
    groups.set('empty', {
      kind: 'category',
      name: 'Nenhum bloco disponível nesta tarefa',
      contents: [],
      id: undefined,
      colour: undefined,
      categorystyle: undefined,
      cssconfig: undefined,
      hidden: undefined,
    })
  // Como no JavaScript: "Procurar um bloco" e "Áreas do projeto" no topo. O Programa da área já
  // existe em todo arquivo (um só), então o bloco da paleta fica desligado: está ali para a
  // criança ver onde os blocos rodam.
  const top = [
    ...(search
      ? [{ kind: 'search', name: '🔎 Procurar um bloco', contents: [], szSearch: 'external' }]
      : []),
    {
      kind: 'category',
      name: '🗂️ Áreas do projeto',
      colour: '#475569',
      contents: [{ kind: 'block', type: PYTHON_PROGRAM, disabled: true }],
    },
  ] as unknown as Blockly.utils.toolbox.StaticCategoryInfo[]
  return { kind: 'categoryToolbox', contents: [...top, ...groups.values()] }
}

const COMMIT_DEBOUNCE_MS = 350
const COMMIT_MAX_WAIT_MS = 2000

async function sourceRevision(source: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('')
}
/** Only an absolute `from module import *` can depend on another file of the project. */
const importsStar = (tree: PythonNode) =>
  nodes(tree.fields.body) &&
  tree.fields.body.some(
    (statement) =>
      statement.kind === 'ImportFrom' &&
      nodes(statement.fields.names) &&
      statement.fields.names.some((alias) => alias.fields.name === '*'),
  )
/** The other Python files, in a comparable form: a change there can change a star import. */
/** O caminho do `diagnostic` do Python pode vir com `./` ou `/` na frente. */
const samePythonPath = (a: string, b: string) => a.replace(/^\.?\//, '') === b.replace(/^\.?\//, '')

const otherPythonSources = (files: Readonly<Record<string, string>> | undefined, path: string) =>
  Object.entries(files ?? {})
    .filter(([name]) => name !== path && name.endsWith('.py'))
    .flat()
const sameSources = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

/** Python owns its parser/workspace; no JavaScript generator participates in this surface. */
export function PythonBlocklyEditor(props: PythonBlocklyEditorProps) {
  const projectId = useProjectStore((state) => state.project?.id)
  const observer = useProjectStore((state) => state.editingAccess === 'observer')
  const hydration = useProjectStore((state) => state.blocksHydration)
  const blocksReady = hydration !== 'pending' && hydration !== 'failed'
  const persistence = useStudioPersistence()
  const store = useProjectStoreApi()
  const environment = useStudioRuntimeEnvironment()
  const execution = useStudioExecution()
  const pending = usePendingEditorEdits()
  const history = useEditorHistory()
  const theme = useStudioTheme()
  const { classicCapture } = useStudioTutor()
  const selectBlock = useHighlightStore((state) => state.selectBlock)
  const highlightSource = useHighlightStore((state) => state.source)
  const tutorTarget = useHighlightStore((state) => state.tutorTarget)
  const selectionNonce = useHighlightStore((state) => state.selectionNonce)
  const focusedTutorNonce = useRef<number | null>(null)
  const container = useRef<HTMLElement>(null)
  const callbacks = useRef(props)
  // Dentro de um diálogo modal do host, os portais do Blockly abrem dentro dele (ver
  // `blocklyPortalsInside`).
  const portalContainer = useStudioPortalContainer()
  useEffect(
    () => (portalContainer ? blocklyPortalsInside(portalContainer) : undefined),
    [portalContainer],
  )
  callbacks.current = props
  const initialTheme = useRef(theme)
  initialTheme.current = theme
  const t = useT()
  const [program, setProgram] = useState<PythonProgramNavigationState>({ entries: [], scratch: 0 })
  // Reflect the actual open scope, including navigation from Ponte, undo and tutor.
  const activeDefinition = program.entries.filter((entry) => entry.expanded).at(-1)?.id ?? ''
  const [view, setView] = useState<View>({
    phase: 'loading',
    message: 'Preparando os blocos Python…',
  })
  // "Mais blocos" no pé da paleta, como no JavaScript, onde o host oferece extensões.
  const moreBlocksText = useStudioConfig().extensions && !observer ? t('blocks.moreBlocks') : null
  const setShowExtensions = useUIStore((s) => s.setShowExtensions)
  const openExtensions = useRef(setShowExtensions)
  openExtensions.current = setShowExtensions
  const tools = useMemo(() => {
    const base = toolbox(props.palette, props.codecs, !observer)
    if (!moreBlocksText) return base
    return {
      ...base,
      contents: [...base.contents, { kind: MORE_BLOCKS_KIND, text: moreBlocksText }],
    } as Blockly.utils.toolbox.ToolboxDefinition
  }, [props.palette, props.codecs, observer, moreBlocksText])
  const currentTools = useRef(tools)
  currentTools.current = tools
  const surface = useRef<{
    workspace: Blockly.WorkspaceSvg
    restore(): void
    discard(): void
    retry(): void
    selectCursor(cursor?: PythonBlocklyEditorProps['sourceCursor']): void
    /** O bloco que gerou a linha (o menor que a contém), para o sinal do erro de execução. */
    blockAtLine(line: number): string | null
    focusTutor(target: TutorTarget): boolean
    navigate(id?: string): Promise<void>
    scratch(): void
    /** "Mostrar o bloco": abre a função em que ele mora, rola até ele e abre o balão do aviso. */
    reveal(id: string): Promise<void>
  } | null>(null)

  useEffect(() => {
    if (!blocksReady) {
      setView(
        hydration === 'failed'
          ? {
              phase: 'error',
              message:
                'Ainda não foi possível recuperar os blocos salvos. Tente novamente para continuar a edição.',
            }
          : { phase: 'loading', message: 'Recuperando os blocos salvos…' },
      )
      return
    }
    const element = container.current
    if (!element || !environment || !projectId) {
      setView({ phase: 'error', message: 'O ambiente Python está indisponível.' })
      return
    }
    Blockly.setLocale(PtBr as unknown as Record<string, string>)
    registerPythonBlocks(props.codecs)
    registerPythonProgramArea()
    // "Procurar um bloco" é a categoria de busca do Estúdio, com o resolvedor do Python.
    registerPtSearchCategory()
    registerMoreBlocksItem()
    // Paleta em COLUNA no computador, como no JavaScript (pedido dela, 11/2026: as categorias
    // em faixa no computador eram estranhas); faixa só no celular, pela largura do editor. Numa
    // aba escondida do estreito o editor mede 0: aí vale a largura da janela.
    const width = element.clientWidth || window.innerWidth
    const horizontal = width < STUDIO_COMPACT_MAX_PX
    element.parentElement?.setAttribute(
      'data-sz-toolbox-layout',
      horizontal ? 'horizontal' : 'vertical',
    )
    const workspace = Blockly.inject(element, {
      toolbox: observer ? undefined : currentTools.current,
      readOnly: observer,
      renderer: 'zelos',
      horizontalLayout: horizontal,
      toolboxPosition: 'start',
      plugins: { flyoutsHorizontalToolbox: SearchAwareHorizontalFlyout },
      sounds: false,
      collapse: false,
      // Execution is described by Python source, never by an invisible workspace flag.
      disable: false,
      theme: szThemeFor(initialTheme.current, element),
      grid: {
        spacing: 24,
        length: 3,
        colour: szGridColourFor(initialTheme.current, element),
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: horizontal ? 0.8 : 1,
        minScale: 0.4,
        maxScale: 1.8,
      },
      move: { scrollbars: true, drag: true, wheel: true },
      trashcan: !observer,
    })
    ;(workspace as unknown as SearchResolverWorkspace).__szSearchItems = (search) =>
      pythonSearchItems(callbacks.current.palette, search, callbacks.current.codecs)
    ;(workspace as unknown as MoreBlocksWorkspace).__szOpenExtensions = () =>
      openExtensions.current(true)
    // Lixeira e zoom mais para cima, como no JavaScript (ver `cornerSpacer.ts`).
    installCornerSpacer(workspace)
    // A cor dos valores dentro de bloco de extensão (ver `literalTint.ts`): o dono de cada tipo.
    const ownerByType = new Map(props.codecs.map((codec) => [codec.id, codec.owner]))
    const literalOwner = (type: string) => ownerByType.get(type)
    // A apresentação é refeita com os eventos desligados (carga, troca de código): o tom dos
    // valores vem junto, sempre.
    const presentWorkspace: typeof updatePythonWorkspacePresentation = (...args) => {
      const result = updatePythonWorkspacePresentation(...args)
      tintPythonLiterals(args[0], literalOwner)
      return result
    }
    let disposed = false,
      applying = false,
      generation = 0,
      fingerprint = ''
    let parsed: PythonParsedDocument | undefined
    let loadedSource: string | undefined
    let origins: PythonWorkspaceOrigins = new Map()
    let rootIds: string[] = []
    const navigation = createPythonProgramNavigation(workspace, setProgram)
    let offer: PythonWorkspaceDraft | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    // `from settings import *` is understood from the project's own settings.py.
    const knownStarExports = pythonResolverOptionsOf(props.codecs).starExports
    let projectModules: PythonProjectModules | undefined
    /** Parsed trees of the other files by content (null: it does not parse). */
    let parsedModules = new Map<string, PythonNode | null>()
    let modulesStale = false
    let committing = false
    const instanceId = crypto.randomUUID()
    const currentProject = () => {
      const project = store.getState().project
      return project &&
        project.id === projectId &&
        isPythonProject(project) &&
        project.kind === 'classic'
        ? project
        : null
    }
    const parser = createPythonAnalysisController({
      project: currentProject,
      environment: () => environment,
      writerEpoch: () => execution.writerEpoch ?? null,
      mountFrame() {
        const frame = document.createElement('iframe')
        frame.hidden = true
        element.parentElement!.append(frame)
        return { frame, release: () => frame.remove() }
      },
    })
    const report = (phase: View['phase'], message = '') => {
      if (!disposed) setView({ phase, message })
    }
    const failure = (error: unknown) =>
      error instanceof Error ? error.message : 'Não foi possível atualizar os blocos.'
    /** Exports of the project's modules, parsing (once per content) the files not seen yet. */
    async function modulesFor(
      analysis: Pick<PythonAnalysisSession, 'parse'>,
      project: NonNullable<ReturnType<typeof currentProject>>,
      tree: PythonNode,
      token: number,
    ): Promise<PythonProjectModules | undefined> {
      if (!importsStar(tree)) return undefined
      const trees = new Map<string, PythonNode | null>([[props.path, tree]])
      const seen = new Map<string, PythonNode | null>()
      for (const [path, source] of Object.entries(project.files)) {
        if (path === props.path || !path.endsWith('.py')) continue
        // null (does not parse) is remembered too: the same content is never parsed twice.
        let parsedTree = seen.has(source) ? seen.get(source) : parsedModules.get(source)
        if (parsedTree === undefined) {
          try {
            const document = await analysis.parse(
              {
                projectId: project.id,
                instanceId,
                path,
                generation: token,
                revision: await sourceRevision(source),
              },
              source,
            )
            parsedTree = document.tree && !document.diagnostics.length ? document.tree : null
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') throw error
            // A file that cannot be read proves nothing: its importers stay cautious.
            parsedTree = null
          }
        }
        seen.set(source, parsedTree)
        trees.set(path, parsedTree)
      }
      parsedModules = seen
      return pythonProjectModules({
        paths: Object.keys(project.files),
        trees,
        entrypoint: project.python.entrypoint,
        starExports: knownStarExports,
      })
    }
    /** Another file changed: re-read what its star imports bind and relabel the blocks. */
    async function refreshModules() {
      const project = currentProject()
      const source = project?.files[props.path]
      const tree = parsed?.tree
      if (!project || !tree || source !== parsed?.source) return
      // A new analysis job would cancel the commit in flight; it runs again afterwards.
      if (committing || commitTimer !== undefined) return
      modulesStale = false
      const token = ++generation
      try {
        const modules = await parser.run({
          current: () =>
            !disposed && token === generation && currentProject()?.files[props.path] === source,
          execute: (analysis) => modulesFor(analysis, project, tree, token),
        })
        if (disposed || token !== generation || loadedSource !== source) return
        projectModules = modules
        presentWorkspace(
          workspace,
          tree,
          origins,
          props.codecs,
          props.officialModules,
          projectModules,
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          modulesStale = true
          return
        }
        if (disposed || token !== generation || loadedSource !== source) return
        // Without the other files, a star import of the project proves nothing.
        projectModules = undefined
        presentWorkspace(workspace, tree, origins, props.codecs, props.officialModules)
      }
    }
    function load(document: PythonParsedDocument, draft?: PythonWorkspaceDraft) {
      if (!document.tree) return
      const restored = draft
        ? preparePythonWorkspaceRestore(draft, document, props.codecs)
        : undefined
      const restoreScratch = preparePythonScratchRestore(
        readPythonScratchWorkspace(currentProject()!, props.path),
        props.codecs,
      )
      applying = true
      loadedSource = undefined
      Blockly.Events.disable()
      try {
        navigation.restore()
        workspace.clear()
        if (restored) {
          Blockly.serialization.workspaces.load(restored.state, workspace)
          rootIds = restored.rootIds
          origins = restored.origins
        } else {
          const projection = pythonASTToVisual(document.tree, {
            codecs: props.codecs,
            officialModules: props.officialModules,
            projectModules,
          })
          rootIds = pythonVisualToWorkspace(projection, workspace, props.codecs)
          for (const id of rootIds) workspace.getBlockById(id)?.moveBy(24, 24)
          origins = bindPythonVisualOrigins(
            pythonWorkspaceToVisual(workspace, rootIds, projection.typeIgnores, props.codecs),
            document.tree,
            props.codecs,
          )
        }
        const hadProgramArea = !!pythonProgramArea(workspace)
        rootIds = ensurePythonProgramArea(workspace, rootIds, props.path)
        restoreScratch?.(workspace)
        forgetBlocklyHistory(workspace)
        presentWorkspace(
          workspace,
          document.tree,
          origins,
          props.codecs,
          props.officialModules,
          projectModules,
        )
        // Legacy caches have no area and often save every definition expanded.
        // Give them the same compact initial view as a freshly projected file.
        void navigation.initialize(!restored || !hadProgramArea)
        const saved = savePythonWorkspace(workspace, origins)
        fingerprint = JSON.stringify(saved)
        loadedSource = document.source
        // Gallery examples start as Python files. Save their initial Program
        // area as soon as projection succeeds, without requiring a user gesture.
        // A recovery offer must remain pending until its source transaction.
        const project = currentProject()
        if (
          (!restored || !hadProgramArea) &&
          !draft?.pending &&
          !observer &&
          store.getState().editingAccess === 'author' &&
          project?.files[props.path] === document.source
        ) {
          const { draft: initial, scratch } = capturePythonWorkspace(
            project,
            props.path,
            saved,
            rootIds,
          )
          initial.pending = false
          const issue = store
            .getState()
            .applyPythonSourceFiles(
              project,
              project.files,
              updatePythonWorkspaceDraft(project, props.path, initial, scratch),
            )
          if (issue) throw new Error(issue)
        }
      } finally {
        Blockly.Events.enable()
        applying = false
      }
      Blockly.svgResize(workspace)
      surface.current?.selectCursor()
    }
    async function refresh() {
      const project = currentProject()
      const source = project?.files[props.path]
      if (disposed || !project || source === undefined) return
      if (parsed?.source === source) {
        if (modulesStale) await refreshModules()
        return
      }
      const token = ++generation
      modulesStale = false
      report('loading', 'Atualizando os blocos a partir do código…')
      try {
        const { document: result, modules } = await parser.run({
          current: () =>
            !disposed && token === generation && currentProject()?.files[props.path] === source,
          execute: async (analysis) => {
            const revision = await sourceRevision(source)
            const document = await analysis.parse(
              { projectId: project.id, instanceId, path: props.path, generation: token, revision },
              source,
            )
            const modules =
              document.tree && !document.diagnostics.length
                ? await modulesFor(analysis, project, document.tree, token)
                : undefined
            return { document, modules }
          },
        })
        if (disposed || token !== generation || currentProject()?.files[props.path] !== source)
          return
        parsed = result
        projectModules = modules
        if (!result.tree || result.diagnostics.length) {
          report(
            'syntax',
            result.diagnostics[0]?.message ?? 'Confira o código Python antes de editar os blocos.',
          )
          return
        }
        const saved = readPythonWorkspaceDraft(currentProject()!, props.path)
        offer = saved?.path === props.path && saved.pending ? saved : undefined
        if (offer) {
          if (observer) {
            load(result)
            report('ready', 'Há um rascunho do autor. Você está vendo o código salvo.')
            return
          }
          report('recovery', 'Há alterações dos blocos que ainda não foram aplicadas ao código.')
          return
        }
        try {
          load(result, saved?.path === props.path ? saved : undefined)
        } catch {
          load(result)
        }
        report('ready')
      } catch (error) {
        if (token === generation && !(error instanceof Error && error.name === 'AbortError'))
          report('error', failure(error))
      }
    }
    function schedule() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void refresh()
      }, 160)
    }
    function flush() {
      const project = currentProject()
      if (
        disposed ||
        applying ||
        offer ||
        observer ||
        store.getState().editingAccess !== 'author' ||
        !parsed?.tree ||
        loadedSource !== parsed.source ||
        !project ||
        project.files[props.path] !== parsed.source
      )
        return
      try {
        const saved = savePythonWorkspace(workspace, origins)
        const nextFingerprint = JSON.stringify(saved)
        if (nextFingerprint === fingerprint) return
        // Layout, collapsed definitions and scratch pieces do not change source.
        // Persist them without parsing/projecting the entire file. Pending
        // semantic edits must finish through the normal source transaction.
        if (
          !committing &&
          !pendingPythonWorkspaceDraft(project) &&
          fingerprint &&
          samePythonWorkspaceProgram(JSON.parse(fingerprint), saved)
        ) {
          const { draft, scratch } = capturePythonWorkspace(project, props.path, saved, rootIds)
          draft.pending = false
          const issue = store
            .getState()
            .applyPythonSourceFiles(
              project,
              project.files,
              updatePythonWorkspaceDraft(project, props.path, draft, scratch),
            )
          if (issue) throw new Error(issue)
          fingerprint = nextFingerprint
          return
        }
        rootIds = orderPythonWorkspaceRoots(workspace, origins, rootIds)
        let projection: PythonBlockProjection | undefined, issue: unknown
        try {
          projection = pythonWorkspaceToVisual(
            workspace,
            rootIds,
            nodes(parsed.tree.fields.type_ignores) ? parsed.tree.fields.type_ignores : [],
            props.codecs,
            origins,
          )
        } catch (error) {
          issue = error
        }
        const token = ++generation
        fingerprint = nextFingerprint
        report('saving', 'Aplicando os blocos ao código…')
        committing = true
        const result = commitPythonWorkspaceGesture({
          store,
          analysis: parser,
          document: parsed,
          workspace: saved,
          rootIds,
          codecs: props.codecs,
          projection: () => {
            if (!projection) throw issue
            return projection
          },
          current: () => !disposed && token === generation,
        })
        void result.then(
          (document) => {
            committing = false
            if (disposed || token !== generation) return
            parsed = document
            loadedSource = document.source
            origins = bindPythonVisualOrigins(projection!, document.tree!, props.codecs)
            presentWorkspace(
              workspace,
              document.tree!,
              origins,
              props.codecs,
              props.officialModules,
              projectModules,
            )
            // A star import the gesture added is read from the other files afterwards.
            if (!projectModules && importsStar(document.tree!)) modulesStale = true
            if (modulesStale) schedule()
            // Only the captured gesture was committed. A later live edit can
            // precede delivery of its Blockly event (RAF followed by a timer).
            fingerprint = JSON.stringify(rebasePythonWorkspaceState(saved, origins))
            surface.current?.selectCursor()
            report('ready')
            flush()
          },
          (error: unknown) => {
            committing = false
            if (token === generation && !(error instanceof Error && error.name === 'AbortError'))
              report('ready', failure(error))
            if (modulesStale) schedule()
          },
        )
      } catch (error) {
        committing = false
        report('ready', failure(error))
      }
    }
    const changed = (event: Blockly.Events.Abstract) => {
      if (
        event.type === Blockly.Events.SELECTED &&
        currentProject()?.files[props.path] === parsed?.source
      ) {
        // Blockly queues UI notifications. A queued deselection can be delivered
        // after the same block was selected again, so read the current selection.
        const selected = Blockly.common.getSelected()
        const block = selected?.workspace === workspace ? workspace.getBlockById(selected.id) : null
        selectBlock(block?.id ?? null)
        const range = block ? origins.get(block.id)?.range : undefined
        if (range) callbacks.current.onSelectRange?.(range)
      }
      if (!event.isUiEvent) scheduleCommit()
    }
    // One commit per gesture: typing in a field or dragging a stack fires many events, and each
    // commit re-parses the whole file. Explicit saves, mode changes and page exit still flush now
    // through the pending-edits registry.
    let commitTimer: ReturnType<typeof setTimeout> | undefined
    let firstPendingAt = 0
    function scheduleCommit() {
      const now = performance.now()
      if (commitTimer === undefined) firstPendingAt = now
      clearTimeout(commitTimer)
      const run = () => {
        if (workspace.isDragging() && performance.now() - firstPendingAt < COMMIT_MAX_WAIT_MS) {
          commitTimer = setTimeout(run, COMMIT_DEBOUNCE_MS)
          return
        }
        commitTimer = undefined
        flush()
      }
      commitTimer =
        now - firstPendingAt >= COMMIT_MAX_WAIT_MS
          ? setTimeout(run, 0)
          : setTimeout(run, COMMIT_DEBOUNCE_MS)
    }
    const flushNow = () => {
      clearTimeout(commitTimer)
      commitTimer = undefined
      flush()
    }
    workspace.addChangeListener(changed)
    // "chamar mover com distancia ⟨10⟩": the names follow the def while the child edits.
    const detachCallLabels = attachPythonCallLabels(workspace)
    const detachLiteralTint = attachPythonLiteralTint(workspace, literalOwner)
    const unregisterFlush = pending?.register(flushNow)
    // A pending gesture is applied before the child acts anywhere else (typing in the code of
    // the Ponte, a button that rewrites the file): once the source changes, the blocks can no
    // longer be committed against it and the gesture would be lost.
    const leave = (event: Event) => {
      // Mid-drag the block is detached: the scheduled commit applies it when it is dropped.
      if (commitTimer === undefined || workspace.isDragging()) return
      const target = event instanceof FocusEvent ? event.relatedTarget : event.target
      if (target instanceof Node && element.contains(target)) return
      // Blockly's own widgets (dropdowns, the field editor) live outside the workspace element.
      if (target instanceof Element && target.closest('.blocklyWidgetDiv, .blocklyDropDownDiv'))
        return
      flushNow()
    }
    element.addEventListener('focusout', leave)
    document.addEventListener('pointerdown', leave, true)
    const adapter = createBlocklyHistory(workspace)
    const unregisterHistory = history?.register('blocks', adapter)
    const activate = () => history?.markActive('blocks')
    element.addEventListener('pointerdown', activate)
    element.addEventListener('focusin', activate)
    const resize = new ResizeObserver(() => Blockly.svgResize(workspace))
    resize.observe(element)
    let previousSource = currentProject()?.files[props.path]
    let previousOthers = otherPythonSources(currentProject()?.files, props.path)
    const unsubscribe = store.subscribe(() => {
      const files = currentProject()?.files
      const source = files?.[props.path]
      const others = otherPythonSources(files, props.path)
      if (!sameSources(others, previousOthers)) {
        previousOthers = others
        modulesStale = true
        if (source === previousSource) schedule()
      }
      if (source !== previousSource) {
        previousSource = source
        schedule()
      }
    })
    // O menor bloco cuja origem no código contém o deslocamento (o cursor da Ponte e o erro).
    // `statement`: só blocos de comando (com encaixe em cima) — o erro marca a LINHA, não o nome
    // da variável que começa nela.
    const blockAtOffset = (offset: number, statement = false): string | null => {
      let best: { id: string; length: number } | undefined
      for (const [id, node] of origins) {
        const range = node.range
        const block = range ? workspace.getBlockById(id) : null
        if (!range || !block || range.start > offset || range.end <= offset) continue
        if (statement && !block.previousConnection) continue
        const length = range.end - range.start
        if (!best || length < best.length) best = { id, length }
      }
      return best?.id ?? null
    }
    surface.current = {
      workspace,
      async navigate(id) {
        if (!parsed || loadedSource !== currentProject()?.files[props.path]) return
        await navigation.reveal(id)
        scheduleCommit()
      },
      scratch() {
        const first = pythonScratchRoots(workspace)[0]
        if (first) void navigation.reveal(first.id)
      },
      async reveal(id) {
        if (!workspace.getBlockById(id)) return
        await navigation.reveal(id)
        if (disposed) return
        Blockly.svgResize(workspace)
        revealBlockInWorkspace(workspace, id, true)
      },
      focusTutor(target) {
        // Never select an instance projected from an older version of this file.
        if (!parsed || loadedSource !== currentProject()?.files[props.path]) return false
        const block = target.blockId ? workspace.getBlockById(target.blockId) : null
        if (block?.type === target.blockType) {
          void navigation.reveal(block.id)
          const range = origins.get(block.id)?.range
          if (range) callbacks.current.onSelectRange?.(range)
          return true
        }
        // Historical references cannot reveal categories excluded by current curation.
        if (callbacks.current.palette.entries.some((entry) => entry.id === target.blockType))
          openTutorCategory(workspace, target.blockType, target.category, target.subcategory)
        return true
      },
      selectCursor(cursor = callbacks.current.sourceCursor) {
        workspace.highlightBlock(null)
        if (!cursor) return
        const { offset } = cursor
        if (
          !Number.isSafeInteger(offset) ||
          offset < 0 ||
          cursor.source !== parsed?.source ||
          currentProject()?.files[props.path] !== parsed?.source
        )
          return
        const best = blockAtOffset(offset)
        if (best) {
          const selected = best
          // Code selection only highlights. Selecting again would emit a block
          // selection back to Monaco and create a feedback loop in Ponte.
          void navigation.reveal(selected, false).then(() => {
            if (!disposed) workspace.highlightBlock(selected)
          })
        }
      },
      blockAtLine(line) {
        const source = parsed?.source
        if (source === undefined || currentProject()?.files[props.path] !== source) return null
        let offset: number
        try {
          offset = pythonPositionToOffset(source, line, 1)
        } catch {
          return null
        }
        // O primeiro caractere de verdade da linha (a indentação não pertence a bloco nenhum).
        while (source[offset] === ' ' || source[offset] === '\t') offset++
        return blockAtOffset(offset, true) ?? blockAtOffset(offset)
      },
      retry() {
        if (parsed?.tree && loadedSource === parsed.source) {
          fingerprint = ''
          flush()
        } else {
          parsed = undefined
          void refresh()
        }
      },
      async restore() {
        if (!offer || !parsed || observer) return
        const project = currentProject()
        if (store.getState().editingAccess !== 'author') return
        if (
          !project ||
          project.files[props.path] !== parsed.source ||
          offer.baseSource !== parsed.source ||
          readPythonWorkspaceDraft(project, props.path)?.generation !== offer.generation
        ) {
          // A different tab/owner may replace the draft without changing source.
          // Present that current draft for a new explicit decision.
          offer = undefined
          parsed = undefined
          void refresh()
          return
        }
        try {
          load(parsed, offer)
          offer = undefined
          fingerprint = ''
          report('ready')
          flush()
        } catch (error) {
          report('recovery', failure(error))
        }
      },
      async discard() {
        const project = currentProject()
        if (
          !offer ||
          !parsed ||
          !project ||
          observer ||
          readPythonWorkspaceDraft(project, props.path)?.generation !== offer.generation
        )
          return
        const issue = store
          .getState()
          .applyPythonSourceFiles(
            project,
            project.files,
            updatePythonWorkspaceDraft(project, props.path),
          )
        if (issue) {
          report('recovery', issue)
          return
        }
        offer = undefined
        load(parsed)
        report('ready')
      },
    }
    const capture = (): StudioTutorClassicEditorContext | null => {
      const project = currentProject()
      const source = project?.files[props.path]
      if (disposed || !project || source === undefined) return null
      const sameSource = parsed?.source === source && loadedSource === source
      const draft = readPythonWorkspaceDraft(project, props.path)
      return {
        projectId: project.id,
        path: props.path,
        sourceHash: studioTutorSourceHash(source),
        synchronization:
          draft?.pending || offer || commitTimer !== undefined
            ? 'pending'
            : sameSource
              ? 'ready'
              : 'unavailable',
        // A parse still in flight must not describe old blocks as current source.
        ...(sameSource ? { workspace: Blockly.serialization.workspaces.save(workspace) } : {}),
      }
    }
    classicCapture.current = capture
    callbacks.current.onWorkspaceReady?.(workspace)
    void refresh()
    return () => {
      flush()
      clearTimeout(commitTimer)
      disposed = true
      generation++
      clearTimeout(timer)
      unsubscribe()
      unregisterFlush?.()
      unregisterHistory?.()
      adapter.dispose()
      resize.disconnect()
      element.removeEventListener('pointerdown', activate)
      element.removeEventListener('focusout', leave)
      document.removeEventListener('pointerdown', leave, true)
      element.removeEventListener('focusin', activate)
      workspace.removeChangeListener(changed)
      detachCallLabels()
      detachLiteralTint()
      parser.dispose()
      navigation.dispose()
      workspace.dispose()
      if (classicCapture.current === capture) classicCapture.current = null
      if (surface.current?.workspace === workspace) surface.current = null
      callbacks.current.onWorkspaceReady?.(null)
    }
  }, [
    projectId,
    props.path,
    props.codecs,
    props.officialModules,
    observer,
    blocksReady,
    hydration,
    store,
    environment,
    execution.writerEpoch,
    pending,
    history,
    classicCapture,
    selectBlock,
  ])

  useEffect(() => {
    const workspace = surface.current?.workspace
    if (workspace && !observer) workspace.updateToolbox(tools)
  }, [tools, observer])
  useEffect(() => {
    surface.current?.workspace.setTheme(szThemeFor(theme, container.current))
  }, [theme])
  useEffect(() => {
    surface.current?.selectCursor(props.sourceCursor)
  }, [props.sourceCursor])
  // O sinal vermelho do erro de execução (redesenho do clássico, 11/2026): a prévia publica o
  // arquivo e a linha do `diagnostic`; aqui vira o bloco daquela linha neste arquivo.
  const runtimeMark = useHighlightStore((state) => state.runtimeMark)
  const revealRequest = useHighlightStore((state) => state.revealRequest)
  const highlightApi = useHighlightStoreApi()
  const handledReveal = useRef(highlightApi.getState().revealRequest?.nonce ?? 0)
  useEffect(() => {
    const current = surface.current
    if (!current || view.phase !== 'ready') return
    const id =
      runtimeMark && samePythonPath(runtimeMark.file, props.path)
        ? current.blockAtLine(runtimeMark.line)
        : null
    setRuntimeErrorBlock(current.workspace, id, runtimeMark?.message ?? '')
  }, [runtimeMark, props.path, view.phase])
  const filesRef = useRef(props.files)
  filesRef.current = props.files
  const changeFileRef = useRef(props.onChangeFile)
  changeFileRef.current = props.onChangeFile
  useEffect(() => {
    if (!revealRequest || revealRequest.nonce === handledReveal.current) return
    const target = revealRequest.target
    if (target.kind === 'runtime' && runtimeMark && !samePythonPath(runtimeMark.file, props.path)) {
      // O erro está em outro .py: abre aquele arquivo e o pedido espera o editor dele ficar
      // pronto (este efeito roda de novo com o `path` e a fase novos).
      const file = filesRef.current?.find((item) => samePythonPath(item, runtimeMark.file))
      if (file && changeFileRef.current) changeFileRef.current(file)
      else handledReveal.current = revealRequest.nonce
      return
    }
    const current = surface.current
    // Editor ainda montando ou recarregando: o pedido fica para quando ele estiver pronto.
    if (!current || view.phase !== 'ready') return
    handledReveal.current = revealRequest.nonce
    // Sem cancelar na limpeza: as dependências mudam à toa e o pedido já foi dado por atendido.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (surface.current !== current) return
        let id = target.kind === 'runtime' ? runtimeErrorBlockId(current.workspace) : target.blockId
        if (!id && target.kind === 'runtime' && runtimeMark) {
          // Os blocos foram refeitos depois da marca (uma edição na Ponte): marca de novo pela
          // linha antes de mostrar.
          id = current.blockAtLine(runtimeMark.line)
          setRuntimeErrorBlock(current.workspace, id, runtimeMark.message)
        }
        if (id) void current.reveal(id)
      })
    })
  }, [revealRequest, runtimeMark, props.path, view.phase])
  useEffect(() => {
    if (
      highlightSource !== 'tutor' ||
      !tutorTarget ||
      view.phase !== 'ready' ||
      focusedTutorNonce.current === selectionNonce
    )
      return
    if (surface.current?.focusTutor(tutorTarget)) focusedTutorNonce.current = selectionNonce
  }, [highlightSource, tutorTarget, selectionNonce, view.phase])
  const locked = !['ready', 'saving'].includes(view.phase)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PythonBlocksHeader
        path={props.path}
        files={props.files ?? [props.path]}
        onChangeFile={props.onChangeFile}
        program={program}
        activeDefinition={activeDefinition}
        locked={locked}
        onNavigate={(id) => void surface.current?.navigate(id)}
        onScratch={() => surface.current?.scratch()}
      />
      {view.message && (
        <p
          role={view.phase === 'error' || view.phase === 'syntax' ? 'alert' : 'status'}
          className="m-0 px-3 py-2 text-sm"
        >
          {view.message}
        </p>
      )}
      {view.phase === 'recovery' && !observer && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          <button type="button" onClick={() => surface.current?.restore()}>
            Restaurar alterações dos blocos
          </button>
          <button type="button" onClick={() => surface.current?.discard()}>
            Descartar rascunho e abrir o código salvo
          </button>
        </div>
      )}
      {view.message && ['ready', 'error'].includes(view.phase) && !observer && (
        <button
          type="button"
          onClick={() => {
            if (hydration === 'failed') {
              const project = store.getState().project
              if (project && project.id === projectId) persistence.hydrateAfterLoad(project)
            } else surface.current?.retry()
          }}
        >
          Tentar novamente
        </button>
      )}
      <section
        ref={container}
        inert={locked}
        className="relative min-h-0 flex-1"
        aria-label="Editor de blocos Python"
      />
    </div>
  )
}
