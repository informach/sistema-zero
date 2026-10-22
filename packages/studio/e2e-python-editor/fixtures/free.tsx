import * as Blockly from 'blockly/core'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { useEffect, useState } from 'react'
import type { Root } from 'react-dom/client'
import { StudioProEditor } from '../../../member-shell/src/components/studio/studio-pro-editor'
import { useFreeStudioOptions } from '../../../member-shell/src/components/studio/use-free-options'
import { useFreeStudioRuntime } from '../../../member-shell/src/components/studio/use-free-runtime'
import type { EditableStudioProject } from '../../src/core/editableProject'
import * as Studio from '../../src/index'
import { ProjectList } from '../../src/projects/ProjectList'
import { createStudioStores } from '../../src/state/studioStores'

/** Real project gallery, store and shared Pro host; controlled free service ports are explicit. */
export function createFreeProbe(root: Root) {
  let currentProjectId: string | null = null
  let viewerId = ''
  let includePintaAsset = false
  let includeExamples = false
  function visualWorkspace() {
    const workspaces = Blockly.common
      .getAllWorkspaces()
      .filter(
        (workspace): workspace is Blockly.WorkspaceSvg =>
          workspace instanceof Blockly.WorkspaceSvg &&
          !workspace.isFlyout &&
          workspace.getParentSvg()?.isConnected === true,
      )
    if (workspaces.length !== 1)
      throw new Error(`Expected one live Blockly workspace, got ${workspaces.length}`)
    return workspaces[0]!
  }
  function Classic({ project, close }: { project: EditableStudioProject; close(): void }) {
    const runtime = useFreeStudioRuntime({ project, viewerId })
    return (
      <div className="h-[800px]">
        {runtime.error && <p role="alert">{runtime.error}</p>}
        <Studio.StudioEditor
          initialProject={project}
          persistence="local"
          runtimeEnvironment={runtime.environment}
          pythonLevel={3}
          allowedModes={['blocks', 'bridge', 'code']}
          onExit={close}
        />
      </div>
    )
  }
  function App() {
    const options = useFreeStudioOptions(viewerId)
    const [project, setProject] = useState<EditableStudioProject | null>(null)
    const open = async (id: string) => {
      currentProjectId = id
      let project: EditableStudioProject | null =
        await Studio.createLocalPersistenceAdapter().load(id)
      if (!project) throw new Error('New project not saved')
      if (includePintaAsset) {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 32
        const context = canvas.getContext('2d')
        if (!context) throw new Error('PNG encoder unavailable')
        context.fillStyle = '#17a2ff'
        context.fillRect(0, 0, 32, 32)
        const owned = createStudioStores()
        owned.project.getState().hydrateProject(project)
        const problem = owned.project.getState().addAsset({
          name: 'heroi',
          kind: 'image',
          source: 'library',
          libOrigin: 'pinta',
          libId: 'personal:web-export-drawing',
          libRevision: 1,
          dataUrl: canvas.toDataURL('image/png'),
          width: 32,
          height: 32,
          license: { name: 'CC0', attribution: 'Qualification drawing' },
        })
        if (problem) throw new Error(problem)
        await owned.persistence.save()
        project = owned.project.getState().project
        if (!project) throw new Error('Asset project missing')
      }
      setProject(project)
    }
    const close = () => {
      currentProjectId = null
      setProject(null)
    }
    useEffect(
      () => () => {
        currentProjectId = null
      },
      [],
    )
    if (project?.kind === 'pro')
      return (
        <div className="h-[800px]">
          <StudioProEditor
            freeRuntime
            viewerId={viewerId}
            projectId={project.id}
            theme="light"
            onExit={close}
          />
        </div>
      )
    if (project) return <Classic key={project.id} project={project} close={close} />
    return (
      <div className="h-[800px]">
        {options.loading && <p role="status">Consultando ambientes Python…</p>}
        {options.error && (
          <p role="alert">
            {options.error}
            <button type="button" onClick={options.retry}>
              Tentar novamente
            </button>
          </p>
        )}
        <ProjectList
          professional
          showExamples={includeExamples}
          onOpenProject={(id) => void open(id)}
          pythonCreation={options.creation}
          pythonDiscovery={options}
          theme="light"
        />
      </div>
    )
  }
  return {
    async create(failure = false, pintaAsset = false, examples = false) {
      includePintaAsset = pintaAsset
      includeExamples = examples
      const setup = await (await fetch(`/free-probe/setup?failure=${failure ? 1 : 0}`)).json()
      viewerId = setup.viewerId
      Studio.setStudioStorageNamespace(viewerId)
      root.render(<App />)
    },
    async saved() {
      return currentProjectId ? Studio.createLocalPersistenceAdapter().load(currentProjectId) : null
    },
    workspace() {
      const workspace = visualWorkspace()
      const blocks = workspace.getAllBlocks(false)
      return {
        id: workspace.id,
        count: blocks.length,
        opaque: blocks
          .filter((block) => block.type.startsWith('sz_py_source_'))
          .map((block) => block.id),
        types: [...new Set(blocks.map((block) => block.type))].sort(),
      }
    },
    /** Navigation only: Playwright types into the actual Blockly field afterward. */
    focusAssignmentField(variable: string, fieldName: string) {
      const workspace = visualWorkspace()
      const assignments = workspace
        .getAllBlocks(false)
        .filter(
          (block) =>
            block.type === 'sz_py_assign' &&
            block.getInputTargetBlock('TARGET')?.getFieldValue('NAME') === variable,
        )
      if (assignments.length !== 1) throw new Error(`Expected one assignment to ${variable}`)
      const value = assignments[0]!.getInputTargetBlock('VALUE')
      const field = value?.getField(fieldName)
      if (!value || !field) throw new Error(`Missing editable field ${variable}.${fieldName}`)
      workspace.centerOnBlock(value.id)
      return { blockId: value.id, value: field.getValue() }
    },
    source(value: string) {
      const editor = monaco.editor
        .getEditors()
        .find((item) => item.getModel()?.uri.path.endsWith('/main.py'))
      const model = editor?.getModel()
      if (!editor || !model) throw new Error('Python editor not ready')
      editor.executeEdits('qualification', [{ range: model.getFullModelRange(), text: value }])
    },
    read: () =>
      monaco.editor
        .getEditors()
        .find(
          (editor) =>
            editor.getDomNode()?.isConnected && editor.getModel()?.uri.path.endsWith('/main.py'),
        )
        ?.getModel()
        ?.getValue(),
    close: () => root.unmount(),
  }
}
declare global {
  var studioFreeProbe: ReturnType<typeof createFreeProbe>
}
