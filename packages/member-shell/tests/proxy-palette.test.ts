import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { NextRequest } from 'next/server'

// `server-only` lança fora do React Server — neutraliza para exercitar o proxy real.
mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'segredo-de-teste-com-32-caracteres!'
process.env.GATEWAY_URL ??= 'http://gateway.test'

const { createMemberProxy } = await import('../src/server/proxy')

const realFetch = globalThis.fetch

afterAll(() => {
  globalThis.fetch = realFetch
})

function jwt(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'none', typ: 'JWT' })}.${part(payload)}.assinatura`
}

describe('proxy: renovação de sessão e hidratação da paleta', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const accessCookie = 'sz_kids_access'
  const refreshCookie = 'sz_kids_refresh'
  const paletteCookie = 'sz_kids_palette'
  const oldRefresh = `refresh-antigo-${crypto.randomUUID()}`
  const newRefresh = `refresh-novo-${crypto.randomUUID()}`
  const newAccess = jwt({ sub: userId, exp: Math.floor(Date.now() / 1000) + 900 })

  beforeEach(() => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input)
      if (url.pathname === '/auth/refresh') {
        return new Response(
          JSON.stringify({
            tokens: {
              accessToken: newAccess,
              refreshToken: newRefresh,
              tokenType: 'Bearer',
              expiresIn: 900,
              refreshExpiresIn: 1209600,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      if (url.pathname === '/members/preferences') {
        return new Response(JSON.stringify({ palette: 'pink' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response('', { status: 404 })
    }) as unknown as typeof fetch
  })

  test('preserva sessão renovada e paleta mesmo quando o gate redireciona para perfis', async () => {
    const expiredAccess = jwt({ sub: userId, exp: 0 })
    const req = new NextRequest('http://localhost:3008/', {
      headers: {
        cookie: `${accessCookie}=${expiredAccess}; ${refreshCookie}=${oldRefresh}`,
      },
    })
    const proxy = createMemberProxy({
      cookies: { accessCookie, refreshCookie },
      paletteCookie,
      protectedPrefixes: ['/cursos'],
      isRootProtected: true,
      requireProfileSelectPath: '/perfis',
    })

    const response = await proxy(req)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3008/perfis')
    expect(response.cookies.get(accessCookie)?.value).toBe(newAccess)
    expect(response.cookies.get(refreshCookie)?.value).toBe(newRefresh)
    expect(response.cookies.get(paletteCookie)?.value).toBe(`${userId}.pink`)
  })
})
