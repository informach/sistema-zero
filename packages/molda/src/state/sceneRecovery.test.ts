import { expect, test } from 'bun:test'
import { deflateSync } from 'fflate'
import type { UseStore } from 'idb-keyval'
import { structuredBytes } from '../core/structuredBytes'
import { renameSceneNode } from '../scene/commands'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { deferred } from '../testing/deferred'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { createSceneEditorStore } from './sceneEditorStore'
import { createScenePersistence } from './scenePersistence'
import {
  inflateRecoveryBlock,
  prepareSceneRecovery,
  restoreSceneRecovery,
} from './sceneRecoveryCodec'
import { createSceneRecoveryPersistence } from './sceneRecoveryPersistence'
import {
  SCENE_CHECKPOINT_BLOCK_PREFIX as BLOCK,
  SCENE_CHECKPOINT_PREFIX as CHECKPOINT,
} from './storageKeys'

test('lossless recovery preserves all native fields and pixels; one changed pixel adds one compressed block', async () => {
  const source = migrateLegacyModel(makeModel()).document
  source.images[0]!.width = 1024
  source.images[0]!.height = 1024
  source.images[0]!.layers[0]!.pixels = new Uint8Array(1024 ** 2)
  const first = await prepareSceneRecovery(source, 1, 'session')
  const restored = await restoreSceneRecovery(first.record, first.blocks)
  expect(restored).toEqual(source)
  expect(restored.images[0]!.layers[0]!.pixels).not.toBe(source.images[0]!.layers[0]!.pixels)
  expect(
    [...first.blocks.values()].reduce((sum, block) => sum + block.bytes.length, 0),
  ).toBeLessThan(2048)
  const next = structuredClone(source)
  next.images[0]!.layers[0]!.pixels[0] = 2
  const second = await prepareSceneRecovery(next, 1, 'session')
  expect([...second.blocks.keys()].filter((hash) => !first.blocks.has(hash))).toHaveLength(1)
  expect(await restoreSceneRecovery(second.record, second.blocks)).toEqual(next)
  const broken = new Map(second.blocks)
  broken.delete(second.record.layers[0]!.blocks[0]!)
  await expect(restoreSceneRecovery(second.record, broken)).rejects.toThrow()
})

test('checkpoint storage keeps two revisions, shares blocks, rejects stale discard and bounds growth', async () => {
  const db = await nativeDatabase()
  const p = createSceneRecoveryPersistence(db.store)
  try {
    let source = migrateLegacyModel(makeModel()).document
    const old = await prepareSceneRecovery(source, 1, 'session')
    await p.save(old)
    for (let i = 0; i < 100; i++) {
      source = { ...source, name: `modelo-${i}`, updatedAt: source.updatedAt + 1 }
      await p.save(await prepareSceneRecovery(source, 1, 'session'))
    }
    const list = await p.list(source.id)
    expect(list).toHaveLength(2)
    expect(await p.restore(list[0]!)).toEqual(source)
    expect(await p.discard(old.record)).toBe(false)
    expect(await p.list(source.id)).toHaveLength(2)
    expect(
      [...(await db.dump()).keys()].filter((key) => String(key).startsWith(BLOCK)),
    ).toHaveLength(old.blocks.size)
    await p.clear(source.id, 'session')
    expect((await db.dump()).size).toBe(0)
  } finally {
    db.close()
  }
})

test('failed normal autosave is recoverable after reopening and successful retry clears its checkpoint', async () => {
  const db = await nativeDatabase()
  const source = migrateLegacyModel(makeModel()).document
  const p = createScenePersistence(db.store, 1_000_000)
  await p.save(source, null)
  let fail = true
  const editor = createSceneEditorStore(
    source,
    1,
    {
      ...p,
      async save(document, revision) {
        if (fail) throw new DOMException('Full disk', 'QuotaExceededError')
        return p.save(document, revision)
      },
    },
    { autosaveMs: 60_000 },
  )
  let reopened: ReturnType<typeof createSceneEditorStore> | undefined
  try {
    await editor.recovery!.ready
    editor.getState().commit(renameSceneNode(source, 'body', 'meu carrinho'))
    await editor.getState().flush()
    expect(editor.getState().saveState).toBe('error')
    expect(editor.recovery!.getSnapshot().protectedDocument).toBe(editor.getState().saveSnapshot())
    const read = await p.read(source.id)
    if (read.status !== 'active') throw new Error('Missing saved document')
    reopened = createSceneEditorStore(read.document, read.summary.revision, p, {
      autosaveMs: 60_000,
    })
    await reopened.recovery!.ready
    expect(reopened.recovery!.getSnapshot().available?.document.nodes[0]?.name).toBe('meu carrinho')
    expect(await reopened.recovery!.restore()).toBe(true)
    await reopened.getState().flush()
    expect(reopened.getState().saveState).toBe('saved')
    expect(await p.recovery.list(source.id)).toEqual([])
    fail = false
    await editor.getState().flush()
    // An older tab cannot overwrite the recovered revision.
    expect(editor.getState().saveState).toBe('error')
    expect((await p.read(source.id)).status).toBe('active')
  } finally {
    await editor.recovery!.discardCurrent()
    editor.getState().dispose()
    reopened?.getState().dispose()
    db.close()
  }
})

test('a checkpoint from another base revision never overwrites a newer saved creation', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const lost = {
    ...renameSceneNode(source, 'body', 'não sobrescrever'),
    updatedAt: source.updatedAt + 1,
  }
  await p.recovery.save(await prepareSceneRecovery(lost, 1, 'other-tab'))
  const saved = { ...source, name: 'versão mais recente', updatedAt: source.updatedAt + 2 }
  await p.save(saved, 1)
  const editor = createSceneEditorStore(saved, 2, p)
  try {
    await editor.recovery!.ready
    expect(editor.recovery!.getSnapshot().available?.conflict).toBe(true)
    expect(await editor.recovery!.restore()).toBe(false)
    expect(editor.getState().asset).toBe(saved)
    expect(await p.recovery.list(source.id)).toHaveLength(1)
    expect(structuredBytes(await db.dump())).toBeGreaterThan(0)
  } finally {
    editor.getState().dispose()
    db.close()
  }
})

test('a later unsaved edit adopts only this session’s newly saved base revision while an older save drains', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const started = deferred(),
    release = deferred()
  const editor = createSceneEditorStore(
    source,
    1,
    {
      ...p,
      async save(document, revision) {
        if (document.nodes[0]?.name === 'primeira') {
          started.resolve()
          await release.promise
          return p.save(document, revision)
        }
        throw new DOMException('Full storage', 'QuotaExceededError')
      },
    },
    { autosaveMs: 1 },
  )
  try {
    await editor.recovery!.ready
    editor.getState().commit(renameSceneNode(source, 'body', 'primeira'))
    await started.promise
    editor.getState().commit(renameSceneNode(editor.getState().asset, 'body', 'segunda'))
    await editor.recovery!.flush()
    release.resolve()
    await editor.getState().flush()
    expect(editor.getState().saveState).toBe('error')
    const [latest] = await p.recovery.list(source.id)
    expect(latest?.baseRevision).toBe(2)
    expect((await p.recovery.restore(latest!)).nodes[0]?.name).toBe('segunda')
  } finally {
    release.resolve()
    await editor.recovery!.discardCurrent()
    editor.getState().dispose()
    db.close()
  }
})

test('a corrupt latest checkpoint falls back to its previous valid copy without erasing the corrupt record', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const good = { ...source, name: 'recuperável', updatedAt: source.updatedAt + 1 }
  good.images = structuredClone(source.images)
  good.images[0]!.layers[0]!.pixels[0] = 5
  const first = await prepareSceneRecovery(good, 1, 'crashed')
  await p.recovery.save(first)
  const latest = structuredClone(good)
  latest.updatedAt++
  latest.images[0]!.layers[0]!.pixels[0] = 6
  const second = await prepareSceneRecovery(latest, 1, 'crashed')
  await p.recovery.save(second)
  const hash = second.record.layers[0]!.blocks[0]!
  const block = second.blocks.get(hash)!
  await db.seed(`${BLOCK}${hash}`, { ...block, bytes: new Uint8Array([255]) })
  const editor = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
  try {
    await editor.recovery!.ready
    expect(editor.recovery!.getSnapshot().available?.document).toEqual(good)
    expect(await editor.recovery!.restore()).toBe(true)
    expect(editor.recovery!.getSnapshot().available).toBeNull()
    await editor.getState().flush()
    expect(await p.recovery.list(source.id)).toHaveLength(1)
    expect(await db.read(`${BLOCK}${hash}`)).toEqual({ ...block, bytes: new Uint8Array([255]) })
  } finally {
    editor.getState().dispose()
    db.close()
  }
})

test('one unreadable checkpoint index does not hide recoverable work from another session', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const good = { ...source, name: 'trabalho encontrado', updatedAt: source.updatedAt + 1 }
  await p.recovery.save(await prepareSceneRecovery(good, 1, 'readable'))
  const corruptKey = `${CHECKPOINT}${source.id}:corrupt`
  const corrupt = { kind: 'molda-checkpoint-set', version: 1, entries: ['unreadable'] }
  await db.seed(corruptKey, corrupt)
  const editor = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
  try {
    await editor.recovery!.ready
    expect(editor.recovery!.getSnapshot().available?.document).toEqual(good)
    expect(editor.recovery!.getSnapshot().error).toContain('preservada')
    expect(await editor.recovery!.restore()).toBe(true)
    await editor.getState().flush()
    expect(await db.read(corruptKey)).toEqual(corrupt)
    expect(await p.read(source.id)).toMatchObject({
      status: 'active',
      document: { name: good.name },
    })
  } finally {
    editor.getState().dispose()
    db.close()
  }
})

test('reopening collects obsolete recovery already saved in the primary without discarding other unsaved work', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  await p.recovery.save(await prepareSceneRecovery(source, 1, 'already-saved'))
  const good = { ...source, name: 'mudanças ainda não salvas', updatedAt: source.updatedAt + 1 }
  await p.recovery.save(await prepareSceneRecovery(good, 1, 'unsaved'))
  const editor = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
  try {
    await editor.recovery!.ready
    expect(editor.recovery!.getSnapshot().available?.document).toEqual(good)
    expect((await p.recovery.list(source.id)).map((record) => record.session)).toEqual(['unsaved'])
    expect(await p.read(source.id)).toMatchObject({
      status: 'active',
      document: { name: source.name },
    })
  } finally {
    editor.getState().dispose()
    db.close()
  }
})

test('an already saved latest checkpoint supersedes earlier edits in that session without a false recovery warning', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const earlier = { ...source, name: 'traço desfeito', updatedAt: source.updatedAt + 1 }
  await p.recovery.save(await prepareSceneRecovery(earlier, 1, 'saved-session'))
  const saved = { ...source, updatedAt: source.updatedAt + 2 }
  await p.recovery.save(await prepareSceneRecovery(saved, 1, 'saved-session'))
  const editor = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
  try {
    await editor.recovery!.ready
    expect(editor.recovery!.getSnapshot().available).toBeNull()
    expect(editor.recovery!.getSnapshot().error).toBeNull()
    expect(await p.recovery.list(source.id)).toEqual([])
  } finally {
    editor.getState().dispose()
    db.close()
  }
})

test('gallery budget refusal still permits an independent checkpoint and temporary preparation is never protected as work', async () => {
  const db = await nativeDatabase()
  const source = migrateLegacyModel(makeModel()).document
  const initial = createScenePersistence(db.store)
  await initial.save(source, null)
  const cost = [...(await db.dump()).values()].reduce<number>(
    (sum, record) => sum + structuredBytes(record),
    0,
  )
  const p = createScenePersistence(db.store, cost + 1)
  const editor = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
  try {
    await editor.recovery!.ready
    editor.getState().stage({ ...source, name: 'preparação temporária' })
    await editor.recovery!.flush()
    expect(await p.recovery.list(source.id)).toEqual([])
    editor.getState().replace(source)
    editor.getState().commit(renameSceneNode(source, 'body', 'carrinho com detalhes'))
    await editor.getState().flush()
    expect(editor.getState().saveState).toBe('error')
    expect(editor.recovery!.getSnapshot().protectedDocument).toBe(editor.getState().asset)
    expect((await p.recovery.list(source.id)).length).toBeGreaterThan(0)
  } finally {
    await editor.recovery!.discardCurrent()
    editor.getState().dispose()
    db.close()
  }
})

test('checkpoint writes own caller data before IO; painting previews do not create background checkpoints', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const prepared = await prepareSceneRecovery(source, 1, 'caller')
  const before = structuredClone(source)
  try {
    const write = p.recovery.save(prepared)
    prepared.record.manifest.document.name = 'mutated caller'
    for (const block of prepared.blocks.values()) block.bytes.fill(255)
    await write
    const [record] = await p.recovery.list(source.id)
    expect(await p.recovery.restore(record!)).toEqual(before)
    await p.recovery.clear(source.id, 'caller')
    const editor = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
    try {
      await editor.recovery!.ready
      for (let i = 0; i < 200; i++)
        editor.getState().replace(renameSceneNode(source, 'body', `prévia-${i}`))
      await Promise.resolve()
      expect(editor.recovery!.getSnapshot().phase).toBe('idle')
      expect(await p.recovery.list(source.id)).toEqual([])
      editor.getState().commitGesture(source, editor.getState().asset)
      await editor.recovery!.flush()
      expect(editor.recovery!.getSnapshot().phase).toBe('protected')
    } finally {
      await editor.recovery!.discardCurrent()
      editor.getState().dispose()
    }
  } finally {
    db.close()
  }
})

test('a derived thumbnail save does not turn a valid recovery into a cross-tab conflict', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const lost = {
    ...renameSceneNode(source, 'body', 'trabalho encontrado'),
    updatedAt: source.updatedAt + 1,
  }
  await p.recovery.save(await prepareSceneRecovery(lost, 1, 'previous-session'))
  const editor = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
  try {
    await editor.recovery!.ready
    editor.getState().setThumb('data:image/png;base64,AAAA')
    await editor.getState().flush()
    expect(await p.readIndexRevision(source.id)).toEqual({ status: 'indexed', revision: 2 })
    expect(editor.getState().contentRevision).toBe(0)
    expect(await editor.recovery!.restore()).toBe(true)
    expect(editor.getState().asset.nodes[0]?.name).toBe('trabalho encontrado')
    await editor.getState().flush()
  } finally {
    editor.getState().dispose()
    db.close()
  }
})

test('recovery protection follows authoring revision rather than a derived thumbnail object identity', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const editor = createSceneEditorStore(
    source,
    1,
    {
      ...p,
      save: async () => {
        throw new Error('Full disk')
      },
    },
    { autosaveMs: 60_000 },
  )
  try {
    await editor.recovery!.ready
    editor.getState().commit(renameSceneNode(source, 'body', 'última mudança'))
    await editor.getState().flush()
    editor.getState().setThumb('data:image/png;base64,AAAA')
    expect(editor.recovery!.getSnapshot().protectedDocument).not.toBe(editor.getState().asset)
    expect(editor.recovery!.getSnapshot().protectedContentRevision).toBe(
      editor.getState().contentRevision,
    )
  } finally {
    await editor.recovery!.discardCurrent()
    editor.getState().dispose()
    db.close()
  }
})

test('RGBA recovery keeps transparent RGB bytes and incompressible blocks exactly', async () => {
  const source = migrateLegacyModel(makeModel()).document
  const image = source.images[0]!
  image.encoding = 'rgba'
  image.width = 256
  image.height = 256
  const pixels = new Uint8Array(256 * 256 * 4)
  let random = 1234567
  for (let i = 0; i < pixels.length; i++) {
    random = (Math.imul(random, 1664525) + 1013904223) | 0
    pixels[i] = random >>> 24
  }
  for (let i = 3; i < pixels.length; i += 44) pixels[i] = 0
  image.layers[0]!.pixels = pixels
  const prepared = await prepareSceneRecovery(source, 1, 'rgba')
  expect(await restoreSceneRecovery(prepared.record, prepared.blocks)).toEqual(source)
})

test('pixel checkpoint collection stays bounded across strokes, and failed final writes preserve the previous complete copy', async () => {
  const db = await nativeDatabase()
  const p = createSceneRecoveryPersistence(db.store)
  let source = migrateLegacyModel(makeModel()).document
  source.images[0]!.width = 256
  source.images[0]!.height = 256
  source.images[0]!.layers[0]!.pixels = new Uint8Array(256 ** 2)
  try {
    for (let i = 0; i < 128; i++) {
      source = structuredClone(source)
      source.updatedAt++
      source.images[0]!.layers[0]!.pixels[i] = (i % 10) + 2
      await p.save(await prepareSceneRecovery(source, 1, 'paint'))
    }
    expect(await p.list(source.id)).toHaveLength(2)
    expect(
      [...(await db.dump()).keys()].filter((key) => String(key).startsWith(BLOCK)),
    ).toHaveLength(3)
    const before = await db.dump()
    const failing: UseStore = (mode, callback) =>
      db.store(mode, (native) => {
        const put = native.put
        native.put = (value, key) => {
          if (typeof key === 'string' && key.startsWith(CHECKPOINT))
            throw new DOMException('Full disk', 'QuotaExceededError')
          return put.call(native, value, key)
        }
        return callback(native)
      })
    const next = structuredClone(source)
    next.updatedAt++
    next.images[0]!.layers[0]!.pixels[200] = 4
    await expect(
      createSceneRecoveryPersistence(failing).save(await prepareSceneRecovery(next, 1, 'paint')),
    ).rejects.toThrow('Full disk')
    expect(await db.dump()).toEqual(before)
    expect(await p.restore((await p.list(source.id))[0]!)).toEqual(source)
  } finally {
    db.close()
  }
})

test('the recovery pool accounts for all its records and refuses atomically before replacing a usable checkpoint', async () => {
  const db = await nativeDatabase()
  const source = migrateLegacyModel(makeModel()).document
  const p = createSceneRecoveryPersistence(db.store)
  try {
    await p.save(await prepareSceneRecovery(source, 1, 'session'))
    const before = await db.dump()
    const cost = [...before.values()].reduce<number>((sum, raw) => sum + structuredBytes(raw), 0)
    const next = { ...source, updatedAt: source.updatedAt + 1, name: 'mais detalhes' }
    await expect(
      createSceneRecoveryPersistence(db.store, cost + 1).save(
        await prepareSceneRecovery(next, 1, 'session'),
      ),
    ).rejects.toThrow('espaço')
    expect(await db.dump()).toEqual(before)
    expect(await p.restore((await p.list(source.id))[0]!)).toEqual(source)
    await createSceneRecoveryPersistence(db.store, 1).clear(source.id, 'session')
    expect((await db.dump()).size).toBe(0)
  } finally {
    db.close()
  }
})

test('deduplication compares exact original pixels when valid DEFLATE representations differ', async () => {
  const db = await nativeDatabase()
  const p = createSceneRecoveryPersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  try {
    await p.save(await prepareSceneRecovery(source, 1, 'compression'))
    const next = { ...source, updatedAt: source.updatedAt + 1 }
    const prepared = await prepareSceneRecovery(next, 1, 'compression')
    for (const [hash, block] of prepared.blocks)
      prepared.blocks.set(hash, {
        ...block,
        bytes: deflateSync(inflateRecoveryBlock(block), { level: 0 }),
      })
    await p.save(prepared)
    expect(await p.restore((await p.list(source.id))[0]!)).toEqual(next)
  } finally {
    db.close()
  }
})

test('a checkpoint cleanup failure preserves the backup and does not report a successful primary save as unsaved', async () => {
  const db = await nativeDatabase()
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const editor = createSceneEditorStore(
    source,
    1,
    {
      ...p,
      recovery: {
        ...p.recovery,
        clear: async () => {
          throw new Error('Cleanup unavailable')
        },
      },
    },
    { autosaveMs: 60_000 },
  )
  try {
    await editor.recovery!.ready
    editor.getState().commit(renameSceneNode(source, 'body', 'salvo de verdade'))
    await editor.getState().flush()
    expect(editor.getState().saveState).toBe('saved')
    expect(editor.recovery!.getSnapshot().phase).toBe('idle')
    expect(await p.read(source.id)).toMatchObject({
      status: 'active',
      document: { nodes: [{ name: 'salvo de verdade' }, { name: 'asa' }] },
    })
    expect((await p.recovery.list(source.id)).length).toBeGreaterThan(0)
  } finally {
    editor.getState().dispose()
    db.close()
  }
})
