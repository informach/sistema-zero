import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type Application, createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import type { GatewayConfigInput } from '../../src/infrastructure/config/gateway-config.schema'

/**
 * Proxy REAL (sem fake forwarder): valida que o fetch-forwarder STREAMA o corpo
 * POST até um upstream Bun de verdade, sem consumi-lo no onParse, e propaga
 * X-Forwarded-For / X-Request-Id.
 */
let upstream: ReturnType<typeof Bun.serve>
let app: Application

beforeAll(async () => {
  upstream = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname === '/health') return new Response('ok')
      const body = req.method === 'POST' ? await req.text() : ''
      return new Response(
        JSON.stringify({
          method: req.method,
          path: url.pathname,
          body,
          xff: req.headers.get('x-forwarded-for'),
          requestId: req.headers.get('x-request-id'),
        }),
        { headers: { 'content-type': 'application/json' } },
      )
    },
  })

  const config: GatewayConfigInput = {
    services: {
      echo: {
        name: 'echo',
        upstreamGroups: { default: [{ url: `http://localhost:${upstream.port}`, id: 'a' }] },
      },
    },
    routes: [
      {
        id: 'echo',
        methods: ['GET', 'POST'],
        pathPattern: '/echo',
        service: 'echo',
        auth: 'public',
      },
    ],
  }
  app = await createApplication(loadEnv({ TRUST_PROXY: 'true' }), { rawConfig: config })
})

afterAll(async () => {
  await app.stop().catch(() => {})
  upstream.stop(true)
})

describe('proxy real (streaming)', () => {
  test('encaminha corpo POST e propaga X-Forwarded-For / X-Request-Id', async () => {
    const res = await app.handle(
      new Request('http://gw.local/echo', {
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      method: string
      body: string
      xff: string
      requestId: string
    }
    expect(data.method).toBe('POST')
    expect(JSON.parse(data.body)).toEqual({ hello: 'world' })
    expect(data.xff).toContain('9.9.9.9')
    expect(data.requestId).toBeTruthy()
    // X-Request-Id volta para o cliente também.
    expect(res.headers.get('x-request-id')).toBe(data.requestId)
  })
})
