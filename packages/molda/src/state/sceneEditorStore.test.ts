import { describe, expect, test } from 'bun:test'
import { COPY } from '../core/copy'
import { renameSceneNode } from '../scene/commands'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { openSceneWorkshop } from './openSceneWorkshop'
import { createSceneEditorStore } from './sceneEditorStore'
import { createScenePersistence } from './scenePersistence'
import {
  DOCUMENT_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
} from './storageKeys'

describe('scene editor persistence boundary', () => {
  test('an open editor cannot spend its revision token on another document with the same revision', async () => {
    const db = await nativeDatabase()
    const persistence = createScenePersistence(db.store)
    const source = migrateLegacyModel(makeModel()).document
    const other = { ...source, id: 'different-project', name: 'Outra criação' }
    await persistence.save(source, null)
    await persistence.save(other, null)
    const before = await db.dump()
    const editor = createSceneEditorStore(source, 1, persistence, { autosaveMs: 60_000 })
    try {
      editor.getState().commit({ ...source, id: other.id, name: 'Troca indevida' })
      await editor.getState().flush()
      expect(editor.getState().saveState).toBe('error')
      expect(editor.getState().savedAsset).toBe(source)
      expect(await db.dump()).toEqual(before)
    } finally {
      editor.getState().dispose()
      db.close()
    }
  })
  test('two open editors cannot overwrite each other, even on repeated manual saves', async () => {
    const db = await nativeDatabase()
    const persistence = createScenePersistence(db.store)
    const document = migrateLegacyModel(makeModel()).document
    await persistence.save(document, null)
    const first = createSceneEditorStore(document, 1, persistence, { autosaveMs: 60_000 })
    const second = createSceneEditorStore(document, 1, persistence, { autosaveMs: 60_000 })
    try {
      first.getState().commit(renameSceneNode(document, 'body', 'primeira aba'))
      await first.getState().flush()
      second.getState().commit(renameSceneNode(document, 'body', 'segunda aba'))
      await second.getState().flush()
      await second.getState().flush()
      expect(second.getState().saveState).toBe('error')
      expect(second.getState().saveError).toBe(COPY.scene.conflict)
      expect(second.getState().asset.nodes[0]?.name).toBe('segunda aba')
      expect(second.getState().savedAsset).toBe(document)
      first.getState().commit(renameSceneNode(first.getState().asset, 'body', 'continuação'))
      await first.getState().flush()
      const read = await persistence.read(document.id)
      expect(read.status).toBe('active')
      if (read.status !== 'active') throw new Error('Missing stored scene')
      expect(read.document.nodes[0]?.name).toBe('continuação')
      expect(read.summary.revision).toBe(3)
    } finally {
      first.getState().dispose()
      second.getState().dispose()
      db.close()
    }
  })

  test('opening explicitly promotes a legacy model and undo remains saved after reopen', async () => {
    const db = await nativeDatabase()
    const source = makeModel()
    await db.seed(`${DOCUMENT_KEY_PREFIX}${source.id}`, source)
    const editor = await openSceneWorkshop(db.store, source.id)
    try {
      const original = await db.read(`${SCENE_RECOVERY_KEY_PREFIX}${source.id}`)
      expect(original).toMatchObject({
        records: [{ key: `${DOCUMENT_KEY_PREFIX}${source.id}`, value: source }],
      })
      editor.getState().commit(renameSceneNode(editor.getState().asset, 'body', 'editado'))
      await editor.getState().flush()
      editor.getState().undo()
      await editor.getState().flush()
      const reopened = await openSceneWorkshop(db.store, source.id)
      expect(reopened.getState().asset.nodes[0]?.name).toBe('corpo')
      expect(await db.read(`${SCENE_RECOVERY_KEY_PREFIX}${source.id}`)).toEqual(original)
      reopened.getState().dispose()
    } finally {
      editor.getState().dispose()
      db.close()
    }
  })

  test('future/corrupt scenes, deleted scenes and cancelled opens never create fallback content', async () => {
    const db = await nativeDatabase()
    try {
      const source = makeModel()
      await db.seed(`${DOCUMENT_KEY_PREFIX}${source.id}`, source)
      await db.seed(`${SCENE_DOCUMENT_KEY_PREFIX}${source.id}`, { ...source, formatVersion: 99 })
      const before = await db.dump()
      await expect(
        openSceneWorkshop(db.store, source.id, { createIfMissing: true }),
      ).rejects.toThrow()
      expect(await db.dump()).toEqual(before)
      const abort = new AbortController()
      abort.abort()
      await expect(
        openSceneWorkshop(db.store, 'cancelled', { createIfMissing: true, signal: abort.signal }),
      ).rejects.toThrow()
      expect(await db.dump()).toEqual(before)
      const editor = await openSceneWorkshop(db.store, 'demo', { createIfMissing: true })
      const persistence = createScenePersistence(db.store)
      await persistence.remove('demo', 1)
      const deleted = await db.dump()
      await expect(openSceneWorkshop(db.store, 'demo', { createIfMissing: true })).rejects.toThrow()
      expect(await db.dump()).toEqual(deleted)
      editor.getState().dispose()
    } finally {
      db.close()
    }
  })
})
