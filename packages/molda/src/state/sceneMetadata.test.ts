import { expect, test } from 'bun:test'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { structuredBytes } from '../core/structuredBytes'
import { makeSceneAtlasDocument } from '../testing/sceneAtlasFixture'
import {
  readSceneSummary,
  readSceneTombstone,
  type SceneTombstone,
  sceneBlobSummary,
  sceneSummary,
} from './sceneMetadata'
import { prepareSceneStorage } from './sceneStorageDocument'

test('versioned metadata separates logical document cost from manifest and unique pixel costs', async () => {
  const source = makeSceneAtlasDocument()
  const prepared = await prepareSceneStorage(source)
  const inline = sceneSummary(source, 7, 123)
  expect(readSceneSummary(inline, source.id)).toEqual(inline)
  const summary = sceneBlobSummary(prepared, 7, 123)
  expect(summary).toMatchObject({
    ...inline,
    storageVersion: 2,
    bytes: prepared.logicalBytes,
    storedBytes: structuredBytes(prepared.manifest),
    blobRefs: [...prepared.blobs].map(([hash, pixels]) => ({ hash, byteLength: pixels.length })),
  })
  const owned = readSceneSummary(summary, source.id)
  expect(owned).toEqual(summary)
  if (owned.storageVersion !== 2) throw new Error('Expected blob metadata')
  owned.blobRefs[0]!.byteLength = 1
  expect(summary.blobRefs[0]!.byteLength).not.toBe(1)
  summary.blobRefs[0]!.hash = '0'.repeat(64)
  expect(prepared.manifest.document.images[0]!.layers[0]!.pixels.hash).not.toBe('0'.repeat(64))
  for (const storageVersion of [1, 2] as const) {
    const tombstone: SceneTombstone = {
      id: source.id,
      formatVersion: 2,
      storageVersion,
      revision: 8,
      originalsBytes: 123,
    }
    expect(readSceneTombstone(tombstone, source.id)).toEqual(tombstone)
    expect(() => readSceneTombstone({ ...tombstone, blobRefs: [] }, source.id)).toThrow()
  }
})

test('metadata closes both layouts and rejects malformed/duplicate/over-budget references', async () => {
  const prepared = await prepareSceneStorage(makeSceneAtlasDocument())
  const summary = sceneBlobSummary(prepared, 1, 0)
  const first = summary.blobRefs[0]!
  for (const change of [
    { storageVersion: 1 },
    { storageVersion: 3 },
    { storedBytes: 0 },
    { storedBytes: Number.MAX_SAFE_INTEGER + 1 },
    { revision: 0 },
    { originalsBytes: -1 },
    { blobRefs: undefined },
    { blobRefs: [first, first] },
    { extra: true },
    { blobRefs: [{ ...first, hash: first.hash.toUpperCase() }] },
    { blobRefs: [{ ...first, hash: `${first.hash}\n` }] },
    { blobRefs: [{ ...first, byteLength: 0 }] },
    { blobRefs: [{ ...first, byteLength: 4 * 1024 * 1024 + 1 }] },
    { blobRefs: [{ ...first, extra: 'preserve' }] },
    {
      blobRefs: Array.from({ length: 9 }, (_, i) => ({
        hash: i.toString(16).padStart(64, '0'),
        byteLength: 4 * 1024 * 1024,
      })),
    },
    {
      blobRefs: Array.from({ length: 20_001 }, (_, i) => ({
        hash: i.toString(16).padStart(64, '0'),
        byteLength: 1,
      })),
    },
  ])
    expect(() => readSceneSummary({ ...summary, ...change }, summary.id)).toThrow()
  expect(() => readSceneSummary(summary, 'another')).toThrow()
  expect(() => readSceneSummary({ formatVersion: 3 }, summary.id)).toThrow(
    MoldaUnsupportedVersionError,
  )
  expect(() =>
    readSceneSummary(
      { ...sceneSummary(makeSceneAtlasDocument(), 1, 0), storageVersion: 2 },
      summary.id,
    ),
  ).toThrow()
})
