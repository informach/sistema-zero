import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { persistProject } from '../../state/persistence'
import {
  captureProjectStorageScope,
  setProjectStorageNamespace,
} from '../../state/projectStorageRuntime'
import { loadSanitizedProjectById } from '../../state/projectStore'
import { createStudioStores } from '../../state/studioStores'
import {
  createPythonWorkspaceDraft,
  readPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from './workspaceDraft'

test('pagehide persists an unfinished gesture before asynchronous generation exists', async () => {
  const previous = captureProjectStorageScope()
  setProjectStorageNamespace(`python-draft-exit-${crypto.randomUUID()}`)
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const stores = createStudioStores({ persistence: 'local' })
  let detach: (() => void) | undefined
  try {
    await persistProject(project)
    stores.project.getState().hydrateProject(project)
    detach = stores.persistence.attach()
    const active = stores.project.getState().project
    if (active?.programmingLanguage !== 'python' || active.kind !== 'classic')
      throw new Error('Fixture')
    const draft = createPythonWorkspaceDraft(
      active,
      'main.py',
      {
        blocks: { languageVersion: 0, blocks: [{ type: 'sz_py_print', id: 'pending-print' }] },
      },
      ['pending-print'],
    )
    expect(stores.project.getState().applyPythonSourceFiles(active, active.files, draft)).toBeNull()
    window.dispatchEvent(new Event('pagehide'))
    detach()
    detach = undefined
    const reopened = await loadSanitizedProjectById(project.id)
    if (reopened?.programmingLanguage !== 'python')
      throw new Error('Python draft was not persisted')
    expect(reopened.files).toEqual(project.files)
    expect(readPythonWorkspaceDraft(reopened)).toEqual(draft)
  } finally {
    detach?.()
    setProjectStorageNamespace(previous.namespace)
  }
})

test('IndexedDB reopening preserves independent file layouts and an unfinished file', async () => {
  const previous = captureProjectStorageScope()
  setProjectStorageNamespace(`python-file-layouts-${crypto.randomUUID()}`)
  try {
    const { project } = await pythonEnvironmentFixture('classic')
    if (project.kind !== 'classic') throw new Error('Fixture')
    const files = { ...project.files, 'helper.py': 'print(8)\n' }
    let current = { ...project, files }
    const main = {
      ...createPythonWorkspaceDraft(current, 'main.py', { note: 'principal' }, []),
      pending: false,
    }
    current = { ...current, blocksState: updatePythonWorkspaceDraft(current, main.path, main) }
    const helper = createPythonWorkspaceDraft(current, 'helper.py', { note: 'pendente' }, [])
    current = { ...current, blocksState: updatePythonWorkspaceDraft(current, helper.path, helper) }
    await persistProject(current)
    const reopened = await loadSanitizedProjectById(current.id)
    if (reopened?.programmingLanguage !== 'python') throw new Error('Python project missing')
    expect(reopened.files).toEqual(files)
    expect(readPythonWorkspaceDraft(reopened, 'main.py')).toEqual(main)
    expect(readPythonWorkspaceDraft(reopened, 'helper.py')).toEqual(helper)
  } finally {
    setProjectStorageNamespace(previous.namespace)
  }
})
