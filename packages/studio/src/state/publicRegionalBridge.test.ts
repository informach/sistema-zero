import { beforeEach, expect, test } from 'bun:test'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import {
  getPersonalAsset,
  removePersonalAsset,
  savePersonalAssetBundle,
} from '../asset-library/personal'
import { reconcileDrawingsFromRestoredProject } from '../asset-library/personalSync'
import { createBlankProjectSnapshot } from '../core/blankProject'
import { gameTwoDManifest } from '../official-extensions/game-2d/manifest'
import { loadProjectSnapshotForCloud } from '../projects/importSnapshot'
import { buildTilemapGameProject } from '../projects/tilemapGame'
import {
  installPngImageBitmap,
  regionalSceneMaterial,
} from '../testing/pintaRegionalMaterialFixture'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore } from './projectStore'

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: IDBKeyRange, configurable: true })
  setProjectStorageNamespace(crypto.randomUUID())
})
test('a ponte pública guarda a revisão verificada, importa sem mudar programa e reabre os mesmos bytes', async () => {
  const material = await regionalSceneMaterial(),
    namespace = crypto.randomUUID()
  const input = { ...material, id: material.regional.sourceId }
  const result = await savePersonalAssetBundle([input], { namespace })
  expect(result.ok).toBe(true)
  const drawing = await getPersonalAsset(input.id, { namespace })
  expect(drawing?.regional).toEqual(material.regional)
  expect(drawing?.dataUrl).toBe(material.dataUrl)
  const store = createProjectStore()
  const project = {
    ...createBlankProjectSnapshot('bridge-project', 'Vila'),
    installedExtensions: [
      { id: gameTwoDManifest.id, version: gameTwoDManifest.version, installedAt: 0 },
    ],
  }
  store.setState({ project, editingAccess: 'author' })
  expect(
    await store
      .getState()
      .importRegionalPintaMaterial({ ...input, libRevision: drawing?.updatedAt }),
  ).toBeNull()
  const imported = store.getState().project
  expect(imported?.files).toEqual(project.files)
  expect(imported?.blocksState).toEqual(project.blocksState)
  expect(imported?.assets?.[0]?.dataUrl).toBe(material.dataUrl)
  expect((await prepareEditableStudioProject(imported))?.assets?.[0]?.regional).toEqual(
    material.regional,
  )
  const before = store.getState().project
  expect(
    await store.getState().importRegionalPintaMaterial({
      ...input,
      regional: { ...material.regional, sha256: 'f'.repeat(64) },
    }),
  ).toBeTruthy()
  expect(store.getState().project).toBe(before)
})
test('Jogar meu mapa cria blocos editáveis, conserva o PNG e lê a mesma versão para a conta', async () => {
  const restoreBitmap = installPngImageBitmap()
  try {
    const material = await regionalSceneMaterial()
    const game = await buildTilemapGameProject({ ...material, id: material.regional.sourceId })
    expect(game?.blocksState).toBeDefined()
    if (!game) throw new Error('O jogo precisa ser criado')
    const cloud = await loadProjectSnapshotForCloud(game.id)
    expect(cloud?.assets?.[0]?.dataUrl).toBe(material.dataUrl)
    expect(cloud?.assets?.[0]?.regional).toEqual(material.regional)
    expect(cloud?.files).toEqual(game.files)
  } finally {
    restoreBitmap()
  }
})

test('a exclusão da biblioteca recusa a revisão antiga e conserva o PNG já usado no projeto', async () => {
  const material = await regionalSceneMaterial(),
    namespace = crypto.randomUUID()
  const input = { ...material, id: material.regional.sourceId }
  expect((await savePersonalAssetBundle([input], { namespace })).ok).toBe(true)
  const first = await getPersonalAsset(input.id, { namespace })
  if (!first?.regional) throw new Error('O cenário deve estar admitido na biblioteca.')
  const expected = { sha256: first.regional.sha256, updatedAt: first.updatedAt }
  expect((await savePersonalAssetBundle([input], { namespace })).ok).toBe(true)
  expect((await removePersonalAsset(input.id, { namespace, regional: expected })).ok).toBe(false)
  const latest = await getPersonalAsset(input.id, { namespace })
  if (!latest?.regional) throw new Error('A revisão mais nova deve continuar na biblioteca.')
  expect(
    (
      await removePersonalAsset(input.id, {
        namespace,
        regional: {
          sha256: latest.regional.sha256,
          updatedAt: latest.updatedAt,
        },
      })
    ).ok,
  ).toBe(true)
  expect(await getPersonalAsset(input.id, { namespace })).toBeNull()
  expect(
    (
      await prepareEditableStudioProject({
        ...createBlankProjectSnapshot('independent-project', 'Vila'),
        assets: [material],
      })
    )?.assets?.[0]?.dataUrl,
  ).toBe(material.dataUrl)
})

test('uma aula legada recusa o regional antes de alterar o desenho, o código ou o checkpoint', async () => {
  const material = await regionalSceneMaterial()
  const store = createProjectStore()
  const project = {
    ...createBlankProjectSnapshot(
      lessonStudioProjectId(crypto.randomUUID(), crypto.randomUUID()),
      'Aula',
    ),
    installedExtensions: [
      { id: gameTwoDManifest.id, version: gameTwoDManifest.version, installedAt: 0 },
    ],
  }
  store.setState({ project, editingAccess: 'author', isDirty: false })
  expect(
    await store
      .getState()
      .importRegionalPintaMaterial({ ...material, id: material.regional.sourceId }),
  ).toContain('Estúdio livre')
  expect(store.getState().project).toBe(project)
  expect(store.getState().isDirty).toBe(false)
})

test('um projeto de outro aparelho mantém seu PNG mesmo quando a biblioteca local tem outra revisão', async () => {
  const namespace = crypto.randomUUID(),
    local = await regionalSceneMaterial('#aabbcc'),
    remote = await regionalSceneMaterial('#ccbbaa')
  expect(local.dataUrl).not.toBe(remote.dataUrl)
  expect(
    (await savePersonalAssetBundle([{ ...local, id: local.regional.sourceId }], { namespace })).ok,
  ).toBe(true)
  const restored = {
    ...createBlankProjectSnapshot('another-device', 'Outra vila'),
    assets: [remote],
  }
  expect(await reconcileDrawingsFromRestoredProject(restored, { namespace })).toEqual({
    projectChanged: true,
  })
  expect(restored.assets[0]?.dataUrl).toBe(remote.dataUrl)
  expect(restored.assets[0]?.libId).toBeUndefined()
  expect(restored.files).toEqual(createBlankProjectSnapshot('another-device', 'Outra vila').files)
  expect((await getPersonalAsset(local.regional.sourceId, { namespace }))?.dataUrl).toBe(
    local.dataUrl,
  )
  expect((await prepareEditableStudioProject(restored))?.assets?.[0]?.regional).toEqual(
    remote.regional,
  )
})
