import { afterEach, expect, mock, spyOn, test } from 'bun:test'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'cover-candidate-test-secret-32-characters'
const env = await import('../src/lib/env')
const storage = await import('../src/server/r2')
const { createStudioPublicationCover } = await import('../src/server/studio-publication-cover')
const { enqueueStudioCoverCandidate, acknowledgeStudioCoverCandidate, drainStudioCoverCandidates } =
  await import('../src/server/studio-cover-candidates')

afterEach(() => mock.restore())

function fixture() {
  const configuration = { ...env.getEnv(), R2_PUBLIC_URL: 'https://art.test' }
  const getEnv = spyOn(env, 'getEnv').mockReturnValue(configuration)
  const privateObjects = new Map<string, Uint8Array>()
  const publicObjects = new Set<string>()
  const publicFences = new Set<string>()
  const create = spyOn(storage, 'r2CreateObject').mockImplementation(async (input) => {
    if (publicObjects.has(input.key) || publicFences.has(input.key)) return null
    publicObjects.add(input.key)
    return { key: input.key, url: `https://art.test/${input.key}` }
  })
  const fence = spyOn(storage, 'r2FenceObject').mockImplementation(async (key) => {
    publicObjects.delete(key)
    publicFences.add(key)
  })
  spyOn(storage, 'r2PutObjectPrivate').mockImplementation(async (input) => {
    privateObjects.set(input.key, new Uint8Array(input.body))
  })
  spyOn(storage, 'r2HeadObjectPrivate').mockImplementation(async (key) =>
    privateObjects.has(key)
      ? {
          contentType: 'application/json',
          contentLength: privateObjects.get(key)!.length,
          etag: 'qa',
        }
      : null,
  )
  spyOn(storage, 'r2GetObjectPrivate').mockImplementation(async (key) => {
    const bytes = privateObjects.get(key)!
    return {
      body: new Blob([new Uint8Array(bytes)]).stream(),
      contentType: 'application/json',
      contentLength: bytes.length,
    }
  })
  spyOn(storage, 'r2ListPrivatePage').mockImplementation(async (prefix, limit = 4, cursor) => {
    const keys = [...privateObjects.keys()]
      .filter((key) => key.startsWith(prefix) && (!cursor || key > cursor))
      .sort()
    const page = keys.slice(0, limit)
    return { keys: page, cursor: keys.length > limit ? page.at(-1) : undefined }
  })
  spyOn(storage, 'r2DeleteObjectPrivate').mockImplementation(async (key) => {
    privateObjects.delete(key)
  })
  spyOn(storage, 'r2DeleteObjects').mockImplementation(async (keys) => {
    for (const key of keys) publicObjects.delete(key)
  })
  return {
    privateObjects,
    publicObjects,
    publicFences,
    fence,
    create,
    setPublicBase(url: string) {
      getEnv.mockReturnValue({ ...configuration, R2_PUBLIC_URL: url })
    },
  }
}

test('a confirmed canonical cover is retained after an uncertain Hub response', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/owner/${playId}/candidate.webp`
  await enqueueStudioCoverCandidate('adult', playId, coverKey)
  f.publicObjects.add(coverKey)
  const resolve = mock(async () => ({
    status: 200,
    body: { status: 'visible', coverImageUrl: `https://art.test/${coverKey}` },
  }))
  expect(await drainStudioCoverCandidates('adult', resolve)).toEqual({
    completed: 0,
    pending: 0,
    waiting: 1,
  })
  expect(resolve).not.toHaveBeenCalled()
  f.setPublicBase('https://new-art.test')
  expect(await drainStudioCoverCandidates('adult', resolve, Date.now() + 3_600_001)).toEqual({
    completed: 1,
    pending: 0,
    waiting: 0,
  })
  expect(f.publicObjects.has(coverKey)).toBe(true)
  expect(f.fence).not.toHaveBeenCalled()
  expect([...f.privateObjects.keys()].filter((key) => key.includes(playId))).toEqual([
    `studio/cover-receipts/adult/${playId}.json`,
  ])
})

test('a retry cover is deleted only after checking the canonical Hub cover', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const canonical = `studio/cover/owner/${playId}/canonical.webp`
  const candidate = `studio/cover/owner/${playId}/retry.webp`
  await enqueueStudioCoverCandidate('kids', playId, candidate)
  f.publicObjects.add(canonical)
  f.publicObjects.add(candidate)
  const resolve = mock(async () => ({
    status: 200,
    body: { status: 'visible', coverImageUrl: `https://art.test/${canonical}` },
  }))
  expect(await drainStudioCoverCandidates('kids', resolve, Date.now() + 3_600_001)).toMatchObject({
    completed: 1,
  })
  expect(f.publicObjects.has(canonical)).toBe(true)
  expect(f.publicObjects.has(candidate)).toBe(false)
})

test('a hidden post keeps its canonical cover for a later restoration', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/owner/${playId}/hidden.webp`
  await enqueueStudioCoverCandidate('kids', playId, coverKey)
  f.publicObjects.add(coverKey)
  const hidden = mock(async () => ({
    status: 200,
    body: { status: 'hidden', coverImageUrl: `https://art.test/${coverKey}` },
  }))
  expect(await drainStudioCoverCandidates('kids', hidden, Date.now() + 3_600_001)).toMatchObject({
    completed: 1,
  })
  expect(f.publicObjects.has(coverKey)).toBe(true)
  expect(f.fence).not.toHaveBeenCalled()
})

test('a deleted post releases its cover even when it was canonical', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/owner/${playId}/deleted.webp`
  await enqueueStudioCoverCandidate('kids', playId, coverKey)
  f.publicObjects.add(coverKey)
  const deleted = mock(async () => ({
    status: 200,
    body: { status: 'deleted', coverImageUrl: `https://art.test/${coverKey}` },
  }))
  expect(await drainStudioCoverCandidates('kids', deleted, Date.now() + 3_600_001)).toMatchObject({
    completed: 1,
  })
  expect(f.publicObjects.has(coverKey)).toBe(false)
  expect(f.publicFences.has(coverKey)).toBe(true)
})

for (const outcome of ['visible', 'deleted'] as const) {
  test(`an open reservation keeps its cover until it becomes ${outcome}, regardless of age`, async () => {
    const f = fixture()
    const playId = crypto.randomUUID()
    const coverKey = `studio/cover/owner/${playId}/reserved.webp`
    await enqueueStudioCoverCandidate('kids', playId, coverKey)
    f.publicObjects.add(coverKey)
    const later = Date.now() + 7 * 24 * 3_600_000
    expect(
      await drainStudioCoverCandidates(
        'kids',
        async () => ({
          status: 200,
          body: { status: 'pending', coverImageUrl: null },
        }),
        later,
      ),
    ).toEqual({ completed: 0, pending: 0, waiting: 1 })
    expect(f.publicObjects.has(coverKey)).toBe(true)
    expect(
      [...f.privateObjects.keys()].some((key) => key.startsWith('studio/cover-candidates/')),
    ).toBe(true)
    expect(
      await drainStudioCoverCandidates(
        'kids',
        async () => ({
          status: 200,
          body: { status: outcome, coverImageUrl: `https://art.test/${coverKey}` },
        }),
        later + 1,
      ),
    ).toEqual({ completed: 1, pending: 0, waiting: 0 })
    expect(f.publicObjects.has(coverKey)).toBe(outcome === 'visible')
  })
}

test('Hub outage retains the candidate, and audience queues cannot cross-delete covers', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const candidate = `studio/cover/owner/${playId}/adult.webp`
  await enqueueStudioCoverCandidate('adult', playId, candidate)
  f.publicObjects.add(candidate)
  const kidsResolve = mock(async () => ({
    status: 200,
    body: { status: 'absent', coverImageUrl: null },
  }))
  expect(
    await drainStudioCoverCandidates('kids', kidsResolve, Date.now() + 3_600_001),
  ).toMatchObject({
    completed: 0,
  })
  expect(kidsResolve).not.toHaveBeenCalled()
  const offline = mock(async () => ({ status: 503, body: null }))
  expect(await drainStudioCoverCandidates('adult', offline, Date.now() + 3_600_001)).toMatchObject({
    pending: 1,
  })
  expect(f.publicObjects.has(candidate)).toBe(true)
  const oldHub = mock(async () => ({ status: 200, body: { visible: true } }))
  expect(await drainStudioCoverCandidates('adult', oldHub, Date.now() + 3_600_002)).toMatchObject({
    pending: 1,
  })
  expect(f.publicObjects.has(candidate)).toBe(true)
  const absent = mock(async () => ({
    status: 200,
    body: { status: 'absent', coverImageUrl: null },
  }))
  expect(await drainStudioCoverCandidates('adult', absent, Date.now() + 3_600_003)).toMatchObject({
    completed: 1,
  })
  expect(f.publicObjects.has(candidate)).toBe(false)
})

test('acknowledging a successful upload clears its reconciliation intent', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/owner/${playId}/published.webp`
  await enqueueStudioCoverCandidate('kids', playId, coverKey)
  await acknowledgeStudioCoverCandidate('kids', playId, coverKey)
  expect([...f.privateObjects.keys()].filter((key) => key.includes(playId))).toEqual([])
})

test('terminal reconciliation fences a paused upload before dropping its durable intent', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/owner/${playId}/paused.webp`
  await enqueueStudioCoverCandidate('kids', playId, coverKey)
  // The producer has enqueued its intent but has not reached the atomic public PUT yet.
  expect(
    await drainStudioCoverCandidates(
      'kids',
      async () => ({ status: 200, body: { status: 'deleted', coverImageUrl: null } }),
      Date.now() + 3_600_001,
    ),
  ).toEqual({ completed: 1, pending: 0, waiting: 0 })
  const failure = await createStudioPublicationCover({
    key: coverKey,
    body: Buffer.from('private image bytes'),
    contentType: 'image/webp',
  }).then(
    () => null,
    (error: unknown) => error,
  )
  expect(failure).toBeInstanceOf(Error)
  expect(f.publicObjects.has(coverKey)).toBe(false)
  expect(f.publicFences.has(coverKey)).toBe(true)
  expect(
    [...f.privateObjects.keys()].some((key) => key.startsWith('studio/cover-candidates/')),
  ).toBe(false)
})

test('an in-flight atomic upload cannot replace a fence that commits before its write', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/owner/${playId}/inflight.webp`
  await enqueueStudioCoverCandidate('kids', playId, coverKey)
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  f.create.mockImplementationOnce(async (input) => {
    started.resolve()
    await release.promise
    if (f.publicObjects.has(input.key) || f.publicFences.has(input.key)) return null
    f.publicObjects.add(input.key)
    return { key: input.key, url: `https://art.test/${input.key}` }
  })
  const outcome = createStudioPublicationCover({
    key: coverKey,
    body: Buffer.from('private image bytes'),
    contentType: 'image/webp',
  }).then(
    () => null,
    (error: unknown) => error,
  )
  await started.promise
  try {
    expect(
      await drainStudioCoverCandidates(
        'kids',
        async () => ({ status: 200, body: { status: 'rejected', coverImageUrl: null } }),
        Date.now() + 3_600_001,
      ),
    ).toEqual({ completed: 1, pending: 0, waiting: 0 })
  } finally {
    release.resolve()
  }
  expect(await outcome).toBeInstanceOf(Error)
  expect(f.publicObjects.has(coverKey)).toBe(false)
  expect(f.publicFences.has(coverKey)).toBe(true)
})

test('an uncertain fence keeps its intent and retry retains the marker instead of reopening the key', async () => {
  const f = fixture()
  const playId = crypto.randomUUID()
  const coverKey = `studio/cover/owner/${playId}/unknown.webp`
  await enqueueStudioCoverCandidate('kids', playId, coverKey)
  f.publicObjects.add(coverKey)
  f.fence.mockImplementationOnce(async (key) => {
    f.publicObjects.delete(key)
    f.publicFences.add(key)
    throw new Error('Fence applied; response lost')
  })
  const resolve = async () => ({ status: 200, body: { status: 'deleted', coverImageUrl: null } })
  const later = Date.now() + 3_600_001
  expect(await drainStudioCoverCandidates('kids', resolve, later)).toEqual({
    completed: 0,
    pending: 1,
    waiting: 0,
  })
  expect(
    [...f.privateObjects.keys()].some((key) => key.startsWith('studio/cover-candidates/')),
  ).toBe(true)
  await expect(
    createStudioPublicationCover({
      key: coverKey,
      body: Buffer.from('old image'),
      contentType: 'image/webp',
    }),
  ).rejects.toThrow('retirada')
  expect(await drainStudioCoverCandidates('kids', resolve, later + 1)).toEqual({
    completed: 1,
    pending: 0,
    waiting: 0,
  })
  expect(f.publicFences.has(coverKey)).toBe(true)
  expect(f.publicObjects.has(coverKey)).toBe(false)
})
