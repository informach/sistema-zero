import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const TOKEN = 'internal-token-16-chars!!'

type ChildStats = {
  profileId: string
  xp: number
  streak: { current: number; best: number }
  badgesCount: number
  coursesInProgress: number
  coursesCompleted: number
  projectsCount: number
  rankingPosition: number | null
}

function statsRequest(accountId: string, profileIds: string[], token = TOKEN): Request {
  const qs = new URLSearchParams({ accountId, profileIds: profileIds.join(','), audience: 'kids' })
  return new Request(`http://local/members/internal/children-stats?${qs}`, {
    headers: token ? { 'x-internal-token': token } : {},
  })
}

const today = '2026-06-18'
const now = new Date('2026-06-18T12:00:00.000Z')

describe('GET /members/internal/children-stats', () => {
  test('resume cada filho da CONTA; perfil de outra conta NÃO vaza', async () => {
    const ctx = buildApp({ internalToken: TOKEN })
    const account = randomUUID()
    const otherAccount = randomUUID()
    const profileA = randomUUID()
    const profileB = randomUUID()
    const profileC = randomUUID() // de OUTRA conta — não pode voltar

    // Matrícula kids ESPECÍFICA da conta → coloca a conta na coorte do ranking.
    seedSampleCourse(ctx.courses, 'curso-kids', 'published', 'kids')
    grantLifetime(ctx.entitlements, { userId: account, courseRef: 'curso-kids' })

    // XP por perfil (kids): A=20 (2 aulas), B=10 (1 aula); C na outra conta.
    await ctx.gamification.award({
      userId: profileA,
      accountId: account,
      audience: 'kids',
      events: [
        { sourceType: 'lesson_complete', sourceId: 'la', amount: 10 },
        { sourceType: 'lesson_complete', sourceId: 'lb', amount: 10 },
      ],
      today,
      now,
      privileged: false,
    })
    await ctx.gamification.award({
      userId: profileB,
      accountId: account,
      audience: 'kids',
      events: [{ sourceType: 'lesson_complete', sourceId: 'lc', amount: 10 }],
      today,
      now,
      privileged: false,
    })
    await ctx.gamification.award({
      userId: profileC,
      accountId: otherAccount,
      audience: 'kids',
      events: [{ sourceType: 'lesson_complete', sourceId: 'ld', amount: 10 }],
      today,
      now,
      privileged: false,
    })

    // 2 projetos do Estúdio entregues pelo perfil A.
    for (const blockId of [randomUUID(), randomUUID()]) {
      await ctx.studioSubmissions.upsert({
        id: randomUUID(),
        userId: profileA,
        blockId,
        lessonId: randomUUID(),
        courseId: randomUUID(),
        project: {},
        submittedAt: now,
      })
    }

    const res = await ctx.app.handle(statsRequest(account, [profileA, profileB, profileC]))
    expect(res.status).toBe(200)
    const body = (await res.json()) as ChildStats[]

    // Só A e B (C é de outra conta — autorização por account_id).
    expect(new Set(body.map((c) => c.profileId))).toEqual(new Set([profileA, profileB]))

    const a = body.find((c) => c.profileId === profileA)
    expect(a).toBeDefined()
    expect(a?.xp).toBe(20)
    expect(a?.streak.current).toBe(1)
    expect(typeof a?.badgesCount).toBe('number') // contagem reusa listBadges (testada à parte)
    expect(a?.projectsCount).toBe(2)
    expect(a?.coursesCompleted).toBe(0) // sem conclusões semeadas
    expect(a?.coursesInProgress).toBe(0)
    expect(a?.rankingPosition).toBe(1) // mais XP que B

    const b = body.find((c) => c.profileId === profileB)
    expect(b?.xp).toBe(10)
    expect(b?.projectsCount).toBe(0)
    expect(b?.rankingPosition).toBe(2)
  })

  test('a MESMA conta de C enxerga C (não é exclusão cega)', async () => {
    const ctx = buildApp({ internalToken: TOKEN })
    const account = randomUUID()
    const profile = randomUUID()
    await ctx.gamification.award({
      userId: profile,
      accountId: account,
      audience: 'kids',
      events: [{ sourceType: 'lesson_complete', sourceId: 'l1', amount: 10 }],
      today,
      now,
      privileged: false,
    })
    const res = await ctx.app.handle(statsRequest(account, [profile]))
    const body = (await res.json()) as ChildStats[]
    expect(body.map((c) => c.profileId)).toEqual([profile])
    expect(body[0]?.xp).toBe(10)
  })

  test('sem x-internal-token → 401', async () => {
    const ctx = buildApp({ internalToken: TOKEN })
    const res = await ctx.app.handle(statsRequest(randomUUID(), [randomUUID()], ''))
    expect(res.status).toBe(401)
  })
})
