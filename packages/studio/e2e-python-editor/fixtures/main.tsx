import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PythonSourceEditor } from '../../src/components/code/PythonSourceEditor'
import { isPythonProject } from '../../src/core/editableProject'
import { pythonEnvironmentFixture } from '../../src/state/fixtures/pythonEnvironment'
import { StudioStoresContext } from '../../src/state/storesContext'
import { createStudioStores } from '../../src/state/studioStores'
import './styles.css'
import { createAuthoringProbe } from './authoring'
import { createBridgeProbe } from './bridge'
import { createFreeProbe } from './free'
import { createLiveProbe } from './live'
import { createPublicAuthorProbe } from './publicAuthor'

const stores = createStudioStores({ persistence: 'none', limits: { maxTotalChars: 300 } })
const root = createRoot(document.getElementById('root')!)
const host = {
  async create(kind: 'classic' | 'pro') {
    const { project } = await pythonEnvironmentFixture(kind)
    stores.project.getState().setProject(project)
    root.render(
      <StrictMode>
        <StudioStoresContext.Provider value={stores}>
          <PythonSourceEditor key={project.id} />
        </StudioStoresContext.Provider>
      </StrictMode>,
    )
  },
  source() {
    const project = stores.project.getState().project
    if (!project || !isPythonProject(project)) throw new Error('Python not mounted')
    if (project.kind === 'classic') return project.files['main.py']!
    const node = project.tree['main.py']
    if (node?.kind !== 'file') throw new Error('main.py not found')
    return node.content
  },
  model() {
    const model = monaco.editor.getModels().find((model) => model.uri.path.endsWith('/main.py'))
    if (!model) throw new Error('Monaco not ready')
    return { value: model.getValue(), language: model.getLanguageId(), options: model.getOptions() }
  },
  replace(value: string, boundary = true) {
    const editor = monaco.editor.getEditors()[0]
    const model = editor?.getModel()
    if (!editor || !model) throw new Error('Monaco not ready')
    if (boundary) editor.pushUndoStop()
    editor.executeEdits('qualification', [{ range: model.getFullModelRange(), text: value }])
    if (boundary) editor.pushUndoStop()
  },
  otherFile(content: string) {
    const issue = stores.project.getState().addExtraFile('helper.py')
    if (issue) throw new Error(issue)
    const editIssue = stores.project.getState().setPythonFile('helper.py', content)
    if (editIssue) throw new Error(editIssue)
  },
  undo() {
    stores.editorHistory.get('code')?.undo()
  },
  redo() {
    stores.editorHistory.get('code')?.redo()
  },
}
declare global {
  var pythonEditorProbe: typeof host
}
globalThis.pythonEditorProbe = host
globalThis.pythonBridgeProbe = createBridgeProbe(root)
globalThis.studioAuthoringProbe = createAuthoringProbe(root)
globalThis.studioLiveProbe = createLiveProbe(root)
globalThis.studioFreeProbe = createFreeProbe(root)
globalThis.studioPublicAuthorProbe = createPublicAuthorProbe(root)
