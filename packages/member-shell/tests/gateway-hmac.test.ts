import { afterAll, describe, expect, mock, test } from 'bun:test'
import { awaitWithSignal } from '@sistemazero/core/http'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'

mock.module('server-only', () => ({}))

const { createGatewayModule } = await import('../src/server/gateway')

const realFetch = globalThis.fetch
afterAll(() => {
  globalThis.fetch = realFetch
})

describe('gatewayFetchHmac', () => {
  test('propagates caller withdrawal to the signed transport', async () => {
    const entered = Promise.withResolvers<AbortSignal>()
    globalThis.fetch = Object.assign(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const signal = init?.signal
        if (!signal) throw new Error('Missing transport lifetime')
        entered.resolve(signal)
        return awaitWithSignal(() => new Promise<Response>(() => {}), signal)
      },
      { preconnect: realFetch.preconnect },
    )
    const gateway = createGatewayModule({} as never)
    const controller = new AbortController()
    const pending = gateway.gatewayFetchHmac('/members/internal/test', {
      method: 'POST',
      signal: controller.signal,
    })
    const forwarded = await entered.promise
    controller.abort()
    expect((await pending).status).toBe(503)
    expect(forwarded.aborted).toBe(true)
  })
  test('assina método, path e corpo exato como o consumer member-shell', async () => {
    let captured: { url: string; init: RequestInit } | null = null
    globalThis.fetch = (async (input, init) => {
      captured = { url: String(input), init: init ?? {} }
      return Response.json({ ok: true })
    }) as typeof fetch
    const gateway = createGatewayModule({} as never)
    const body = {
      actor: {
        userId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010',
        accountId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e011',
        privileged: false,
      },
      projectId: 'projeto-1',
      clientMessageId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e001',
      question: 'Como faço o pulo?',
    }

    const result = await gateway.gatewayFetchHmac('/members/internal/zappy/questions', {
      method: 'POST',
      body,
    })

    expect(result).toEqual({ status: 200, body: { ok: true } })
    const request = captured as { url: string; init: RequestInit } | null
    expect(request?.url).toBe('http://gateway.test/members/internal/zappy/questions')
    const headers = new Headers(request?.init.headers)
    const rawBody = String(request?.init.body)
    expect(headers.get('x-consumer-id')).toBe('member-shell')
    expect(headers.get('authorization')).toBeNull()
    expect(
      verifyHmacSignature({
        secret: 'member-shell-test-secret-32-characters',
        body: canonicalHmacMessage({
          method: 'POST',
          path: '/members/internal/zappy/questions',
          body: rawBody,
        }),
        signatureHeader: headers.get('x-signature') ?? undefined,
        nowSeconds: Math.floor(Date.now() / 1000),
        toleranceSeconds: 5,
      }).valid,
    ).toBe(true)
  })
})

describe('gatewayFetchDual', () => {
  test('keeps the student JWT and signs the same immutable publisher body after token refresh', async () => {
    const body = {
      publisher: {
        authorId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010',
        accountId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e011',
        audience: 'adult',
      },
      title: 'Jogo Turtle',
    }
    const requests: Array<{ url: string; headers: Headers; body: string }> = []
    globalThis.fetch = (async (input, init) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      const rawBody = String(init?.body)
      requests.push({ url, headers, body: rawBody })
      if (url.endsWith('/auth/refresh'))
        return Response.json({
          tokens: {
            accessToken: 'student-renewed',
            refreshToken: 'dual-refresh-successor',
            tokenType: 'Bearer',
            expiresIn: 900,
            refreshExpiresIn: 3600,
          },
        })
      if (headers.get('authorization') === 'Bearer student-original') {
        body.title = 'Mutated by a different request'
        return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
      }
      return Response.json({ id: 'published' }, { status: 201 })
    }) as typeof fetch
    const gateway = createGatewayModule({
      audience: 'adult',
      getAccessToken: async () => 'student-original',
      getRefreshToken: async () => 'dual-refresh-original',
      verifyAccessTokenLocally: async () => ({ ok: true, user: {} }),
      setSessionCookies: async () => {},
    } as never)

    expect(
      await gateway.gatewayFetchDual('/hub/internal/showcase-thread-studio-standalone', {
        method: 'POST',
        body,
      }),
    ).toEqual({ status: 201, body: { id: 'published' } })

    const studioRequests = requests.filter((request) => request.url.includes('/hub/internal/'))
    expect(studioRequests).toHaveLength(2)
    expect(studioRequests.map((request) => request.headers.get('authorization'))).toEqual([
      'Bearer student-original',
      'Bearer student-renewed',
    ])
    expect(studioRequests[0]?.body).toBe(studioRequests[1]?.body)
    expect(JSON.parse(studioRequests[1]?.body ?? '{}').title).toBe('Jogo Turtle')
    for (const request of studioRequests) {
      expect(request.headers.get('x-consumer-id')).toBe('member-shell')
      expect(
        verifyHmacSignature({
          secret: 'member-shell-test-secret-32-characters',
          body: canonicalHmacMessage({
            method: 'POST',
            path: '/hub/internal/showcase-thread-studio-standalone',
            body: request.body,
          }),
          signatureHeader: request.headers.get('x-signature') ?? undefined,
          nowSeconds: Math.floor(Date.now() / 1000),
          toleranceSeconds: 5,
        }).valid,
      ).toBe(true)
    }
  })
})
