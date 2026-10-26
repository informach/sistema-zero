import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { CourseAdminService } from '../../src/application/content-admin/content-admin.service'
import {
  buildCreatorJourneySeed,
  type CreatorEditorialSpec,
} from '../../src/application/creator-journey/creator-journey-seed'
import {
  buildApp,
  grantAllCourses,
  grantAllKidsCourses,
  grantLifetime,
  seedSampleCourse,
} from '../helpers'

const spec = JSON.parse(
  readFileSync(
    new URL('../../src/infrastructure/config/creator-journey-curriculum.json', import.meta.url),
    'utf8',
  ),
) as CreatorEditorialSpec
function setup(audience: 'kids' | 'adult') {
  const ctx = buildApp()
  const accountId = randomUUID()
  const userId = audience === 'kids' ? randomUUID() : accountId
  const suffix = audience === 'adult' ? '-adulto' : ''
  const base = seedSampleCourse(
    ctx.courses,
    `desafio-primeiro-jogo${suffix}`,
    'published',
    audience,
  )
  const spatial = seedSampleCourse(
    ctx.courses,
    `jornada-faisca-base-3d${suffix}`,
    'published',
    audience,
  )
  const extra = seedSampleCourse(ctx.courses, `cade-todo-mundo${suffix}`, 'published', audience)
  const plan = buildCreatorJourneySeed(spec, ctx.courses.courses)
  if (audience === 'kids')
    ctx.kidsJourneySnapshots.policy = {
      ...ctx.kidsJourneySnapshots.policy,
      curriculum: plan.curricula.kids,
    }
  else
    ctx.adultJourneyRepository.record = {
      version: 1,
      policy: { schemaVersion: 1, stages: [], curriculum: plan.curricula.adult },
    }
  const headers: Record<string, string> =
    audience === 'kids'
      ? {
          'x-auth-user-id': userId,
          'x-auth-account-id': accountId,
          'x-auth-kids-context': 'student',
        }
      : { 'x-auth-user-id': userId }
  const request = (path: string) =>
    ctx.app.handle(
      new Request(
        `http://localhost/members/${path}${path.includes('?') ? '&' : '?'}audience=${audience}`,
        { headers },
      ),
    )
  const complete = (courseId: string) =>
    ctx.gamification.events.push({
      userId,
      audience,
      sourceType: 'course_complete',
      sourceId: courseId,
      amount: 0,
      createdAt: new Date(),
    })
  return { ...ctx, accountId, userId, base, spatial, extra, request, complete }
}

test('new curriculum republishes historical positioned courses without requiring Mural; legacy guard remains', async () => {
  const ctx = setup('kids')
  const current = ctx.courses.courses.find((course) => course.id === ctx.base.courseId)!
  current.status = 'draft'
  current.careerSlot = 1
  current.journeyRole = 'positioned'
  const fields = { ...current, salesPageUrl: null, status: 'published' as const }
  await expect(
    new CourseAdminService(ctx.courses, ctx.courses).update(current.id, fields),
  ).rejects.toThrow()
  const updated = await new CourseAdminService(ctx.courses, ctx.courses, async () => true).update(
    current.id,
    fields,
  )
  expect(updated.status).toBe('published')
  expect(updated.careerSlot).toBe(1)
})

test('a newly seeded mission cannot publish only its 2D half; all planned lesson identities are required', async () => {
  const ctx = setup('adult')
  const current = ctx.courses.courses.find((course) => course.id === ctx.spatial.courseId)!
  const lessons = ctx.courses.lessons.filter((lesson) => lesson.courseId === current.id)
  current.status = 'draft'
  current.metadata = {
    creatorSeed: {
      key: 'faisca-missao',
      version: '2026-10-25',
      outlineHash: 'a'.repeat(64),
      requiredLessonIds: lessons.map((lesson) => lesson.id),
    },
  }
  lessons[0]!.title = 'Aplicação 2D'
  lessons[1]!.title = 'Aplicação 3D'
  lessons[1]!.isPublished = false
  const fields = { ...current, status: 'published' as const, salesPageUrl: null }
  const service = new CourseAdminService(ctx.courses, ctx.courses)
  await expect(service.update(current.id, fields)).rejects.toThrow('Aplicação 3D')
  lessons[1]!.isPublished = true
  expect((await service.update(current.id, fields)).status).toBe('published')
  expect(ctx.courses.courses.find((course) => course.id === current.id)?.metadata).toEqual(
    current.metadata,
  )
})

for (const audience of ['kids', 'adult'] as const) {
  test(`${audience}: subscription gates extra until both bases; catalog and detail agree`, async () => {
    const ctx = setup(audience)
    ;(audience === 'kids' ? grantAllKidsCourses : grantAllCourses)(ctx.entitlements, {
      userId: ctx.accountId,
    })
    let response = await ctx.request(`courses/${ctx.extra.slug}`)
    expect(response.status).toBe(423)
    expect((await response.json()).careerLock.curriculum.role).toBe('extra')
    const catalog = await (await ctx.request('catalog')).json()
    expect(
      catalog.courses.find(
        (course: { courseSlug: string }) => course.courseSlug === ctx.extra.slug,
      ),
    ).toMatchObject({
      hasAccess: true,
      careerLock: { locked: true },
      curriculum: { role: 'extra', level: 'noob' },
    })
    ctx.complete(ctx.base.courseId)
    expect((await ctx.request(`courses/${ctx.extra.slug}`)).status).toBe(423)
    ctx.complete(ctx.spatial.courseId)
    response = await ctx.request(`courses/${ctx.extra.slug}`)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      curriculum: { role: 'extra' },
      accessReason: 'journey',
      careerLock: { locked: false },
    })
  })

  test(`${audience}: active specific grant opens Cadê with and without master, subscription-specific does not`, async () => {
    const ctx = setup(audience)
    grantLifetime(ctx.entitlements, {
      userId: ctx.accountId,
      courseRef: ctx.extra.slug,
      subscriptionId: randomUUID(),
    })
    expect((await ctx.request(`courses/${ctx.extra.slug}`)).status).toBe(423)
    grantLifetime(ctx.entitlements, {
      userId: ctx.accountId,
      courseRef: ctx.extra.slug,
      key: `independent:${randomUUID()}`,
    })
    expect((await ctx.request(`courses/${ctx.extra.slug}`)).status).toBe(200)
    ;(audience === 'kids' ? grantAllKidsCourses : grantAllCourses)(ctx.entitlements, {
      userId: ctx.accountId,
    })
    expect((await ctx.request(`courses/${ctx.extra.slug}`)).status).toBe(200)
    const catalog = await (await ctx.request('catalog')).json()
    expect(
      catalog.courses.find(
        (course: { courseSlug: string }) => course.courseSlug === ctx.extra.slug,
      ),
    ).toMatchObject({ careerLock: { locked: false }, accessReason: 'manual-grant' })
  })
}
