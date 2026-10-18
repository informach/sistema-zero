import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { pythonGalleryFixture as setup } from '../fakes/python-gallery'

test.each([
  'unknown',
  'another-request',
  'expired',
  'retired',
] as const)('Python gallery refuses %s copy generations before reading storage', async (mode) => {
  const f = await setup('pro')
  let copyGeneration = f.plan.copyGeneration
  try {
    if (mode === 'unknown') copyGeneration = randomUUID()
    else if (mode === 'another-request') {
      const other = await f.gallery.prepare(f.actor, f.lessonId, f.blockId, {
        ...f.input,
        requestId: randomUUID(),
      })
      if (other.completed) throw new Error('Unexpected completion')
      copyGeneration = other.copyGeneration
    } else {
      const row = f.galleryCopies.attempts.get(copyGeneration)
      if (!row) throw new Error('Missing registered generation')
      if (mode === 'expired') row.expiresAt = new Date(0)
      else row.retired = true
    }
    await expect(
      f.gallery.commit(f.actor, f.lessonId, f.blockId, f.input, f.reference, { copyGeneration }),
    ).rejects.toMatchObject({ code: 'LEARNING_CONFLICT' })
    expect(f.source.requests).toEqual([])
    expect(f.inspected()).toBe(0)
    expect(await f.saved()).toBeNull()
  } finally {
    f.source.close()
  }
})

test.each([
  'classic',
  'pro',
] as const)('Python %s gallery materializes its saved source and persists a delivery without a separate activity grade', async (kind) => {
  const f = await setup(kind)
  try {
    const response = await f.submit()
    expect(response.status).toBe(200)
    const receipt = await response.json()
    expect(receipt).toMatchObject({ submittedAt: expect.any(String) })
    expect(receipt).not.toHaveProperty('score')
    expect(receipt).not.toHaveProperty('passed')
    expect(f.inspected()).toBe(0)
    const saved = await f.saved()
    expect(saved?.project).toEqual(f.plan.snapshot)
    expect(saved?.submittedAt).toBeTruthy()
    expect(JSON.stringify(saved?.project)).not.toContain('http:')
    expect((await f.submit()).status).toBe(200)
    expect(f.inspected()).toBe(0)
  } finally {
    f.source.close()
  }
})

test.each([
  'unavailable',
  'corrupt',
  'inline',
] as const)('Python gallery %s source never reaches inspection or persistence', async (mode) => {
  const f = await setup('pro', mode === 'unavailable')
  try {
    if (mode === 'corrupt')
      f.source.objects.set(
        `/bucket/${f.plan.snapshot.items[0]!.parts[0]!.storageKey}`,
        gzipSync('{}'),
      )
    const response = await f.submit(mode === 'inline' ? f.source.project : f.reference)
    expect(response.status).toBe(mode === 'inline' ? 400 : 503)
    expect(f.inspected()).toBe(0)
    expect(await f.saved()).toBeNull()
  } finally {
    f.source.close()
  }
})

test.each([
  'entitlement',
  'creation',
  'cancel',
  'captured',
] as const)('materialization keeps the admitted owner and rechecks access: %s', async (mode) => {
  const f = await setup('pro')
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>(),
    controller = new AbortController()
  const originalRequestId = f.input.requestId
  f.source.setHandler(async (request) => {
    entered.resolve()
    await release.promise
    return new Response(f.source.objects.get(new URL(request.url).pathname))
  })
  const pending = f.gallery
    .commit(f.actor, f.lessonId, f.blockId, f.input, f.reference, {
      signal: controller.signal,
      copyGeneration: f.plan.copyGeneration,
    })
    .then(
      () => 'accepted',
      (error: Error & { code?: unknown }) =>
        typeof error.code === 'string' ? error.code : error.name,
    )
  try {
    await entered.promise
    if (mode === 'entitlement') f.entitlements.byId.clear()
    else if (mode === 'creation') {
      const creation = [...f.creations.rows.values()].find(
        (item) => item.itemId === f.source.project.id,
      )
      if (!creation) throw new Error('Missing creation')
      creation.revision++
    } else if (mode === 'captured') {
      f.actor.userId = randomUUID()
      f.input.requestId = randomUUID()
      f.reference.source.url = 'https://foreign.test/changed'
    } else controller.abort(new DOMException('Withdrawn', 'AbortError'))
    release.resolve()
    expect(await pending).toBe(
      mode === 'captured'
        ? 'accepted'
        : mode === 'cancel'
          ? 'AbortError'
          : mode === 'creation'
            ? 'VALIDATION_ERROR'
            : 'ACCESS_DENIED',
    )
    expect(f.inspected()).toBe(0)
    if (mode === 'captured')
      expect((await f.saved())?.project).toMatchObject({ requestId: originalRequestId })
    else expect(await f.saved()).toBeNull()
  } finally {
    controller.abort()
    release.resolve()
    await pending
    f.source.close()
  }
})
