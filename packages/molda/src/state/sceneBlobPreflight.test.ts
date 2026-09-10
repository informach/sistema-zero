import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import { bindSceneSkin } from '../scene/skinBinding'
import { nativeDatabase } from '../testing/nativeDatabase'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { scenePixelHash } from './sceneBlob'
import { inspectSceneBlobRecordStructure } from './sceneBlobStorage'
import { sceneBlobSummary } from './sceneMetadata'
import { createScenePersistence } from './scenePersistence'
import { type PreparedSceneStorage, prepareSceneStorage } from './sceneStorageDocument'
import {
  SCENE_BLOB_KEY_PREFIX as BLOB,
  SCENE_DOCUMENT_KEY_PREFIX as DOCUMENT,
  SCENE_SUMMARY_KEY_PREFIX as SUMMARY,
} from './storageKeys'

function recordsFor(prepared: PreparedSceneStorage) {
  const id = prepared.manifest.id
  return new Map<string, unknown>([
    [`${DOCUMENT}${id}`, prepared.manifest],
    [`${SUMMARY}${id}`, sceneBlobSummary(prepared, 1, 0)],
    ...[...prepared.blobs].map(([hash, bytes]): [string, unknown] => [`${BLOB}${hash}`, bytes]),
  ])
}

test.each([
  'indexed',
  'rgba',
  'empty',
  'skin',
])('metadata edits retain the exact native cost and owned content for %s scenes', async (kind) => {
  const db = await nativeDatabase()
  try {
    const rig = makeSceneSkinFixture()
    let source =
      kind === 'indexed'
        ? makeSceneAtlasDocument()
        : kind === 'skin'
          ? { ...rig.document, skins: [bindSceneSkin(rig.document, rig.input)] }
          : makeSceneGlbFixture(1, 1, 2, kind === 'empty' ? 0 : 4, 3)
    if (kind === 'rgba') {
      const image = source.images[0]!
      image.layers[1]!.pixels.set(image.layers[0]!.pixels)
      image.layers[1]!.visible = false
      image.layers[2]!.pixels.set([201, 17, 89, 0])
    }
    const persistence = createScenePersistence(db.store)
    expect(await persistence.save(source, null)).toEqual({ status: 'saved', revision: 1 })
    const pixelsBefore = [...(await db.dump())].filter(
      ([key]) => typeof key === 'string' && key.startsWith(BLOB),
    )
    const updates: ((document: MoldaSceneDocument) => void)[] = [
      (document) => {
        document.name = 'Minha criação 📦 — uma história bem maior'
      },
      (document) => {
        document.createdAt = 0
        document.updatedAt = 12.25
      },
      (document) => {
        document.thumb = 'data:image/png;base64,AA=='
      },
      (document) => {
        document.name = 'Oi'
        document.thumb = 'data:image/webp;base64,AAAA'
      },
      (document) => {
        delete document.thumb
      },
    ]
    let revision = 1
    for (const update of updates) {
      source = structuredClone(source)
      update(source)
      expect(await persistence.save(source, revision)).toEqual({
        status: 'saved',
        revision: ++revision,
      })
      const result = await persistence.read(source.id)
      if (result.status !== 'active') throw new Error('Expected an active scene')
      expect(result.document).toEqual(source)
      expect(result.summary.bytes).toBe(structuredBytes(result.document))
      expect(result.summary).toMatchObject({
        storageVersion: 2,
        storedBytes: structuredBytes(await db.read(`${DOCUMENT}${source.id}`)),
      })
      const pixelsAfter = [...(await db.dump())].filter(
        ([key]) => typeof key === 'string' && key.startsWith(BLOB),
      )
      expect(Bun.deepEquals(pixelsAfter, pixelsBefore)).toBe(true)
    }
    const expected = structuredClone(source)
    expected.name = 'Captura privada'
    const pending = persistence.save(expected, revision)
    const captured = structuredClone(expected)
    expected.nodes[0]!.name = 'Mutação do chamador'
    expected.images[0]?.layers[0]?.pixels.fill(0)
    expect(await pending).toEqual({ status: 'saved', revision: revision + 1 })
    expect(await persistence.read(source.id)).toMatchObject({
      status: 'active',
      document: captured,
    })
  } finally {
    db.close()
  }
})

test.each([
  'bytes',
  'name',
  'createdAt',
  'updatedAt',
  'thumbDataUrl',
])('metadata-only save rejects a stale %s index and preserves every record', async (field) => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    const prepared = await prepareSceneStorage(source)
    const summary = sceneBlobSummary(prepared, 1, 0)
    const values: Record<string, unknown> = {
      bytes: summary.bytes + 1,
      name: 'Índice divergente',
      createdAt: summary.createdAt + 1,
      updatedAt: summary.updatedAt + 1,
      thumbDataUrl: 'data:image/png;base64,AA==',
    }
    const records = recordsFor(prepared)
    records.set(`${SUMMARY}${source.id}`, { ...summary, [field]: values[field] })
    for (const [key, value] of records) await db.seed(key, value)
    const before = await db.dump()
    await expect(
      createScenePersistence(db.store).save({ ...source, name: 'Só o nome' }, 1),
    ).rejects.toThrow()
    expect(Bun.deepEquals(await db.dump(), before)).toBe(true)
  } finally {
    db.close()
  }
})

test.each([
  'parent',
  'clip-target',
  'world-bounds',
])('a structurally valid %s defect still requires complete native validation before writing', async (kind) => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneGlbFixture(1, 1, 2, 4)
    const prepared = await prepareSceneStorage(source)
    const beforeBytes = structuredBytes(prepared.manifest)
    if (kind === 'parent') prepared.manifest.document.nodes[0]!.parentId = 'absent'
    else if (kind === 'clip-target')
      prepared.manifest.document.animations![0]!.tracks[0]!.nodeId = 'absent'
    else
      prepared.manifest.document.nodes[0]!.transform = {
        kind: 'trs',
        translation: [Number.MAX_VALUE, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [Number.MAX_VALUE, 1, 1],
      }
    prepared.logicalBytes += structuredBytes(prepared.manifest) - beforeBytes
    const records = recordsFor(prepared)
    expect(
      inspectSceneBlobRecordStructure(records, source.id, new Set(records.keys())).status,
    ).toBe('blob-structure')
    for (const [key, value] of records) await db.seed(key, value)
    const before = await db.dump()
    const persistence = createScenePersistence(db.store)
    expect((await persistence.read(source.id)).status).toBe('invalid')
    await expect(
      persistence.save({ ...source, name: 'Não reparar silenciosamente' }, 1),
    ).rejects.toThrow()
    expect(Bun.deepEquals(await db.dump(), before)).toBe(true)
  } finally {
    db.close()
  }
})

test('honest hashes cannot certify indexed pixels outside the document palette', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneAtlasDocument()
    const prepared = await prepareSceneStorage(source)
    const reference = prepared.manifest.document.images[0]!.layers[0]!.pixels
    const badPixels = new Uint8Array(reference.byteLength).fill(255)
    const badHash = await scenePixelHash(badPixels)
    reference.hash = badHash
    const records = recordsFor(prepared)
    records.set(`${BLOB}${badHash}`, badPixels)
    expect(
      inspectSceneBlobRecordStructure(records, source.id, new Set(records.keys())).status,
    ).toBe('blob-structure')
    for (const [key, value] of records) await db.seed(key, value)
    const before = await db.dump()
    await expect(
      createScenePersistence(db.store).save({ ...source, name: 'Mudança de nome' }, 1),
    ).rejects.toThrow()
    expect(Bun.deepEquals(await db.dump(), before)).toBe(true)
  } finally {
    db.close()
  }
})

test('body and paint edits take the complete path and remain lossless', async () => {
  const db = await nativeDatabase()
  try {
    const source = makeSceneGlbFixture(1, 1, 2, 4, 2)
    const persistence = createScenePersistence(db.store)
    await persistence.save(source, null)
    source.nodes[0]!.name = 'Uma parte nova'
    source.animations![0]!.tracks[0]!.keys[0]!.value[0] = 0.125
    source.images[0]!.layers[1]!.pixels.set([101, 102, 103, 0])
    expect(readSceneDocument(source).status).toBe('valid')
    expect(await persistence.save(source, 1)).toEqual({ status: 'saved', revision: 2 })
    expect(await persistence.read(source.id)).toMatchObject({ status: 'active', document: source })
  } finally {
    db.close()
  }
})
