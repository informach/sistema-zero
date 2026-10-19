import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  createStudioRuntimeCatalog,
  StudioRuntimeReleaseSchema,
} from '@sistemazero/core/studio/runtime-catalog'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import * as Blockly from 'blockly/core'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import type { Root } from 'react-dom/client'
import { ModeArea } from '../../src/components/layout/ModeArea'
import { isPythonProject } from '../../src/core/editableProject'
import { createCodeObservationRegistry } from '../../src/monaco/codeObservation'
import { PYTHON_PROGRAMMING_CODECS } from '../../src/python/blocks/catalog'
import { readPythonWorkspaceDraft } from '../../src/python/blocks/workspaceDraft'
import { createPythonLanguageHttpProvider } from '../../src/python/language/httpProvider'
import type { StudioRuntimeEnvironment } from '../../src/runtime/environment'
import { createPythonRuntimeProvider } from '../../src/runtime/python/provider'
import { createStudioRuntimeRegistry } from '../../src/runtime/registry'
import { useProjectStore } from '../../src/state/projectStore'
import { refinePythonProjectDocument } from '../../src/state/pythonProjectValidation'
import { StudioStoresContext } from '../../src/state/storesContext'
import { createStudioStores } from '../../src/state/studioStores'
import { StudioCodeObservationProvider } from '../../src/studio/code-observation'
import {
  type LearningConfig,
  resolveStudioConfig,
  STANDALONE_CONFIG,
  StudioConfigProvider,
} from '../../src/studio/config'
import { StudioLayoutProvider } from '../../src/studio/layoutContext'
import { StudioExecutionProvider } from '../../src/studio/observation'
import { StudioRuntimeEnvironmentProvider } from '../../src/studio/runtime-environment'

export function createBridgeProbe(root: Root) {
  const codeObservation = createCodeObservationRegistry()
  const stores = createStudioStores({ persistence: 'none' })
  const selections: { selectedBlockId: string | null; source: string | null; nonce: number }[] = []
  const unsubscribeSelections = stores.highlight.subscribe((state) => {
    selections.push({
      selectedBlockId: state.selectedBlockId,
      source: state.source,
      nonce: state.selectionNonce,
    })
    if (selections.length > 40) selections.shift()
  })
  const selectedEvents: unknown[] = []
  let environment: StudioRuntimeEnvironment
  let mode: 'blocks' | 'bridge' | 'code' = 'bridge'
  let learning: LearningConfig = { ...STANDALONE_CONFIG.learning, pythonLevel: 1 }
  let narrow = false
  function Editor() {
    const id = useProjectStore((state) => state.project?.id)
    return <ModeArea projectMode={mode} projectId={id} />
  }
  function render() {
    root.render(
      <StrictMode>
        <StudioCodeObservationProvider value={codeObservation}>
          <StudioStoresContext.Provider value={stores}>
            <StudioRuntimeEnvironmentProvider value={environment}>
              <StudioConfigProvider
                value={{
                  ...STANDALONE_CONFIG,
                  ...resolveStudioConfig({ professional: true }, undefined),
                  learning,
                }}
              >
                <StudioExecutionProvider
                  value={{
                    editingAccess: 'author',
                    autoRun: false,
                    requireIsolatedPreview: true,
                    muted: false,
                  }}
                >
                  <StudioLayoutProvider
                    value={{ width: narrow ? 600 : 1280, isNarrow: narrow, isCompact: false }}
                  >
                    <div data-sz-theme="light" className="h-full bg-sz-bg text-sz-fg">
                      <Editor />
                    </div>
                  </StudioLayoutProvider>
                </StudioExecutionProvider>
              </StudioConfigProvider>
            </StudioRuntimeEnvironmentProvider>
          </StudioStoresContext.Provider>
        </StudioCodeObservationProvider>
      </StrictMode>,
    )
  }
  return {
    codeObservation,
    focusTutor(target: {
      blockId?: string
      blockType: string
      category: string
      subcategory?: string
    }) {
      stores.highlight.getState().focusTutorReference(target)
    },
    selectedBlockId() {
      return stores.highlight.getState().selectedBlockId
    },
    observeSelections() {
      for (const workspace of Blockly.common.getAllWorkspaces())
        workspace.addChangeListener((event) => {
          if (event.type !== Blockly.Events.SELECTED) return
          const id = (event as Blockly.Events.Selected).newElementId
          selectedEvents.push({
            event: event.toJson(),
            listening: workspace.id,
            hasBlock: !!id && !!workspace.getBlockById(id),
            actual: Blockly.common.getSelected()?.id,
          })
          if (selectedEvents.length > 40) selectedEvents.shift()
        })
    },
    selectionDebug() {
      const selected = Blockly.common.getSelected()
      return {
        selections,
        selectedEvents,
        actual: selected?.id ?? null,
        workspace: selected?.workspace.id ?? null,
      }
    },
    scrollCode(line: number) {
      monaco.editor.getEditors()[0]?.revealLineInCenter(line)
    },
    async create() {
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
      const frame = new URL(config.providerFrameURL)
      const provider = createPythonRuntimeProvider({
        id: 'python-bridge-probe',
        allowedOrigins: [frame.origin],
        resolveFrame: async () => ({
          url: frame.href,
          runtimeManifestSha256: release.manifestSha256,
        }),
      })
      environment = {
        catalog,
        pythonLanguage: createPythonLanguageHttpProvider({
          async authorization(projectId) {
            const project = stores.project.getState().project
            if (!project || !isPythonProject(project) || project.id !== projectId)
              throw new Error('Project changed')
            const subject = studioRuntimeSubject(project)
            return {
              context: { kind: 'free', audience: 'kids', projectId },
              operation: 'analyze',
              subject,
              revision: await sha256Hex(canonicalJson(subject)),
            }
          },
        }),
        pythonAuthoring: [
          { runtime: release, blockIds: PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id) },
        ],
        registry: createStudioRuntimeRegistry([
          {
            id: provider.id,
            profileId: release.profileId,
            programmingLanguage: 'python',
            kinds: ['classic', 'pro'],
            load: async () => provider,
          },
        ]),
        access: () => ({
          releaseStatus: 'active',
          grantedCapabilities: ['edit', 'execute', 'python-repl'],
          grantedExtensionIds: ['python-turtle'],
          hostOperations: [
            { capability: 'edit', state: 'available' },
            { capability: 'execute', state: 'available' },
            { capability: 'python-repl', state: 'available' },
          ],
          curation: null,
        }),
        resolvePythonAnalysis: async () => ({
          url: new URL('analysis.html', frame).href,
          allowedOrigins: [frame.origin],
        }),
      }
      const project = await refinePythonProjectDocument(
        await (await fetch('/project/classic-portable')).json(),
      )
      if (project.kind !== 'classic') throw new Error('Fixture')
      stores.project.getState().hydrateProject({
        ...project,
        files: { ...project.files, 'main.py': '# placar\nx = 3\nprint(x)\n' },
      })
      render()
    },
    state() {
      const project = stores.project.getState().project
      if (!project || !isPythonProject(project) || project.kind !== 'classic')
        throw new Error('No project')
      return {
        source: project.files['main.py'],
        pending: readPythonWorkspaceDraft(project)?.pending ?? false,
        logs: stores.logs.getState().entries,
      }
    },
    replaceSource(value: string) {
      const editor = monaco.editor
        .getEditors()
        .find((editor) => editor.getModel()?.uri.path.endsWith('/main.py'))
      const model = editor?.getModel()
      if (!editor || !model) throw new Error('Monaco not ready')
      editor.pushUndoStop()
      editor.executeEdits('qualification', [{ range: model.getFullModelRange(), text: value }])
      editor.pushUndoStop()
    },
    replaceSavedSource(value: string) {
      const issue = stores.project.getState().setPythonFile('main.py', value)
      if (issue) throw new Error(issue)
    },
    switchProject(source: string) {
      const project = stores.project.getState().project
      if (!project || !isPythonProject(project) || project.kind !== 'classic')
        throw new Error('No project')
      stores.project.getState().hydrateProject({
        ...project,
        id: crypto.randomUUID(),
        files: { ...project.files, 'main.py': source },
        blocksState: null,
      })
    },
    layout(value: boolean) {
      narrow = value
      render()
    },
    cursorPoint(line: number, column: number) {
      const editor = monaco.editor
        .getEditors()
        .find((editor) => editor.getModel()?.uri.path.endsWith('/main.py'))
      const position = editor?.getScrolledVisiblePosition({ lineNumber: line, column })
      const bounds = editor?.getDomNode()?.getBoundingClientRect()
      if (!position || !bounds) throw new Error('Monaco position not visible')
      return {
        x: bounds.left + position.left + 2,
        y: bounds.top + position.top + position.height / 2,
      }
    },
    mode(value: 'blocks' | 'bridge') {
      mode = value
      render()
    },
    learning(value: Partial<LearningConfig>) {
      learning = { ...learning, ...value }
      render()
    },
    approveBlocks(approved: boolean) {
      environment = {
        ...environment,
        pythonAuthoring: approved
          ? environment.catalog.releases.map((runtime) => ({
              runtime,
              blockIds: PYTHON_PROGRAMMING_CODECS.map((codec) => codec.id),
            }))
          : [],
      }
      render()
    },
    async openPro(files?: Record<string, string>) {
      const project = await refinePythonProjectDocument(
        await (await fetch('/project/portable')).json(),
      )
      if (project.kind !== 'pro') throw new Error('Expected Pro')
      stores.project.getState().hydrateProject({
        ...project,
        tree: {
          ...project.tree,
          'src/main.py': { kind: 'file', content: 'print("Pro Python")\n' },
          ...Object.fromEntries(
            Object.entries(files ?? {}).map(([path, content]) => [
              path,
              { kind: 'file' as const, content },
            ]),
          ),
        },
      })
      mode = 'code'
      render()
    },
    proState() {
      const project = stores.project.getState().project
      const editor = monaco.editor.getEditors()[0],
        model = editor?.getModel()
      return {
        tree: project?.tree,
        entrypoint: project && isPythonProject(project) ? project.python.entrypoint : null,
        active: model?.uri.path,
        source: model?.getValue(),
        position: editor?.getPosition(),
        logs: stores.logs.getState().entries,
        markers: monaco.editor
          .getModelMarkers({ owner: 'sz-python-pyright' })
          .map(({ message, source, code, startLineNumber, startColumn, resource }) => ({
            message,
            source,
            code,
            line: startLineNumber,
            column: startColumn,
            path: resource.path,
          })),
      }
    },
    proCursor(lineNumber: number, column: number) {
      const editor = monaco.editor.getEditors()[0]
      if (!editor) throw new Error('No editor')
      editor.setPosition({ lineNumber, column })
      editor.focus()
    },
    async proAction(action: string) {
      const editor = monaco.editor.getEditors()[0]
      if (!editor) throw new Error('No editor')
      const selected = editor.getAction(action)
      if (!selected) throw new Error(`Missing action ${action}`)
      await selected.run()
    },
    unmount() {
      unsubscribeSelections()
      flushSync(() => root.render(null))
    },
  }
}
declare global {
  var pythonBridgeProbe: ReturnType<typeof createBridgeProbe>
}
