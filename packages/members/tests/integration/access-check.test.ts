import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'
import { buildApp, grantAllCourses, grantCommunity, grantLifetime } from '../helpers'

const TOKEN = 'internal-token-16-chars!!'

test('consulta interna de comércio exige token e consumidor Funnel, e usa a conta solicitada', async () => {
  const { app, entitlements } = buildApp({ internalToken: TOKEN })
  const userId = randomUUID()
  grantLifetime(entitlements, { userId, courseRef: 'meu-curso' })
  const request = (headers: Record<string, string>) =>
    app.handle(
      new Request(`http://local/members/internal/commerce/access?userId=${userId}`, { headers }),
    )
  expect((await request({ 'x-consumer-id': 'funnel' })).status).toBe(401)
  expect(
    (await request({ 'x-internal-token': TOKEN, 'x-consumer-id': 'member-shell' })).status,
  ).toBe(403)
  const response = await request({ 'x-internal-token': TOKEN, 'x-consumer-id': 'funnel' })
  expect(response.status).toBe(200)
  expect((await response.json()).items).toHaveLength(1)
})

test('consulta comercial usa direitos ativos da conta, sem bypass de equipe e sem dados pessoais', async () => {
  const { app, entitlements } = buildApp({ internalToken: TOKEN })
  const userId = randomUUID()
  const manual = grantLifetime(entitlements, { userId, courseRef: 'curso-manual' })
  const gift = grantLifetime(entitlements, { userId, courseRef: 'curso-presente' })
  entitlements.seed(
    EntitlementAggregate.restore({ ...gift.toSnapshot(), sourceId: 'scholarship:qa' }),
  )
  grantLifetime(entitlements, {
    userId,
    courseRef: 'expirado',
    now: new Date('2025-01-01'),
    expiresAt: new Date('2025-02-01'),
  })
  grantLifetime(entitlements, { userId: randomUUID(), courseRef: 'outra-conta' })
  const response = await app.handle(
    new Request('http://local/members/commerce/access', {
      headers: {
        'x-internal-token': TOKEN,
        'x-auth-user-id': userId,
        'x-auth-user-role': 'superadmin',
        'x-auth-user-status': 'active',
      },
    }),
  )
  expect(response.status).toBe(200)
  expect((await response.json()).items).toEqual([
    {
      productId: manual.toSnapshot().productId,
      offerId: manual.toSnapshot().offerId,
      subscriptionId: null,
      expiresAt: null,
      kind: 'manual',
      accessType: 'course',
      courseRef: 'curso-manual',
    },
    {
      productId: gift.toSnapshot().productId,
      offerId: gift.toSnapshot().offerId,
      subscriptionId: null,
      expiresAt: null,
      kind: 'gift',
      accessType: 'course',
      courseRef: 'curso-presente',
    },
  ])
  expect(
    (
      await app.handle(
        new Request('http://local/members/commerce/access', {
          headers: { 'x-auth-user-id': userId },
        }),
      )
    ).status,
  ).toBe(401)
})

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://local/members/internal/access-check', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /members/internal/access-check', () => {
  test('devolve grants específicos + hasMaster', async () => {
    const { app, entitlements } = buildApp({ internalToken: TOKEN })
    const userId = randomUUID()
    grantLifetime(entitlements, { userId, courseRef: 'curso-a' })
    grantAllCourses(entitlements, { userId })

    const res = await app.handle(
      post({ userId, courseRefs: ['curso-a', 'curso-b'] }, { 'x-internal-token': TOKEN }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { grants: string[]; hasMaster: boolean }
    expect(body.grants).toEqual(['curso-a'])
    expect(body.hasMaster).toBe(true)
  })

  test('sem matrícula → grants vazio, sem master', async () => {
    const { app } = buildApp({ internalToken: TOKEN })
    const res = await app.handle(
      post({ userId: randomUUID(), courseRefs: ['curso-a'] }, { 'x-internal-token': TOKEN }),
    )
    const body = (await res.json()) as { grants: string[]; hasMaster: boolean }
    expect(body.grants).toEqual([])
    expect(body.hasMaster).toBe(false)
  })

  test('sem x-internal-token quando exigido → 401', async () => {
    const { app } = buildApp({ internalToken: TOKEN })
    const res = await app.handle(post({ userId: randomUUID(), courseRefs: [] }))
    expect(res.status).toBe(401)
  })

  test('acesso de COMUNIDADE: devolve `communities`; não vira grant de curso', async () => {
    const { app, entitlements } = buildApp({ internalToken: TOKEN })
    const userId = randomUUID()
    // A chave da comunidade COLIDE de propósito com um slug de curso pedido:
    // o entitlement `community` NÃO pode virar grant de curso (separação por accessType).
    grantCommunity(entitlements, { userId, communityKey: 'curso-a' })

    const res = await app.handle(
      post({ userId, courseRefs: ['curso-a'] }, { 'x-internal-token': TOKEN }),
    )
    const body = (await res.json()) as {
      grants: string[]
      hasMaster: boolean
      communities: string[]
    }
    expect(body.communities).toEqual(['curso-a'])
    expect(body.grants).toEqual([]) // comunidade não libera o curso homônimo
    expect(body.hasMaster).toBe(false)
  })

  test('curso e comunidade coexistem sem se misturar', async () => {
    const { app, entitlements } = buildApp({ internalToken: TOKEN })
    const userId = randomUUID()
    grantLifetime(entitlements, { userId, courseRef: 'curso-a' })
    grantCommunity(entitlements, { userId, communityKey: 'vip' })

    const res = await app.handle(
      post({ userId, courseRefs: ['curso-a', 'curso-b'] }, { 'x-internal-token': TOKEN }),
    )
    const body = (await res.json()) as { grants: string[]; communities: string[] }
    expect(body.grants).toEqual(['curso-a'])
    expect(body.communities).toEqual(['vip'])
  })
})
