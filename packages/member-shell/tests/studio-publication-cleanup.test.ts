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

test('accepted moderation cleanup survives runtime outage and only acknowledges after all deletions', async () => {
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
  spyOn(storage, 'r2ListPrivateKeys').mockImplementation(async (prefix, limit) =>
    [...records.keys()].filter((key) => key.startsWith(prefix)).slice(0, limit),
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
  const playId = crypto.randomUUID(),
    coverKey = `studio/cover/author/${playId}.webp`
  await enqueueStudioPublicationCleanup(playId, `https://art.test/${coverKey}`)
  expect(records.size).toBe(1)
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 1 })
  expect(deleted).toEqual([])
  expect(records.size).toBe(1)
  purge.mockResolvedValue({ deleted: true })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
  expect(deleted).toEqual([
    `studio/play/${playId}.json`,
    coverKey,
    `studio/publication-cleanup/${playId}.json`,
  ])
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 0 })
})
