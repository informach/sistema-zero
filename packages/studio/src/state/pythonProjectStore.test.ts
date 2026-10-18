import { describe, expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import type { EditableStudioProject } from '../core/editableProject'
import { isPythonProject } from '../core/editableProject'
import { projectPublicationId } from '../core/projectPublication'
import { preparePythonExecutionSnapshot } from '../runtime/python/snapshot'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { documentFixture } from './fixtures/projectDocuments'
import { persistProject } from './persistence'
import { captureProjectStorageScope, setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore, loadSanitizedProjectById } from './projectStore'
import { refinePythonProjectDocument } from './pythonProjectValidation'

async function setup(kind: 'classic' | 'pro') {
  const raw = documentFixture('python', kind)
  raw.assets = []
  const project = await refinePythonProjectDocument(raw)
  const store = createProjectStore()
  store.getState().hydrateProject(project)
  return store
}

describe('one project store for Python Classic and Pro', () => {
  test('v3 duplicates stay reopenable at the maximum title length in all four variants', async () => {
    const previous = captureProjectStorageScope()
    const originalIndexedDB = globalThis.indexedDB
    Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
    setProjectStorageNamespace(`duplicate-${crypto.randomUUID()}`)
    try {
      const store = createProjectStore()
      for (const language of ['javascript', 'python'] as const)
        for (const kind of ['classic', 'pro'] as const) {
          const raw = documentFixture(language, kind)
          raw.name = 'a'.repeat(200)
          raw.assets = []
          if (raw.programmingLanguage === 'python' && raw.kind === 'classic')
            raw.publication = { playId: crypto.randomUUID() }
          const source = (await prepareEditableStudioProject(raw))!
          await persistProject(source)
          const copy = (await store.getState().duplicateProject(source.id))!
          expect(copy.name).toHaveLength(200)
          expect(copy.name).toEndWith(' (cópia)')
          expect(copy.id).not.toBe(source.id)
          expect(projectPublicationId(copy)).toBeUndefined()
          const reopened = await loadSanitizedProjectById(copy.id)
          expect(reopened?.name).toBe(copy.name)
          expect(reopened?.programmingLanguage).toBe(language)
          expect((await loadSanitizedProjectById(source.id))?.name).toBe(source.name)
          const imported = await store
            .getState()
            .importProjectFromJSON(JSON.parse(JSON.stringify(source)))
          expect(projectPublicationId(imported.project)).toBeUndefined()
          expect(
            projectPublicationId((await loadSanitizedProjectById(imported.project.id))!),
          ).toBeUndefined()
          expect(projectPublicationId((await loadSanitizedProjectById(source.id))!)).toBe(
            projectPublicationId(source),
          )
        }
    } finally {
      setProjectStorageNamespace(previous.namespace)
      Object.defineProperty(globalThis, 'indexedDB', {
        value: originalIndexedDB,
        configurable: true,
      })
    }
  })
  for (const kind of ['classic', 'pro'] as const) {
    test(`${kind}: source edits preserve environment and reject lossy changes`, async () => {
      const store = await setup(kind)
      const state = store.getState()
      const before = state.project!
      if (!isPythonProject(before)) throw new Error('fixture')
      const path = before.python.entrypoint
      expect(state.setPythonFile(path, 'def unfinished(\n')).toBeNull()
      const edited = store.getState().project!
      expect(edited).not.toBe(before)
      expect(isPythonProject(edited) && edited.python).toBe(before.python)
      expect(edited.runtime).toBe(before.runtime)
      expect(store.getState().isDirty).toBe(true)
      expect(state.setPythonFile(path, '#'.repeat(256_001))).toContain('limites')
      expect(store.getState().project).toBe(edited)
      state.setFiles({ 'script.js': 'replace()' })
      state.applyProjectState({ files: { 'index.html': 'replace' }, blocksState: { js: true } })
      expect(store.getState().project).toBe(edited)
      state.setEditingAccess('observer')
      expect(state.setPythonFile(path, 'print(123)')).toContain('observação')
      expect(store.getState().project).toBe(edited)
    })

    test(`${kind}: requirements edits can be saved but cannot execute with the old lock`, async () => {
      const store = await setup(kind)
      expect(store.getState().setPythonFile('requirements.txt', 'some-package==1\n')).toBeNull()
      const project = store.getState().project!
      await expect(refinePythonProjectDocument(project)).resolves.toMatchObject({ id: project.id })
      await expect(preparePythonExecutionSnapshot(project)).rejects.toThrow('requirements.txt')
    })
  }

  test('Classic owns main.py; auxiliary Python files follow portable path and source rules', async () => {
    const store = await setup('classic')
    const state = store.getState()
    expect(state.addExtraFile('helpers/math.py')).toBeNull()
    state.setExtraFile('helpers/math.py', 'value = 42\n')
    expect(state.renameExtraFile('helpers/math.py', 'helpers/numbers.py')).toBeNull()
    const project = store.getState().project!
    if (!isPythonProject(project) || project.kind !== 'classic') throw new Error('fixture')
    expect(project.files?.['helpers/numbers.py']).toBe('value = 42\n')
    expect(state.renameExtraFile('main.py', 'start.py')).toContain('inicial')
    expect(state.addExtraFile('Helpers/other.py')).toContain('colidem')
    expect(store.getState().project).toBe(project)
    state.removeExtraFile('helpers/numbers.py')
    const removed = store.getState().project!
    if (!isPythonProject(removed) || removed.kind !== 'classic') throw new Error('fixture')
    expect(removed.files['helpers/numbers.py']).toBeUndefined()
  })

  test('Pro supports Python directories and keeps the entrypoint valid when moving a folder', async () => {
    const store = await setup('pro')
    const state = store.getState()
    expect(state.addProFile('levels/one.py')).toBeNull()
    state.setProFileContent('levels/one.py', 'score = 7')
    expect(state.renameProNode('src', 'game')).toBeNull()
    const project = store.getState().project!
    expect(isPythonProject(project) && project.python.entrypoint).toBe('game/main.py')
    state.removeProNode('game')
    expect(store.getState().project).toBe(project)
    expect(store.getState().saveError).toContain('inicial')
    expect(state.addProFile('game/CON.py')).toContain('inválido')
    expect(project.tree?.['levels/one.py']).toEqual({ kind: 'file', content: 'score = 7' })
    expect(project).not.toHaveProperty('files')
  })

  test('visual transactions commit only against the captured Classic source', async () => {
    const store = await setup('classic')
    const state = store.getState()
    const captured = state.project!
    if (!isPythonProject(captured) || captured.kind !== 'classic') throw new Error('fixture')
    state.setPythonFile('main.py', '# updated\n')
    expect(
      state.applyPythonSourceFiles(captured, { ...captured.files, 'main.py': '# stale' }, null),
    ).toContain('mudou')
    const current = store.getState().project!
    if (!isPythonProject(current) || current.kind !== 'classic') throw new Error('fixture')
    expect(
      state.applyPythonSourceFiles(
        current,
        { ...current.files, 'main.py': 'print(42)' },
        { visual: true },
      ),
    ).toBeNull()
    expect(store.getState().project).not.toHaveProperty('bridgeCodeAhead')
    expect(store.getState().project?.blocksState).toEqual({ visual: true })
  })

  test('Python materials reject unsupported formats without changing the document', async () => {
    const store = await setup('classic')
    const state = store.getState()
    const before = state.project
    expect(
      state.addAsset({ name: 'sample', kind: 'audio', dataUrl: 'data:audio/aac;base64,AA==' }),
    ).toContain('formato')
    expect(store.getState().project).toBe(before)
    expect(
      state.addAsset({ name: 'sample', kind: 'image', dataUrl: 'data:image/PNG;base64,aGVybw==' }),
    ).toBeNull()
    expect(store.getState().project?.assets?.[0]?.proPath).toBe('assets/sample.png')
    await expect(refinePythonProjectDocument(store.getState().project)).resolves.toMatchObject({
      id: before!.id,
    })
  })

  test('promotion preserves an independent Classic copy and the execution recipe', async () => {
    const store = await setup('classic')
    expect(store.getState().setPublication(crypto.randomUUID())).toBeNull()
    const before = store.getState().project!
    const copies: EditableStudioProject[] = []
    await store.getState().convertToPro(async (copy) => {
      copies.push(copy)
    })
    expect(copies).toHaveLength(1)
    expect(copies[0]?.id).not.toBe(before.id)
    expect(copies[0]?.kind).toBe('classic')
    expect(projectPublicationId(copies[0]!)).toBeUndefined()
    expect(projectPublicationId(store.getState().project!)).toBeUndefined()
    expect(store.getState().project?.kind).toBe('pro')
    expect((await preparePythonExecutionSnapshot(before)).revision).toBe(
      (await preparePythonExecutionSnapshot(store.getState().project)).revision,
    )
  })

  test('an edit while the original copy is saved prevents promotion from overwriting it', async () => {
    const store = await setup('classic')
    await expect(
      store.getState().convertToPro(async () => {
        store.getState().setPythonFile('main.py', '# newer source\n')
      }),
    ).rejects.toThrow('mudou')
    expect(store.getState().project?.kind).toBe('classic')
    const current = store.getState().project!
    if (!isPythonProject(current) || current.kind !== 'classic') throw new Error('fixture')
    expect(current.files['main.py']).toBe('# newer source\n')
  })
})
