import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantAllCourses, grantCommunity, grantLifetime } from '../helpers'

const TOKEN = 'internal-token-16-chars!!'

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
