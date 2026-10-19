import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { reservationFixture } from './fixtures/studio-reservation'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'cleanup-test-secret-with-32-characters'
const env = await import('../src/lib/env')
const storage = await import('../src/server/r2')
const runtime = await import('../src/server/studio-publication')
const covers = await import('../src/server/studio-cover-candidates')
const ownership = await import('../src/server/studio-publication-ownership')
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
  spyOn(storage, 'r2CreateObjectPrivate').mockImplementation(async (input) => {
    if (records.has(input.key)) return false
    records.set(input.key, new Uint8Array(input.body))
    return true
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
  const fenced: string[] = []
  spyOn(storage, 'r2FenceObject').mockImplementation(async (key) => {
    fenced.push(key)
  })
  const purge = spyOn(runtime, 'callStudioPublication').mockRejectedValue(new Error('Offline'))
  const authorId = crypto.randomUUID()
  const queue = async (playId: string, coverUrl?: string, audience: 'kids' | 'adult' = 'kids') => {
    await ownership.recordStudioPublicationOwner(
      audience,
      playId,
      authorId,
      reservationFixture({ audience, playId, authorId }),
    )
    return enqueueStudioPublicationCleanup(playId, coverUrl, audience, authorId)
  }
  return { records, deleted, fenced, purge, authorId, queue }
}

test('accepted moderation cleanup survives runtime outage and only acknowledges after all deletions', async () => {
  const { records, deleted, purge, authorId, queue } = fixture()
  const playId = crypto.randomUUID(),
    coverKey = `studio/cover/${authorId}/${playId}.webp`
  await queue(playId, `https://art.test/${coverKey}`)
  expect(records.size).toBe(2)
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 1 })
  expect(deleted).toEqual([])
  expect(records.has(`studio/publication-cleanup/${playId}.json`)).toBe(true)
  purge.mockResolvedValue({ deleted: true })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
  expect(deleted).toEqual([`studio/publication-cleanup/${playId}.json`])
  expect(JSON.parse(new TextDecoder().decode(records.get(`studio/play/${playId}.json`)))).toEqual({
    studioPublicationState: 'retired',
    playId,
  })
  expect(
    JSON.parse(
      new TextDecoder().decode(records.get(`studio/publication-owners/kids/${playId}.json`)),
    ),
  ).toEqual({
    audience: 'kids',
    playId,
    retired: true,
  })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 0 })
})

test('a page of failing tasks does not starve later cleanup jobs', async () => {
  const { records, purge, queue } = fixture()
  const ids = Array.from({ length: 6 }, () => crypto.randomUUID()).sort()
  for (const id of ids) await queue(id)
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
  const { records, deleted, purge, queue } = fixture()
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
  expect((await queue(playId)).runtime).toBe(true)
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 1 })
  expect(deleted).toEqual([])
  expect(purge).toHaveBeenCalledTimes(1)
  purge.mockResolvedValue({ deleted: true })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
})

test('missing runtime settings retain the Classic Python cleanup intent until its runtime is purged', async () => {
  const { records, deleted, purge, queue } = fixture()
  spyOn(env, 'getEnv').mockReturnValue({
    ...env.getEnv(),
    STUDIO_PRO_RUNTIME_URL: undefined,
    STUDIO_PRO_RUNTIME_TOKEN: undefined,
  })
  const playId = crypto.randomUUID()
  records.set(
    `studio/play/${playId}.json`,
    new TextEncoder().encode(JSON.stringify({ kind: 'classic', programmingLanguage: 'python' })),
  )
  await queue(playId)
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 1 })
  expect(deleted).toEqual([])
  expect(records.has(`studio/play/${playId}.json`)).toBe(true)
  expect(purge).toHaveBeenCalledTimes(1)
  purge.mockResolvedValue({ deleted: true })
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
  expect(JSON.parse(new TextDecoder().decode(records.get(`studio/play/${playId}.json`)))).toEqual({
    studioPublicationState: 'retired',
    playId,
  })
})

test('a failed cover fence retains the intent and retries the whole idempotent operation', async () => {
  const { records, purge, queue } = fixture()
  purge.mockResolvedValue({ deleted: true })
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/author/${playId}/canonical.webp`
  await covers.enqueueStudioCoverCandidate('kids', playId, coverKey)
  await covers.commitStudioCoverCandidate('kids', playId, coverKey)
  await queue(playId, `https://art.test/${coverKey}`)
  const remove = spyOn(storage, 'r2FenceObject').mockRejectedValue(new Error('Access denied'))
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 0, pending: 1 })
  expect(records.has(`studio/publication-cleanup/${playId}.json`)).toBe(true)
  remove.mockResolvedValue()
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
})

test('moderation fences a canonical cover after the public media domain changes', async () => {
  const { records, deleted, fenced, purge, queue } = fixture()
  purge.mockResolvedValue({ deleted: true })
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/author/${playId}/canonical.webp`
  await covers.enqueueStudioCoverCandidate('adult', playId, coverKey)
  await covers.commitStudioCoverCandidate('adult', playId, coverKey)
  expect(records.has(`studio/cover-receipts/adult/${playId}.json`)).toBe(true)
  spyOn(env, 'getEnv').mockReturnValue({ ...env.getEnv(), R2_PUBLIC_URL: 'https://new-art.test' })
  const intent = await queue(playId, `https://art.test/${coverKey}`, 'adult')
  expect(intent.coverKey).toBe(coverKey)
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
  expect(fenced).toContain(coverKey)
  expect(deleted).not.toContain(coverKey)
  expect(records.has(`studio/cover-receipts/adult/${playId}.json`)).toBe(false)
  expect(
    await enqueueStudioPublicationCleanup(playId, `https://art.test/${coverKey}`, 'adult'),
  ).toMatchObject({ alreadyCleaned: true })
  expect(records.has(`studio/publication-cleanup/${playId}.json`)).toBe(false)
})

test('legacy entries without a BFF ownership receipt remain pending without deletions', async () => {
  const { deleted, authorId } = fixture()
  const playId = crypto.randomUUID()
  await expect(
    enqueueStudioPublicationCleanup(
      playId,
      `https://art.test/studio/cover/${authorId}/${playId}.webp`,
      'kids',
      authorId,
    ),
  ).rejects.toThrow('Propriedade')
  expect(deleted).toEqual([])
})

test('a receipt for a different author or audience cannot authorize cleanup', async () => {
  const { deleted, authorId } = fixture()
  const playId = crypto.randomUUID()
  await ownership.recordStudioPublicationOwner(
    'kids',
    playId,
    authorId,
    reservationFixture({ playId, authorId }),
  )
  await expect(
    enqueueStudioPublicationCleanup(playId, null, 'kids', crypto.randomUUID()),
  ).rejects.toThrow('Propriedade')
  await expect(enqueueStudioPublicationCleanup(playId, null, 'adult', authorId)).rejects.toThrow(
    'Propriedade',
  )
  expect(deleted).toEqual([])
})

test('a Hub URL cannot select a different cover key when the BFF has no cover receipt', async () => {
  const { deleted, purge, queue } = fixture()
  purge.mockResolvedValue({ deleted: true })
  const playId = crypto.randomUUID()
  const otherCover = `studio/cover/other/${crypto.randomUUID()}.webp`
  const intent = await queue(playId, `https://art.test/${otherCover}`)
  expect(intent.coverKey).toBeNull()
  expect(await drainStudioPublicationCleanup()).toEqual({ completed: 1, pending: 0 })
  expect(deleted).not.toContain(otherCover)
})
