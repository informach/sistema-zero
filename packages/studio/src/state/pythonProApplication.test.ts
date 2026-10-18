import { describe, expect, test } from 'bun:test'
import {
  applyStudioProChange,
  type StudioProChange,
  studioProDigest,
} from '@sistemazero/core/studio/pro-revision'
import { IDBFactory } from 'fake-indexeddb'
import { isPythonProject } from '../core/editableProject'
import { documentFixture } from './fixtures/projectDocuments'
import { persistProject } from './persistence'
import { registerProjectPersistence } from './projectOperations'
import type { ProjectStorageScope } from './projectStorageRuntime'
import { createProjectStore, loadSanitizedProjectById } from './projectStore'
import {
  applyProEditorChange,
  applyProProposal,
  applyProRevision,
  captureProRevision,
  listProApplications,
  listProSessionApplications,
  undoProApplication,
} from './proRevision'
import { refinePythonProProjectDocument } from './pythonProProjectValidation'

async function setup() {
  const source = documentFixture('python', 'pro')
  const project = await refinePythonProProjectDocument({
    ...source,
    assets: [],
    coverAssetName: undefined,
  })
  const store = createProjectStore()
  store.getState().setProject(project)
  const base = await captureProRevision(project)
  if (base.version !== 2 || base.configuration.programmingLanguage !== 'python')
    throw new Error('fixture')
  return { store, project, base: { ...base, configuration: base.configuration } }
}

describe('Python Pro shared application and recovery', () => {
  test('a builder proposal persists source, entrypoint, Pinta provenance and inverse atomically across reopening', async () => {
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = new IDBFactory().open(`python-builder-${crypto.randomUUID()}`, 1)
      request.onupgradeneeded = () => request.result.createObjectStore('kv')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const database = await opening,
      scope: ProjectStorageScope = {
        identity: database.name,
        namespace: '',
        store: async (mode, callback) =>
          callback(database.transaction('kv', mode).objectStore('kv')),
      },
      source = documentFixture('python', 'pro')
    if (source.programmingLanguage !== 'python' || source.kind !== 'pro')
      throw new Error('Python fixture required')
    const project = await refinePythonProProjectDocument({
        ...source,
        tree: { ...source.tree, rascunhos: { kind: 'dir' } },
        coverAssetName: undefined,
        assets: [
          {
            id: 'pinta-hero',
            name: 'heroi',
            kind: 'image',
            source: 'library',
            libId: 'personal:pinta-hero',
            libOrigin: 'pinta',
            libRevision: 7,
            proPath: 'assets/heroi.png',
            license: {
              name: 'CC BY 4.0',
              attribution: 'Desenho de teste',
              sourceUrl: 'https://example.test/arte',
            },
            dataUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
          },
        ],
      }),
      first = createProjectStore(),
      reopened = createProjectStore(),
      attach = (store: ReturnType<typeof createProjectStore>) =>
        registerProjectPersistence(store, {
          scopeIdentity: scope.identity,
          localScope: scope,
          load: (id) => loadSanitizedProjectById(id, scope),
          save: (project) => persistProject(project, {}, scope),
        }),
      releaseFirst = attach(first),
      releaseReopened = attach(reopened)
    try {
      await persistProject(project, {}, scope)
      first.getState().hydrateProject(project)
      const base = await captureProRevision(project)
      if (base.version !== 2 || base.configuration.programmingLanguage !== 'python')
        throw new Error('Python revision required')
      const change: StudioProChange = {
          baseHash: base.hash,
          summary: 'Mover início do programa',
          patches: [
            {
              path: project.python.entrypoint,
              before: await studioProDigest(base.files[project.python.entrypoint]!),
              content: null,
            },
            {
              path: 'src/inicio.py',
              before: null,
              content: base.files[project.python.entrypoint]!,
            },
          ],
          configuration: {
            before: base.configuration,
            after: {
              ...base.configuration,
              python: { ...base.configuration.python, entrypoint: 'src/inicio.py' },
            },
          },
        },
        expected = (await applyStudioProChange(base, change)).revision,
        receipt = await applyProProposal(first, project.id, {
          operationId: 'apply-python',
          jobId: 'builder-python',
          request: { version: 1, intent: 'change', scope: 'game', criteria: [] },
          change,
          expectedRevisionHash: expected.hash,
        })
      expect(receipt.status).toBe('saved')
      const saved = await loadSanitizedProjectById(project.id, scope)
      if (!saved) throw new Error('Durable document missing')
      expect((await captureProRevision(saved)).hash).toBe(expected.hash)
      expect(saved.assets).toEqual(project.assets)
      expect(saved.proMeta?.assistance).toEqual(project.proMeta.assistance)
      const records = await listProApplications(scope, project.id)
      expect(records).toHaveLength(1)
      expect(records[0]).toMatchObject({
        source: 'zappy',
        jobId: 'builder-python',
        afterHash: expected.hash,
      })
      reopened.getState().hydrateProject(saved)
      expect((await undoProApplication(reopened, project.id, 'apply-python')).status).toBe('saved')
      const undone = await loadSanitizedProjectById(project.id, scope)
      if (!undone) throw new Error('Restored document missing')
      expect(await captureProRevision(undone)).toEqual(base)
      expect(undone.assets).toEqual(project.assets)
      expect(undone.tree?.rascunhos).toEqual({ kind: 'dir' })
      expect((await undoProApplication(reopened, project.id, 'apply-python')).status).toBe('saved')
      expect(await listProApplications(scope, project.id)).toHaveLength(2)
    } finally {
      releaseFirst()
      releaseReopened()
      database.close()
    }
  })
  test('moves the entrypoint and its configuration atomically and restores both', async () => {
    const { store, project, base } = await setup()
    const entrypoint = project.python.entrypoint
    const change: StudioProChange = {
      baseHash: base.hash,
      summary: 'Mover arquivo inicial',
      patches: [
        { path: entrypoint, before: await studioProDigest(base.files[entrypoint]!), content: null },
        { path: 'src/start.py', before: null, content: base.files[entrypoint]! },
      ],
      configuration: {
        before: base.configuration,
        after: { ...base.configuration, python: { ...project.python, entrypoint: 'src/start.py' } },
      },
    }
    const updates: string[] = []
    const stop = store.subscribe(({ project }) => {
      if (!project || !isPythonProject(project) || project.kind !== 'pro')
        throw new Error('project')
      expect(project.tree[project.python.entrypoint]?.kind).toBe('file')
      updates.push(project.python.entrypoint)
    })
    try {
      const inverse = await applyProRevision(store, project.id, change)
      expect(updates).toEqual(['src/start.py'])
      expect((await captureProRevision(store.getState().project!)).hash).toBe(inverse.baseHash)
      await applyProRevision(store, project.id, inverse)
      expect(updates).toEqual(['src/start.py', entrypoint])
      expect(await captureProRevision(store.getState().project!)).toEqual(base)
    } finally {
      stop()
    }
  })

  test('invalid entrypoint and observer writes preserve the exact open document', async () => {
    const { store, project, base } = await setup()
    const invalid: StudioProChange = {
      baseHash: base.hash,
      summary: 'Arquivo ausente',
      patches: [],
      configuration: {
        before: base.configuration,
        after: { ...base.configuration, python: { ...project.python, entrypoint: 'missing.py' } },
      },
    }
    await expect(applyProRevision(store, project.id, invalid)).rejects.toThrow()
    expect(store.getState().project).toBe(project)
    const change = {
      baseHash: base.hash,
      summary: 'Editar',
      patches: [
        {
          path: 'src/helper.py',
          before: await studioProDigest(base.files['src/helper.py']!),
          content: 'n = 43',
        },
      ],
    }
    store.getState().setEditingAccess('observer')
    await expect(applyProRevision(store, project.id, change)).rejects.toThrow('observação')
    expect(store.getState().project).toBe(project)
  })

  test('uses the existing editor history for a source change and undo', async () => {
    const { store, project, base } = await setup()
    const receipt = await applyProEditorChange(store, project.id, {
      operationId: 'python-edit',
      change: {
        baseHash: base.hash,
        summary: 'Editar número',
        patches: [
          {
            path: 'src/helper.py',
            before: await studioProDigest(base.files['src/helper.py']!),
            content: 'n = 43',
          },
        ],
      },
    })
    expect(receipt.status).toBe('session')
    const records = listProSessionApplications(store, project.id)
    expect(records).toHaveLength(1)
    expect((await captureProRevision(store.getState().project!)).files['src/helper.py']).toBe(
      'n = 43',
    )
    await undoProApplication(store, project.id, records[0]!.record.operationId)
    expect(await captureProRevision(store.getState().project!)).toEqual(base)
  })
})
