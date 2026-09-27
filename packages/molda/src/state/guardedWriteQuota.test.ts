import { expect, test } from 'bun:test'
import { indexedAssetBytes } from '../core/assetSummary'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { structuredBytes } from '../core/structuredBytes'
import { makeSky, makeTexture } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { guardedWrite, MoldaStorageBudgetError, removeStoredDocuments } from './guardedWrite'
import { prepareSceneStorage } from './sceneStorageDocument'

test('v1 quota counts unknown Molda records and native pixel blobs without interpreting or changing them', async () => {
  const db = await nativeDatabase()
  try {
    const prepared = await prepareSceneStorage(makeSceneAtlasDocument())
    const records = new Map<string, unknown>([
      [`molda:scene:${prepared.manifest.id}`, prepared.manifest],
      ...[...prepared.blobs].map(([hash, bytes]): [string, unknown] => [
        `molda:scene-blob:${hash}`,
        bytes,
      ]),
      ['molda:future-index:opaque', { bytes: 0, payload: new Uint8Array(4096) }],
    ])
    const cyclic: { payload: Uint8Array; self?: unknown } = { payload: new Uint8Array(4096) }
    cyclic.self = cyclic
    records.set('molda:future-layout:cyclic', cyclic)
    for (const [key, value] of records) await db.seed(key, value)
    // Different tool/prefix is outside Molda's quota, even in the same physical object store.
    await db.seed('another-tool:data', new Uint8Array(1_000_000))
    await db.seed('molda-other:data', new Uint8Array(1_000_000))
    const incoming = makeSky()
    const exact =
      indexedAssetBytes(incoming) +
      [...records.values()].reduce<number>((sum, value) => sum + structuredBytes(value), 0)
    const before = await db.dump()
    await expect(guardedWrite(db.store, [incoming], exact - 1)).rejects.toBeInstanceOf(
      MoldaStorageBudgetError,
    )
    expect(Bun.deepEquals(await db.dump(), before)).toBe(true)
    expect(await guardedWrite(db.store, [incoming], exact)).toBe(true)
    expect(await guardedWrite(db.store, [incoming], exact)).toBe(true)
    for (const [key, value] of records) expect(Bun.deepEquals(await db.read(key), value)).toBe(true)
    const committed = await db.dump()
    await expect(
      guardedWrite(
        db.store,
        [{ ...incoming, name: 'x'.repeat(48), updatedAt: incoming.updatedAt + 1 }],
        exact,
        new Map([[incoming.id, incoming.updatedAt]]),
      ),
    ).rejects.toBeInstanceOf(MoldaStorageBudgetError)
    expect(Bun.deepEquals(await db.dump(), committed)).toBe(true)
    // The quota fix must not turn foreign-layout deletion into a permissive cleanup.
    await expect(
      removeStoredDocuments(db.store, [incoming.id, prepared.manifest.id]),
    ).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
    expect(Bun.deepEquals(await db.dump(), committed)).toBe(true)
    expect(await removeStoredDocuments(db.store, [incoming.id])).toBe(true)
    for (const [key, value] of records) expect(Bun.deepEquals(await db.read(key), value)).toBe(true)
  } finally {
    db.close()
  }
})

test('a newly committed unknown payload is visible to the next transactional quota check', async () => {
  const db = await nativeDatabase()
  try {
    const incoming = makeTexture()
    const pixels = new Uint8Array(1000).fill(17)
    const stored = db.seed('molda:unknown-pixels:next-generation', pixels)
    const save = guardedWrite(db.store, [incoming], indexedAssetBytes(incoming))
    await stored
    await expect(save).rejects.toBeInstanceOf(MoldaStorageBudgetError)
    expect(await db.read(`molda:record:${incoming.id}`)).toBeUndefined()
    expect(await db.read('molda:unknown-pixels:next-generation')).toEqual(pixels)
  } finally {
    db.close()
  }
})

test('two writers cannot both spend space occupied by unknown records', async () => {
  const db = await nativeDatabase()
  try {
    const first = makeTexture({ id: 'one' })
    const second = makeTexture({ id: 'two' })
    const payload = new Uint8Array(indexedAssetBytes(first) * 2)
    await db.seed('molda:future:data', payload)
    const limit = payload.byteLength + indexedAssetBytes(first)
    const outcomes = await Promise.allSettled([
      guardedWrite(db.store, [first], limit),
      guardedWrite(db.store, [second], limit),
    ])
    expect(outcomes[0]).toEqual({ status: 'fulfilled', value: true })
    expect(outcomes[1]).toMatchObject({
      status: 'rejected',
      reason: expect.any(MoldaStorageBudgetError),
    })
    expect(await db.read('molda:record:two')).toBeUndefined()
    expect(await db.read('molda:future:data')).toEqual(payload)
  } finally {
    db.close()
  }
})
