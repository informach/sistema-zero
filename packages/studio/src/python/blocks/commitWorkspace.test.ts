import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { isPythonProject } from '../../core/editableProject'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { createProjectStore } from '../../state/projectStore'
import { createPythonAnalysisController } from '../language/controller'
import type { PythonParsedDocument } from '../language/types'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import { commitPythonWorkspaceGesture } from './commitWorkspace'
import { call, expression, moduleNode, name, text } from './nodes'
import { pythonASTToVisual } from './projection'
import {
  createPythonWorkspaceDraft,
  readPythonWorkspaceDraft,
  updatePythonWorkspaceDraft,
} from './workspaceDraft'

async function fixture() {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const store = createProjectStore()
  const original = { ...project, files: { ...project.files, 'main.py': '' } }
  store.getState().hydrateProject(original)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  environment.resolvePythonAnalysis = async () => ({
    url: 'https://analysis.test/analysis.html',
    allowedOrigins: ['https://analysis.test'],
  })
  const tree = moduleNode([expression(call(name('print'), [text('Oi')]))])
  const document: PythonParsedDocument = {
    version: 1,
    language: 'python',
    source: '',
    tree: moduleNode([]),
    tokens: [],
    diagnostics: [],
    identity: {
      projectId: project.id,
      instanceId: 'editor',
      path: 'main.py',
      revision: 'a'.repeat(64),
      generation: 1,
    },
  }
  const analysis = createPythonAnalysisController({
    project: () => {
      const current = store.getState().project
      return current && isPythonProject(current) ? current : null
    },
    environment: () => environment,
    mountFrame: () => ({ frame: globalThis.document.createElement('iframe'), release() {} }),
    async prepareSession() {
      await gate
      return {
        closed: false,
        parse: async (identity, source) => ({ ...document, source, identity, tree }),
        render: async () => 'print("Oi")',
        dispose() {},
      }
    },
  })
  const workspace = new Blockly.Workspace()
  const roots = pythonVisualToWorkspace(pythonASTToVisual(tree), workspace)
  const projection = pythonWorkspaceToVisual(workspace, roots)
  const gesture = (projectVisual = () => projection) =>
    commitPythonWorkspaceGesture({
      store,
      analysis,
      document,
      projection: projectVisual,
      codecs: PYTHON_PROGRAMMING_CODECS,
      workspace: Blockly.serialization.workspaces.save(workspace),
      rootIds: roots,
      current: () => true,
    })
  return {
    store,
    document,
    gesture,
    release,
    dispose: () => {
      release()
      analysis.dispose()
      workspace.dispose()
    },
  }
}

test('a gesture stages before parser boot and commits source without overwriting newer metadata', async () => {
  const f = await fixture()
  try {
    const pending = f.gesture()
    const staged = f.store.getState().project!
    if (!isPythonProject(staged) || staged.kind !== 'classic') throw new Error('Fixture')
    expect(staged.files['main.py']).toBe('')
    expect(readPythonWorkspaceDraft(staged)?.pending).toBe(true)
    f.store.getState().rename('Título mais novo')
    f.release()
    const result = await pending
    expect(result.source).toBe('print("Oi")\n')
    const current = f.store.getState().project!
    if (!isPythonProject(current) || current.kind !== 'classic') throw new Error('Fixture')
    expect(current.files['main.py']).toBe(result.source)
    expect(current.name).toBe('Título mais novo')
    expect(readPythonWorkspaceDraft(current)?.pending).toBe(false)
    expect(readPythonWorkspaceDraft(current)?.baseSource).toBe(result.source)
  } finally {
    f.dispose()
  }
})

test('staging and settling a gesture preserve another file visual layout', async () => {
  const f = await fixture()
  try {
    const project = f.store.getState().project!
    if (!isPythonProject(project) || project.kind !== 'classic') throw new Error('Fixture')
    const extended = { ...project, files: { ...project.files, 'helper.py': 'print(8)\n' } }
    const other = {
      ...createPythonWorkspaceDraft(extended, 'helper.py', { note: 'auxiliar' }, []),
      pending: false,
    }
    f.store.getState().hydrateProject({
      ...extended,
      blocksState: updatePythonWorkspaceDraft(extended, other.path, other),
    })
    const pending = f.gesture()
    const staged = f.store.getState().project!
    if (!isPythonProject(staged)) throw new Error('Fixture')
    expect(readPythonWorkspaceDraft(staged, 'helper.py')).toEqual(other)
    expect(readPythonWorkspaceDraft(staged, 'main.py')?.pending).toBe(true)
    f.release()
    await pending
    const settled = f.store.getState().project!
    if (!isPythonProject(settled)) throw new Error('Fixture')
    expect(readPythonWorkspaceDraft(settled, 'helper.py')).toEqual(other)
    expect(readPythonWorkspaceDraft(settled, 'main.py')?.pending).toBe(false)
  } finally {
    f.dispose()
  }
})

test('typing into the source during generation wins over the staged visual gesture', async () => {
  const f = await fixture()
  try {
    const pending = f.gesture().catch((error) => error.name)
    expect(f.store.getState().setPythonFile('main.py', 'print("digitado")')).toBeNull()
    f.release()
    expect(await pending).toBe('AbortError')
    const current = f.store.getState().project!
    if (!isPythonProject(current) || current.kind !== 'classic') throw new Error('Fixture')
    expect(current.files['main.py']).toBe('print("digitado")')
  } finally {
    f.dispose()
  }
})

test('an incomplete gesture is saved before visual validation fails', async () => {
  const f = await fixture()
  try {
    expect(() =>
      f.gesture(() => {
        throw new Error('Preencha a entrada')
      }),
    ).toThrow('Preencha')
    const current = f.store.getState().project!
    if (!isPythonProject(current)) throw new Error('Fixture')
    expect(readPythonWorkspaceDraft(current)?.pending).toBe(true)
    expect(current.files?.['main.py']).toBe('')
  } finally {
    f.dispose()
  }
})

test('a gesture cannot overwrite unfinished visual work from another file', async () => {
  const f = await fixture()
  try {
    expect(f.store.getState().addExtraFile('helper.py')).toBeNull()
    const current = f.store.getState().project!
    if (!isPythonProject(current) || current.kind !== 'classic') throw new Error('Fixture')
    const older = createPythonWorkspaceDraft(current, 'helper.py', { marker: 'unfinished' }, [])
    expect(f.store.getState().applyPythonSourceFiles(current, current.files, older)).toBeNull()
    expect(() => f.gesture()).toThrow('helper.py')
    const retained = f.store.getState().project!
    if (!isPythonProject(retained)) throw new Error('Fixture')
    expect(readPythonWorkspaceDraft(retained)?.generation).toBe(older.generation)
  } finally {
    f.dispose()
  }
})

test('closing during generation preserves the draft, and observation never stages a gesture', async () => {
  const f = await fixture()
  const pending = f.gesture().catch((error) => error.name)
  f.dispose()
  expect(await pending).toBe('AbortError')
  const current = f.store.getState().project!
  if (!isPythonProject(current)) throw new Error('Fixture')
  expect(readPythonWorkspaceDraft(current)?.pending).toBe(true)
  const other = await fixture()
  try {
    other.store.getState().setEditingAccess('observer')
    expect(() => other.gesture()).toThrow('observação')
    expect(other.store.getState().project?.blocksState).toBeNull()
  } finally {
    other.dispose()
  }
})

test('a reentrant subscriber cannot make the older gesture claim and delete a newer draft', async () => {
  const f = await fixture()
  let replacement: string | undefined
  const unsubscribe = f.store.subscribe((state) => {
    const current = state.project
    if (
      replacement ||
      !current ||
      !isPythonProject(current) ||
      current.kind !== 'classic' ||
      !readPythonWorkspaceDraft(current)?.pending
    )
      return
    const newer = createPythonWorkspaceDraft(current, 'main.py', { marker: 'newer' }, [])
    replacement = newer.generation
    expect(state.applyPythonSourceFiles(current, current.files, newer)).toBeNull()
  })
  try {
    const result = f.gesture().catch((error) => error.name)
    f.release()
    expect(await result).toBe('AbortError')
    const current = f.store.getState().project!
    if (!isPythonProject(current) || current.kind !== 'classic') throw new Error('Fixture')
    expect(current.files['main.py']).toBe('')
    expect(readPythonWorkspaceDraft(current)?.generation).toBe(replacement)
    expect(readPythonWorkspaceDraft(current)?.workspace).toEqual({ marker: 'newer' })
  } finally {
    unsubscribe()
    f.dispose()
  }
})
