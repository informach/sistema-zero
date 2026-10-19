import { afterEach, expect, mock, spyOn, test } from 'bun:test'

mock.module('server-only', () => ({}))
const storage = await import('../src/server/r2')
const snapshots = await import('../src/server/studio-publication-snapshot')
afterEach(() => mock.restore())

function fixture(beforeCreate: () => Promise<void> = async () => {}) {
  const records = new Map<string, Buffer>()
  spyOn(storage, 'r2CreateObjectPrivate').mockImplementation(async (input) => {
    await beforeCreate()
    if (records.has(input.key)) return false
    records.set(input.key, Buffer.from(input.body))
    return true
  })
  spyOn(storage, 'r2PutObjectPrivate').mockImplementation(async (input) => {
    records.set(input.key, Buffer.from(input.body))
  })
  spyOn(storage, 'r2GetObjectPrivate').mockImplementation(async (key) => {
    const bytes = records.get(key)!
    return {
      body: new Blob([new Uint8Array(bytes)]).stream(),
      contentType: 'application/json',
      contentLength: bytes.length,
    }
  })
  return records
}

test('concurrent different snapshots cannot both claim the reserved publication ID', async () => {
  const records = fixture(),
    id = crypto.randomUUID()
  const attempts = await Promise.allSettled([
    snapshots.createStudioPublicationSnapshot(id, Buffer.from('first')),
    snapshots.createStudioPublicationSnapshot(id, Buffer.from('different')),
  ])
  expect(attempts.map((attempt) => attempt.status).sort()).toEqual(['fulfilled', 'rejected'])
  expect(records.get(`studio/play/${id}.json`)?.toString()).toBe('first')
  await snapshots.createStudioPublicationSnapshot(id, Buffer.from('first'))
  expect(records.size).toBe(1)
})

test('retirement fences a write that was already in flight and retains no source text', async () => {
  let release!: () => void
  const waiting = new Promise<void>((resolve) => {
    release = resolve
  })
  const records = fixture(() => waiting),
    id = crypto.randomUUID()
  const writer = snapshots.createStudioPublicationSnapshot(id, Buffer.from('private source'))
  await snapshots.retireStudioPublicationSnapshot(id)
  const retired = records.get(`studio/play/${id}.json`)!.toString()
  release()
  await expect(writer).rejects.toThrow('retirada')
  expect(records.get(`studio/play/${id}.json`)!.toString()).toBe(retired)
  expect(JSON.parse(retired)).toEqual({ studioPublicationState: 'retired', playId: id })
})
