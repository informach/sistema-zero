import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { persistProject } from '../../state/persistence'
import {
  captureProjectStorageScope,
  setProjectStorageNamespace,
} from '../../state/projectStorageRuntime'
import { createProjectStore, loadSanitizedProjectById } from '../../state/projectStore'
import { createStudioStores } from '../../state/studioStores'
import { registerPythonBlocks } from './blockly'
import { ensurePythonProgramArea } from './programArea'
import { preparePythonScratchRestore } from './restoreWorkspace'
import {
  capturePythonWorkspace,
  readPythonScratchWorkspace,
  readPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from './workspaceDraft'
import { savePythonWorkspace } from './workspaceState'

async function fixture() {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const initial = { ...project, files: { ...project.files, 'folder/helper.py': 'print(1)\n' } }
  const ws = new Blockly.Workspace()
  try {
    registerPythonBlocks()
    const roots = ensurePythonProgramArea(ws, [], 'folder/helper.py')
    const block = ws.newBlock('sz_py_integer', 'scratch-number')
    block.setFieldValue('73', 'NUMBER')
    block.setCommentText('Minha ideia')
    block.moveBy(810, 140)
    const { draft, scratch } = capturePythonWorkspace(
      initial,
      'folder/helper.py',
      savePythonWorkspace(ws, new Map()),
      roots,
    )
    return {
      ...initial,
      blocksState: updatePythonWorkspaceDraft(initial, draft.path, draft, scratch),
    }
  } finally {
    ws.dispose()
  }
}

for (const action of ['source edit and undo', 'discard pending edit'] as const) {
  test(`scratch survives ${action}, IndexedDB reopening and a fresh Program projection`, async () => {
    const scope = captureProjectStorageScope()
    setProjectStorageNamespace(`python-scratch-${crypto.randomUUID()}`)
    const ws = new Blockly.Workspace()
    try {
      const project = await fixture()
      const scratch = readPythonScratchWorkspace(project, 'folder/helper.py')
      const store = createProjectStore()
      store.getState().hydrateProject(project)
      if (action === 'source edit and undo') {
        expect(store.getState().setPythonFile('folder/helper.py', 'def invalid(')).toBeNull()
        expect(
          store.getState().setPythonFile('folder/helper.py', project.files['folder/helper.py']!),
        ).toBeNull()
      } else {
        expect(
          store
            .getState()
            .applyPythonSourceFiles(
              project,
              project.files,
              updatePythonWorkspaceDraft(project, 'folder/helper.py'),
            ),
        ).toBeNull()
      }
      await persistProject(store.getState().project!)
      const reopened = await loadSanitizedProjectById(project.id)
      if (reopened?.programmingLanguage !== 'python') throw new Error('Project missing')
      expect(readPythonWorkspaceDraft(reopened, 'folder/helper.py')).toBeUndefined()
      expect(readPythonScratchWorkspace(reopened, 'folder/helper.py')).toEqual(scratch)
      const roots = ensurePythonProgramArea(ws, [], 'folder/helper.py')
      preparePythonScratchRestore(readPythonScratchWorkspace(reopened, 'folder/helper.py'))!(ws)
      const block = ws.getBlockById('scratch-number')!
      expect(block.getFieldValue('NUMBER')).toBe('73')
      expect(block.getCommentText()).toBe('Minha ideia')
      expect(block.getRelativeToSurfaceXY()).toMatchObject({ x: 810, y: 140 })
      expect(block.getParent()).toBeNull()
      expect(ws.getBlockById(roots[0]!)!.getInputTargetBlock('BODY')).toBeNull()
    } finally {
      ws.dispose()
      setProjectStorageNamespace(scope.namespace)
    }
  })
}

test('scratch follows a folder rename independently of source cache and disappears on file removal', async () => {
  const project = await fixture()
  const scratch = readPythonScratchWorkspace(project, 'folder/helper.py')
  const store = createProjectStore()
  store.getState().hydrateProject(project)
  expect(store.getState().setPythonFile('folder/helper.py', 'print(2)\n')).toBeNull()
  expect(store.getState().renameExtraFile('folder', 'renamed')).toBeNull()
  const current = store.getState().project!
  if (current.programmingLanguage !== 'python' || current.kind !== 'classic')
    throw new Error('Fixture')
  expect(readPythonScratchWorkspace(current, 'folder/helper.py')).toBeUndefined()
  expect(readPythonScratchWorkspace(current, 'renamed/helper.py')).toEqual(scratch)
  expect(readPythonWorkspaceDraft(current, 'renamed/helper.py')).toBeUndefined()
  store.getState().removeExtraFile('renamed/helper.py')
  const removed = store.getState().project!
  if (removed.programmingLanguage !== 'python') throw new Error('Fixture')
  expect(readPythonScratchWorkspace(removed, 'renamed/helper.py')).toBeUndefined()
})

test('scratch preflight rejects executable areas and duplicate IDs before appending anything', async () => {
  const project = await fixture()
  const ws = new Blockly.Workspace()
  try {
    ensurePythonProgramArea(ws, [], 'main.py')
    expect(() => preparePythonScratchRestore(savePythonWorkspace(ws, new Map()))).toThrow(
      'restaurar',
    )
    ws.newBlock('sz_py_integer', 'scratch-number')
    const restore = preparePythonScratchRestore(
      readPythonScratchWorkspace(project, 'folder/helper.py'),
    )!
    const before = savePythonWorkspace(ws, new Map())
    expect(() => restore(ws)).toThrow('identificadores')
    expect(savePythonWorkspace(ws, new Map())).toEqual(before)
  } finally {
    ws.dispose()
  }
})

test('late hydration preserves scratch after a code edit without reviving a retired pending edit', async () => {
  const saved = await fixture()
  const project = { ...saved, blocksState: null }
  const { promise: load, resolve: deliver } = Promise.withResolvers<typeof saved.blocksState>()
  const stores = createStudioStores({
    persistence: {
      load: async () => project,
      save: async () => {},
      loadBlocksState: () => load,
    },
  })
  stores.project.getState().hydrateProject(project)
  stores.persistence.hydrateAfterLoad(project)
  expect(stores.project.getState().setPythonFile('folder/helper.py', 'print(2)\n')).toBeNull()
  deliver(saved.blocksState)
  await load
  expect(stores.project.getState().blocksHydration).toBe('restored')
  expect(
    stores.project.getState().setPythonFile('folder/helper.py', saved.files['folder/helper.py']!),
  ).toBeNull()
  const current = stores.project.getState().project!
  if (current.programmingLanguage !== 'python') throw new Error('Fixture')
  expect(readPythonWorkspaceDraft(current, 'folder/helper.py')).toBeUndefined()
  expect(readPythonScratchWorkspace(current, 'folder/helper.py')).toEqual(
    readPythonScratchWorkspace(saved, 'folder/helper.py'),
  )
})
