import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

function setup() {
  const ctx = buildApp(),
    userId = randomUUID(),
    accountId = randomUUID()
  const course = seedSampleCourse(ctx.courses, 'identity-view', 'published', 'kids')
  ctx.kidsJourneySnapshots.owners.set(userId, accountId)
  grantLifetime(ctx.entitlements, { userId: accountId, courseRef: 'identity-view' })
  return {
    ...ctx,
    course,
    headers: {
      'x-auth-user-id': userId,
      'x-auth-account-id': accountId,
      'x-auth-kids-context': 'student',
    },
  }
}

test('canonical course identity: published catalog exposes the immutable course ID alongside its label', async () => {
  const ctx = setup()
  const response = await ctx.app.handle(
    new Request('http://localhost/members/catalog?audience=kids', { headers: ctx.headers }),
  )
  expect(response.status).toBe(200)
  const { courses } = await response.json()
  expect(courses[0]).toMatchObject({
    courseId: ctx.course.courseId,
    courseSlug: 'identity-view',
    title: 'Curso Demo',
  })
})

test('canonical course identity: owned course exposes the same ID for requirement/milestone correspondence', async () => {
  const ctx = setup()
  const response = await ctx.app.handle(
    new Request('http://localhost/members/courses?audience=kids', { headers: ctx.headers }),
  )
  expect(response.status).toBe(200)
  const { courses } = await response.json()
  expect(courses[0]).toMatchObject({
    courseId: ctx.course.courseId,
    courseSlug: 'identity-view',
    title: 'Curso Demo',
  })
})

test('canonical course grouping: trusted own-account preview transports the same published tierAccess rules without rank', async () => {
  const ctx = buildApp(),
    userId = randomUUID()
  const response = await ctx.app.handle(
    new Request('http://localhost/members/gamification/me?audience=kids', {
      headers: {
        'x-auth-user-id': userId,
        'x-auth-user-role': 'staff',
        'x-auth-user-status': 'active',
      },
    }),
  )
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.level).toBeNull()
  expect(body.kidsPreview).toHaveProperty('tierAccess', ctx.kidsJourneySnapshots.policy.tierAccess)
  expect(body.kidsPreview).not.toHaveProperty('earned')
})
