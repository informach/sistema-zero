import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { KidsJourneyUnavailableError } from '../../src/domain/kids-journey/kids-journey.errors'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

function registered(ctx: ReturnType<typeof buildApp>, userId: string, accountId: string, level: 'noob' | 'architect') {
  ctx.kidsJourneySnapshots.owners.set(userId, accountId)
  ctx.kidsJourneySnapshots.earned.set(userId, { level, capabilities: [],
    courseAccess: { entry: [], expanded: [], reward: [] } })
}

test('peer avatars and Admin overview use one canonical batch including registered profiles with no XP', async () => {
  const ctx = buildApp(), first = randomUUID(), second = randomUUID(), unknown = randomUUID(), accountId = randomUUID()
  registered(ctx, first, accountId, 'architect')
  registered(ctx, second, accountId, 'noob')
  const ids = [first, second, unknown].join(',')
  const avatars = await ctx.app.handle(new Request(`http://localhost/members/avatars?ids=${ids}&audience=kids`))
  expect(avatars.status).toBe(200)
  const batch = await avatars.json()
  expect(batch.avatars[first]).toEqual({ photoUrl: null, level: 'architect' })
  expect(batch.avatars[second]).toEqual({ photoUrl: null, level: 'noob' })
  expect(batch.avatars[unknown]).toEqual({ photoUrl: null, level: null, journeyUnavailable: true })
  expect(ctx.kidsJourneySnapshots.snapshotReads).toBe(1)
  const overview = await ctx.app.handle(new Request(`http://localhost/members/admin/profiles-overview?profileIds=${ids}`))
  expect(overview.status).toBe(200)
  const body = await overview.json()
  expect(body.profiles.map((row: { levelSlug: string | null }) => row.levelSlug)).toEqual(['architect', 'noob', null])
  expect(body.profiles[2].journeyUnavailable).toBe(true)
  expect(body.profiles.every((row: { xp: number }) => row.xp === 0)).toBe(true)
  expect(ctx.kidsJourneySnapshots.snapshotReads).toBe(2)
  expect(ctx.gamification.qualifyingJourneySlotReads).toBe(0)
})

test('public profile retains an offline earned rank without Gamma activity; absent membership is unavailable', async () => {
  const ctx = buildApp(), userId = randomUUID(), accountId = randomUUID()
  registered(ctx, userId, accountId, 'architect')
  const response = await ctx.app.handle(new Request(`http://localhost/members/profiles/${userId}/public?audience=kids`))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ xp: 0, level: { slug: 'architect', next: 'champion' } })
  const missing = await ctx.app.handle(new Request(`http://localhost/members/profiles/${randomUUID()}/public?audience=kids`))
  expect(missing.status).toBe(503)
  expect(await missing.json()).not.toHaveProperty('level')
  expect(ctx.gamification.qualifyingJourneySlotReads).toBe(0)
})

test('ranking enrichment failure keeps actual XP and explicitly marks rank unavailable instead of returning Noob', async () => {
  const ctx = buildApp(), userId = randomUUID()
  const course = seedSampleCourse(ctx.courses, 'canonical-ranking', 'published', 'kids')
  grantLifetime(ctx.entitlements, { userId, courseRef: course.slug })
  await ctx.gamification.award({ userId, accountId: userId, audience: 'kids',
    events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 25 }],
    today: '2026-06-02', now: new Date('2026-06-02T12:00:00Z'), privileged: false })
  ctx.kidsJourneySnapshots.readSnapshot = async () => { throw new KidsJourneyUnavailableError() }
  const response = await ctx.app.handle(new Request('http://localhost/members/gamification/ranking?audience=kids', {
    headers: { 'x-auth-user-id': userId },
  }))
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.items).toHaveLength(1)
  expect(body.items[0]).toMatchObject({ xp: 25, levelSlug: null, journeyUnavailable: true })
  expect(body.items[0]).not.toHaveProperty('accountId')
})


test('device-selection photos remain independent of unavailable pedagogical policy and require the existing consumer guard', async () => {
  const ctx = buildApp(), userId = randomUUID()
  ctx.kidsJourneySnapshots.readSnapshot = async () => { throw new KidsJourneyUnavailableError() }
  const request = (consumer?: string) => ctx.app.handle(new Request('http://localhost/members/internal/device-avatars', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(consumer ? { 'x-consumer-id': consumer } : {}) },
    body: JSON.stringify({ profileIds: [userId] }),
  }))
  expect((await request()).status).toBe(401)
  const response = await request('member-shell')
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ photos: { [userId]: null } })
  expect(ctx.kidsJourneySnapshots.snapshotReads).toBe(0)
})


test('League keeps a registered offline rank and explicitly marks an unregistered peer without fabricating Noob', async () => {
  const ctx = buildApp(), userId = randomUUID(), peerId = randomUUID()
  registered(ctx, userId, userId, 'architect')
  const course = seedSampleCourse(ctx.courses, 'canonical-league', 'published', 'kids')
  for (const id of [userId, peerId]) {
    grantLifetime(ctx.entitlements, { userId: id, courseRef: course.slug })
    ctx.gamification.leagueMemberships.push({ userId: id, accountId: id,
      audience: 'kids', weekKey: 'w:2026-06-01', tier: 'bronze' })
  }
  const response = await ctx.app.handle(new Request('http://localhost/members/gamification/league/me?audience=kids', {
    headers: { 'x-auth-user-id': userId },
  }))
  expect(response.status).toBe(200)
  const { entries } = await response.json()
  expect(entries.find((row: { isMe: boolean }) => row.isMe)).toMatchObject({ levelSlug: 'architect', weeklyXp: 0 })
  expect(entries.find((row: { isMe: boolean }) => !row.isMe)).toMatchObject({ levelSlug: null, journeyUnavailable: true })
  expect(entries.every((row: object) => !('accountId' in row) && !('profileId' in row))).toBe(true)
  expect(ctx.kidsJourneySnapshots.snapshotReads).toBe(1)
  expect(ctx.gamification.qualifyingJourneySlotReads).toBe(0)
})

test('League preserves actual weekly XP when policy hydration is unavailable', async () => {
  const ctx = buildApp(), userId = randomUUID()
  const course = seedSampleCourse(ctx.courses, 'unavailable-league', 'published', 'kids')
  grantLifetime(ctx.entitlements, { userId, courseRef: course.slug })
  await ctx.gamification.award({ userId, accountId: userId, audience: 'kids',
    events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: 25 }],
    today: '2026-06-02', now: new Date('2026-06-02T12:00:00Z'), privileged: false })
  ctx.kidsJourneySnapshots.readSnapshot = async () => { throw new KidsJourneyUnavailableError() }
  const response = await ctx.app.handle(new Request('http://localhost/members/gamification/league/me?audience=kids', {
    headers: { 'x-auth-user-id': userId },
  }))
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.entries).toHaveLength(1)
  expect(body.entries[0]).toMatchObject({ weeklyXp: 25, levelSlug: null, journeyUnavailable: true })
  expect(body.entries[0]).not.toHaveProperty('accountId')
})
