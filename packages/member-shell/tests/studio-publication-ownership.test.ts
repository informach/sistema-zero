import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { reservationFixture } from './fixtures/studio-reservation'

mock.module('server-only', () => ({}))
const storage = await import('../src/server/r2')
const ownership = await import('../src/server/studio-publication-ownership')
afterEach(() => mock.restore())

test('a late publication writer cannot replace the retired ownership record', async () => {
  const playId = crypto.randomUUID(),
    authorId = crypto.randomUUID()
  const key = `studio/publication-owners/kids/${playId}.json`
  const tombstone = Buffer.from(JSON.stringify({ playId, audience: 'kids', retired: true }))
  const records = new Map<string, Uint8Array>([[key, tombstone]])
  // The earlier HEAD observed absence, but retirement committed before the writer's PUT.
  spyOn(storage, 'r2HeadObjectPrivate').mockResolvedValue(null)
  spyOn(storage, 'r2PutObjectPrivate').mockImplementation(async (input) => {
    records.set(input.key, new Uint8Array(input.body))
  })
  spyOn(storage, 'r2CreateObjectPrivate').mockImplementation(async (input) => {
    if (records.has(input.key)) return false
    records.set(input.key, new Uint8Array(input.body))
    return true
  })
  spyOn(storage, 'r2GetObjectPrivate').mockImplementation(async (inputKey) => {
    const bytes = records.get(inputKey)!
    return {
      body: new Blob([new Uint8Array(bytes)]).stream(),
      contentType: 'application/json',
      contentLength: bytes.length,
    }
  })
  await expect(
    ownership.recordStudioPublicationOwner(
      'kids',
      playId,
      authorId,
      reservationFixture({ playId, authorId }),
    ),
  ).rejects.toThrow()
  expect(records.get(key)).toEqual(tombstone)
})
