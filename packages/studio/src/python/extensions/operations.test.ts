import { describe, expect, test } from 'bun:test'
import { isPythonProject } from '../../core/editableProject'
import { createStudioRuntimeAuthority } from '../../runtime/authority'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { createProjectStore } from '../../state/projectStore'
import {
  captureProRevision,
  listProSessionApplications,
  undoProApplication,
} from '../../state/proRevision'
import type { PythonAnalysisSession } from '../language/session'
import type { PythonNode } from '../language/types'
import { changePythonExtension, pythonExtensionInstallIssue } from './operations'

function removalAnalysis(tree: PythonNode | null = { kind: 'Module', fields: { body: [] } }) {
  return {
    async run<T>(request: {
      execute(parser: Pick<PythonAnalysisSession, 'parse' | 'render'>): Promise<T>
    }) {
      return request.execute({
        parse: async (identity, source) => ({
          version: 1,
          language: 'python',
          identity,
          source,
          tree,
          tokens: [],
          diagnostics: [],
        }),
        render: async () => {
          throw new Error('Unexpected render')
        },
      })
    },
  }
}

describe('Python extension actions', () => {
  for (const kind of ['classic', 'pro'] as const) {
    test(`${kind}: changed authority in the same environment fences installation before React observes it`, async () => {
      const { project, environment } = await pythonEnvironmentFixture(kind)
      const store = createProjectStore()
      store.getState().setProject(project)
      const state = {
        available: true,
        pythonAuthoring: [],
        grantedExtensionIds: [TURTLE_EXTENSION.id],
        capabilities: ['edit' as const],
        curation: null,
        releaseStatus: 'active' as const,
      }
      const authority = createStudioRuntimeAuthority(state)
      environment.authority = authority.authority
      const pending = changePythonExtension({
        store,
        expected: project,
        policy: () => ({ environment }),
        extension: TURTLE_EXTENSION,
        action: 'install',
      }).catch((error: unknown) => error)
      authority.update({ ...state, grantedExtensionIds: [] })
      expect(await pending).toBeInstanceOf(Error)
      expect(store.getState().project).toBe(project)
      expect(listProSessionApplications(store, project.id)).toEqual([])
    })

    test(`${kind}: changed authority during removal analysis preserves installed extension and source`, async () => {
      const { project, environment } = await pythonEnvironmentFixture(kind)
      const store = createProjectStore()
      const expected = {
        ...project,
        installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }],
      }
      store.getState().setProject(expected)
      const state = {
        available: true,
        pythonAuthoring: [],
        grantedExtensionIds: [TURTLE_EXTENSION.id],
        capabilities: ['edit' as const],
        curation: null,
        releaseStatus: 'active' as const,
      }
      const authority = createStudioRuntimeAuthority(state)
      environment.authority = authority.authority
      const entered = Promise.withResolvers<void>()
      const gate = Promise.withResolvers<void>()
      const base = removalAnalysis()
      const pending = changePythonExtension({
        store,
        expected,
        policy: () => ({ environment }),
        extension: TURTLE_EXTENSION,
        action: 'remove',
        analysis: {
          async run(input) {
            entered.resolve()
            await gate.promise
            return base.run(input)
          },
        },
      }).catch((error: unknown) => error)
      await entered.promise
      authority.update({ ...state, curation: { pythonLevel: 1 } })
      gate.resolve()
      expect(await pending).toBeInstanceOf(Error)
      expect(store.getState().project).toBe(expected)
      expect(listProSessionApplications(store, project.id)).toEqual([])
    })
  }
  for (const kind of ['classic', 'pro'] as const) {
    test(`${kind}: install/remove preserve canonical source and runtime; source stays editable`, async () => {
      const { project, environment } = await pythonEnvironmentFixture(kind)
      const store = createProjectStore()
      store.getState().setProject(project)
      const source = '# Meu programa 🐢\nprint(123)\n'
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
        policy: () => ({ environment }),
        extension: TURTLE_EXTENSION,
        action: 'remove',
        analysis: removalAnalysis(),
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

  for (const kind of ['classic', 'pro'] as const) {
    test(`${kind}: known Turtle import refuses removal and preserves document/history`, async () => {
      const { project, environment } = await pythonEnvironmentFixture(kind)
      const store = createProjectStore()
      store
        .getState()
        .setProject({ ...project, installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }] })
      store.getState().setPythonFile('main.py', '# desenho\nimport turtle as t\nt.forward(10)\n')
      const expected = store.getState().project!
      if (!isPythonProject(expected)) throw new Error('fixture')
      const tree: PythonNode = {
        kind: 'Module',
        fields: {
          body: [
            {
              kind: 'Import',
              range: { start: 10, end: 28 },
              fields: { names: [{ kind: 'alias', fields: { name: 'turtle', asname: 't' } }] },
            },
          ],
        },
      }
      await expect(
        changePythonExtension({
          store,
          expected,
          policy: () => ({ environment }),
          extension: TURTLE_EXTENSION,
          action: 'remove',
          analysis: removalAnalysis(tree),
        }),
      ).rejects.toThrow('main.py:2')
      expect(store.getState().project).toBe(expected)
      expect(listProSessionApplications(store, project.id)).toEqual([])
    })

    test(`${kind}: removal without analysis fails closed`, async () => {
      const { project, environment } = await pythonEnvironmentFixture(kind)
      const store = createProjectStore()
      store
        .getState()
        .setProject({ ...project, installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }] })
      const expected = store.getState().project!
      if (!isPythonProject(expected)) throw new Error('fixture')
      await expect(
        changePythonExtension({
          store,
          expected,
          policy: () => ({ environment }),
          extension: TURTLE_EXTENSION,
          action: 'remove',
        }),
      ).rejects.toThrow('análise')
      expect(store.getState().project).toBe(expected)
    })

    for (const invalidate of ['source ABA', 'policy', 'host callback'] as const) {
      test(`${kind}: ${invalidate} during removal analysis refuses late publication`, async () => {
        const { project, environment } = await pythonEnvironmentFixture(kind)
        const store = createProjectStore()
        store.getState().setProject({
          ...project,
          installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }],
        })
        const expected = store.getState().project!
        if (!isPythonProject(expected)) throw new Error('fixture')
        const gate = Promise.withResolvers<void>()
        const requested = Promise.withResolvers<void>()
        let allowedIds: readonly string[] | undefined
        let active = true
        const outcome = changePythonExtension({
          store,
          expected,
          policy: () => ({ environment, allowedIds }),
          extension: TURTLE_EXTENSION,
          action: 'remove',
          analysis: {
            async run<T>() {
              requested.resolve()
              await gate.promise
              return [] as T
            },
          },
          assertCurrent() {
            if (!active) throw new Error('Contexto encerrado')
          },
        }).catch((error: unknown) => error)
        await requested.promise
        if (invalidate === 'source ABA') {
          store.getState().setPythonFile('main.py', 'print(9)\n')
          store.setState({ project: expected })
        } else if (invalidate === 'policy') allowedIds = []
        else active = false
        gate.resolve()
        expect(await outcome).toBeInstanceOf(Error)
        expect(store.getState().project).toBe(expected)
        expect(listProSessionApplications(store, project.id)).toEqual([])
      })
    }
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
