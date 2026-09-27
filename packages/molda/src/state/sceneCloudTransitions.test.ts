import { expect, test } from 'bun:test'
import { assetToJson } from '../export/assetJson'
import { sceneToJson } from '../scene/documentJson'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { adoptCloudScene } from './promoteScene'
import { createMoldaSceneCloudSource } from './sceneCloudSource'
import { createScenePersistence } from './scenePersistence'
import {
  DELETED_KEY_PREFIX,
  DOCUMENT_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
} from './storageKeys'

test('a cena remota substitui o v1 comparado e preserva o original na mesma promoção', async () => {
  const db = await nativeDatabase()
  try {
    const legacy = { ...makeModel(), originalExtra: { preserve: true } }
    const remote = { ...migrateLegacyModel(legacy).document, name: 'remota', updatedAt: 9000 }
    await db.seed(`${DOCUMENT_KEY_PREFIX}${legacy.id}`, legacy)
    const source = createMoldaSceneCloudSource(db.store)
    const json = JSON.stringify(sceneToJson(remote))
    const before = await db.dump()
    expect(await source.saveIfUnchanged(legacy.id, json, legacy.updatedAt + 1)).toBe(false)
    expect(await db.dump()).toEqual(before)
    expect(await source.saveIfUnchanged(legacy.id, json, legacy.updatedAt)).toBe(true)
    const saved = await createScenePersistence(db.store).read(legacy.id)
    expect(saved.status === 'active' && saved.document).toEqual(remote)
    expect(await db.read(`${DOCUMENT_KEY_PREFIX}${legacy.id}`)).toBeUndefined()
    expect(await db.read(`${DELETED_KEY_PREFIX}${legacy.id}`)).toBe(true)
    expect(await db.read(`${SCENE_RECOVERY_KEY_PREFIX}${legacy.id}`)).toMatchObject({
      records: [{ key: `${DOCUMENT_KEY_PREFIX}${legacy.id}`, value: legacy }],
    })
  } finally {
    db.close()
  }
})

test('edição remota v1 sobre cena promove o conteúdo recebido sem regredir a geração', async () => {
  const db = await nativeDatabase()
  try {
    const legacy = makeModel()
    const persistence = createScenePersistence(db.store)
    const document = migrateLegacyModel(legacy).document
    await persistence.save(document, null)
    const remote = { ...legacy, name: 'editada-no-outro-aparelho', updatedAt: 9000 }
    const source = createMoldaSceneCloudSource(db.store)
    expect(
      await source.saveIfUnchanged(
        legacy.id,
        JSON.stringify(assetToJson(remote)),
        document.updatedAt,
      ),
    ).toBe(true)
    const saved = await persistence.read(legacy.id)
    expect(saved.status === 'active' && saved.document).toEqual(migrateLegacyModel(remote).document)
    expect(await db.read(`${DOCUMENT_KEY_PREFIX}${legacy.id}`)).toBeUndefined()
  } finally {
    db.close()
  }
})

test.each([
  1, 2,
])('edição remota v%i restaura cena excluída usando a revisão da lápide', async (version) => {
  const db = await nativeDatabase()
  try {
    const legacy = makeModel()
    const persistence = createScenePersistence(db.store)
    const document = migrateLegacyModel(legacy).document
    await persistence.save(document, null)
    await persistence.remove(document.id, 1)
    const remote = { ...legacy, name: 'editada-depois', updatedAt: 9000 }
    const json = JSON.stringify(
      version === 1 ? assetToJson(remote) : sceneToJson(migrateLegacyModel(remote).document),
    )
    const source = createMoldaSceneCloudSource(db.store)
    expect(await source.saveIfUnchanged(document.id, json, document.updatedAt)).toBe(false)
    expect(await source.saveIfUnchanged(document.id, json, null)).toBe(true)
    const saved = await persistence.read(document.id)
    expect(saved.status === 'active' && saved.document.name).toBe(remote.name)
    expect(saved.status === 'active' && saved.summary.revision).toBe(3)
  } finally {
    db.close()
  }
})

test('uma geração futura ou corrompida não é tratada como ausência nem cede lugar ao v1', async () => {
  const db = await nativeDatabase()
  try {
    const legacy = makeModel()
    await db.seed(`${DOCUMENT_KEY_PREFIX}${legacy.id}`, legacy)
    await db.seed(`${SCENE_DOCUMENT_KEY_PREFIX}${legacy.id}`, { formatVersion: 3, id: legacy.id })
    const before = await db.dump()
    const source = createMoldaSceneCloudSource(db.store)
    await expect(source.read(legacy.id)).rejects.toThrow()
    expect(await db.dump()).toEqual(before)
  } finally {
    db.close()
  }
})

test('descidas concorrentes sobre o v1 não sobrescrevem a promoção vencedora', async () => {
  const db = await nativeDatabase()
  try {
    const legacy = makeModel()
    await db.seed(`${DOCUMENT_KEY_PREFIX}${legacy.id}`, legacy)
    const document = migrateLegacyModel(legacy).document
    const results = await Promise.all([
      adoptCloudScene(db.store, { ...document, name: 'primeira' }, legacy.updatedAt),
      adoptCloudScene(db.store, { ...document, name: 'segunda' }, legacy.updatedAt),
    ])
    expect(results.map((result) => result.status)).toEqual(['promoted', 'conflict'])
    const saved = await createScenePersistence(db.store).read(legacy.id)
    expect(saved.status === 'active' && saved.document.name).toBe('primeira')
  } finally {
    db.close()
  }
})

test('quota insuficiente na descida não grava promoção, original nem lápides parciais', async () => {
  const db = await nativeDatabase()
  try {
    const legacy = makeModel()
    await db.seed(`${DOCUMENT_KEY_PREFIX}${legacy.id}`, legacy)
    const before = await db.dump()
    await expect(
      adoptCloudScene(db.store, migrateLegacyModel(legacy).document, legacy.updatedAt, 1),
    ).rejects.toThrow()
    expect(await db.dump()).toEqual(before)
  } finally {
    db.close()
  }
})
