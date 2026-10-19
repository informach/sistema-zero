import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

function request(accountId: string, profileIds: string[]) {
  return new Request(
    `http://localhost/members/parents/children-stats?profileIds=${profileIds.join(',')}&audience=kids`,
    {
      headers: { 'x-auth-user-id': accountId },
    },
  )
}

test('parent report includes a registered zero-XP child, uses earned capabilities and filters foreign registry owners', async () => {
  const ctx = buildApp(),
    accountId = randomUUID(),
    userId = randomUUID(),
    foreignId = randomUUID()
  ctx.kidsJourneySnapshots.owners.set(userId, accountId)
  ctx.kidsJourneySnapshots.owners.set(foreignId, randomUUID())
  ctx.kidsJourneySnapshots.earned.set(userId, {
    level: 'noob',
    capabilities: ['studio'],
    courseAccess: { entry: [], expanded: [], reward: [] },
  })
  grantLifetime(ctx.entitlements, { userId: accountId, courseRef: 'estudio-completo' })
  const response = await ctx.app.handle(request(accountId, [userId, foreignId]))
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.children).toHaveLength(1)
  expect(body.children[0]).toMatchObject({
    profileId: userId,
    xp: 0,
    career: {
      level: 'noob',
      tools: expect.arrayContaining([
        expect.objectContaining({ id: 'estudio-completo', state: 'available' }),
      ]),
    },
  })
  expect(ctx.kidsJourneySnapshots.snapshotReads).toBe(1)
  expect(ctx.gamification.journeyCourseStateReads).toBe(0)
  expect(ctx.gamification.qualifyingJourneySlotReads).toBe(0)
})

test('pending publication follows actual policy milestone and ledger identity after a course is retagged', async () => {
  const ctx = buildApp(),
    accountId = randomUUID(),
    userId = randomUUID()
  ctx.kidsJourneySnapshots.owners.set(userId, accountId)
  const course = seedSampleCourse(
    ctx.courses,
    'pending-publication',
    'published',
    'kids',
    false,
    'primeiros-passos',
    '2d',
    1,
  )
  await ctx.gamification.award({
    userId,
    accountId,
    audience: 'kids',
    events: [{ sourceType: 'course_complete', sourceId: course.courseId, amount: 0 }],
    today: '2026-06-02',
    now: new Date('2026-06-02T12:00:00Z'),
    privileged: false,
  })
  const current = ctx.courses.courses.find((item) => item.id === course.courseId)!
  Object.assign(current, { level: 'iniciante', careerSlot: 2 })
  const first = await ctx.app.handle(request(accountId, [userId]))
  expect(first.status).toBe(200)
  const before = await first.json()
  expect(before.children[0].career.pendingPublications).toEqual([
    { courseSlug: course.slug, title: 'Curso Demo' },
  ])
  const policy = ctx.kidsJourneySnapshots.policy
  ctx.kidsJourneySnapshots.policy = {
    ...policy,
    steps: policy.steps.map((step) => ({
      ...step,
      requirements: step.requirements.map((requirement) => ({
        ...requirement,
        milestone: 'complete' as const,
      })),
    })),
  }
  const second = await ctx.app.handle(request(accountId, [userId]))
  expect(second.status).toBe(200)
  const after = await second.json()
  expect(after.children[0].career.level).toBe('coder')
  expect(after.children[0].career.pendingPublications).toEqual([])
  expect(ctx.gamification.journeyCourseStateReads).toBe(0)
})
