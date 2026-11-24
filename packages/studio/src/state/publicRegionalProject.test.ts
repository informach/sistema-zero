import { beforeEach, expect, test } from 'bun:test'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { createBlankProjectSnapshot } from '../core/blankProject'
import { restoreProjectFromCloud } from '../projects/importSnapshot'
import { regionalSceneMaterial } from '../testing/pintaRegionalMaterialFixture'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { readValues } from './idbTransaction'
import {
  deleteProject,
  loadProjectAssetsSnapshotById,
  loadProjectById,
  loadProjectThumb,
  persistProject,
  persistProjectAssets,
  writeProjectThumb,
} from './persistence'
import { projectAssetsKey, projectFilesKey, projectMetaKey } from './projectStorageKeys'
import { advanceLocalRevision } from './projectStorageRevision'
import { createProjectStorageScope } from './projectStorageRuntime'
import { readRetainedManifest } from './retainedProjectStore'

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
  Object.defineProperty(globalThis, 'IDBKeyRange', { configurable: true, value: IDBKeyRange })
})
const scope = () => createProjectStorageScope(crypto.randomUUID())
async function document() {
  return { ...createBlankProjectSnapshot('vila', 'Vila'), assets: [await regionalSceneMaterial()] }
}

test('a miniatura recebida da conta pode completar o card regional sem alterar a autoria', async () => {
  const owner = scope(),
    project = await document()
  await persistProject(project, {}, owner)
  const before = await readRetainedManifest(owner, project.id)
  const thumb = 'data:image/jpeg;base64,AAAA'
  expect(await writeProjectThumb(project.id, thumb, { silent: true }, owner)).toBe(true)
  expect(await loadProjectThumb(project.id, owner)).toBe(thumb)
  expect((await loadProjectById(project.id, owner))?.assets).toEqual(project.assets)
  const after = await readRetainedManifest(owner, project.id)
  expect(after?.parts.head).toEqual(before?.parts.head)
})

test('novo projeto pessoal regional nasce na autoridade 5 sem escrever PNG5 na partição 4', async () => {
  const owner = scope(),
    other = scope(),
    project = await document()
  await persistProject(project, {}, owner)
  expect(await readRetainedManifest(owner, project.id)).toBeDefined()
  expect(
    await readValues(owner.store, [
      projectAssetsKey(project.id),
      projectFilesKey(project.id),
      projectMetaKey(project.id),
    ]),
  ).toEqual([undefined, undefined, undefined])
  const reopened = await prepareEditableStudioProject(
    await loadProjectById(project.id, createProjectStorageScope(owner.namespace)),
  )
  expect(reopened?.assets).toEqual(project.assets)
  expect((await loadProjectAssetsSnapshotById(project.id, owner)).assets).toEqual(project.assets)
  expect(reopened?.files).toEqual(project.files)
  expect(await loadProjectById(project.id, other)).toBeNull()
})
test('adoção conserva o predecessor e a edição seguinte usa a mesma autoridade', async () => {
  const owner = scope(),
    project = await document()
  await persistProject({ ...project, assets: [] }, {}, owner)
  const previous = await readValues(owner.store, [
    projectAssetsKey(project.id),
    projectFilesKey(project.id),
  ])
  const opened = await prepareEditableStudioProject(await loadProjectById(project.id, owner))
  if (!opened) throw new Error('Projeto de base ausente')
  const edited = advanceLocalRevision(opened, {
    ...opened,
    assets: project.assets,
    updatedAt: opened.updatedAt + 1,
  })
  await persistProject(edited, {}, owner)
  expect(
    await readValues(owner.store, [projectAssetsKey(project.id), projectFilesKey(project.id)]),
  ).toEqual(previous)
  expect(
    (await prepareEditableStudioProject(await loadProjectById(project.id, owner)))?.assets,
  ).toEqual(project.assets)
})
test('duas abas não sobrescrevem a revisão regional com uma base vencida', async () => {
  const owner = scope(),
    project = await document()
  await persistProject(project, {}, owner)
  const a = await prepareEditableStudioProject(await loadProjectById(project.id, owner))
  const b = await prepareEditableStudioProject(await loadProjectById(project.id, owner))
  if (!a || !b) throw new Error('Projeto ausente')
  await persistProject(
    advanceLocalRevision(a, { ...a, name: 'A', updatedAt: a.updatedAt + 1 }),
    {},
    owner,
  )
  await expect(
    persistProject(advanceLocalRevision(b, { ...b, name: 'B' }), {}, owner),
  ).rejects.toThrow('outra aba')
  expect((await loadProjectById(project.id, owner))?.name).toBe('A')
})

test('o restauro público reabre em outro aparelho e substitui uma revisão fechada pela cabeça retida', async () => {
  const first = scope(),
    second = scope(),
    project = await document()
  await persistProject(project, {}, first)
  const snapshot = await loadProjectById(project.id, first)
  const remote = await restoreProjectFromCloud(snapshot, {
    expectedId: project.id,
    namespace: second.namespace,
  })
  expect(remote.project.assets).toEqual(project.assets)
  const restored = await restoreProjectFromCloud(
    { ...project, name: 'Vila nova', updatedAt: project.updatedAt + 1 },
    { expectedId: project.id, namespace: second.namespace },
  )
  expect(restored.project.name).toBe('Vila nova')
  expect((await loadProjectById(project.id, second))?.assets).toEqual(project.assets)
})
test('atualizar desenhos adota a base exata e exclusão remota não deixa a aba ressuscitar o projeto', async () => {
  const owner = scope(),
    project = await document()
  await persistProject({ ...project, assets: [] }, {}, owner)
  const snapshot = await loadProjectAssetsSnapshotById(project.id, owner)
  expect(
    await persistProjectAssets(project.id, project.assets, owner, snapshot.assets, () => true),
  ).toBe(true)
  const opened = await prepareEditableStudioProject(await loadProjectById(project.id, owner))
  if (!opened) throw new Error('Projeto ausente')
  await deleteProject(project.id, owner, { notifyCloudMirror: false })
  expect(await loadProjectById(project.id, owner)).toBeNull()
  await expect(
    persistProject(advanceLocalRevision(opened, { ...opened, name: 'Antigo' }), {}, owner),
  ).rejects.toThrow()
})
