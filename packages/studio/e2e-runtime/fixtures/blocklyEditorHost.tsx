import {
  createStudioRuntimeCatalog,
  StudioRuntimeReleaseSchema,
} from '@sistemazero/core/studio/runtime-catalog'
import * as Blockly from 'blockly/core'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  PythonBlocklyEditor,
  type PythonBlocklyEditorProps,
} from '../../src/components/blocks/PythonBlocklyEditor'
import { isPythonProject } from '../../src/core/editableProject'
import { type PythonBlocklyBlock, pythonVisualToWorkspace } from '../../src/python/blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS } from '../../src/python/blocks/catalog'
import { call, expression, moduleNode, name, text } from '../../src/python/blocks/nodes'
import { pythonASTToVisual } from '../../src/python/blocks/projection'
import { selectPythonPalette } from '../../src/python/blocks/selection'
import {
  readPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from '../../src/python/blocks/workspaceDraft'
import type { StudioRuntimeEnvironment } from '../../src/runtime/environment'
import { createStudioRuntimeRegistry } from '../../src/runtime/registry'
import { refinePythonProjectDocument } from '../../src/state/pythonProjectValidation'
import { StudioStoresContext } from '../../src/state/storesContext'
import { createStudioStores } from '../../src/state/studioStores'
import { StudioRuntimeEnvironmentProvider } from '../../src/studio/runtime-environment'

export async function createBlocklyEditorProbe() {
  const config = await (await fetch('/configuration')).json()
  const release = StudioRuntimeReleaseSchema.parse(
    (await (await fetch('/distribution')).json()).release,
  )
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const url = new URL('analysis.html', config.providerFrameURL)
  let analysisUnavailable = false
  const environment: StudioRuntimeEnvironment = {
    catalog,
    registry: createStudioRuntimeRegistry([]),
    access: () => ({
      releaseStatus: 'active',
      grantedCapabilities: ['edit'],
      grantedExtensionIds: [],
      hostOperations: [{ capability: 'edit', state: 'available' }],
      curation: null,
    }),
    resolvePythonAnalysis: async () => {
      if (analysisUnavailable) throw new Error('Falha de conexão de teste')
      return { url: url.href, allowedOrigins: [url.origin] }
    },
  }
  const stores = createStudioStores({ persistence: 'none' })
  const palette = selectPythonPalette({
    level: 1,
    installedExtensions: new Set(),
    approvedBlockIds: new Set(PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id)),
  })
  let root: Root | undefined,
    container: HTMLDivElement | undefined,
    workspace: Blockly.WorkspaceSvg | null = null
  const style = document.createElement('style')
  style.textContent =
    '#python-blockly-editor-probe{height:620px;width:900px} #python-blockly-editor-probe>div{height:100%;display:flex;flex-direction:column} #python-blockly-editor-probe section{flex:1;min-height:0}'
  document.head.append(style)
  let sourceCursor: PythonBlocklyEditorProps['sourceCursor']
  const historyEvents: {
    type: string
    group: string
    recordUndo: boolean
    undo: number
    redo: number
  }[] = []
  let activePath = 'main.py'
  function mount() {
    container ??= document.createElement('div')
    container.id = 'python-blockly-editor-probe'
    document.body.append(container)
    root = createRoot(container)
    render()
  }
  function render() {
    root?.render(
      <StrictMode>
        <StudioStoresContext.Provider value={stores}>
          <StudioRuntimeEnvironmentProvider value={environment}>
            <PythonBlocklyEditor
              path={activePath}
              codecs={PYTHON_PROGRAMMING_CODECS}
              palette={palette}
              sourceCursor={sourceCursor}
              onWorkspaceReady={(value) => {
                workspace = value
                if (!value) return
                value.addChangeListener((event) => {
                  if (event.isUiEvent) return
                  historyEvents.push({
                    type: event.type,
                    group: event.group,
                    recordUndo: event.recordUndo,
                    undo: value.getUndoStack().length,
                    redo: value.getRedoStack().length,
                  })
                  if (historyEvents.length > 100) historyEvents.shift()
                })
              }}
            />
          </StudioRuntimeEnvironmentProvider>
        </StudioStoresContext.Provider>
      </StrictMode>,
    )
  }
  const source = () => {
    const project = stores.project.getState().project
    if (!project || !isPythonProject(project) || project.kind !== 'classic')
      throw new Error('No project')
    return project.files[activePath]!
  }
  const draft = () => {
    const project = stores.project.getState().project
    if (!project || !isPythonProject(project)) throw new Error('No project')
    return readPythonWorkspaceDraft(project, activePath)
  }
  const numberBlock = () => {
    const block = workspace?.getAllBlocks(false).find((block) => block.type === 'sz_py_integer')
    if (!block) throw new Error('Number missing')
    return block
  }
  let unsubscribeGesture: (() => void) | undefined
  return {
    async create() {
      root?.unmount()
      root = undefined
      activePath = 'main.py'
      const project = await refinePythonProjectDocument(
        await (await fetch('/project/classic-portable')).json(),
      )
      if (project.kind !== 'classic') throw new Error('Classic fixture required')
      stores.project.getState().hydrateProject({
        ...project,
        files: { ...project.files, 'main.py': '# placar\nx = 3\nprint(x)\n' },
      })
      mount()
    },
    state: () => ({
      source: source(),
      pending: draft()?.pending ?? false,
      count: workspace?.getAllBlocks(false).length ?? 0,
      generation: draft()?.generation,
    }),
    history: () => ({
      undo: workspace?.getUndoStack().map((event) => ({ type: event.type, group: event.group })),
      redo: workspace?.getRedoStack().map((event) => ({ type: event.type, group: event.group })),
      events: historyEvents,
      blocks: workspace
        ?.getAllBlocks(false)
        .map((block) => ({ id: block.id, type: block.type, parent: block.getParent()?.id })),
    }),
    number(value: string) {
      numberBlock().setFieldValue(value, 'NUMBER')
      stores.pendingEditorEdits.flush()
      return { source: source(), pending: draft()?.pending }
    },
    /** A field edit, its real Blockly event, then a click outside the blocks: no explicit flush. */
    async numberThenClickOutside(value: string) {
      numberBlock().setFieldValue(value, 'NUMBER')
      // Blockly delivers the change on the next frame; the commit itself waits 350 ms.
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)))
      const before = draft()?.pending ?? false
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      return { before, after: draft()?.pending ?? false }
    },
    numberDuringNextCommit(value: string) {
      const previous = source()
      unsubscribeGesture?.()
      unsubscribeGesture = stores.project.subscribe(() => {
        if (source() === previous) return
        unsubscribeGesture?.()
        unsubscribeGesture = undefined
        // Let Blockly deliver its real deferred event, without an explicit flush.
        numberBlock().setFieldValue(value, 'NUMBER')
      })
    },
    replacePendingNumber(value: string) {
      const project = stores.project.getState().project
      const saved = draft()
      if (!project || !isPythonProject(project) || project.kind !== 'classic' || !saved?.pending)
        throw new Error('Pending draft required')
      const roots = saved.workspace.blocks as { blocks: Blockly.serialization.blocks.State[] }
      const queue = [...roots.blocks]
      while (queue.length) {
        const block = queue.pop()!
        if (block.type === 'sz_py_integer') block.fields = { ...block.fields, NUMBER: value }
        for (const input of Object.values(block.inputs ?? {})) {
          if (input.block) queue.push(input.block)
          if (input.shadow) queue.push(input.shadow)
        }
        if (block.next?.block) queue.push(block.next.block)
      }
      saved.generation = crypto.randomUUID()
      const issue = stores.project
        .getState()
        .applyPythonSourceFiles(
          project,
          project.files,
          updatePythonWorkspaceDraft(project, saved.path, saved),
        )
      if (issue) throw new Error(issue)
      return saved.generation
    },
    incomplete() {
      const block = workspace?.getAllBlocks(false).find((block) => block.type === 'sz_py_print') as
        | PythonBlocklyBlock
        | undefined
      if (!block) throw new Error('Print missing')
      block.setPythonOption('args:count', 2)
      stores.pendingEditorEdits.flush()
    },
    renameAssignment(value: string) {
      const assignment = workspace
        ?.getAllBlocks(false)
        .find((block) => block.type === 'sz_py_assign')
      const target = assignment
        ?.getChildren(false)
        .find((block) => block.type === 'sz_py_variable') as PythonBlocklyBlock | undefined
      if (!target) throw new Error('Assignment target missing')
      target.setFieldValue(value, target.pythonState.layout.fields[0]!.name)
      stores.pendingEditorEdits.flush()
    },
    source: (value: string) => stores.project.getState().setPythonFile('main.py', value),
    selectFile(path: string) {
      const project = stores.project.getState().project
      if (!project || !isPythonProject(project) || project.kind !== 'classic')
        throw new Error('No project')
      if (!Object.hasOwn(project.files, path)) {
        const issue = stores.project.getState().addExtraFile(path)
        if (issue) throw new Error(issue)
        const changed = stores.project.getState().setPythonFile(path, 'y = 8\n')
        if (changed) throw new Error(changed)
      }
      activePath = path
      sourceCursor = undefined
      render()
    },
    arrange(x: number, y: number, note: string) {
      const block = workspace?.getTopBlocks(false)[0]
      if (!block) throw new Error('Root missing')
      const position = block.getRelativeToSurfaceXY()
      block.moveBy(x - position.x, y - position.y)
      block.setCommentText(note)
      stores.pendingEditorEdits.flush()
    },
    arrangement() {
      const block = workspace?.getTopBlocks(false)[0]
      if (!block) return null
      const { x, y } = block.getRelativeToSurfaceXY()
      return { x, y, note: block.getCommentText() }
    },
    rearrangeAndInsert() {
      if (!workspace) throw new Error('Workspace missing')
      const first = workspace.getTopBlocks(false)[0]!,
        second = first.getNextBlock()
      if (!second || second.getNextBlock()) throw new Error('Expected two statements')
      const scratch = new Blockly.Workspace()
      let newState: Blockly.serialization.blocks.State
      try {
        const roots = pythonVisualToWorkspace(
          pythonASTToVisual(moduleNode([expression(call(name('print'), [text('novo')]))])),
          scratch,
        )
        newState = Blockly.serialization.blocks.save(scratch.getBlockById(roots[0]!)!)!
      } finally {
        scratch.dispose()
      }
      Blockly.Events.setGroup(true)
      try {
        // User creation participates in Undo; source hydration deliberately does not.
        const added = Blockly.serialization.blocks.append(newState, workspace, { recordUndo: true })
        const number = first.getDescendants(false).find((block) => block.type === 'sz_py_integer')!
        second.unplug()
        second.nextConnection!.connect(added.previousConnection!)
        added.nextConnection!.connect(first.previousConnection!)
        number.setFieldValue('10', 'NUMBER')
      } finally {
        Blockly.Events.setGroup(false)
      }
      stores.pendingEditorEdits.flush()
    },
    transferFunctionCommand() {
      const from = workspace?.getTopBlocks(false).find((block) => block.type === 'sz_py_def')
      const to = from?.getNextBlock()
      const command = from?.getInputTargetBlock('body')
      const destination = to?.getInputTargetBlock('body')
      if (!command || !destination) throw new Error('Function transfer fixture missing')
      Blockly.Events.setGroup(true)
      try {
        command.unplug()
        destination.nextConnection!.connect(command.previousConnection!)
      } finally {
        Blockly.Events.setGroup(false)
      }
      stores.pendingEditorEdits.flush()
    },
    /** A + / − control of a block (an optional branch, how many "senão se"). */
    setOption(type: string, key: string, value: number | boolean, emptyInput?: string) {
      const block = workspace?.getAllBlocks(false).find((block) => block.type === type) as
        | (Blockly.Block & { setPythonOption(key: string, value: number | boolean): void })
        | undefined
      if (!block) throw new Error('Block missing')
      Blockly.Events.setGroup(true)
      try {
        // A branch is emptied before its − removes it; one group, one Undo.
        if (emptyInput) block.getInputTargetBlock(emptyInput)?.dispose(false)
        block.setPythonOption(key, value)
      } finally {
        Blockly.Events.setGroup(false)
      }
      stores.pendingEditorEdits.flush()
    },
    emptyFunctionBody(type = 'sz_py_def', input = 'body') {
      const block = workspace?.getAllBlocks(false).find((block) => block.type === type)
      const command = block?.getInputTargetBlock(input)
      if (!command) throw new Error('Statement input missing')
      Blockly.Events.setGroup(true)
      try {
        command.dispose(false)
      } finally {
        Blockly.Events.setGroup(false)
      }
      stores.pendingEditorEdits.flush()
    },
    remount() {
      root?.unmount()
      root = undefined
      mount()
    },
    undo: () => stores.editorHistory.get('blocks')?.undo(),
    redo: () => stores.editorHistory.get('blocks')?.redo(),
    observe: () => stores.project.getState().setEditingAccess('observer'),
    setAnalysisUnavailable: (value: boolean) => {
      analysisUnavailable = value
    },
    setHydrating: (value: boolean) =>
      stores.project.setState({ blocksHydration: value ? 'pending' : 'restored' }),
    failHydration: () => stores.project.setState({ blocksHydration: 'failed' }),
    selectSource(offset: number) {
      sourceCursor = { source: source(), offset, nonce: (sourceCursor?.nonce ?? 0) + 1 }
      render()
    },
    dispose() {
      unsubscribeGesture?.()
      root?.unmount()
      root = undefined
      container?.remove()
      style.remove()
    },
  }
}
declare global {
  var pythonBlocklyEditorProbe: Awaited<ReturnType<typeof createBlocklyEditorProbe>>
}
