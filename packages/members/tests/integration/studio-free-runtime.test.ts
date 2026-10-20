import { expect, test } from 'bun:test'
import { creatorJourneyLevel } from '@sistemazero/core/journey'
import { StudioFreeOptionsSchema } from '@sistemazero/core/studio/authoring-catalog'
import {
  StudioFreeRuntimeDecisionSchema,
  type StudioFreeRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'
import { buildApp, grantCommunityProduct, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-4111-8111-111111111111'
const ACCOUNT = '22222222-2222-4222-8222-222222222222'
const SIBLING = '33333333-3333-4333-8333-333333333333'
const NOW = new Date('2026-10-17T12:00:00Z')

async function setup(kind: 'classic' | 'pro' = 'classic') {
  const fixture = await authoringFixture('python', kind)
  if (kind === 'classic') fixture.project.mode = 'blocks'
  const env = buildApp({
    now: NOW,
    studioAuthoringPolicy: fixture.policy,
    studioRuntimePolicy: await createStudioRuntimePolicy(
      fixture.configuration,
      createStudioRuntimeHosts(fixture.configuration.catalog, [
        { runtime: fixture.project.runtime, origin: 'https://runtime.example.test' },
      ]),
    ),
  })
  const grant = grantCommunityProduct(env.entitlements, {
    userId: ACCOUNT,
    sku: 'estudio-completo',
  })
  for (const [tier, slots] of Object.entries(creatorJourneyLevel('coder').requiredSlots)) {
    for (const slot of slots) {
      const course = seedSampleCourse(
        env.courses,
        `qualify-${tier}-${slot}`,
        'published',
        'kids',
        false,
        'primeiros-passos',
        '2d',
        slot,
      )
      env.courses.courses.find(({ id }) => id === course.courseId)!.metadata = {
        studioUnlockBlocks: [SERVER_BLOCK_CATALOG[0]!.type],
      }
      await env.gamification.award({
        userId: USER,
        accountId: ACCOUNT,
        audience: 'kids',
        privileged: false,
        events: [
          { sourceType: 'course_complete', sourceId: course.courseId, amount: 0 },
          { sourceType: 'course_showcased', sourceId: course.courseId, amount: 0 },
        ],
        today: '2026-10-17',
        now: NOW,
      })
    }
  }
  const body: StudioFreeRuntimeRequest = {
    context: { kind: 'free', audience: 'kids', projectId: fixture.project.id },
    subject: studioRuntimeSubject(fixture.project),
    revision: 'a'.repeat(64),
    operation: 'execute',
  }
  const request = (
    input: unknown = body,
    headers: Record<string, string> = {},
    path = 'free-runtime',
  ) =>
    env.app.handle(
      new Request(`http://localhost/members/studio/${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-kids-context': 'student',
          'x-auth-user-id': USER,
          'x-auth-account-id': ACCOUNT,
          ...headers,
        },
        body: JSON.stringify(input),
      }),
    )
  const options = (headers: Record<string, string> = {}) =>
    env.app.handle(
      new Request('http://localhost/members/studio/free-options', {
        headers: {
          'x-auth-kids-context': 'student',
          'x-auth-user-id': USER,
          'x-auth-account-id': ACCOUNT,
          ...headers,
        },
      }),
    )
  return { ...env, fixture, grant, body, request, options }
}

test('analysis HTTP reuses Complete Studio ownership and achievement without granting free Pro', async () => {
  const f = await setup()
  const body = { ...f.body, operation: 'analyze' }
  const analyze = (input: unknown = body, headers: Record<string, string> = {}) =>
    f.request(input, headers, 'python-analysis')
  const response = await analyze()
  expect(response.status).toBe(200)
  expect(StudioFreeRuntimeDecisionSchema.parse(await response.json()).actor).toEqual({
    userId: USER,
    accountId: ACCOUNT,
  })
  expect((await analyze(body, { 'x-auth-user-id': SIBLING })).status).toBe(403)
  expect((await analyze(body, { 'x-auth-account-id': SIBLING })).status).toBe(403)
  expect((await analyze(body, { 'x-auth-impersonator-id': USER })).status).toBe(403)
  const pro = await authoringFixture('python', 'pro')
  expect(
    (
      await analyze({
        ...body,
        context: { ...body.context, projectId: pro.project.id },
        subject: studioRuntimeSubject(pro.project),
      })
    ).status,
  ).toBe(403)
  f.grant.revoke(NOW)
  f.entitlements.seed(f.grant)
  expect((await analyze()).status).toBe(403)
})

test('free HTTP discovers and authorizes Python with account product and profile palette', async () => {
  const f = await setup()
  const before = structuredClone(f.gamification.events)
  const response = await f.options()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(StudioFreeOptionsSchema.parse(await response.json()).canCreatePro).toBe(false)
  const admitted = await f.request()
  expect(admitted.status).toBe(200)
  expect(admitted.headers.get('cache-control')).toBe('private, no-store')
  const decision = StudioFreeRuntimeDecisionSchema.parse(await admitted.json())
  expect(decision.actor).toEqual({ userId: USER, accountId: ACCOUNT })
  expect(decision.curation.allowedModes).toEqual(['blocks'])
  expect(f.gamification.events).toEqual(before)
})

test('HTTP denies siblings, foreign account, impersonation and inactive staff, retaining real 403 responses', async () => {
  const f = await setup()
  const denials: Record<string, string>[] = [
    { 'x-auth-user-id': SIBLING },
    { 'x-auth-account-id': SIBLING },
    { 'x-auth-impersonator-id': SIBLING },
    { 'x-auth-user-id': SIBLING, 'x-auth-user-role': 'staff', 'x-auth-user-status': 'inactive' },
  ]
  for (const headers of denials) {
    const response = await f.request(f.body, headers)
    expect(response.status).toBe(403)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  }
  const staff = { 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }
  // A student profile of the staff's OWN account (the only way into the Kids learning area) is
  // the team preview; inside a support session it is refused like any impersonation.
  expect((await f.request(f.body, staff)).status).toBe(200)
  expect((await f.options(staff)).status).toBe(200)
  expect((await f.request(f.body, { ...staff, 'x-auth-impersonator-id': SIBLING })).status).toBe(
    403,
  )
  expect((await f.options({ ...staff, 'x-auth-impersonator-id': SIBLING })).status).toBe(403)
  const own = (extra: Record<string, string> = {}) =>
    f.app.handle(
      new Request('http://localhost/members/studio/free-runtime', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': ACCOUNT,
          ...staff,
          ...extra,
        },
        body: JSON.stringify(f.body),
      }),
    )
  expect((await own()).status).toBe(200)
  expect((await own({ 'x-auth-kids-context': 'parent' })).status).toBe(200)
  expect((await own({ 'x-auth-impersonator-id': SIBLING })).status).toBe(403)
  expect((await own({ 'x-auth-impersonation-mode': 'write' })).status).toBe(403)
})

test('HTTP revalidates product loss and forbids client-injected rights and contextual Pro escalation', async () => {
  const f = await setup('pro')
  expect((await f.request()).status).toBe(403)
  expect((await f.request({ ...f.body, capabilities: ['execute'] })).status).toBe(400)
  expect(
    (await f.request({ ...f.body, context: { ...f.body.context, audience: 'adult' } })).status,
  ).toBe(403)
  const classic = await setup()
  classic.grant.revoke(NOW)
  classic.entitlements.seed(classic.grant)
  expect((await classic.request()).status).toBe(403)
  expect((await classic.options()).status).toBe(403)
})

async function adultSetup(kind: 'classic' | 'pro' = 'classic') {
  const fixture = await authoringFixture('python', kind)
  const env = buildApp({
    now: NOW,
    studioAuthoringPolicy: fixture.policy,
    studioRuntimePolicy: await createStudioRuntimePolicy(
      fixture.configuration,
      createStudioRuntimeHosts(fixture.configuration.catalog, [
        { runtime: fixture.project.runtime, origin: 'https://runtime.example.test' },
      ]),
    ),
  })
  const grant = grantCommunityProduct(env.entitlements, {
    userId: ACCOUNT,
    sku: 'adult-estudio-completo',
  })
  env.adultJourneyRepository.grants.set(ACCOUNT, new Set(['studio']))
  const course = seedSampleCourse(env.courses, 'adult-python-palette', 'published', 'adult')
  env.courses.courses.find(({ id }) => id === course.courseId)!.metadata = {
    studioUnlockBlocks: [SERVER_BLOCK_CATALOG[0]!.type],
  }
  await env.gamification.award({
    userId: ACCOUNT,
    accountId: ACCOUNT,
    audience: 'adult',
    privileged: false,
    events: [
      { sourceType: 'course_complete', sourceId: course.courseId, amount: 0 },
      { sourceType: 'course_showcased', sourceId: course.courseId, amount: 0 },
    ],
    today: '2026-10-17',
    now: NOW,
  })
  const body: StudioFreeRuntimeRequest = {
    context: { kind: 'free', audience: 'adult', projectId: fixture.project.id },
    subject: studioRuntimeSubject(fixture.project),
    revision: 'a'.repeat(64),
    operation: 'execute',
  }
  const request = (
    path = 'free-runtime',
    input: unknown = body,
    headers: Record<string, string> = {},
  ) =>
    env.app.handle(
      new Request(`http://localhost/members/studio/${path}?audience=adult`, {
        method: path === 'free-options' ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', 'x-auth-user-id': ACCOUNT, ...headers },
        ...(path === 'free-options' ? {} : { body: JSON.stringify(input) }),
      }),
    )
  return { ...env, fixture, grant, body, request }
}

test('adult discovery, execution and analysis use adult journey/product/palette without requiring AI', async () => {
  const f = await adultSetup()
  const options = await f.request('free-options')
  expect(options.status).toBe(200)
  const discovery = StudioFreeOptionsSchema.parse(await options.json())
  expect(discovery.canCreatePro).toBe(false)
  expect(discovery.pythonCuration.allowedModes).toEqual(['blocks'])
  f.adultJourneyRepository.grants.get(ACCOUNT)!.add('bridge')
  expect(
    StudioFreeOptionsSchema.parse(await (await f.request('free-options')).json()).pythonCuration
      .allowedModes,
  ).toEqual(['blocks', 'bridge'])
  for (const path of ['free-runtime', 'python-analysis']) {
    const result = await f.request(path, {
      ...f.body,
      operation: path === 'python-analysis' ? 'analyze' : 'execute',
    })
    expect(result.status).toBe(200)
    const decision = StudioFreeRuntimeDecisionSchema.parse(await result.json())
    expect(decision.actor).toEqual({ userId: ACCOUNT, accountId: ACCOUNT })
    expect(decision.context.audience).toBe('adult')
  }
  expect(await f.adultJourneyRepository.listGranted(ACCOUNT)).not.toContain('ai')
  f.grant.revoke(NOW)
  f.entitlements.seed(f.grant)
  for (const path of ['free-options', 'free-runtime', 'python-analysis'])
    expect(
      (
        await f.request(path, {
          ...f.body,
          operation: path === 'python-analysis' ? 'analyze' : 'execute',
        })
      ).status,
    ).toBe(403)
})

test('adult staff opens and runs the free Studio with no license, no grants and an empty policy', async () => {
  const f = await adultSetup('pro')
  f.grant.revoke(NOW)
  f.entitlements.seed(f.grant)
  f.adultJourneyRepository.grants.delete(ACCOUNT)
  expect(f.adultJourneyRepository.record).toBeNull()
  expect((await f.request('free-options')).status).toBe(403)
  for (const role of ['staff', 'admin', 'superadmin']) {
    const staff = { 'x-auth-user-role': role, 'x-auth-user-status': 'active' }
    const options = await f.request('free-options', f.body, staff)
    expect(options.status).toBe(200)
    const discovery = StudioFreeOptionsSchema.parse(await options.json())
    expect(discovery.canCreatePro).toBe(true)
    expect(discovery.pythonCuration.allowedModes).toEqual(['blocks', 'bridge'])
    for (const path of ['free-runtime', 'python-analysis']) {
      const result = await f.request(
        path,
        { ...f.body, operation: path === 'python-analysis' ? 'analyze' : 'execute' },
        staff,
      )
      expect(result.status).toBe(200)
      expect(StudioFreeRuntimeDecisionSchema.parse(await result.json()).actor).toEqual({
        userId: ACCOUNT,
        accountId: ACCOUNT,
      })
    }
    // Support (impersonation) keeps being refused even when the target is staff.
    expect(
      (await f.request('free-runtime', f.body, { ...staff, 'x-auth-impersonator-id': USER }))
        .status,
    ).toBe(403)
  }
})

test('adult Pro follows adult Pro capability, independently of AI and Kids rank', async () => {
  const f = await adultSetup('pro')
  expect((await f.request()).status).toBe(403)
  f.adultJourneyRepository.grants.get(ACCOUNT)!.add('pro')
  expect((await f.request()).status).toBe(200)
  expect(
    StudioFreeOptionsSchema.parse(await (await f.request('free-options')).json()).canCreatePro,
  ).toBe(true)
  f.adultJourneyRepository.grants.get(ACCOUNT)!.delete('pro')
  expect((await f.request()).status).toBe(403)
})

test('adult free authority rejects Kids principals, support and a substituted audience before dispatch', async () => {
  const f = await adultSetup()
  for (const headers of [
    { 'x-auth-kids-context': 'parent' },
    { 'x-auth-kids-context': 'student', 'x-auth-user-id': USER, 'x-auth-account-id': ACCOUNT },
    { 'x-auth-impersonator-id': USER },
  ] as Record<string, string>[])
    for (const path of ['free-options', 'free-runtime', 'python-analysis'])
      expect(
        (
          await f.request(
            path,
            { ...f.body, operation: path === 'python-analysis' ? 'analyze' : 'execute' },
            headers,
          )
        ).status,
      ).toBe(403)
  for (const path of ['free-runtime', 'python-analysis'])
    expect(
      (
        await f.request(path, {
          ...f.body,
          operation: path === 'python-analysis' ? 'analyze' : 'execute',
          context: { ...f.body.context, audience: 'kids' },
        })
      ).status,
    ).toBe(403)
})

test('Kids purchase and palette do not substitute for adult purchase or adult palette', async () => {
  const f = await adultSetup()
  f.grant.revoke(NOW)
  f.entitlements.seed(f.grant)
  grantCommunityProduct(f.entitlements, { userId: ACCOUNT, sku: 'estudio-completo' })
  expect((await f.request()).status).toBe(403)
  grantCommunityProduct(f.entitlements, { userId: ACCOUNT, sku: 'adult-estudio-completo' })
  const adultCourse = f.courses.courses.find(({ slug }) => slug === 'adult-python-palette')!
  adultCourse.metadata = { studioUnlockBlocks: [] }
  expect((await f.request('free-options')).status).toBe(403)
})

test('Kids free authority requires an authenticated student profile or explicit active staff', async () => {
  const f = await setup()
  for (const headers of [
    { 'x-auth-kids-context': 'parent' },
    { 'x-auth-kids-context': '' },
    { 'x-auth-user-id': ACCOUNT },
  ] as Record<string, string>[])
    expect((await f.request(f.body, headers)).status).toBe(403)
})
