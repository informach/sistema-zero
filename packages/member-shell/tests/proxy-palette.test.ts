import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { NextRequest } from 'next/server'

// `server-only` lança fora do React Server — neutraliza para exercitar o proxy real.
mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'segredo-de-teste-com-32-caracteres!'
process.env.GATEWAY_URL ??= 'http://gateway.test'

const { createMemberProxy } = await import('../src/server/proxy')

const realFetch = globalThis.fetch

test('novo acesso conserva o destino infantil e separa o login dos pais', async () => {
  const proxy = createMemberProxy({
    kidsAccess: true,
    cookies: { accessCookie: 'kids_access', refreshCookie: 'kids_refresh' },
    protectedPrefixes: ['/cursos', '/pais', '/responsavel'],
    isRootProtected: true,
  })
  const student = await proxy(
    new NextRequest('http://localhost/cursos/aventura/aulas/fase?parte=2'),
  )
  const target = new URL(student.headers.get('location') ?? '')
  expect(target.pathname).toBe('/login/aluno')
  expect(target.searchParams.get('next')).toBe('/cursos/aventura/aulas/fase?parte=2')
  const parent = await proxy(new NextRequest('http://localhost/responsavel'))
  expect(new URL(parent.headers.get('location') ?? '').pathname).toBe('/login/responsavel')
})

afterAll(() => {
  globalThis.fetch = realFetch
})

function jwt(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'none', typ: 'JWT' })}.${part(payload)}.assinatura`
}

test('remover o refresh não libera APIs infantis para uma sessão adulta', async () => {
  const parentSessionId = crypto.randomUUID()
  const proxy = createMemberProxy({
    kidsAccess: true,
    cookies: { accessCookie: 'kids_access', refreshCookie: 'kids_refresh' },
    protectedPrefixes: [],
    isRootProtected: true,
  })
  const access = jwt({
    sub: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 900,
    kids: {
      kind: 'parent',
      sessionId: parentSessionId,
      authenticatedAt: Math.floor(Date.now() / 1000),
    },
  })
  const response = await proxy(
    new NextRequest('http://localhost/api/zappy/chat', {
      method: 'POST',
      headers: {
        cookie: `kids_access=${access}`,
        origin: 'http://localhost',
        host: 'localhost',
        'x-sz-session': parentSessionId,
      },
    }),
  )
  expect(response.status).toBe(403)
})

test('aba antiga não usa operações S2S com a identidade de outro perfil', async () => {
  const sessionId = crypto.randomUUID()
  const access = jwt({
    sub: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 900,
    kids: {
      kind: 'student',
      sessionId,
      deviceId: crypto.randomUUID(),
      grantId: crypto.randomUUID(),
    },
  })
  const proxy = createMemberProxy({
    kidsAccess: true,
    cookies: { accessCookie: 'kids_access', refreshCookie: 'kids_refresh' },
    protectedPrefixes: [],
    isRootProtected: true,
  })
  const request = (proof?: string) =>
    new NextRequest('http://localhost/api/studio/zappy/ask', {
      method: 'POST',
      headers: {
        cookie: `kids_access=${access}`,
        origin: 'http://localhost',
        host: 'localhost',
        ...(proof ? { 'x-sz-session': proof } : {}),
      },
    })
  expect((await proxy(request(crypto.randomUUID()))).status).toBe(409)
  expect((await proxy(request())).status).toBe(409)
  expect((await proxy(request(sessionId))).status).toBe(200)
})

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

  /**
   * ⚠️ O espelho da cor é do DONO da sessão. Sessão morta sem apagá-lo deixava a tela de login de
   * um aparelho de família vestida com a cor de quem acabou de ser desligado.
   */
  test('sessão recusada apaga o espelho da cor junto com os cookies de sessão', async () => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input)
      if (url.pathname === '/auth/refresh') return new Response('', { status: 401 })
      return new Response('', { status: 404 })
    }) as unknown as typeof fetch

    // ⚠️ Refresh PRÓPRIO: o single-flight do `refreshTokens` guarda o resultado por token, e
    // reusar o do teste acima entregaria a rotação bem-sucedida dele.
    const refreshMorto = `refresh-morto-${crypto.randomUUID()}`
    const req = new NextRequest('http://localhost:3008/', {
      headers: {
        cookie: `${accessCookie}=${jwt({ sub: userId, exp: 0 })}; ${refreshCookie}=${refreshMorto}; ${paletteCookie}=${userId}.pink`,
      },
    })
    const proxy = createMemberProxy({
      cookies: { accessCookie, refreshCookie },
      paletteCookie,
      protectedPrefixes: ['/cursos'],
      isRootProtected: true,
    })

    const response = await proxy(req)

    expect(response.status).toBe(307)
    for (const nome of [accessCookie, refreshCookie, paletteCookie]) {
      expect({ nome, valor: response.cookies.get(nome)?.value }).toEqual({ nome, valor: '' })
      expect({ nome, maxAge: response.cookies.get(nome)?.maxAge }).toEqual({ nome, maxAge: 0 })
    }
  })
})
