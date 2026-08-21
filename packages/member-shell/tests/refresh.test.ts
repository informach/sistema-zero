import { afterAll, describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza para testar a lógica pura.
mock.module('server-only', () => ({}))

// Env mínima ANTES do import (getEnv valida no primeiro uso).
process.env.JWT_HS256_SECRET ??= 'segredo-de-teste-com-32-caracteres!'
process.env.GATEWAY_URL ??= 'http://gateway.test'

const { refreshTokens, replaceCachedAccessToken, withCurrentRefreshToken } = await import(
  '../src/server/refresh'
)

const TOKENS = {
  accessToken: 'novo-access',
  refreshToken: 'novo-refresh',
  tokenType: 'Bearer' as const,
  expiresIn: 900,
  refreshExpiresIn: 1209600,
}

const realFetch = globalThis.fetch
afterAll(() => {
  globalThis.fetch = realFetch
})

/** Instala um fetch fake e devolve o contador de chamadas. */
function installFetch(handler: () => Promise<Response>): { calls: () => number } {
  let count = 0
  globalThis.fetch = (async () => {
    count++
    return handler()
  }) as unknown as typeof fetch
  return { calls: () => count }
}

function okResponse(): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify({ tokens: TOKENS }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
}

describe('refreshTokens (single-flight)', () => {
  test('chamadas CONCORRENTES com o mesmo refresh token fazem UMA rotação', async () => {
    const fetchSpy = installFetch(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            void okResponse().then(resolve)
          }, 20)
        }),
    )
    const [a, b, c] = await Promise.all([
      refreshTokens('token-concorrente'),
      refreshTokens('token-concorrente'),
      refreshTokens('token-concorrente'),
    ])
    expect(fetchSpy.calls()).toBe(1)
    expect(a).toEqual(TOKENS)
    expect(b).toBe(a) // mesma promise → mesmo resultado p/ todos
    expect(c).toBe(a)
  })

  test('resultado fica cacheado na janela do TTL (re-apresentação não vai ao auth)', async () => {
    const fetchSpy = installFetch(okResponse)
    await refreshTokens('token-cacheado')
    const again = await refreshTokens('token-cacheado')
    expect(fetchSpy.calls()).toBe(1)
    expect(again).toEqual(TOKENS)
  })

  test('auth rejeitou (4xx) → invalid (e fica cacheado — sessão morta)', async () => {
    const fetchSpy = installFetch(() => Promise.resolve(new Response('', { status: 401 })))
    expect(await refreshTokens('token-invalido')).toBe('invalid')
    expect(await refreshTokens('token-invalido')).toBe('invalid')
    expect(fetchSpy.calls()).toBe(1)
  })

  test('gateway fora (5xx/rede) → unavailable e NÃO cacheia (próxima tentativa re-tenta)', async () => {
    const fetchSpy = installFetch(() => Promise.resolve(new Response('', { status: 503 })))
    expect(await refreshTokens('token-indisponivel')).toBe('unavailable')
    expect(await refreshTokens('token-indisponivel')).toBe('unavailable')
    expect(fetchSpy.calls()).toBe(2)
  })

  test('estado vive em globalThis (compartilhado entre os bundles de proxy/RSC/handlers)', async () => {
    installFetch(okResponse)
    await refreshTokens('token-global')
    const store = globalThis as Record<symbol, unknown>
    const map = store[Symbol.for('@sistemazero/community:refresh-inflight')]
    expect(map).toBeInstanceOf(Map)
    expect((map as Map<string, unknown>).has('token-global')).toBe(true)
  })

  test('mode/logout aguardam refresh concorrente e usam o sucessor atual', async () => {
    installFetch(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            void okResponse().then(resolve)
          }, 20)
        }),
    )

    const rotating = refreshTokens('token-em-rotacao')
    const usedBySensitiveOperation = withCurrentRefreshToken(
      'token-em-rotacao',
      async (current) => current,
    )

    await expect(rotating).resolves.toEqual(TOKENS)
    await expect(usedBySensitiveOperation).resolves.toBe(TOKENS.refreshToken)
  })

  test('mudança de modo substitui o access readonly ainda cacheado pelo single-flight', async () => {
    installFetch(okResponse)
    await refreshTokens('token-antes-do-modo')
    await replaceCachedAccessToken('token-antes-do-modo', {
      accessToken: 'access-write',
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshExpiresIn: 3600,
    })

    const cached = await refreshTokens('token-antes-do-modo')
    expect(cached).toEqual({
      ...TOKENS,
      accessToken: 'access-write',
      refreshExpiresIn: 3600,
    })
  })
})
