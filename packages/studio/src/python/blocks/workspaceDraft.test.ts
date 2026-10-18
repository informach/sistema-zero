import { expect, test } from 'bun:test'
import { buildPythonSourceFiles } from '../../export/pythonSource'
import { preparePythonExecutionSnapshot } from '../../runtime/python/snapshot'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { createProjectStore } from '../../state/projectStore'
import { refinePythonProjectDocument } from '../../state/pythonProjectValidation'
import { preparePythonPromotion } from '../../state/pythonPromotion'
import {
  assertPythonVisualDraftSettled,
  createPythonWorkspaceDraft,
  readPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from './workspaceDraft'

test('an interrupted visual edit remains recoverable and cannot silently execute/export/promote old source', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const store = createProjectStore()
  store.getState().hydrateProject(project)
  const workspace = {
    blocks: { languageVersion: 0, blocks: [{ type: 'sz_py_print', id: 'root' }] },
  }
  const draft = createPythonWorkspaceDraft(project, project.python.entrypoint, workspace, ['root'])
  workspace.blocks.blocks.length = 0
  expect(store.getState().applyPythonSourceFiles(project, project.files, draft)).toBeNull()
  const reopened = await refinePythonProjectDocument(store.getState().project)
  expect(readPythonWorkspaceDraft({ ...reopened, id: 'duplicated-project' })?.generation).toBe(
    draft.generation,
  )
  expect(reopened.files).toEqual(project.files)
  expect(readPythonWorkspaceDraft(reopened)?.workspace).toEqual({
    blocks: { languageVersion: 0, blocks: [{ type: 'sz_py_print', id: 'root' }] },
  })
  await expect(preparePythonExecutionSnapshot(reopened)).rejects.toThrow('rascunho')
  await expect(buildPythonSourceFiles(reopened)).rejects.toThrow('rascunho')
  await expect(
    preparePythonPromotion(reopened, { originalId: 'original', now: Date.now() }),
  ).rejects.toThrow('rascunho')
  expect(store.getState().applyPythonSourceFiles(project, project.files, null)).toContain('mudou')
  if (reopened.kind !== 'classic') throw new Error('Fixture')
  store.getState().hydrateProject(reopened)
  const files = { ...reopened.files, [project.python.entrypoint]: 'print("edição validada")\n' }
  expect(store.getState().applyPythonSourceFiles(reopened, files, null)).toBeNull()
  const committed = await refinePythonProjectDocument(store.getState().project)
  expect(readPythonWorkspaceDraft(committed)).toBeUndefined()
  expect(
    (await preparePythonExecutionSnapshot(committed)).files.some((file) =>
      new TextDecoder().decode(file.bytes).includes('edição validada'),
    ),
  ).toBe(true)
})

test('a cache from other source cannot replace code or prevent execution of the current source', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const draft = createPythonWorkspaceDraft(project, project.python.entrypoint, {}, [])
  const altered = {
    ...project,
    files: { ...project.files, [project.python.entrypoint]: '# fonte mais nova\n' },
    blocksState: draft,
  }
  expect(readPythonWorkspaceDraft(altered)).toBeUndefined()
  expect(() => assertPythonVisualDraftSettled(altered)).not.toThrow()
  const snapshot = await preparePythonExecutionSnapshot(altered)
  expect(
    new TextDecoder().decode(
      snapshot.files.find((file) => file.path === project.python.entrypoint)!.bytes,
    ),
  ).toBe('# fonte mais nova\n')
  expect(() => createPythonWorkspaceDraft(project, 'missing.py', {}, [])).toThrow()
  expect(() =>
    createPythonWorkspaceDraft(project, project.python.entrypoint, {}, ['same', 'same']),
  ).toThrow()
})

test('unknown cache envelopes remain inert without coercing imported JSON objects', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  for (const blocksState of [
    { kind: { toString: 'not callable' } },
    { kind: ['python-workspace-draft'] },
    { kind: 'python-workspace-collection', version: 2, activePath: { toString: 'not callable' } },
    {
      kind: 'python-workspace-collection',
      version: 1,
      activePath: { toString: 'not callable' },
      drafts: [],
    },
  ]) {
    const imported = { ...project, blocksState }
    expect(readPythonWorkspaceDraft(imported)).toBeUndefined()
    expect(() => assertPythonVisualDraftSettled(imported)).not.toThrow()
    expect((await preparePythonExecutionSnapshot(imported)).files.length).toBeGreaterThan(0)
  }
})

for (const pending of [true, false])
  test(`unrelated files, rename and extensions preserve visual state (pending=${pending})`, async () => {
    const { project } = await pythonEnvironmentFixture('classic')
    if (project.kind !== 'classic') throw new Error('Fixture')
    const source = { ...project, files: { ...project.files, 'helper.py': 'print(1)\n' } }
    const draft = { ...createPythonWorkspaceDraft(source, 'helper.py', {}, []), pending }
    const store = createProjectStore()
    store.getState().hydrateProject({ ...source, blocksState: draft })
    expect(store.getState().setPythonFile('main.py', 'print(2)\n')).toBeNull()
    expect(
      readPythonWorkspaceDraft(await refinePythonProjectDocument(store.getState().project))
        ?.generation,
    ).toBe(draft.generation)
    expect(store.getState().addExtraFile('other.py')).toBeNull()
    expect(store.getState().renameExtraFile('helper.py', 'renamed.py')).toBeNull()
    const renamed = store.getState().project!
    if (renamed.programmingLanguage !== 'python') throw new Error('Fixture')
    expect(readPythonWorkspaceDraft(renamed)?.path).toBe('renamed.py')
    expect(await store.getState().applyPythonExtensions(renamed, [])).toBeNull()
    const changed = await refinePythonProjectDocument(store.getState().project)
    expect(readPythonWorkspaceDraft(changed)?.generation).toBe(draft.generation)
    expect(store.getState().setPythonFile('renamed.py', 'print(3)\n')).toBeNull()
    expect(
      readPythonWorkspaceDraft(await refinePythonProjectDocument(store.getState().project)),
    ).toBeUndefined()
  })

test('each file retains its visual cache through switching, rename, source edits and selective discard', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const first = { ...project, files: { ...project.files, 'helper.py': 'print(1)\n' } }
  const main = {
    ...createPythonWorkspaceDraft(first, 'main.py', { note: 'principal' }, []),
    pending: false,
  }
  const withMain = { ...first, blocksState: updatePythonWorkspaceDraft(first, main.path, main) }
  const helper = {
    ...createPythonWorkspaceDraft(withMain, 'helper.py', { note: 'auxiliar' }, []),
    pending: false,
  }
  const both = {
    ...withMain,
    blocksState: updatePythonWorkspaceDraft(withMain, helper.path, helper),
  }
  const store = createProjectStore()
  store.getState().hydrateProject(both)
  expect(readPythonWorkspaceDraft(both, 'main.py')).toEqual(main)
  expect(readPythonWorkspaceDraft(both, 'helper.py')).toEqual(helper)
  expect(store.getState().renameExtraFile('helper.py', 'renamed.py')).toBeNull()
  let current = await refinePythonProjectDocument(store.getState().project)
  if (current.kind !== 'classic') throw new Error('Fixture')
  expect(readPythonWorkspaceDraft(current, 'main.py')).toEqual(main)
  expect(readPythonWorkspaceDraft(current, 'helper.py')).toBeUndefined()
  expect(readPythonWorkspaceDraft(current, 'renamed.py')).toEqual({ ...helper, path: 'renamed.py' })
  const pending = createPythonWorkspaceDraft(current, 'main.py', { note: 'pendente' }, [])
  current = { ...current, blocksState: updatePythonWorkspaceDraft(current, pending.path, pending) }
  // Selecting/settling a different cache must not hide a pending entry from execution gates.
  const other = readPythonWorkspaceDraft(current, 'renamed.py')!
  current = { ...current, blocksState: updatePythonWorkspaceDraft(current, other.path, other) }
  expect(readPythonWorkspaceDraft(current)?.pending).toBe(false)
  expect(() => assertPythonVisualDraftSettled(current)).toThrow('rascunho')
  const discarded = { ...current, blocksState: updatePythonWorkspaceDraft(current, 'main.py') }
  expect(readPythonWorkspaceDraft(discarded, 'renamed.py')).toEqual(other)
  expect(() => assertPythonVisualDraftSettled(discarded)).not.toThrow()
  store.getState().hydrateProject(current)
  expect(store.getState().setPythonFile('renamed.py', 'print(9)\n')).toBeNull()
  const edited = await refinePythonProjectDocument(store.getState().project)
  expect(readPythonWorkspaceDraft(edited, 'main.py')).toEqual(pending)
  expect(readPythonWorkspaceDraft(edited, 'renamed.py')).toBeUndefined()
})

test('renaming cannot publish a visual collection exceeding its recovery budget', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const original = { ...project, files: { ...project.files, 'a.py': '' } }
  const main = { ...createPythonWorkspaceDraft(original, 'main.py', {}, []), pending: false }
  const other = {
    ...createPythonWorkspaceDraft(original, 'a.py', { note: '' }, []),
    pending: false,
  }
  const state = {
    kind: 'python-workspace-collection',
    version: 1,
    activePath: 'main.py',
    drafts: [main, other],
  }
  let textChars = 0
  JSON.stringify(state, (key, value) => {
    textChars += key.length + (typeof value === 'string' ? value.length : 0)
    return value
  })
  other.workspace.note = 'x'.repeat(8_388_608 - textChars - 1)
  const store = createProjectStore()
  store.getState().hydrateProject({ ...original, blocksState: state })
  const before = store.getState().project!
  if (before.programmingLanguage !== 'python') throw new Error('Fixture')
  expect(readPythonWorkspaceDraft(before, 'a.py')?.generation).toBe(other.generation)
  expect(store.getState().renameExtraFile('a.py', 'longer_a.py')).toContain('complexidade')
  expect(store.getState().project).toBe(before)
  expect(readPythonWorkspaceDraft(before, 'main.py')).toEqual(main)
  expect(readPythonWorkspaceDraft(before, 'a.py')?.generation).toBe(other.generation)
})
