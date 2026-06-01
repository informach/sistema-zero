import { describe, expect, test } from 'bun:test'
import { signHmac } from '@sistemazero/core/security'
import { type Application, createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import type { GatewayConfigInput } from '../../src/infrastructure/config/gateway-config.schema'
import { fakeForwarder } from '../helpers'

const env = (overrides: Record<string, string> = {}) =>
  loadEnv({ TRUST_PROXY: 'true', TRUSTED_PROXY_HOPS: '1', ...overrides })

/** Requisição com IP de cliente via X-Forwarded-For (TRUST_PROXY=true). */
function req(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers)
  if (!headers.has('x-forwarded-for')) headers.set('x-forwarded-for', '203.0.113.7')
  return new Request(`http://gw.local${path}`, { ...init, headers })
}

const baseConfig: GatewayConfigInput = {
  cors: { origins: ['https://app.example.com'] },
  services: {
    echo: {
      name: 'echo',
      upstreamGroups: { default: [{ url: 'http://up-a', id: 'a' }] },
      loadBalancer: 'round-robin',
      retry: { maxRetries: 0 },
    },
  },
  routes: [
    { id: 'echo-get', methods: ['GET'], pathPattern: '/echo/:id', service: 'echo', auth: 'public' },
    {
      id: 'echo-post',
      methods: ['POST'],
      pathPattern: '/echo',
      service: 'echo',
      auth: 'public',
      rateLimit: { max: 2, windowMs: 60_000, by: 'ip' },
    },
  ],
}

async function buildApp(
  config: GatewayConfigInput,
  forward = (() => new Response('ok')) as Parameters<typeof fakeForwarder>[0],
  envOverrides: Record<string, string> = {},
): Promise<Application> {
  return createApplication(env(envOverrides), {
    rawConfig: config,
    forwarder: fakeForwarder(forward),
  })
}

describe('gateway (integração via app.handle)', () => {
  test('GET /health (liveness) e /readyz (readiness)', async () => {
    const app = await buildApp(baseConfig)
    const health = await app.handle(new Request('http://gw.local/health'))
    expect(health.status).toBe(200)
    expect(((await health.json()) as { service: string }).service).toBe('api-gateway')

    const ready = await app.handle(new Request('http://gw.local/readyz'))
    expect(ready.status).toBe(200)

    // Graceful drain: após stop(), /readyz vira 503 (LB para de rotear).
    await app.stop()
    const draining = await app.handle(new Request('http://gw.local/readyz'))
    expect(draining.status).toBe(503)
    expect(((await draining.json()) as { status: string }).status).toBe('draining')
  })

  test('proxy GET: encaminha o caminho e propaga X-Request-Id', async () => {
    let seenPath = ''
    const app = await buildApp(baseConfig, (r) => {
      seenPath = r.path
      return new Response(JSON.stringify({ id: r.path }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    const res = await app.handle(req('/echo/123?q=1'))
    expect(res.status).toBe(200)
    expect(seenPath).toBe('/echo/123?q=1')
    expect(res.headers.get('x-request-id')).toBeTruthy()
    expect(res.headers.get('ratelimit-limit')).toBeTruthy()
  })

  test('rota inexistente → 404', async () => {
    const app = await buildApp(baseConfig)
    expect((await app.handle(req('/nope'))).status).toBe(404)
  })

  test('rate limit: 3ª no mesmo IP → 429 + Retry-After + headers RateLimit-*', async () => {
    const app = await buildApp(baseConfig)
    const post = () =>
      app.handle(
        req('/echo', {
          method: 'POST',
          body: '{}',
          headers: { 'content-type': 'application/json' },
        }),
      )

    const first = await post()
    expect(first.status).toBe(200)
    expect(first.headers.get('ratelimit-limit')).toBe('2')
    expect(first.headers.get('ratelimit-remaining')).toBe('1')
    expect(first.headers.get('ratelimit-reset')).toBeTruthy()

    expect((await post()).status).toBe(200)

    const third = await post()
    expect(third.status).toBe(429)
    expect(third.headers.get('retry-after')).toBeTruthy()
    // O 429 também carrega os headers RateLimit-* (ctx.rateLimit setado antes do deny).
    expect(third.headers.get('ratelimit-limit')).toBe('2')
    expect(third.headers.get('ratelimit-remaining')).toBe('0')
  })

  test('safety-net global por IP: muitas requisições anônimas → 429 global', async () => {
    const app = await buildApp(baseConfig, () => new Response('ok'), {
      GLOBAL_RATE_LIMIT_PER_MINUTE: '3',
    })
    const get = (i: number) => app.handle(req(`/echo/${i}`))
    expect((await get(1)).status).toBe(200)
    expect((await get(2)).status).toBe(200)
    expect((await get(3)).status).toBe(200)
    const blocked = await get(4)
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBeTruthy()
  })

  test('CORS preflight respondido no edge (não toca upstream)', async () => {
    let touched = false
    const app = await buildApp(baseConfig, () => {
      touched = true
      return new Response('x')
    })
    const res = await app.handle(
      new Request('http://gw.local/echo/1', {
        method: 'OPTIONS',
        headers: { origin: 'https://app.example.com', 'access-control-request-method': 'GET' },
      }),
    )
    expect([200, 204]).toContain(res.status)
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy()
    expect(touched).toBe(false)
  })

  test('HMAC: sem assinatura → 401; assinatura válida → 200', async () => {
    const hmacConfig: GatewayConfigInput = {
      consumers: [
        { id: 'sys-a', hmacSecret: 'secret-a-at-least-16', allowedCidrs: ['203.0.113.0/24'] },
      ],
      services: {
        echo: { name: 'echo', upstreamGroups: { default: [{ url: 'http://up', id: 'a' }] } },
      },
      routes: [
        {
          id: 'secure',
          methods: ['POST'],
          pathPattern: '/secure',
          service: 'echo',
          auth: { mode: 'any', strategies: ['hmac'] },
          upstreamAuth: 'passthrough',
        },
      ],
    }
    const app = await buildApp(hmacConfig)

    const noAuth = await app.handle(req('/secure', { method: 'POST', body: '{}' }))
    expect(noAuth.status).toBe(401)

    const body = '{}'
    const ts = Math.floor(Date.now() / 1000)
    const sig = signHmac('secret-a-at-least-16', body, ts)
    const ok = await app.handle(
      req('/secure', {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-consumer-id': 'sys-a',
          'x-signature': `t=${ts},v1=${sig}`,
        },
      }),
    )
    expect(ok.status).toBe(200)
  })

  test('load balancing round-robin + ejeção passiva de instância ruim', async () => {
    const lbConfig: GatewayConfigInput = {
      services: {
        echo: {
          name: 'echo',
          upstreamGroups: {
            default: [
              { url: 'http://up-a', id: 'a' },
              { url: 'http://up-b', id: 'b' },
            ],
          },
          loadBalancer: 'round-robin',
          retry: { maxRetries: 0 },
        },
      },
      routes: [
        { id: 'g', methods: ['GET'], pathPattern: '/echo/:id', service: 'echo', auth: 'public' },
      ],
    }
    const hits: string[] = []
    const app = await buildApp(lbConfig, (r) => {
      hits.push(r.target.id)
      return r.target.id === 'b'
        ? new Response('bad', { status: 503 })
        : new Response('ok', { status: 200 })
    })
    const statuses: number[] = []
    for (let i = 0; i < 8; i++) statuses.push((await app.handle(req(`/echo/${i}`))).status)

    expect(hits.slice(0, 2)).toEqual(['a', 'b']) // alterna no começo
    expect(hits.slice(-2)).toEqual(['a', 'a']) // 'b' ejetado após 3 falhas
    expect(statuses.slice(-2)).toEqual([200, 200])
  })

  test('versionamento: versão não suportada → 400', async () => {
    const verConfig: GatewayConfigInput = {
      services: {
        echo: { name: 'echo', upstreamGroups: { default: [{ url: 'http://up', id: 'a' }] } },
      },
      routes: [
        {
          id: 'v',
          methods: ['GET'],
          pathPattern: '/echo/:id',
          service: 'echo',
          auth: 'public',
          versions: [{ version: 'v1' }],
        },
      ],
    }
    const app = await buildApp(verConfig)
    expect((await app.handle(req('/v1/echo/1'))).status).toBe(200)
    const bad = await app.handle(req('/v9/echo/1'))
    expect(bad.status).toBe(400)
    expect(((await bad.json()) as { error: { code: string } }).error.code).toBe(
      'UNSUPPORTED_VERSION',
    )
  })
})
