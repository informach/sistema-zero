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

test('a etapa nas listas: posição em lote e identidades públicas com a foto e a etapa', async () => {
  const ctx = buildApp()
  const first = seedSampleCourse(ctx.courses)
  const second = seedSampleCourse(ctx.courses, 'segundo-curso-adulto')
  await ctx.adultJourney.configure(
    {
      schemaVersion: 1,
      stages: [
        {
          id: 'aprendiz',
          title: 'Aprendiz',
          requirements: [{ courseId: first.courseId, milestone: 'complete' }],
          capabilities: ['studio'],
        },
        {
          id: 'construtor',
          title: 'Construtor(a)',
          requirements: [{ courseId: second.courseId, milestone: 'complete' }],
          capabilities: [],
        },
      ],
    },
    0,
  )
  const other = crypto.randomUUID()
  const privateOne = crypto.randomUUID()
  ctx.gamification.events.push({
    userId: other,
    audience: 'adult',
    sourceType: 'course_complete',
    sourceId: first.courseId,
    amount: 0,
    createdAt: new Date(),
  })
  const positions = await ctx.adultJourney.positions([userId, other, other])
  expect(positions.get(userId)).toEqual({
    position: 1,
    total: 3,
    stageId: 'aprendiz',
    title: 'Aprendiz',
  })
  expect(positions.get(other)?.title).toBe('Construtor(a)')

  for (const [id, publicEnabled] of [
    [other, true],
    [privateOne, false],
  ] as const) {
    const saved = await ctx.app.handle(
      new Request('http://localhost/members/adult/profile', {
        method: 'PUT',
        headers: { 'x-auth-user-id': id, 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Rita', publicEnabled, voiceEnabled: false }),
      }),
    )
    expect(saved.status).toBe(200)
  }
  await ctx.avatar.setPhotoUrl(other, other, 'adult', 'https://cdn.exemplo/rita.png', new Date())
  await ctx.avatar.setPhotoUrl(
    privateOne,
    privateOne,
    'adult',
    'https://cdn.exemplo/p.png',
    new Date(),
  )
  const response = await request(
    ctx,
    `/adult/profiles/public-identities?ids=${other},${privateOne}`,
  )
  expect(await response.json()).toEqual({
    identities: [
      {
        userId: other,
        displayName: 'Rita',
        photoUrl: 'https://cdn.exemplo/rita.png',
        journey: { position: 2, total: 3, title: 'Construtor(a)' },
      },
    ],
  })
})

test('sem jornada configurada, as listas seguem sem etapa', async () => {
  const ctx = buildApp()
  expect((await ctx.adultJourney.positions([userId])).size).toBe(0)
})

test('no adulto, a foto em lote sai só a da própria pessoa (a dos outros vem pela identidade pública)', async () => {
  const ctx = buildApp()
  const other = crypto.randomUUID()
  await ctx.avatar.setPhotoUrl(userId, userId, 'adult', 'https://cdn.exemplo/eu.png', new Date())
  await ctx.avatar.setPhotoUrl(other, other, 'adult', 'https://cdn.exemplo/outro.png', new Date())
  const adult = await request(ctx, `/avatars?ids=${userId},${other}&audience=adult`)
  expect(adult.status).toBe(200)
  const body = (await adult.json()) as { avatars: Record<string, { photoUrl: string | null }> }
  expect(Object.keys(body.avatars)).toEqual([userId])
  expect(body.avatars[userId]?.photoUrl).toBe('https://cdn.exemplo/eu.png')
})

test('a etapa alcançada não volta quando a política ganha um curso numa etapa concluída', async () => {
  const ctx = buildApp()
  const first = seedSampleCourse(ctx.courses, 'piso-primeiro')
  const second = seedSampleCourse(ctx.courses, 'piso-segundo')
  const added = seedSampleCourse(ctx.courses, 'piso-novo')
  const stages = (firstStage: string[]) => ({
    schemaVersion: 1,
    stages: [
      {
        id: 'aprendiz',
        title: 'Aprendiz',
        requirements: firstStage.map((courseId) => ({ courseId, milestone: 'complete' })),
        capabilities: ['studio', 'pinta'],
      },
      {
        id: 'construtor',
        title: 'Construtor(a)',
        requirements: [{ courseId: second.courseId, milestone: 'complete' }],
        capabilities: [],
      },
    ],
  })
  await ctx.adultJourney.configure(stages([first.courseId]), 0)
  ctx.gamification.events.push({
    userId,
    audience: 'adult',
    sourceType: 'course_complete',
    sourceId: first.courseId,
    amount: 0,
    createdAt: new Date(),
  })
  const before = await ctx.adultJourney.get(userId)
  expect(before.stages[0]?.completed).toBe(true)
  expect(ctx.adultJourneyRepository.reached.get(userId)).toBe(2)

  await ctx.adultJourney.configure(stages([first.courseId, added.courseId]), 1)
  const after = await ctx.adultJourney.get(userId)
  expect(after.stages[0]).toMatchObject({ completed: true, missing: [] })
  expect(after.stages[1]).toMatchObject({ completed: false, available: true })
  expect(after.capabilities).toEqual(['studio', 'pinta'])
  expect((await ctx.adultJourney.positions([userId])).get(userId)).toMatchObject({
    position: 2,
    title: 'Construtor(a)',
  })
  // Quem nunca abriu a jornada não tem piso: a lista usa a posição calculada.
  expect((await ctx.adultJourney.positions([accountId])).get(accountId)?.position).toBe(1)
})
