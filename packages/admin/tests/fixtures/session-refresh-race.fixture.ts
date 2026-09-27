import { afterAll, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
mock.module('next/headers', () => ({ headers: async () => new Headers() }))
mock.module('@/lib/env', () => ({ getEnv: () => ({ GATEWAY_URL: 'https://gateway.test' }) }))

const cookieWrites: string[] = []
let cookieClears = 0

mock.module('@/server/session', () => ({
  getAccessToken: async () => null,
  getRefreshToken: async () => 'refresh-original',
  setSessionCookies: async (tokens: { refreshToken: string }) => {
    cookieWrites.push(tokens.refreshToken)
  },
  clearSessionCookies: async () => {
    cookieClears++
  },
}))

const originalFetch = globalThis.fetch
let refreshRequests = 0
globalThis.fetch = Object.assign(
  async (input: Parameters<typeof fetch>[0]) => {
    expect(new URL(String(input)).pathname).toBe('/auth/refresh')
    refreshRequests++
    if (refreshRequests > 1) {
      return Response.json({ error: { code: 'INVALID_REFRESH_TOKEN' } }, { status: 401 })
    }
    return Response.json({
      tokens: {
        accessToken: 'access-renewed',
        refreshToken: 'refresh-renewed',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshExpiresIn: 2_592_000,
      },
    })
  },
  { preconnect: originalFetch.preconnect },
)

afterAll(() => {
  globalThis.fetch = originalFetch
})

const { tryRefresh } = await import('../../src/server/gateway')

test('requisição atrasada com cookie antigo compartilha a renovação e recebe os cookies novos', async () => {
  expect(await tryRefresh()).toBe('access-renewed')

  // A segunda requisição já saiu do navegador com o cookie antigo, mas só
  // chegou ao refresh depois de a primeira rotação terminar.
  expect(await tryRefresh()).toBe('access-renewed')
  expect(refreshRequests).toBe(1)
  expect(cookieWrites).toEqual(['refresh-renewed', 'refresh-renewed'])
  expect(cookieClears).toBe(0)
})
