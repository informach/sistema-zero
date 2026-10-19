import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  buildApp,
  jsonRequest,
  readStudioPreparation,
  readStudioPublication,
  readStudioReserved,
  studentHeaders,
  TEST_INTERNAL_API_TOKEN,
} from '../helpers'

async function fixture(kind: 'lesson' | 'free' | 'live' = 'free') {
  const ctx = buildApp()
  const authorId = randomUUID(),
    accountId = randomUUID()
  const space = await ctx.repo.createSpace({
    slug: 'mural-dos-criadores',
    name: 'QA',
    description: null,
    iconUrl: null,
    audience: 'kids',
    accessConfig: { visibility: 'public', courses: [], roles: [] },
    requiresApproval: true,
    teaserWhenLocked: true,
    status: 'active',
  })
  await ctx.repo.createChannel(space.id, {
    slug: 'parede',
    name: 'QA',
    topic: null,
    accessConfig: null,
    postingPolicy: 'staff_only',
    requiresApproval: null,
    status: 'active',
  })
  const path = `/hub/internal/showcase-thread-studio${kind === 'lesson' ? '' : '-standalone'}`
  const body = {
    publisher: { authorId, accountId, audience: 'kids' },
    spaceSlug: space.slug,
    description: 'QA source',
    clientIdempotencyKey: randomUUID(),
    snapshotHash: 'a'.repeat(64),
    ...(kind === 'lesson'
      ? { lessonId: randomUUID(), blockId: randomUUID() }
      : { title: 'QA game' }),
    ...(kind === 'live'
      ? {
          liveWorkspace: {
            id: randomUUID(),
            revision: 1,
            playId: randomUUID(),
            publicationToken: 'qa-token',
          },
        }
      : {}),
  }
  ctx.members.grantsByUser.set(accountId, new Set(['estudio-completo']))
  if (kind === 'live') ctx.members.liveEligibility = { eligible: true, title: 'QA live' }
  const request = (suffix: string, value: unknown = body) =>
    ctx.app.handle(
      jsonRequest('POST', path + suffix, {
        headers: studentHeaders(authorId, {
          'x-auth-account-id': accountId,
          'x-auth-profile-name': 'QA',
        }),
        body: value,
      }),
    )
  return { ...ctx, body, path, request, authorId, accountId }
}

test('prepare is private, idempotent and creates no thread, play reference, notification or delivery', async () => {
  const f = await fixture('lesson')
  const replies = await Promise.all([f.request('/prepare'), f.request('/prepare')])
  expect(replies.map((r) => r.status)).toEqual([200, 200])
  const first = await readStudioReserved(replies[0]!),
    retry = await readStudioReserved(replies[1]!)
  expect(first).toEqual(retry)
  expect(first.state).toBe('reserved')
  expect(f.threadRepo.threads).toHaveLength(0)
  expect(f.threadRepo.showcaseDeliveries.size).toBe(0)
  expect(f.members.showcaseNotifications).toHaveLength(0)
  expect((await f.request('/prepare', { ...f.body, snapshotHash: 'b'.repeat(64) })).status).toBe(
    409,
  )
})

test('finalize requires reservation, exact snapshot, context and author; concurrent/lost-ACK retry is one visible thread', async () => {
  const f = await fixture('lesson')
  const reservation = await readStudioReserved(await f.request('/prepare'))
  const final = { ...f.body, reservationId: reservation.reservationId, playId: reservation.playId }
  expect((await f.request('', f.body)).status).toBe(400)
  expect((await f.request('', { ...final, snapshotHash: 'b'.repeat(64) })).status).toBe(409)
  expect((await f.request('', { ...final, blockId: randomUUID() })).status).toBe(409)
  expect(
    (await f.request('', { ...final, publisher: { ...f.body.publisher, authorId: randomUUID() } }))
      .status,
  ).toBe(403)
  expect(f.threadRepo.threads).toHaveLength(0)
  const results = await Promise.all([f.request('', final), f.request('', final)])
  expect(results.map((r) => r.status)).toEqual([200, 200])
  const first = await readStudioPublication(results[0]!),
    second = await readStudioPublication(results[1]!)
  expect(first.thread.id).toBe(second.thread.id)
  expect(f.threadRepo.threads).toHaveLength(1)
  expect(f.threadRepo.showcaseDeliveries.size).toBe(1)
  expect(first.thread.playId).toBe(reservation.playId)
  expect(
    (
      await readStudioPreparation(
        await f.request('/prepare', { ...f.body, snapshotHash: 'c'.repeat(64) }),
      )
    ).state,
  ).toBe('finalized')
})

for (const status of ['hidden', 'deleted', 'rejected'] as const)
  test(`preparation and late finalize preserve ${status} instead of restoring a thread`, async () => {
    const f = await fixture('lesson')
    const reservation = await readStudioReserved(await f.request('/prepare'))
    const final = {
      ...f.body,
      reservationId: reservation.reservationId,
      playId: reservation.playId,
    }
    const published = await readStudioPublication(await f.request('', final))
    await f.threadRepo.setThreadStatus(published.thread.id, status, ['visible'], new Date())
    const notifyBefore = f.members.showcaseNotifications.length
    const replay = await readStudioPreparation(await f.request('/prepare'))
    if (replay.state === 'reserved') throw new Error('Terminal reservation revived')
    expect(replay.state).toBe(status === 'hidden' ? 'finalized' : 'retired')
    expect(replay.thread?.status).toBe(status)
    const late = await readStudioPublication(await f.request('', final))
    expect(late.thread.status).toBe(status)
    expect(f.members.showcaseNotifications.length).toBe(notifyBefore)
  })

test('live prepare keeps the Members-attested play ID and token expiry is not part of semantic identity', async () => {
  const f = await fixture('live')
  const first = await f.request('/prepare')
  expect(first.status).toBe(200)
  const reserved = await readStudioReserved(first)
  if (!f.body.liveWorkspace) throw new Error('Missing signed live claim')
  expect(reserved.playId).toBe(f.body.liveWorkspace.playId)
  const renewed = await f.request('/prepare', {
    ...f.body,
    liveWorkspace: { ...f.body.liveWorkspace, publicationToken: 'renewed-token' },
  })
  expect(await readStudioReserved(renewed)).toEqual(reserved)
})

test('standalone finalize alone persists a stable event; replay and terminal retries add none', async () => {
  const f = await fixture()
  const reserved = await readStudioReserved(await f.request('/prepare'))
  expect(f.threadRepo.studioEvents.size).toBe(0)
  expect(f.members.standaloneShowcases).toHaveLength(0)
  const final = { ...f.body, reservationId: reserved.reservationId, playId: reserved.playId }
  const published = await readStudioPublication(await f.request('', final))
  expect([...f.threadRepo.studioEvents]).toEqual([
    [
      `studio:${published.thread.id}:standalone`,
      {
        kind: 'standalone',
        payload: {
          userId: f.authorId,
          accountId: f.accountId,
          audience: 'kids',
          playId: reserved.playId,
          publishedAt: published.thread.createdAt,
        },
      },
    ],
  ])
  await f.request('', final)
  expect(f.threadRepo.studioEvents.size).toBe(1)
  await f.threadRepo.setThreadStatus(published.thread.id, 'deleted', ['visible'], new Date())
  const before = f.members.standaloneShowcases.length
  await f.request('', final)
  expect(f.threadRepo.studioEvents.size).toBe(1)
  expect(f.members.standaloneShowcases).toHaveLength(before)
})

test('live revocation between preparation and finalization publishes nothing', async () => {
  const f = await fixture('live')
  const reserved = await readStudioReserved(await f.request('/prepare'))
  f.members.liveEligibility = { eligible: false, title: '' }
  expect(
    (
      await f.request('', {
        ...f.body,
        reservationId: reserved.reservationId,
        playId: reserved.playId,
      })
    ).status,
  ).toBe(403)
  expect(f.threadRepo.threads).toHaveLength(0)
  expect(f.threadRepo.studioEvents.size).toBe(0)
})

test('cover reconciliation retains an open reservation without adopting or comparing a URL', async () => {
  const f = await fixture()
  const reserved = await readStudioReserved(await f.request('/prepare'))
  const response = await f.app.handle(
    jsonRequest('GET', `/hub/internal/studio-cover/${reserved.playId}?audience=kids`, {
      headers: { 'x-internal-token': TEST_INTERNAL_API_TOKEN },
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ status: 'pending', coverImageUrl: null })
})
