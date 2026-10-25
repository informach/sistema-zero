import { describe, expect, test } from 'bun:test'
import { isPythonProject } from '../../core/editableProject'
import { createStudioRuntimeAuthority } from '../../runtime/authority'
import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import { PYGAME_EXTENSION } from '../../runtime/python/pygame/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
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
import {
  changePythonExtension,
  pythonExtensionCodeCheck,
  pythonExtensionInstallIssue,
} from './operations'

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

/** The test environment with the two Raylib extensions granted, besides Turtle. */
async function raylibEnvironment(kind: 'classic' | 'pro') {
  const fixture = await pythonEnvironmentFixture(kind)
  const { environment } = fixture
  return {
    ...fixture,
    environment: {
      ...environment,
      access: (project: Parameters<typeof environment.access>[0]) => ({
        ...environment.access(project),
        grantedExtensionIds: [TURTLE_EXTENSION.id, RAYLIB_2D_EXTENSION.id, RAYLIB_3D_EXTENSION.id],
      }),
    },
  }
}

describe('Python extension actions', () => {
  for (const extension of [PGZERO_EXTENSION, PYGAME_EXTENSION])
    for (const kind of ['classic', 'pro'] as const) {
      test(`${kind}: ${extension.id} removal requires analysis and preserves code that imports its modules`, async () => {
        const { project, environment } = await pythonEnvironmentFixture(kind)
        const expected = { ...project, installedExtensions: [{ ...extension, installedAt: 1 }] }
        const store = createProjectStore()
        store.getState().setProject(expected)
        expect(
          pythonExtensionCodeCheck(expected.installedExtensions, extension, 'remove'),
        ).not.toBeNull()
        await expect(
          changePythonExtension({
            store,
            expected,
            policy: () => ({ environment }),
            extension,
            action: 'remove',
          }),
        ).rejects.toThrow('análise')
        for (const module of extension.id === PGZERO_EXTENSION.id
          ? ['pgzero', 'pgzrun', 'pygame']
          : ['pygame', 'pinta']) {
          await expect(
            changePythonExtension({
              store,
              expected,
              policy: () => ({ environment }),
              extension,
              action: 'remove',
              analysis: removalAnalysis({
                kind: 'Module',
                fields: {
                  body: [
                    {
                      kind: 'Import',
                      fields: {
                        names: [{ kind: 'alias', fields: { name: module, asname: null } }],
                      },
                    },
                  ],
                },
              }),
            }),
          ).rejects.toThrow('main.py:1')
          expect(store.getState().project).toBe(expected)
        }
        await changePythonExtension({
          store,
          expected,
          policy: () => ({ environment }),
          extension,
          action: 'remove',
          analysis: removalAnalysis(),
        })
        expect(store.getState().project!.installedExtensions).toEqual([])
      })
    }

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

    test(`${kind}: Raylib 2D e 3D trocam de lugar numa ação só, e o código continua o mesmo`, async () => {
      const { project, environment } = await raylibEnvironment(kind)
      const store = createProjectStore()
      store.getState().setProject({
        ...project,
        installedExtensions: [{ ...RAYLIB_2D_EXTENSION, installedAt: 1 }],
      })
      const source = 'from pyray import *\ninit_window(800, 450, "jogo")\n'
      store.getState().setPythonFile(project.python.entrypoint, source)
      const before = store.getState().project!
      if (!isPythonProject(before)) throw new Error('fixture')
      const sourceFiles = (p: typeof before) => (p.kind === 'classic' ? p.files : p.tree)
      // A troca não pede para remover antes, o que travaria quem já tem código.
      expect(pythonExtensionInstallIssue(before, environment, RAYLIB_3D_EXTENSION)).toBeNull()
      expect(
        pythonExtensionCodeCheck(before.installedExtensions, RAYLIB_3D_EXTENSION, 'install'),
      ).toBeNull()
      await changePythonExtension({
        store,
        expected: before,
        policy: () => ({ environment }),
        extension: RAYLIB_3D_EXTENSION,
        action: 'install',
      })
      const three = store.getState().project!
      if (!isPythonProject(three)) throw new Error('project')
      expect(three.installedExtensions.map(({ id }) => id)).toEqual([RAYLIB_3D_EXTENSION.id])
      expect(sourceFiles(three)).toEqual(sourceFiles(before))
      // De volta para o 2D: o código não chama nada do 3D, então pode.
      expect(
        pythonExtensionCodeCheck(three.installedExtensions, RAYLIB_2D_EXTENSION, 'install'),
      ).toBe('raylib-to-2d')
      await changePythonExtension({
        store,
        expected: three,
        policy: () => ({ environment }),
        extension: RAYLIB_2D_EXTENSION,
        action: 'install',
        analysis: removalAnalysis(),
      })
      const two = store.getState().project!
      if (!isPythonProject(two)) throw new Error('project')
      expect(two.installedExtensions.map(({ id }) => id)).toEqual([RAYLIB_2D_EXTENSION.id])
      expect(sourceFiles(two)).toEqual(sourceFiles(before))
    })

    test(`${kind}: a troca para o 2D é recusada quando o código usa função do 3D`, async () => {
      const { project, environment } = await raylibEnvironment(kind)
      const store = createProjectStore()
      store.getState().setProject({
        ...project,
        installedExtensions: [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }],
      })
      const source = 'from pyray import *\ndraw_cube(p, 1, 1, 1, RED)\n'
      store.getState().setPythonFile(project.python.entrypoint, source)
      const expected = store.getState().project!
      if (!isPythonProject(expected)) throw new Error('fixture')
      const start = source.indexOf('draw_cube')
      const tree: PythonNode = {
        kind: 'Module',
        fields: {
          body: [
            {
              kind: 'ImportFrom',
              fields: {
                module: 'pyray',
                level: { literal: 'int', value: '0' },
                names: [{ kind: 'alias', fields: { name: '*', asname: null } }],
              },
            },
            {
              kind: 'Expr',
              fields: {
                value: {
                  kind: 'Call',
                  fields: {
                    func: {
                      kind: 'Name',
                      range: { start, end: start + 9 },
                      fields: { id: 'draw_cube', ctx: { kind: 'Load', fields: {} } },
                    },
                    args: [],
                    keywords: [],
                  },
                },
              },
            },
          ],
        },
      }
      await expect(
        changePythonExtension({
          store,
          expected,
          policy: () => ({ environment }),
          extension: RAYLIB_2D_EXTENSION,
          action: 'install',
          analysis: removalAnalysis(tree),
        }),
      ).rejects.toThrow(/só a Raylib 3D tem em .*main\.py:2/)
      expect(store.getState().project).toBe(expected)
      // Sem a análise, a troca para o 2D não acontece às cegas.
      await expect(
        changePythonExtension({
          store,
          expected,
          policy: () => ({ environment }),
          extension: RAYLIB_2D_EXTENSION,
          action: 'install',
        }),
      ).rejects.toThrow('análise')
      expect(store.getState().project).toBe(expected)
    })

    test(`${kind}: remover a Raylib com o código usando o raylib é recusado e ensina a trocar`, async () => {
      const { project, environment } = await raylibEnvironment(kind)
      const store = createProjectStore()
      store.getState().setProject({
        ...project,
        installedExtensions: [{ ...RAYLIB_2D_EXTENSION, installedAt: 1 }],
      })
      store.getState().setPythonFile(project.python.entrypoint, '# jogo\nimport pyray as rl\n')
      const expected = store.getState().project!
      if (!isPythonProject(expected)) throw new Error('fixture')
      const tree: PythonNode = {
        kind: 'Module',
        fields: {
          body: [
            {
              kind: 'Import',
              range: { start: 7, end: 25 },
              fields: { names: [{ kind: 'alias', fields: { name: 'pyray', asname: 'rl' } }] },
            },
          ],
        },
      }
      const refused = changePythonExtension({
        store,
        expected,
        policy: () => ({ environment }),
        extension: RAYLIB_2D_EXTENSION,
        action: 'remove',
        analysis: removalAnalysis(tree),
      })
      await expect(refused).rejects.toThrow('main.py:2')
      await expect(refused).rejects.toThrow('instale Raylib 3D direto')
      expect(store.getState().project).toBe(expected)
      // Sem uso do raylib no código, remover pode.
      await changePythonExtension({
        store,
        expected,
        policy: () => ({ environment }),
        extension: RAYLIB_2D_EXTENSION,
        action: 'remove',
        analysis: removalAnalysis(),
      })
      const removed = store.getState().project!
      if (!isPythonProject(removed)) throw new Error('project')
      expect(removed.installedExtensions).toEqual([])
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
