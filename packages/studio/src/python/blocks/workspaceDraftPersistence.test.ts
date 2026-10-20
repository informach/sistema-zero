import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import { prepareProjectDownload } from '../../export/projectDownload'
import { buildPythonSourceFiles } from '../../export/pythonSource'
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

for (const writer of ['local writer', 'persistence service'] as const) {
  test(`${writer}: editing another Python file cannot discard a recoverable visual gesture`, async () => {
    const previous = captureProjectStorageScope()
    setProjectStorageNamespace(`python-draft-other-file-${crypto.randomUUID()}`)
    const stores = createStudioStores({ persistence: 'local' })
    let detach: (() => void) | undefined
    try {
      const { project } = await pythonEnvironmentFixture('classic')
      if (project.kind !== 'classic') throw new Error('Fixture')
      const initial = { ...project, files: { ...project.files, 'helper.py': 'print(1)\n' } }
      stores.project.getState().hydrateProject(initial)
      detach = stores.persistence.attach()
      const draft = createPythonWorkspaceDraft(initial, 'main.py', { note: 'unfinished' }, [])
      expect(
        stores.project.getState().applyPythonSourceFiles(initial, initial.files, draft),
      ).toBeNull()
      expect(stores.project.getState().setPythonFile('helper.py', 'print(2)\n')).toBeNull()
      const edited = stores.project.getState().project
      if (edited?.programmingLanguage !== 'python' || edited.kind !== 'classic')
        throw new Error('Python project missing')
      expect(readPythonWorkspaceDraft(edited, 'main.py')).toEqual(draft)
      if (writer === 'local writer') await persistProject(edited)
      else await stores.persistence.save()
      const reopened = await loadSanitizedProjectById(initial.id)
      if (reopened?.programmingLanguage !== 'python' || reopened.kind !== 'classic')
        throw new Error('Python project missing')
      expect(reopened.files).toEqual(edited.files)
      expect(readPythonWorkspaceDraft(reopened, 'main.py')).toEqual(draft)
    } finally {
      detach?.()
      setProjectStorageNamespace(previous.namespace)
    }
  })
}

for (const editTiming of ['before opening', 'during hydration'] as const) {
  test(`Python draft hydration survives unrelated source edits ${editTiming}`, async () => {
    const { project } = await pythonEnvironmentFixture('classic')
    if (project.kind !== 'classic') throw new Error('Fixture')
    const initial = {
      ...project,
      files: { ...project.files, 'helper.py': 'print(1)\n' },
      ...(editTiming === 'before opening' ? { bridgeCodeAhead: true as const } : {}),
    }
    const draft = createPythonWorkspaceDraft(initial, 'main.py', { note: 'unfinished' }, [])
    const { promise: load, resolve: deliver } = Promise.withResolvers<typeof draft>()
    const stores = createStudioStores({
      persistence: {
        load: async () => initial,
        save: async () => {},
        loadBlocksState: () => load,
      },
    })
    stores.project.getState().hydrateProject(initial)
    stores.persistence.hydrateAfterLoad(initial)
    if (editTiming === 'during hydration')
      expect(stores.project.getState().setPythonFile('helper.py', 'print(2)\n')).toBeNull()
    deliver(draft)
    await load
    const current = stores.project.getState().project
    if (current?.programmingLanguage !== 'python') throw new Error('Python project missing')
    expect(readPythonWorkspaceDraft(current, 'main.py')).toEqual(draft)
    expect(stores.project.getState().blocksHydration).toBe('restored')
  })
}

test('source download cannot hide an unfinished Python gesture after editing another file', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const initial = { ...project, files: { ...project.files, 'helper.py': 'print(1)\n' } }
  const stores = createStudioStores({ persistence: 'none' })
  stores.project.getState().hydrateProject(initial)
  const draft = createPythonWorkspaceDraft(initial, 'main.py', { note: 'unfinished' }, [])
  expect(stores.project.getState().applyPythonSourceFiles(initial, initial.files, draft)).toBeNull()
  expect(stores.project.getState().setPythonFile('helper.py', 'print(2)\n')).toBeNull()
  await expect(
    prepareProjectDownload(stores.project, undefined, new AbortController().signal, (snapshot) =>
      buildPythonSourceFiles(snapshot),
    ),
  ).rejects.toThrow('rascunho')
  const current = stores.project.getState().project
  if (current?.programmingLanguage !== 'python') throw new Error('Python project missing')
  expect(readPythonWorkspaceDraft(current, 'main.py')).toEqual(draft)
})

for (const discard of ['source edit', 'visual discard'] as const) {
  test(`${discard}: saving an empty Python cache cannot resurrect a retired gesture`, async () => {
    const previous = captureProjectStorageScope()
    setProjectStorageNamespace(`python-draft-retired-${crypto.randomUUID()}`)
    try {
      const { project } = await pythonEnvironmentFixture('classic')
      if (project.kind !== 'classic') throw new Error('Fixture')
      const draft = createPythonWorkspaceDraft(project, 'main.py', { note: 'retired' }, [])
      const original = { ...project, blocksState: draft }
      const stores = createStudioStores({ persistence: 'none' })
      stores.project.getState().hydrateProject(original)
      await persistProject(original)
      if (discard === 'source edit') {
        expect(stores.project.getState().setPythonFile('main.py', 'print(2)\n')).toBeNull()
        await persistProject(stores.project.getState().project!)
        expect(stores.project.getState().setPythonFile('main.py', draft.baseSource)).toBeNull()
      } else {
        expect(
          stores.project.getState().applyPythonSourceFiles(original, original.files, null),
        ).toBeNull()
      }
      await persistProject(stores.project.getState().project!)
      const reopened = await loadSanitizedProjectById(original.id)
      if (reopened?.programmingLanguage !== 'python') throw new Error('Python project missing')
      expect(readPythonWorkspaceDraft(reopened, 'main.py')).toBeUndefined()
    } finally {
      setProjectStorageNamespace(previous.namespace)
    }
  })
}

test('a draft retired by a same-file edit during hydration cannot return after Undo', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const draft = createPythonWorkspaceDraft(project, 'main.py', { note: 'retired' }, [])
  const { promise: load, resolve: deliver } = Promise.withResolvers<typeof draft>()
  const stores = createStudioStores({
    persistence: {
      load: async () => project,
      save: async () => {},
      loadBlocksState: () => load,
    },
  })
  stores.project.getState().hydrateProject(project)
  stores.persistence.hydrateAfterLoad(project)
  expect(stores.project.getState().setPythonFile('main.py', 'print(2)\n')).toBeNull()
  deliver(draft)
  await load
  expect(stores.project.getState().blocksHydration).toBe('restored')
  expect(stores.project.getState().setPythonFile('main.py', draft.baseSource)).toBeNull()
  const current = stores.project.getState().project
  if (current?.programmingLanguage !== 'python') throw new Error('Python project missing')
  expect(readPythonWorkspaceDraft(current, 'main.py')).toBeUndefined()
})
