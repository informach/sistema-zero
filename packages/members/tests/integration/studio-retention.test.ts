import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { XP_VALUES } from '../../src/domain/gamification/gamification'
import { ESTUDIO_ACCESS_REF } from '../../src/domain/gamification/missions'
import { buildApp, grantCommunity, signedWebhookHeaders } from '../helpers'

const USER = '22222222-2222-2222-2222-222222222222'
const OTHER_AUTHOR = '33333333-3333-3333-3333-333333333333'
const authHeaders = { 'x-auth-user-id': USER, 'content-type': 'application/json' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const postStandalone = (app: App, body: object, deliveryId: string = randomUUID()) => {
  const raw = JSON.stringify(body)
  return app.handle(
    new Request('http://localhost/members/webhooks/showcase-standalone', {
      method: 'POST',
      headers: signedWebhookHeaders('/members/webhooks/showcase-standalone', raw, deliveryId),
      body: raw,
    }),
  )
}

const postPlaysMilestone = (app: App, body: object, deliveryId: string = randomUUID()) => {
  const raw = JSON.stringify(body)
  return app.handle(
    new Request('http://localhost/members/webhooks/plays-milestone', {
      method: 'POST',
      headers: signedWebhookHeaders('/members/webhooks/plays-milestone', raw, deliveryId),
      body: raw,
    }),
  )
}

const postRemix = (app: App, playId: string, headers: Record<string, string> = authHeaders) =>
  app.handle(
    new Request('http://localhost/members/gamification/remix?audience=kids', {
      method: 'POST',
      headers,
      body: JSON.stringify({ playId }),
    }),
  )

const getMe = (app: App) =>
  app.handle(
    new Request('http://localhost/members/gamification/me?audience=kids', {
      headers: authHeaders,
    }),
  )

const getMissions = (app: App) =>
  app.handle(
    new Request('http://localhost/members/gamification/missions/me?audience=kids', {
      headers: authHeaders,
    }),
  )

describe('publicar standalone no Mural — webhook /showcase-standalone', () => {
  test('grava o marco + XP diário (streak vivo); republicar no MESMO dia não dobra XP', async () => {
    const { app, gamification } = buildApp()

    const res = await postStandalone(app, {
      userId: USER,
      accountId: USER,
      audience: 'kids',
      playId: randomUUID(),
    })
    expect(res.status).toBe(200)

    let me = await readJson(await getMe(app))
    expect(me.xp).toBe(XP_VALUES.STUDIO_PUBLISH_DAY)
    expect(me.streak.current).toBe(1)

    // Republicar no MESMO dia (playId novo → marco novo, mas o XP diário dedupa
    // pelo sourceId determinístico do dia — spam de republicação não infla XP).
    const res2 = await postStandalone(app, {
      userId: USER,
      accountId: USER,
      audience: 'kids',
      playId: randomUUID(),
    })
    expect(res2.status).toBe(200)

    me = await readJson(await getMe(app))
    expect(me.xp).toBe(XP_VALUES.STUDIO_PUBLISH_DAY)

    const marcos = gamification.events.filter(
      (e: { sourceType: string }) => e.sourceType === 'studio_published',
    )
    expect(marcos.length).toBe(2)
  })
})

describe('marcos de plays recebidos — webhook /plays-milestone', () => {
  test('10 jogadas → badge plays-10; 100 → plays-100; idempotente por playId', async () => {
    const { app } = buildApp()
    const playId = randomUUID()

    expect(
      (
        await postPlaysMilestone(app, {
          userId: USER,
          accountId: USER,
          audience: 'kids',
          playId,
          milestone: 10,
        })
      ).status,
    ).toBe(200)

    let me = await readJson(await getMe(app))
    expect(
      me.badges.find((b: { slug: string }) => b.slug === 'plays-10')?.unlockedAt,
    ).not.toBeNull()
    expect(me.badges.find((b: { slug: string }) => b.slug === 'plays-100')?.unlockedAt).toBeNull()
    // Marco não move XP/streak (amount 0).
    expect(me.xp).toBe(0)

    expect(
      (
        await postPlaysMilestone(app, {
          userId: USER,
          accountId: USER,
          audience: 'kids',
          playId,
          milestone: 100,
        })
      ).status,
    ).toBe(200)

    me = await readJson(await getMe(app))
    expect(
      me.badges.find((b: { slug: string }) => b.slug === 'plays-100')?.unlockedAt,
    ).not.toBeNull()
  })
})

describe('missões gated por estudio-completo', () => {
  test('com posse: semanal E mensal têm ≥1 missão do estúdio; publicar/remixar andam o progresso', async () => {
    const { app, entitlements, hubPlays, gamification } = buildApp()
    grantCommunity(entitlements, { userId: USER, communityKey: ESTUDIO_ACCESS_REF })

    // Anda as duas fontes: publica standalone (webhook) + remixa um jogo de colega.
    await postStandalone(app, {
      userId: USER,
      accountId: USER,
      audience: 'kids',
      playId: randomUUID(),
    })
    const originalPlay = randomUUID()
    hubPlays.set(originalPlay, { visible: true, authorId: OTHER_AUTHOR })
    const remixRes = await postRemix(app, originalPlay)
    expect(remixRes.status).toBe(200)
    expect(await readJson(remixRes)).toEqual({ recorded: true })

    const missions = await readJson(await getMissions(app))
    const weeklyStudio = missions.weekly.filter((m: { goalType: string }) =>
      ['studio_published', 'studio_remix'].includes(m.goalType),
    )
    const monthlyStudio = missions.monthly.filter((m: { goalType: string }) =>
      ['studio_published', 'studio_remix'].includes(m.goalType),
    )
    // Garantia do sorteio 2 fases: sempre 1 vaga do estúdio p/ quem tem o produto.
    expect(weeklyStudio.length).toBeGreaterThanOrEqual(1)
    expect(monthlyStudio.length).toBeGreaterThanOrEqual(1)
    // O progresso deriva do ledger — as duas fontes têm 1 evento cada.
    for (const m of [...weeklyStudio, ...monthlyStudio]) {
      expect(m.progress).toBeGreaterThanOrEqual(1)
    }

    // Re-remixar o MESMO jogo é inerte (sourceId = playId do original).
    await postRemix(app, originalPlay)
    const remixEvents = gamification.events.filter(
      (e: { sourceType: string }) => e.sourceType === 'studio_remix',
    )
    expect(remixEvents.length).toBe(1)
  })

  test('sem posse: nenhuma missão do estúdio no set (não vaza produto)', async () => {
    const { app } = buildApp()
    const missions = await readJson(await getMissions(app))
    const all = [...missions.daily, ...missions.weekly, ...missions.monthly]
    expect(
      all.some((m: { goalType: string }) =>
        ['studio_published', 'studio_remix'].includes(m.goalType),
      ),
    ).toBe(false)
  })
})

describe('POST /members/gamification/remix — guards anti-farm', () => {
  test('sem posse do Estúdio → 403 ACCESS_DENIED', async () => {
    const { app, hubPlays } = buildApp()
    const playId = randomUUID()
    hubPlays.set(playId, { visible: true, authorId: OTHER_AUTHOR })
    const res = await postRemix(app, playId)
    expect(res.status).toBe(403)
  })

  test('playId desconhecido no hub (indisponível) → 503 sem gravar marco', async () => {
    const { app, entitlements, gamification } = buildApp()
    grantCommunity(entitlements, { userId: USER, communityKey: ESTUDIO_ACCESS_REF })
    const res = await postRemix(app, randomUUID())
    expect(res.status).toBe(503)
    expect(await readJson(res)).toEqual({ recorded: false, reason: 'HUB_UNAVAILABLE' })
    expect(
      gamification.events.some((e: { sourceType: string }) => e.sourceType === 'studio_remix'),
    ).toBe(false)
  })

  test('post oculto/inexistente (visible=false) → 404 PLAY_NOT_FOUND', async () => {
    const { app, entitlements, hubPlays } = buildApp()
    grantCommunity(entitlements, { userId: USER, communityKey: ESTUDIO_ACCESS_REF })
    const playId = randomUUID()
    hubPlays.set(playId, { visible: false, authorId: null })
    const res = await postRemix(app, playId)
    expect(res.status).toBe(404)
  })

  test('remixar o PRÓPRIO jogo → 200 inerte (SELF_REMIX, sem marco)', async () => {
    const { app, entitlements, hubPlays, gamification } = buildApp()
    grantCommunity(entitlements, { userId: USER, communityKey: ESTUDIO_ACCESS_REF })
    const playId = randomUUID()
    hubPlays.set(playId, { visible: true, authorId: USER })
    const res = await postRemix(app, playId)
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({ recorded: false, reason: 'SELF_REMIX' })
    expect(
      gamification.events.some((e: { sourceType: string }) => e.sourceType === 'studio_remix'),
    ).toBe(false)
  })

  test('equipe (privileged) pula o gate de posse', async () => {
    const { app, hubPlays } = buildApp()
    const playId = randomUUID()
    hubPlays.set(playId, { visible: true, authorId: OTHER_AUTHOR })
    const res = await postRemix(app, playId, {
      ...authHeaders,
      'x-auth-user-role': 'admin',
      'x-auth-user-status': 'active',
    })
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({ recorded: true })
  })
})
