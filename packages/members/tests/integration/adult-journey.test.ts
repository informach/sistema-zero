import { expect, test } from 'bun:test'
import type { AdultJourneyView } from '@sistemazero/core/journey'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const userId = '00000002-1111-4111-8111-111111111111'
const accountId = '22222222-2222-4222-8222-222222222222'
type Context = ReturnType<typeof buildApp>
function request(
  ctx: Context,
  path: string,
  method = 'GET',
  body?: unknown,
  extra: Record<string, string> = {},
) {
  return ctx.app.handle(
    new Request(`http://localhost/members${path}`, {
      method,
      headers: {
        'x-auth-user-id': userId,
        'x-auth-user-status': 'active',
        'x-auth-user-role': 'customer',
        'content-type': 'application/json',
        ...extra,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )
}
function policy(courseId: string, capabilities = ['studio']) {
  return {
    schemaVersion: 1,
    stages: [
      {
        id: 'primeiro-jogo',
        title: 'Primeiro jogo',
        requirements: [{ courseId, milestone: 'complete' }],
        capabilities,
      },
    ],
  }
}

test('configuração exige Admin e origem interna; perfil Kids não acessa jornada adulta', async () => {
  const ctx = buildApp({ requireAdmin: true, internalToken: 'internal-journey-test-token' })
  expect((await request(ctx, '/admin/journey/adult')).status).toBe(401)
  const token = { 'x-internal-token': 'internal-journey-test-token' }
  expect((await request(ctx, '/admin/journey/adult', 'GET', undefined, token)).status).toBe(403)
  expect(
    (
      await request(ctx, '/admin/journey/adult', 'GET', undefined, {
        ...token,
        'x-auth-user-role': 'admin',
      })
    ).status,
  ).toBe(200)
  expect(
    (
      await request(ctx, '/journey/adult', 'GET', undefined, {
        ...token,
        'x-auth-account-id': accountId,
      })
    ).status,
  ).toBe(403)
})

test('política rejeita cursos Kids, cursos ao vivo, IDs repetidos e IA antes de curso avançado', async () => {
  const ctx = buildApp()
  const adult = seedSampleCourse(ctx.courses)
  const kids = seedSampleCourse(ctx.courses, 'kids', 'published', 'kids')
  await expect(ctx.adultJourney.configure(policy(kids.courseId), 0)).rejects.toThrow(
    'adultos gravados',
  )
  await expect(ctx.adultJourney.configure(policy(adult.courseId, ['ai']), 0)).rejects.toThrow(
    'avançado',
  )
  const row = ctx.courses.courses.find((course) => course.id === adult.courseId)
  if (!row) throw new Error('Curso ausente')
  row.modality = 'live'
  await expect(ctx.adultJourney.configure(policy(adult.courseId), 0)).rejects.toThrow(
    'adultos gravados',
  )
  row.modality = 'recorded'
  row.level = 'avancado'
  expect(
    (await ctx.adultJourney.configure(policy(adult.courseId, ['ai', 'pensa']), 0)).version,
  ).toBe(1)
  await expect(ctx.adultJourney.configure(policy(adult.courseId), 0)).rejects.toThrow(
    'configuração mudou',
  )
})

test('XP e licença não liberam ferramenta; marco adulto libera e edição futura preserva conquista', async () => {
  const ctx = buildApp()
  const course = seedSampleCourse(ctx.courses)
  await ctx.adultJourney.configure(policy(course.courseId), 0)
  grantLifetime(ctx.entitlements, { userId, courseRef: 'adult-estudio-completo' })
  const body = {
    name: 'Jogo',
    kind: 'classic',
    formatVersion: 2,
    itemUpdatedAt: '2026-10-18T12:00:00Z',
    bytes: 100,
  }
  const upload = () =>
    request(ctx, '/creations/studio/meu-jogo/upload?audience=adult', 'POST', body)
  ctx.gamification.events.push({
    userId,
    audience: 'adult',
    sourceType: 'lesson_complete',
    sourceId: crypto.randomUUID(),
    amount: 10000,
    createdAt: new Date(),
  })
  expect((await upload()).status).toBe(403)
  ctx.gamification.events.push({
    userId,
    audience: 'kids',
    sourceType: 'course_complete',
    sourceId: course.courseId,
    amount: 0,
    createdAt: new Date(),
  })
  expect((await upload()).status).toBe(403)
  ctx.gamification.events.push({
    userId,
    audience: 'adult',
    sourceType: 'course_complete',
    sourceId: course.courseId,
    amount: 0,
    createdAt: new Date(),
  })
  expect((await upload()).status).toBe(200)
  const me = (await (await request(ctx, '/gamification/me?audience=adult')).json()) as {
    journey: AdultJourneyView
  }
  expect(me.journey.capabilities).toEqual(['studio'])
  await ctx.adultJourney.configure({ schemaVersion: 1, stages: [] }, 1)
  expect((await ctx.adultJourney.get(userId)).capabilities).toEqual(['studio'])
  expect((await ctx.adultJourney.get(accountId)).capabilities).toEqual([])
})

test('missões adultas exigem mostra acessível; concluídas continuam resgatáveis', async () => {
  const ctx = buildApp()
  grantLifetime(ctx.entitlements, { userId, courseRef: 'adult-estudio-completo' })
  const course = seedSampleCourse(ctx.courses)
  await ctx.adultJourney.configure(policy(course.courseId), 0)
  ctx.gamification.events.push({
    userId,
    audience: 'adult',
    sourceType: 'course_complete',
    sourceId: course.courseId,
    amount: 0,
    createdAt: new Date(),
  })
  const read = async () =>
    (await (await request(ctx, '/gamification/missions/me?audience=adult')).json()) as {
      audience: string
      monthly: { slug: string; goalType: string; completed: boolean }[]
    }
  const visible = await read()
  expect(visible.audience).toBe('adult')
  expect(visible.monthly.some((m) => m.goalType === 'studio_published')).toBe(true)
  ctx.adultCommunityAvailability.value = false
  expect((await read()).monthly.some((m) => m.goalType === 'studio_published')).toBe(false)
  expect(
    (await request(ctx, '/gamification/missions/monthly-lancar-2/claim?audience=adult', 'POST'))
      .status,
  ).toBe(404)
  for (let i = 0; i < 2; i++)
    ctx.gamification.events.push({
      userId,
      audience: 'adult',
      sourceType: 'studio_published',
      sourceId: crypto.randomUUID(),
      amount: 0,
      createdAt: new Date('2026-06-02T12:00:00Z'),
    })
  expect((await read()).monthly.find((m) => m.slug === 'monthly-lancar-2')?.completed).toBe(true)
  expect(
    (await request(ctx, '/gamification/missions/monthly-lancar-2/claim?audience=adult', 'POST'))
      .status,
  ).toBe(200)
})

test('remix adulto não aceita jogo Kids nem gera marco cruzado', async () => {
  const ctx = buildApp()
  const course = seedSampleCourse(ctx.courses)
  await ctx.adultJourney.configure(policy(course.courseId), 0)
  ctx.gamification.events.push({
    userId,
    audience: 'adult',
    sourceType: 'course_complete',
    sourceId: course.courseId,
    amount: 0,
    createdAt: new Date(),
  })
  grantLifetime(ctx.entitlements, { userId, courseRef: 'adult-estudio-completo' })
  const playId = crypto.randomUUID()
  ctx.hubPlays.set(playId, { visible: true, authorId: accountId })
  const remix = () => request(ctx, '/gamification/remix?audience=adult', 'POST', { playId })
  expect((await remix()).status).toBe(404)
  expect(ctx.gamification.events.some((e) => e.sourceType === 'studio_remix')).toBe(false)
  ctx.hubPlays.set(playId, { visible: true, authorId: accountId, audience: 'adult' })
  expect((await remix()).status).toBe(200)
  expect(
    ctx.gamification.events.filter((e) => e.sourceType === 'studio_remix').map((e) => e.audience),
  ).toEqual(['adult'])
})

test('IA adulta exige formação avançada e licença própria; perfil infantil não pode consumi-la', async () => {
  const ctx = buildApp()
  const course = seedSampleCourse(ctx.courses)
  const row = ctx.courses.courses.find((item) => item.id === course.courseId)
  if (!row) throw new Error('Curso ausente')
  row.level = 'avancado'
  await ctx.adultJourney.configure(policy(course.courseId, ['studio', 'ai', 'pensa', 'pro']), 0)
  const consume = () =>
    request(ctx, '/ai-usage/consume?audience=adult', 'POST', { feature: 'studio-describe' })
  expect((await consume()).status).toBe(403)
  expect((await request(ctx, '/ai-usage/me?audience=adult')).status).toBe(403)
  expect((await request(ctx, '/adult/pensa/projects')).status).toBe(403)
  grantLifetime(ctx.entitlements, { userId, courseRef: 'estudio-completo' })
  ctx.gamification.events.push({
    userId,
    audience: 'adult',
    sourceType: 'course_complete',
    sourceId: course.courseId,
    amount: 0,
    createdAt: ctx.clockRef.now,
  })
  expect((await consume()).status).toBe(403)
  grantLifetime(ctx.entitlements, { userId, courseRef: 'adult-estudio-completo' })
  expect((await consume()).status).toBe(200)
  expect(
    (
      await request(
        ctx,
        '/ai-usage/consume?audience=adult',
        'POST',
        { feature: 'studio-describe' },
        { 'x-auth-kids-context': 'student' },
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await request(ctx, '/adult/pensa/projects', 'GET', undefined, {
        'x-auth-account-id': accountId,
      })
    ).status,
  ).toBe(403)
})

test('Kids parental sessions cannot select adult identity through query or adult endpoints', async () => {
  const ctx = buildApp()
  const parent = { 'x-auth-kids-context': 'parent' }
  for (const path of [
    '/journey/adult',
    '/adult/profile',
    '/adult/help/collections',
    '/creations/studio?audience=adult',
    '/gamification/me?audience=adult',
  ]) {
    expect((await request(ctx, path, 'GET', undefined, parent)).status).toBe(403)
  }
})
