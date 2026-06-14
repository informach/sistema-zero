import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantAllCourses, grantLifetime } from '../helpers'

const TOKEN = 'internal-token-16-chars!!'

function post(
  app: ReturnType<typeof buildApp>['app'],
  body: unknown,
  headers: Record<string, string> = {},
): Request {
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
      post(app, { userId, courseRefs: ['curso-a', 'curso-b'] }, { 'x-internal-token': TOKEN }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { grants: string[]; hasMaster: boolean }
    expect(body.grants).toEqual(['curso-a'])
    expect(body.hasMaster).toBe(true)
  })

  test('sem matrícula → grants vazio, sem master', async () => {
    const { app } = buildApp({ internalToken: TOKEN })
    const res = await app.handle(
      post(app, { userId: randomUUID(), courseRefs: ['curso-a'] }, { 'x-internal-token': TOKEN }),
    )
    const body = (await res.json()) as { grants: string[]; hasMaster: boolean }
    expect(body.grants).toEqual([])
    expect(body.hasMaster).toBe(false)
  })

  test('sem x-internal-token quando exigido → 401', async () => {
    const { app } = buildApp({ internalToken: TOKEN })
    const res = await app.handle(post(app, { userId: randomUUID(), courseRefs: [] }))
    expect(res.status).toBe(401)
  })
})
