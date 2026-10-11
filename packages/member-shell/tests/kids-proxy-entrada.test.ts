import { afterAll, afterEach, describe, expect, mock, test } from 'bun:test'
import { NextRequest } from 'next/server'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'segredo-de-teste-com-32-caracteres!'
process.env.GATEWAY_URL ??= 'http://gateway.test'

const { createMemberProxy } = await import('../src/server/proxy')
const { kidsMayUseBff } = await import('../src/lib/kids-bff-policy')
const { safeStudyDestination } = await import('../src/lib/study-access')

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})
afterAll(() => {
  globalThis.fetch = realFetch
})

const proxy = createMemberProxy({
  kidsAccess: true,
  cookies: { accessCookie: 'kids_access', refreshCookie: 'kids_refresh' },
  protectedPrefixes: ['/cursos', '/pais', '/responsavel'],
  isRootProtected: true,
})
const deviceToken = 'a'.repeat(43)

function jwt(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'none', typ: 'JWT' })}.${part(payload)}.assinatura`
}
const access = (claims: Record<string, unknown>) =>
  jwt({ sub: crypto.randomUUID(), exp: Math.floor(Date.now() / 1000) + 900, ...claims })
const location = (response: Response) => {
  const url = new URL(response.headers.get('location') ?? 'http://sem-destino')
  return `${url.pathname}${url.search}`
}
function recognizes(profiles: unknown[], status = 200) {
  const calls: string[] = []
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL) => {
      calls.push(new URL(input instanceof Request ? input.url : String(input)).pathname)
      return Response.json({ profiles }, { status })
    }),
    { preconnect: realFetch.preconnect },
  )
  return calls
}

describe('entrada do Kids pelo proxy', () => {
  test('raiz sem sessão vai para a escolha; navegador de aluno com acesso vivo vai para o aluno', async () => {
    const none = recognizes([])
    expect(location(await proxy(new NextRequest('http://localhost/')))).toBe('/login')
    // Sem cookie do aparelho nem pergunta ao Auth.
    expect(none).toEqual([])
    const withDevice = () =>
      new NextRequest('http://localhost/', { headers: { cookie: `kids_device=${deviceToken}` } })
    const unknown = recognizes([])
    expect(location(await proxy(withDevice()))).toBe('/login')
    expect(unknown).toEqual(['/auth/kids/device'])
    recognizes([{ id: crypto.randomUUID(), name: 'Ana', available: true }])
    expect(location(await proxy(withDevice()))).toBe('/login/aluno')
    recognizes([], 503)
    expect(location(await proxy(withDevice()))).toBe('/login')
  })

  test('sessão antiga sem contexto Kids (inclusive de pais) vai para a escolha, com o destino', async () => {
    const legacy = access({ email: 'pai@example.com' })
    for (const path of ['/cursos/aventura?parte=2', '/pais/acessos']) {
      const response = await proxy(
        new NextRequest(`http://localhost${path}`, {
          headers: { cookie: `kids_access=${legacy}; kids_refresh=r` },
        }),
      )
      const target = new URL(response.headers.get('location') ?? '')
      expect(target.pathname).toBe('/login')
      expect(target.searchParams.get('next')).toBe(path)
    }
  })

  test('área dos pais preserva o next: sem sessão e com sessão de aluno', async () => {
    const none = await proxy(new NextRequest('http://localhost/pais/andre/acessos?aba=1'))
    expect(location(none)).toBe(
      `/login/responsavel?next=${encodeURIComponent('/pais/andre/acessos?aba=1')}`,
    )
    const student = access({
      kids: {
        kind: 'student',
        sessionId: crypto.randomUUID(),
        deviceId: crypto.randomUUID(),
        grantId: crypto.randomUUID(),
      },
      pfl: { accountId: crypto.randomUUID() },
    })
    const fromChild = await proxy(
      new NextRequest('http://localhost/pais/andre', {
        headers: { cookie: `kids_access=${student}; kids_refresh=r` },
      }),
    )
    expect(new URL(fromChild.headers.get('location') ?? '').pathname).toBe('/login/responsavel')
    expect(new URL(fromChild.headers.get('location') ?? '').searchParams.get('next')).toBe(
      '/pais/andre',
    )
  })

  test('beacon de erro do cliente passa para os dois públicos sem a prova da sessão', async () => {
    const parent = access({
      kids: { kind: 'parent', sessionId: crypto.randomUUID(), authenticatedAt: 1_800_000_000 },
    })
    const beacon = (origin: string) =>
      proxy(
        new NextRequest('http://localhost/api/client-error', {
          method: 'POST',
          headers: {
            cookie: `kids_access=${parent}; kids_refresh=r`,
            origin,
            host: 'localhost',
          },
        }),
      )
    expect((await beacon('http://localhost')).status).toBe(200)
    // A mesma origem continua obrigatória.
    expect((await beacon('https://outro-site.example')).status).toBe(403)
  })
})

describe('regras puras do BFF Kids', () => {
  const parent = { kind: 'parent', sessionId: 's', authenticatedAt: 1 } as const
  const child = { kind: 'student', sessionId: 's', deviceId: 'd', grantId: 'g' } as const

  test('beacon de erro vale para os dois; caminho torto não muda de área', () => {
    expect(kidsMayUseBff(parent, '/api/client-error', 'POST', 'pai')).toBe(true)
    expect(kidsMayUseBff(child, '/api/client-error', 'POST', 'ana')).toBe(true)
    for (const path of ['/api//parents/children-stats', '/api/%70arents/x', '/api/x/../parents'])
      expect(kidsMayUseBff(child, path, 'GET', 'ana')).toBe(false)
    expect(kidsMayUseBff(parent, '/api//pensa/ai/chat', 'POST', 'pai')).toBe(false)
  })

  test('destino do aluno é resolvido antes de conferir', () => {
    expect(safeStudyDestination('/cursos/aventura/aulas/1?parte=2#x')).toBe(
      '/cursos/aventura/aulas/1?parte=2#x',
    )
    for (const value of [
      '/cursos/../pais',
      '/cursos/%2e%2e/pais',
      '/cursos/..%2fpais',
      '//outro-site.example/cursos',
      '/\\outro-site.example/cursos',
      'https://outro-site.example/cursos',
      '/pais',
      '/api/cursos',
      '/cursos\n/x',
      null,
    ])
      expect(safeStudyDestination(value)).toBe('/')
  })
})
