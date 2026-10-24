import * as Blockly from 'blockly/core'
import * as PtBr from 'blockly/msg/pt-br'
import { useEffect, useMemo, useRef, useState } from 'react'
import { szGridColourFor, szThemeFor } from '../../blockly/theme'
import { isPythonProject } from '../../core/editableProject'
import {
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
  registerPythonBlocks,
} from '../../python/blocks/blockly'
import { commitPythonWorkspaceGesture } from '../../python/blocks/commitWorkspace'
import type { PythonBlockCodec } from '../../python/blocks/contract'
import { nodes } from '../../python/blocks/nodes'
import { pythonPaletteBlockState } from '../../python/blocks/paletteBlocks'
import {
  PYTHON_PALETTE_GROUPS,
  pythonCategoryColour,
  pythonCategoryLabel,
} from '../../python/blocks/paletteGroups'
import { type PythonBlockProjection, pythonASTToVisual } from '../../python/blocks/projection'
import {
  bindPythonVisualOrigins,
  type PythonWorkspaceOrigins,
} from '../../python/blocks/provenance'
import { preparePythonWorkspaceRestore } from '../../python/blocks/restoreWorkspace'
import { type PythonPaletteSelection, searchPythonPalette } from '../../python/blocks/selection'
import {
  type PythonWorkspaceDraft,
  readPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from '../../python/blocks/workspaceDraft'
import {
  orderPythonWorkspaceRoots,
  updatePythonWorkspacePresentation,
} from '../../python/blocks/workspacePresentation'
import { rebasePythonWorkspaceState, savePythonWorkspace } from '../../python/blocks/workspaceState'
import { createPythonAnalysisController } from '../../python/language/controller'
import type { PythonParsedDocument, PythonSourceRange } from '../../python/language/types'
import { useHighlightStore } from '../../state/highlightStore'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import {
  useEditorHistory,
  usePendingEditorEdits,
  useStudioPersistence,
} from '../../state/studioStores'
import { useStudioExecution } from '../../studio/observation'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { useStudioTheme } from '../../studio/theme'
import {
  type StudioTutorBlockReference,
  type StudioTutorClassicEditorContext,
  useStudioTutor,
} from '../../studio/tutor'
import { studioTutorSourceHash } from '../../studio/tutorSafety'
import { createBlocklyHistory, forgetBlocklyHistory } from './blocklyHistory'
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
}

function toolbox(
  palette: PythonPaletteSelection,
  query: string,
  codecs: readonly PythonBlockCodec[],
): Blockly.utils.toolbox.ToolboxDefinition {
  const registry = new Map(codecs.map((codec) => [codec.id, codec]))
  const groups = new Map<string, Blockly.utils.toolbox.StaticCategoryInfo>()
  const categories = new Map<string, Blockly.utils.toolbox.StaticCategoryInfo>()
  for (const entry of searchPythonPalette(palette, query)) {
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
    const codec = registry.get(entry.id)
    target.contents.push(
      codec
        ? (pythonPaletteBlockState(codec, codecs) as Blockly.utils.toolbox.BlockInfo)
        : { kind: 'block', type: entry.id },
    )
  }
  // Blockly decides category mode from the entries, even for categoryToolbox.
  // Keep that mode when search/curation leaves no insertable blocks.
  if (!groups.size)
    groups.set('empty', {
      kind: 'category',
      name: query ? 'Nenhum bloco encontrado' : 'Nenhum bloco disponível nesta tarefa',
      contents: [],
      id: undefined,
      colour: undefined,
      categorystyle: undefined,
      cssconfig: undefined,
      hidden: undefined,
    })
  return { kind: 'categoryToolbox', contents: [...groups.values()] }
}

const COMMIT_DEBOUNCE_MS = 350
const COMMIT_MAX_WAIT_MS = 2000

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
  callbacks.current = props
  const initialTheme = useRef(theme)
  initialTheme.current = theme
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>({
    phase: 'loading',
    message: 'Preparando os blocos Python…',
  })
  const tools = useMemo(
    () => toolbox(props.palette, query, props.codecs),
    [props.palette, query, props.codecs],
  )
  const currentTools = useRef(tools)
  currentTools.current = tools
  const surface = useRef<{
    workspace: Blockly.WorkspaceSvg
    restore(): void
    discard(): void
    retry(): void
    selectCursor(cursor?: PythonBlocklyEditorProps['sourceCursor']): void
    focusTutor(target: TutorTarget): boolean
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
    const workspace = Blockly.inject(element, {
      toolbox: observer ? undefined : currentTools.current,
      readOnly: observer,
      renderer: 'zelos',
      // A Ponte gives this pane about a third of the host width. Keep categories
      // above the canvas so a sidebar cannot consume the block editing area.
      horizontalLayout: true,
      toolboxPosition: 'start',
      sounds: false,
      collapse: true,
      // Execution is described by Python source, never by an invisible workspace flag.
      disable: false,
      theme: szThemeFor(initialTheme.current, element),
      grid: {
        spacing: 24,
        length: 3,
        colour: szGridColourFor(initialTheme.current, element),
        snap: true,
      },
      zoom: { controls: true, wheel: true, startScale: 0.9, minScale: 0.4, maxScale: 1.8 },
      move: { scrollbars: true, drag: true, wheel: true },
      trashcan: !observer,
    })
    let disposed = false,
      applying = false,
      generation = 0,
      fingerprint = ''
    let parsed: PythonParsedDocument | undefined
    let loadedSource: string | undefined
    let origins: PythonWorkspaceOrigins = new Map()
    let rootIds: string[] = []
    let offer: PythonWorkspaceDraft | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
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
    function load(document: PythonParsedDocument, draft?: PythonWorkspaceDraft) {
      if (!document.tree) return
      const restored = draft
        ? preparePythonWorkspaceRestore(draft, document, props.codecs)
        : undefined
      applying = true
      loadedSource = undefined
      Blockly.Events.disable()
      try {
        workspace.clear()
        if (restored) {
          Blockly.serialization.workspaces.load(restored.state, workspace)
          rootIds = restored.rootIds
          origins = restored.origins
        } else {
          const projection = pythonASTToVisual(document.tree, {
            codecs: props.codecs,
            officialModules: props.officialModules,
          })
          rootIds = pythonVisualToWorkspace(projection, workspace, props.codecs)
          for (const id of rootIds) workspace.getBlockById(id)?.moveBy(24, 24)
          origins = bindPythonVisualOrigins(
            pythonWorkspaceToVisual(workspace, rootIds, projection.typeIgnores, props.codecs),
            document.tree,
            props.codecs,
          )
        }
        forgetBlocklyHistory(workspace)
        updatePythonWorkspacePresentation(
          workspace,
          document.tree,
          origins,
          props.codecs,
          props.officialModules,
        )
        fingerprint = JSON.stringify(savePythonWorkspace(workspace, origins))
        loadedSource = document.source
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
      if (disposed || !project || source === undefined || parsed?.source === source) return
      const token = ++generation
      report('loading', 'Atualizando os blocos a partir do código…')
      try {
        const result = await parser.run({
          current: () =>
            !disposed && token === generation && currentProject()?.files[props.path] === source,
          execute: async (analysis) => {
            const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
            const revision = [...new Uint8Array(bytes)]
              .map((value) => value.toString(16).padStart(2, '0'))
              .join('')
            return analysis.parse(
              { projectId: project.id, instanceId, path: props.path, generation: token, revision },
              source,
            )
          },
        })
        if (disposed || token !== generation || currentProject()?.files[props.path] !== source)
          return
        parsed = result
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
            if (disposed || token !== generation) return
            parsed = document
            loadedSource = document.source
            origins = bindPythonVisualOrigins(projection!, document.tree!, props.codecs)
            updatePythonWorkspacePresentation(
              workspace,
              document.tree!,
              origins,
              props.codecs,
              props.officialModules,
            )
            // Only the captured gesture was committed. A later live edit can
            // precede delivery of its Blockly event (RAF followed by a timer).
            fingerprint = JSON.stringify(rebasePythonWorkspaceState(saved, origins))
            surface.current?.selectCursor()
            report('ready')
            flush()
          },
          (error: unknown) => {
            if (token === generation && !(error instanceof Error && error.name === 'AbortError'))
              report('ready', failure(error))
          },
        )
      } catch (error) {
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
    const unregisterFlush = pending?.register(flushNow)
    const adapter = createBlocklyHistory(workspace)
    const unregisterHistory = history?.register('blocks', adapter)
    const activate = () => history?.markActive('blocks')
    element.addEventListener('pointerdown', activate)
    element.addEventListener('focusin', activate)
    const resize = new ResizeObserver(() => Blockly.svgResize(workspace))
    resize.observe(element)
    let previousSource = currentProject()?.files[props.path]
    const unsubscribe = store.subscribe(() => {
      const source = currentProject()?.files[props.path]
      if (source !== previousSource) {
        previousSource = source
        schedule()
      }
    })
    surface.current = {
      workspace,
      focusTutor(target) {
        // Never select an instance projected from an older version of this file.
        if (!parsed || loadedSource !== currentProject()?.files[props.path]) return false
        const block = target.blockId ? workspace.getBlockById(target.blockId) : null
        if (block?.type === target.blockType) {
          block.select()
          workspace.centerOnBlock(block.id, false)
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
        let best: { id: string; length: number } | undefined
        for (const [id, node] of origins) {
          const range = node.range
          if (!range || range.start > offset || range.end <= offset || !workspace.getBlockById(id))
            continue
          const length = range.end - range.start
          if (!best || length < best.length) best = { id, length }
        }
        if (best) {
          workspace.highlightBlock(best.id)
          workspace.centerOnBlock(best.id)
        }
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
      restore() {
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
      discard() {
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
        synchronization: draft?.pending || offer ? 'pending' : sameSource ? 'ready' : 'unavailable',
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
      element.removeEventListener('focusin', activate)
      workspace.removeChangeListener(changed)
      parser.dispose()
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
  useEffect(() => {
    if (
      highlightSource !== 'tutor' ||
      !tutorTarget ||
      view.phase !== 'ready' ||
      focusedTutorNonce.current === selectionNonce
    )
      return
    // A search filter can hide the category. Update the actual toolbox first.
    if (query) {
      setQuery('')
      return
    }
    if (surface.current?.focusTutor(tutorTarget)) focusedTutorNonce.current = selectionNonce
  }, [highlightSource, tutorTarget, selectionNonce, query, view.phase])
  const locked = !['ready', 'saving'].includes(view.phase)
  return (
    <div className="flex h-full min-h-0 flex-col" data-sz-toolbox-layout="horizontal">
      {!observer && (
        <label className="flex items-center gap-2 px-3 py-2 text-sm">
          Buscar blocos
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 rounded border border-sz-border bg-sz-panel px-2 py-1"
            placeholder="Nome ou comando Python"
          />
        </label>
      )}
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
