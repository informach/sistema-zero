import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const headers = { 'x-auth-user-id': USER }
type Gam = ReturnType<typeof buildApp>['gamification']
type Ctx = ReturnType<typeof buildApp>

const getLeague = (app: ReturnType<typeof buildApp>['app']) =>
  app.handle(
    new Request('http://localhost/members/gamification/league/me?audience=kids', { headers }),
  )
const readJson = (r: Response): Promise<any> => r.json()

function seedKidsAccess(ctx: Ctx, userIds: string[] = [USER]) {
  const course = seedSampleCourse(ctx.courses, 'curso-kids', 'published', 'kids')
  for (const userId of userIds) {
    grantLifetime(ctx.entitlements, { userId, courseRef: course.slug })
  }
  return course
}

/** Semeia uma atividade de XP num instante específico (p/ a janela da semana). */
function seedXp(gam: Gam, userId: string, amount: number, at: string) {
  gam.events.push({
    userId,
    audience: 'kids',
    sourceType: 'lesson_complete',
    sourceId: randomUUID(),
    amount,
    createdAt: new Date(at),
  })
}

describe('Liga — board e resolução de tier', () => {
  test('sem matrícula ativa na vitrine → 403 e não cria membership', async () => {
    const { app, gamification } = buildApp()
    const res = await getLeague(app)
    expect(res.status).toBe(403)
    expect(gamification.leagueMemberships).toHaveLength(0)
  })

  test('equipe não entra na liga mesmo com matrícula real', async () => {
    const ctx = buildApp()
    const { app, gamification } = ctx
    seedKidsAccess(ctx)
    const res = await app.handle(
      new Request('http://localhost/members/gamification/league/me?audience=kids', {
        headers: { ...headers, 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' },
      }),
    )
    expect(res.status).toBe(403)
    expect(gamification.leagueMemberships).toHaveLength(0)
  })

  test('aluno novo com matrícula entra no bronze; board tem só ele (semana amistosa)', async () => {
    const ctx = buildApp() // clock 2026-06-02 → semana w:2026-06-01
    const { app } = ctx
    seedKidsAccess(ctx)
    const body = await readJson(await getLeague(app))
    expect(body.tier).toBe('bronze')
    expect(body.weekKey).toBe('w:2026-06-01')
    expect(body.myPosition).toBe(1)
    expect(body.entries).toMatchObject([{ position: 1, weeklyXp: 0, isMe: true }])
    // 1 jogador < mínimo → semana amistosa (ninguém sobe/cai).
    expect(body.promotionCount).toBe(0)
    expect(body.relegationCount).toBe(0)
  })

  test('XP da semana corrente entra no board (derivado do ledger)', async () => {
    const ctx = buildApp()
    const { app, gamification } = ctx
    seedKidsAccess(ctx)
    seedXp(gamification, USER, 40, '2026-06-02T12:00:00.000Z') // dentro de w:2026-06-01
    const body = await readJson(await getLeague(app))
    expect(body.entries[0]).toMatchObject({ position: 1, weeklyXp: 40, isMe: true })
  })

  test('fechamento LAZY: 1º numa coorte cheia da semana anterior → sobe p/ prata', async () => {
    const ctx = buildApp() // semana corrente w:2026-06-01
    const { app, gamification } = ctx
    // Semana anterior w:2026-05-25 (segunda) com 5 jogadores no bronze; USER é o 1º.
    const others = [
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
      '55555555-5555-5555-5555-555555555555',
    ]
    seedKidsAccess(ctx, [USER, ...others])
    for (const u of [USER, ...others]) {
      gamification.leagueMemberships.push({
        userId: u,
        accountId: u,
        audience: 'kids',
        weekKey: 'w:2026-05-25',
        tier: 'bronze',
      })
    }
    // XP na janela da semana anterior — USER bem na frente.
    seedXp(gamification, USER, 200, '2026-05-26T12:00:00.000Z')
    others.forEach((u, i) => {
      seedXp(gamification, u, 10 + i, '2026-05-26T12:00:00.000Z')
    })

    const body = await readJson(await getLeague(app))
    expect(body.tier).toBe('prata') // promovido (rank 1 de 5)
    // A membership da nova semana foi criada (idempotente em releituras).
    const again = await readJson(await getLeague(app))
    expect(again.tier).toBe('prata')
  })

  test('último de coorte cheia → cai de tier', async () => {
    const ctx = buildApp()
    const { app, gamification } = ctx
    const cohort = [
      USER,
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
      '55555555-5555-5555-5555-555555555555',
    ]
    seedKidsAccess(ctx, cohort)
    for (const u of cohort) {
      gamification.leagueMemberships.push({
        userId: u,
        accountId: u,
        audience: 'kids',
        weekKey: 'w:2026-05-25',
        tier: 'ouro',
      })
    }
    // USER com o MENOR XP da semana anterior → lanterna.
    seedXp(gamification, USER, 1, '2026-05-26T12:00:00.000Z')
    cohort.slice(1).forEach((u) => {
      seedXp(gamification, u, 100, '2026-05-26T12:00:00.000Z')
    })

    const body = await readJson(await getLeague(app))
    expect(body.tier).toBe('prata') // ouro → cai 1 nível
  })

  test('empate na XP da semana → mesma posição (competition ranking, casa com promoção)', async () => {
    const ctx = buildApp() // semana corrente w:2026-06-01
    const { app, gamification } = ctx
    const O1 = '22222222-2222-2222-2222-222222222222'
    const O2 = '33333333-3333-3333-3333-333333333333'
    seedKidsAccess(ctx, [USER, O1, O2])
    // Memberships da semana CORRENTE (bronze) p/ os três — o board lê da coorte da semana.
    for (const u of [USER, O1, O2]) {
      gamification.leagueMemberships.push({
        userId: u,
        accountId: u,
        audience: 'kids',
        weekKey: 'w:2026-06-01',
        tier: 'bronze',
      })
    }
    // USER e O1 empatam em 50; O2 tem 10.
    seedXp(gamification, USER, 50, '2026-06-02T12:00:00.000Z')
    seedXp(gamification, O1, 50, '2026-06-02T12:00:00.000Z')
    seedXp(gamification, O2, 10, '2026-06-02T12:00:00.000Z')

    const body = await readJson(await getLeague(app))
    // Competition ranking ("1224"): os dois empatados em 50 → posição 1; o de 10 → posição 3.
    expect(body.entries.map((e: { position: number }) => e.position)).toEqual([1, 1, 3])
    expect(body.myPosition).toBe(1)
  })

  test('vitrine kids: colega ganha foto + nível + 1º nome; link SÓ p/ perfil público', async () => {
    const ctx = buildApp() // semana corrente w:2026-06-01
    const { app, gamification, avatar, authProfiles } = ctx
    const PUB = '22222222-2222-2222-2222-222222222222' // perfil público (opt-in)
    const PRIV = '33333333-3333-3333-3333-333333333333' // perfil privado
    seedKidsAccess(ctx, [USER, PUB, PRIV])
    for (const u of [USER, PUB, PRIV]) {
      gamification.leagueMemberships.push({
        userId: u,
        accountId: u,
        audience: 'kids',
        weekKey: 'w:2026-06-01',
        tier: 'bronze',
      })
    }
    // USER 30 · PUB 20 · PRIV 10 → posições 1/2/3.
    seedXp(gamification, USER, 30, '2026-06-02T12:00:00.000Z')
    seedXp(gamification, PUB, 20, '2026-06-02T12:00:00.000Z')
    seedXp(gamification, PRIV, 10, '2026-06-02T12:00:00.000Z')
    await avatar.setPhotoUrl(PUB, PUB, 'kids', 'https://cdn.example/pub.png', new Date())
    authProfiles.set(PUB, { firstName: 'Bia', public: true })
    authProfiles.set(PRIV, { firstName: 'Theo', public: false })

    const [me, pub, priv] = (await readJson(await getLeague(app))).entries

    expect(me.isMe).toBe(true)
    // Colega público: foto + 1º nome + nível (aura) + profileId (habilita o link).
    expect(pub).toMatchObject({
      position: 2,
      isMe: false,
      firstName: 'Bia',
      photoUrl: 'https://cdn.example/pub.png',
      profileId: PUB,
    })
    expect(typeof pub.levelSlug).toBe('string')
    // Colega privado: 1º nome + nível, mas SEM profileId (não clicável).
    expect(priv).toMatchObject({ position: 3, firstName: 'Theo' })
    expect(priv.profileId).toBeUndefined()
  })

  test('sem auth configurado (dev): board degrada p/ base + avatar, sem nome/link', async () => {
    // buildApp injeta um fake de auth; aqui simulamos o gateway ausente esvaziando os
    // nomes → firstName null e profileId ausente (o front cai em "Colega").
    const ctx = buildApp()
    const { app } = ctx
    seedKidsAccess(ctx)
    const body = await readJson(await getLeague(app))
    expect(body.entries[0]).toMatchObject({ position: 1, isMe: true, firstName: null })
    expect(body.entries[0].profileId).toBeUndefined()
    expect(body.entries[0]).toHaveProperty('photoUrl') // avatar sempre presente (local)
  })
})
