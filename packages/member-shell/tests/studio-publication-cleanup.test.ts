import { afterEach, expect, mock, spyOn, test } from 'bun:test'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'cleanup-test-secret-with-32-characters'
const env = await import('../src/lib/env')
const storage = await import('../src/server/r2')
const runtime = await import('../src/server/studio-publication')
const { enqueueStudioPublicationCleanup, drainStudioPublicationCleanup } = await import(
  '../src/server/studio-publication-cleanup'
)
afterEach(() => mock.restore())

function fixture() {
  spyOn(env, 'getEnv').mockReturnValue({
    ...env.getEnv(),
    R2_PUBLIC_URL: 'https://art.test',
    STUDIO_PRO_RUNTIME_URL: 'https://runtime.test',
    STUDIO_PRO_RUNTIME_TOKEN: 'private',
  })
  const records = new Map<string, Uint8Array>()
  spyOn(storage, 'r2PutObjectPrivate').mockImplementation(async (input) => {
    records.set(input.key, new Uint8Array(input.body))
  })
  spyOn(storage, 'r2ListPrivatePage').mockImplementation(async (prefix, limit = 4, cursor) => {
    const keys = [...records.keys()]
      .filter((key) => key.startsWith(prefix) && (!cursor || key > cursor))
      .sort()
    const page = keys.slice(0, limit)
    return { keys: page, cursor: keys.length > limit ? page.at(-1) : undefined }
  })
  spyOn(storage, 'r2HeadObjectPrivate').mockImplementation(async (key) =>
    records.has(key)
      ? {
          contentType: 'application/json',
          contentLength: records.get(key)!.length,
          etag: 'fixture',
        }
      : null,
  )
  spyOn(storage, 'r2GetObjectPrivate').mockImplementation(async (key) => {
    const bytes = records.get(key)!
    return {
      body: new Blob([new Uint8Array(bytes)]).stream(),
      contentType: 'application/json',
      contentLength: bytes.length,
    }
  })
  const deleted: string[] = []
  spyOn(storage, 'r2DeleteObjectPrivate').mockImplementation(async (key) => {
    deleted.push(key)
    records.delete(key)
  })
  spyOn(storage, 'r2DeleteObjects').mockImplementation(async (keys) => {
    deleted.push(...keys)
  })
  const purge = spyOn(runtime, 'callStudioPublication').mockRejectedValue(new Error('Offline'))
  return { records, deleted, purge }
}

test('accepted moderation cleanup survives runtime outage and only acknowledges after all deletions', async () => {
  const { records, deleted, purge } = fixture()
  const playId = crypto.randomUUID(),
    coverKey = `studio/cover/author/${playId}.webp`
  await enqueueStudioPublicationCleanup(playId, `https://art.test/${coverKey}`)
  expect(records.size).toBe(1)
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 1 })
  expect(deleted).toEqual([])
  expect(records.has(`studio/publication-cleanup/${playId}.json`)).toBe(true)
  purge.mockResolvedValue({ deleted: true })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
  expect(deleted).toEqual([
    `studio/play/${playId}.json`,
    coverKey,
    `studio/publication-cleanup/${playId}.json`,
  ])
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 0 })
})

test('a page of failing tasks does not starve later cleanup jobs', async () => {
  const { records, purge } = fixture()
  const ids = Array.from({ length: 6 }, () => crypto.randomUUID()).sort()
  for (const id of ids) await enqueueStudioPublicationCleanup(id)
  purge.mockImplementation(async (body) => {
    if (ids.slice(0, 4).includes(String(body.playId))) throw new Error('Temporary failure')
    return { deleted: true }
  })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 4 })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 2, pending: 0 })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 4 })
  expect(ids.slice(4).every((id) => !records.has(`studio/publication-cleanup/${id}.json`))).toBe(
    true,
  )
  purge.mockResolvedValue({ deleted: true })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 4, pending: 0 })
})

test('missing runtime settings retain Pro cleanup until the service is restored', async () => {
  const { records, deleted, purge } = fixture()
  spyOn(env, 'getEnv').mockReturnValue({
    ...env.getEnv(),
    STUDIO_PRO_RUNTIME_URL: undefined,
    STUDIO_PRO_RUNTIME_TOKEN: undefined,
  })
  const playId = crypto.randomUUID()
  records.set(
    `studio/play/${playId}.json`,
    new TextEncoder().encode(JSON.stringify({ kind: 'pro' })),
  )
  expect((await enqueueStudioPublicationCleanup(playId)).runtime).toBe(true)
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 1 })
  expect(deleted).toEqual([])
  expect(purge).toHaveBeenCalledTimes(1)
  purge.mockResolvedValue({ deleted: true })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
})

test('a failed cover deletion retains the intent and retries the whole idempotent operation', async () => {
  const { records, purge } = fixture()
  purge.mockResolvedValue({ deleted: true })
  const playId = crypto.randomUUID()
  await enqueueStudioPublicationCleanup(playId, `https://art.test/studio/cover/${playId}.webp`)
  const remove = spyOn(storage, 'r2DeleteObjects').mockRejectedValue(new Error('Access denied'))
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 1 })
  expect(records.has(`studio/publication-cleanup/${playId}.json`)).toBe(true)
  remove.mockResolvedValue()
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
})
