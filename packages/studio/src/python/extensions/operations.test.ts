import { describe, expect, test } from 'bun:test'
import { isPythonProject } from '../../core/editableProject'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { createProjectStore } from '../../state/projectStore'
import {
  captureProRevision,
  listProSessionApplications,
  undoProApplication,
} from '../../state/proRevision'
import { changePythonExtension, pythonExtensionInstallIssue } from './operations'

describe('Python extension actions', () => {
  for (const kind of ['classic', 'pro'] as const) {
    test(`${kind}: install/remove preserve canonical source and runtime; source stays editable`, async () => {
      const { project, environment } = await pythonEnvironmentFixture(kind)
      const store = createProjectStore()
      store.getState().setProject(project)
      const source = '# Meu desenho 🐢\nimport turtle\nturtle.forward(123)\n'
      store.getState().setPythonFile(project.python.entrypoint, source)
      const before = store.getState().project!
      if (!isPythonProject(before)) throw new Error('fixture')
      const sourceFiles = (p: typeof before) => (p.kind === 'classic' ? p.files : p.tree)
      await changePythonExtension({
        store,
        expected: before,
        policy: () => ({ environment }),
        extension: TURTLE_EXTENSION,
        action: 'install',
      })
      const installed = store.getState().project!
      if (!isPythonProject(installed)) throw new Error('project')
      expect(installed.installedExtensions).toHaveLength(1)
      expect(sourceFiles(installed)).toEqual(sourceFiles(before))
      expect(installed.runtime).toEqual(before.runtime)
      expect(installed.python).toEqual(before.python)
      await changePythonExtension({
        store,
        expected: installed,
        policy: () => ({ environment }),
        extension: TURTLE_EXTENSION,
        action: 'install',
      })
      expect(store.getState().project).toBe(installed)
      await changePythonExtension({
        store,
        expected: installed,
        policy: () => ({ environment: null }),
        extension: TURTLE_EXTENSION,
        action: 'remove',
      })
      const removed = store.getState().project!
      if (!isPythonProject(removed)) throw new Error('project')
      expect(removed.installedExtensions).toEqual([])
      expect(sourceFiles(removed)).toEqual(sourceFiles(before))
      expect(store.getState().setPythonFile(project.python.entrypoint, '# guardado\n')).toBeNull()
    })

    test(`${kind}: revocation during preparation refuses the commit and history`, async () => {
      const { project, environment } = await pythonEnvironmentFixture(kind)
      const store = createProjectStore()
      store.getState().setProject(project)
      let granted = true
      const initialDirty = store.getState().isDirty
      const dynamic = {
        ...environment,
        access: () => ({
          ...environment.access(project),
          grantedExtensionIds: granted ? [TURTLE_EXTENSION.id] : [],
        }),
      }
      const pending = changePythonExtension({
        store,
        expected: project,
        policy: () => ({ environment: dynamic }),
        extension: TURTLE_EXTENSION,
        action: 'install',
      })
      granted = false
      await expect(pending).rejects.toThrow('liberada')
      expect(store.getState().project).toBe(project)
      expect(store.getState().isDirty).toBe(initialDirty)
      expect(listProSessionApplications(store, project.id)).toEqual([])
    })

    test(`${kind}: observation, denied grants and concurrent source edits cannot install`, async () => {
      const { project, environment } = await pythonEnvironmentFixture(kind)
      const store = createProjectStore()
      store.getState().setProject(project)
      const input = {
        store,
        expected: project,
        policy: () => ({ environment }),
        extension: TURTLE_EXTENSION,
        action: 'install' as const,
      }
      store.getState().setEditingAccess('observer')
      await expect(changePythonExtension(input)).rejects.toThrow('observação')
      store.getState().setEditingAccess('author')
      await expect(
        changePythonExtension({ ...input, policy: () => ({ environment, allowedIds: [] }) }),
      ).rejects.toThrow('liberada')
      const denied = {
        ...environment,
        access: () => ({ ...environment.access(project), grantedExtensionIds: [] }),
      }
      await expect(
        changePythonExtension({ ...input, policy: () => ({ environment: denied }) }),
      ).rejects.toThrow('liberada')
      const withdrawn = {
        ...environment,
        access: () => ({ ...environment.access(project), releaseStatus: 'revoked' as const }),
      }
      expect(pythonExtensionInstallIssue(project, withdrawn, TURTLE_EXTENSION)).toContain(
        'novas extensões',
      )
      expect(
        pythonExtensionInstallIssue(project, environment, { id: 'game-2d', version: '1.0.0' }),
      ).not.toBeNull()
      expect(
        pythonExtensionInstallIssue(project, environment, {
          ...TURTLE_EXTENSION,
          version: '2.0.0',
        }),
      ).not.toBeNull()
      const pending = changePythonExtension(input)
      store.getState().setPythonFile(project.python.entrypoint, 'print("outra edição")\n')
      const edited = store.getState().project
      await expect(pending).rejects.toThrow('mudou')
      expect(store.getState().project).toBe(edited)
      expect(edited?.installedExtensions).toEqual([])
    })
  }

  test('Pro uses the shared configuration history and supports undo', async () => {
    const { project, environment } = await pythonEnvironmentFixture('pro')
    const store = createProjectStore()
    store.getState().setProject(project)
    const before = await captureProRevision(project)
    await changePythonExtension({
      store,
      expected: project,
      policy: () => ({ environment }),
      extension: TURTLE_EXTENSION,
      action: 'install',
    })
    const records = listProSessionApplications(store, project.id)
    expect(records).toHaveLength(1)
    await undoProApplication(store, project.id, records[0]!.record.operationId)
    expect(await captureProRevision(store.getState().project!)).toEqual(before)
  })
})
