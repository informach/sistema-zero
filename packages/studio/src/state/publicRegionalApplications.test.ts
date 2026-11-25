import { afterEach, beforeEach, expect, test } from 'bun:test'
import { studioProDigest } from '@sistemazero/core/studio'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { createBlankProjectSnapshot } from '../core/blankProject'
import { gameTwoDManifest } from '../official-extensions/game-2d/manifest'
import { regionalSceneMaterial } from '../testing/pintaRegionalMaterialFixture'
import { convertClassicToProTree } from './convertToPro'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { readValues, writeInOneTransaction } from './idbTransaction'
import { deleteProject, loadProjectById, persistProject } from './persistence'
import { registerProjectPersistence } from './projectOperations'
import { PRO_APPLICATION_LIMITS } from './projectStorageCoordinator'
import { applicationBudgetKey, projectApplicationsKey } from './projectStorageKeys'
import { captureProjectStorageScope, setProjectStorageNamespace } from './projectStorageRuntime'
import { createLocalPersistenceAdapter, createProjectStore } from './projectStore'
import {
  applyProEditorChange,
  captureProRevision,
  listProApplications,
  retryProApplication,
  undoProApplication,
} from './proRevision'
import { retainedApplicationBudgetId } from './retainedProjectApplications'

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: IDBKeyRange, configurable: true })
  setProjectStorageNamespace(crypto.randomUUID())
})
afterEach(() => setProjectStorageNamespace(''))
async function fixture() {
  const scope = captureProjectStorageScope(),
    store = createProjectStore(),
    adapter = createLocalPersistenceAdapter()
  const original = {
    ...createBlankProjectSnapshot('regional-applications', 'Vila'),
    installedExtensions: [
      { id: gameTwoDManifest.id, version: gameTwoDManifest.version, installedAt: 1 },
    ],
  }
  const tree = await convertClassicToProTree(original)
  const pro = {
    ...original,
    kind: 'pro' as const,
    mode: 'code' as const,
    tree,
    proMeta: {
      templateId: 'vanilla-vite',
      devScript: 'dev',
      origin: { projectId: original.id, revision: 0 },
    },
  }
  await persistProject(pro, {}, scope)
  const opened = await prepareEditableStudioProject(await loadProjectById(pro.id, scope))
  if (!opened) throw new Error('Projeto ausente')
  store.setState({ project: opened, editingAccess: 'author' })
  registerProjectPersistence(store, adapter)
  async function edit(path: string, content: string) {
    const current = store.getState().project
    if (!current) throw new Error('Projeto ausente')
    const base = await captureProRevision(current)
    return applyProEditorChange(store, current.id, {
      operationId: crypto.randomUUID(),
      change: {
        baseHash: base.hash,
        summary: 'Editar arquivo',
        patches: [
          {
            path,
            before: base.files[path] === undefined ? null : await studioProDigest(base.files[path]),
            content,
          },
        ],
      },
    })
  }
  return { scope, store, adapter, edit, pro }
}
test('adota o histórico anterior, confirma novas aplicações e permite desfazer depois de reabrir', async () => {
  const f = await fixture()
  expect((await f.edit('src/lg04.ts', 'export const score = 1')).status).toBe('saved')
  const legacy = await readValues(f.scope.store, [projectApplicationsKey(f.pro.id)])
  const material = await regionalSceneMaterial()
  expect(
    await f.store
      .getState()
      .importRegionalPintaMaterial({ ...material, id: material.regional.sourceId }),
  ).toBeNull()
  const imported = f.store.getState().project
  if (!imported) throw new Error('Projeto ausente')
  await f.adapter.save(imported)
  const second = await f.edit('src/lg04.ts', 'export const score = 2')
  expect(second.status).toBe('saved')
  expect(await listProApplications(f.scope, f.pro.id)).toHaveLength(2)
  expect(await readValues(f.scope.store, [projectApplicationsKey(f.pro.id)])).toEqual(legacy)
  const reopened = await prepareEditableStudioProject(await loadProjectById(f.pro.id, f.scope))
  if (!reopened) throw new Error('Projeto ausente')
  const store = createProjectStore()
  store.setState({ project: reopened, editingAccess: 'author' })
  registerProjectPersistence(store, f.adapter)
  expect((await undoProApplication(store, f.pro.id, second.operationId)).status).toBe('saved')
  expect(await loadProjectById(f.pro.id, f.scope)).toMatchObject({
    tree: { 'src/lg04.ts': { content: 'export const score = 1' } },
  })
  const [budget] = await readValues(f.scope.store, [applicationBudgetKey()])
  expect(budget).toHaveProperty(retainedApplicationBudgetId(f.pro.id))
  await deleteProject(f.pro.id, f.scope)
  const [after] = await readValues(f.scope.store, [applicationBudgetKey()])
  expect(after).not.toHaveProperty(retainedApplicationBudgetId(f.pro.id))
  expect(after).not.toHaveProperty(f.pro.id)
})

async function adopt(f: Awaited<ReturnType<typeof fixture>>) {
  const material = await regionalSceneMaterial()
  expect(
    await f.store
      .getState()
      .importRegionalPintaMaterial({ ...material, id: material.regional.sourceId }),
  ).toBeNull()
  const current = f.store.getState().project
  if (!current) throw new Error('Projeto ausente')
  await f.adapter.save(current)
}
test('cota compartilhada com o escritor antigo não confirma a aplicação; liberar espaço permite repetir sem reaplicar', async () => {
  const f = await fixture()
  await adopt(f)
  await writeInOneTransaction(f.scope.store, {
    puts: [[applicationBudgetKey(), { outro: PRO_APPLICATION_LIMITS.profileBytes }]],
  })
  const pending = await f.edit('src/lg04.ts', 'export const score = 3')
  expect(pending.status).toBe('pending')
  const saved = await prepareEditableStudioProject(await loadProjectById(f.pro.id, f.scope))
  expect(saved?.tree?.['src/lg04.ts']).toBeUndefined()
  expect(f.store.getState().project?.tree?.['src/lg04.ts']).toMatchObject({
    content: 'export const score = 3',
  })
  await writeInOneTransaction(f.scope.store, { puts: [[applicationBudgetKey(), {}]] })
  expect((await retryProApplication(f.store, f.pro.id, pending.operationId)).status).toBe('saved')
  expect(await listProApplications(f.scope, f.pro.id)).toHaveLength(1)
})
test('a saída do Pro retém a aplicação pendente e a reabertura a confirma junto com a autoria', async () => {
  const f = await fixture()
  await adopt(f)
  registerProjectPersistence(f.store, {
    ...f.adapter,
    save: async () => {
      throw new DOMException('Sem espaço', 'QuotaExceededError')
    },
  })
  const pending = await f.edit('src/lg04.ts', 'export const score = 4')
  expect(pending.status).toBe('pending')
  const current = f.store.getState().project
  if (!current || !f.adapter.flushOnExit) throw new Error('Recuperação de saída ausente')
  await f.adapter.flushOnExit(current, { pageAlive: true })
  const reopened = await prepareEditableStudioProject(
    await loadProjectById(f.pro.id, f.scope, { recoverDraft: true }),
  )
  if (!reopened) throw new Error('Cópia de saída ausente')
  expect(reopened.tree?.['src/lg04.ts']).toMatchObject({ content: 'export const score = 4' })
  await f.adapter.save(reopened)
  expect(
    (await listProApplications(f.scope, f.pro.id)).map((record) => record.operationId),
  ).toContain(pending.operationId)
  expect(await loadProjectById(f.pro.id, f.scope)).toMatchObject({
    tree: { 'src/lg04.ts': { content: 'export const score = 4' } },
  })
})
