import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type {
  AdminRankingPageView,
  RankingLeaderboardView,
} from '../../src/application/mappers/views'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const ME = '11111111-1111-1111-1111-111111111111'
const FIRST = '22222222-2222-2222-2222-222222222222'
const TIED_PUBLIC = '33333333-3333-3333-3333-333333333333'
const TIED_PRIVATE = '44444444-4444-4444-4444-444444444444'
const ZERO = '55555555-5555-5555-5555-555555555555'

async function award(
  gamification: ReturnType<typeof buildApp>['gamification'],
  userId: string,
  xp: number,
) {
  await gamification.award({
    userId,
    accountId: userId,
    audience: 'kids',
    events: [{ sourceType: 'lesson_complete', sourceId: randomUUID(), amount: xp, coins: 0 }],
    today: '2026-09-06',
    now: new Date('2026-09-06T12:00:00.000Z'),
    privileged: false,
  })
}

describe('Ranking geral paginado', () => {
  test('preserva posições globais, empates e a própria linha fora da página', async () => {
    const { app, courses, entitlements, gamification, authProfiles } = buildApp()
    const course = seedSampleCourse(courses, 'ranking-kids', 'published', 'kids')
    for (const id of [ME, FIRST, TIED_PUBLIC, TIED_PRIVATE, ZERO]) {
      grantLifetime(entitlements, { userId: id, courseRef: course.slug })
    }
    await award(gamification, FIRST, 100)
    await award(gamification, TIED_PUBLIC, 80)
    await award(gamification, TIED_PRIVATE, 80)
    await award(gamification, ME, 10)
    await award(gamification, ZERO, 0)
    authProfiles.set(ME, { firstName: 'Lia', public: false })
    authProfiles.set(FIRST, { firstName: 'Bia', public: false })
    authProfiles.set(TIED_PUBLIC, { firstName: 'Caio', public: true })
    authProfiles.set(TIED_PRIVATE, { firstName: 'Davi', public: false })

    const response = await app.handle(
      new Request('http://localhost/members/gamification/ranking?audience=kids&limit=2&offset=0', {
        headers: { 'x-auth-user-id': ME },
      }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as RankingLeaderboardView
    expect(body).toMatchObject({ total: 4, limit: 2, offset: 0 })
    expect(body.items).toEqual([
      {
        position: 1,
        xp: 100,
        isMe: false,
        firstName: 'Bia',
        photoUrl: null,
        levelSlug: 'noob',
      },
      {
        position: 2,
        xp: 80,
        isMe: false,
        firstName: 'Caio',
        photoUrl: null,
        levelSlug: 'noob',
        profileId: TIED_PUBLIC,
      },
    ])
    expect(body.me).toEqual({
      position: 4,
      xp: 10,
      isMe: true,
      firstName: 'Lia',
      photoUrl: null,
      levelSlug: 'noob',
    })
    expect(body.items[0]).not.toHaveProperty('userId')
    expect(body.items[0]).not.toHaveProperty('accountId')
  })

  test('admin filtra depois do RANK e recebe ids internos sem recalcular posições', async () => {
    const { app, courses, entitlements, gamification } = buildApp()
    const course = seedSampleCourse(courses, 'ranking-admin', 'published', 'kids')
    for (const id of [ME, FIRST, TIED_PUBLIC, TIED_PRIVATE]) {
      grantLifetime(entitlements, { userId: id, courseRef: course.slug })
    }
    await award(gamification, FIRST, 100)
    await award(gamification, TIED_PUBLIC, 80)
    await award(gamification, TIED_PRIVATE, 80)
    await award(gamification, ME, 10)

    const response = await app.handle(
      new Request(
        `http://localhost/members/admin/gamification/ranking?audience=kids&userIds=${ME},${TIED_PRIVATE}`,
      ),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as AdminRankingPageView
    expect(body).toMatchObject({ totalParticipants: 4, totalMatches: 2, limit: 20, offset: 0 })
    expect(
      body.items.map((item: { userId: string; position: number }) => [item.userId, item.position]),
    ).toEqual([
      [TIED_PRIVATE, 2],
      [ME, 4],
    ])

    const emptySearch = await app.handle(
      new Request('http://localhost/members/admin/gamification/ranking?audience=kids&userIds=-'),
    )
    expect(emptySearch.status).toBe(200)
    expect(await emptySearch.json()).toMatchObject({
      items: [],
      totalParticipants: 4,
      totalMatches: 0,
    })
  })

  test('exige matrícula ativa e recusa a visualização de equipe no endpoint público', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses, 'ranking-access', 'published', 'kids')

    const withoutAccess = await app.handle(
      new Request('http://localhost/members/gamification/ranking?audience=kids', {
        headers: { 'x-auth-user-id': ME },
      }),
    )
    expect(withoutAccess.status).toBe(403)

    grantLifetime(entitlements, { userId: ME, courseRef: course.slug })
    const staff = await app.handle(
      new Request('http://localhost/members/gamification/ranking?audience=kids', {
        headers: {
          'x-auth-user-id': ME,
          'x-auth-user-role': 'staff',
          'x-auth-user-status': 'active',
        },
      }),
    )
    expect(staff.status).toBe(403)
  })
})
