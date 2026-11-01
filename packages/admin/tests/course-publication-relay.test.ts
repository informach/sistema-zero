import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { relayCoursePublication } from '../src/server/course-publication-relay'

const token = 'publication-relay-test-credential-123456789'
const config = {
  membersUrl: 'http://members.internal:3004',
  environment: 'production',
  peerToken: token,
}
test('a ponte não abre uma porta genérica ao Members nem aceita a sessão do navegador', async () => {
  let forwarded = 0
  const fetcher = async () => {
    forwarded++
    return Response.json({})
  }
  const request = (path: string, headers = {}) =>
    new Request(`https://admin.example/api/internal/course-publication/peer/${path}`, {
      headers: { 'x-course-promotion-token': token, ...headers },
    })
  expect(
    (
      await relayCoursePublication(
        request('capabilities', { 'x-course-promotion-token': '', cookie: 'admin=true' }),
        'peer',
        ['capabilities'],
        config,
        fetcher,
      )
    ).status,
  ).toBe(401)
  expect(
    (await relayCoursePublication(request('users'), 'peer', ['users'], config, fetcher)).status,
  ).toBe(400)
  expect(
    (
      await relayCoursePublication(
        request('jobs/../users'),
        'peer',
        ['jobs', '../users'],
        config,
        fetcher,
      )
    ).status,
  ).toBe(400)
  expect(
    (
      await relayCoursePublication(
        request('capabilities'),
        'peer',
        ['capabilities'],
        { ...config, environment: 'staging' },
        fetcher,
      )
    ).status,
  ).toBe(503)
  expect(forwarded).toBe(0)
})
test('o destino e os únicos headers encaminhados vêm da configuração', async () => {
  const id = randomUUID()
  const response = await relayCoursePublication(
    new Request(`https://admin.example/api/internal/course-publication/peer/bindings/${id}`, {
      headers: {
        'x-course-promotion-token': token,
        cookie: 'private-session',
        'x-auth-user-role': 'superadmin',
      },
    }),
    'peer',
    ['bindings', id],
    config,
    async (input, init) => {
      expect(String(input)).toBe(
        `http://members.internal:3004/members/internal/course-promotions/bindings/${id}`,
      )
      expect(new Headers(init?.headers).get('cookie')).toBeNull()
      expect(new Headers(init?.headers).get('x-auth-user-role')).toBeNull()
      expect(new Headers(init?.headers).get('x-course-promotion-token')).toBe(token)
      expect(init?.redirect).toBe('error')
      return Response.json({ environment: 'production', result: { id } })
    },
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
})
test('a fonte só permite um GET por trabalho e usa outro token', async () => {
  const id = randomUUID()
  const request = new Request(
    `https://admin.example/api/internal/course-publication/source/${id}`,
    { headers: { 'x-course-source-token': token } },
  )
  const response = await relayCoursePublication(
    request,
    'source',
    [id],
    { membersUrl: config.membersUrl, environment: 'staging', sourceToken: token },
    async (input, init) => {
      expect(String(input)).toBe(
        `http://members.internal:3004/members/internal/course-promotion-sources/${id}`,
      )
      expect(new Headers(init?.headers).get('x-course-promotion-token')).toBeNull()
      return Response.json({ environment: 'staging', result: {} })
    },
  )
  expect(response.status).toBe(200)
  expect((await relayCoursePublication(request, 'peer', ['bindings', id], config)).status).toBe(401)
})
