import { describe, expect, test } from 'bun:test'
import { createRequestTransformStage } from '../../src/application/pipeline/stages/request-transform.stage'
import type { RouteConfig } from '../../src/infrastructure/config/gateway-config.schema'
import {
  EDGE_AUTH_HEADERS,
  stripEdgeAuthHeaders,
} from '../../src/infrastructure/proxy/header-rules'
import { createResigner } from '../../src/infrastructure/upstream/resign.transformer'
import { makeContext } from '../helpers'

function routeMatch(partial: Partial<RouteConfig>) {
  const route = {
    id: 'r',
    methods: ['POST'],
    pathPattern: '/x',
    service: 's',
    upstreamGroup: 'default',
    auth: 'public',
    transforms: [],
    stripPrefix: false,
    ...partial,
  } as RouteConfig
  return { route, params: {}, version: 'v1' }
}

describe('stripEdgeAuthHeaders', () => {
  test('remove credenciais de borda, preserva idempotency-key/content-type', () => {
    const h = new Headers({
      authorization: 'Bearer x',
      cookie: 'sid=1',
      'x-consumer-id': 'c',
      'x-signature': 't=1,v1=a',
      'x-session-token': 's',
      'idempotency-key': 'k',
      'content-type': 'application/json',
    })
    stripEdgeAuthHeaders(h)
    for (const n of EDGE_AUTH_HEADERS) expect(h.get(n)).toBe(null)
    expect(h.get('idempotency-key')).toBe('k')
    expect(h.get('content-type')).toBe('application/json')
  })
})

describe('request-transform stage: credenciais de borda', () => {
  test('rota resign: remove creds do cliente e re-injeta as do gateway', async () => {
    const ctx = makeContext({
      method: 'POST',
      body: '{}',
      headers: {
        'x-consumer-id': 'client',
        'x-signature': 't=1,v1=dead',
        authorization: 'Bearer leak',
      },
    })
    ctx.route = routeMatch({ upstreamAuth: 'resign' })
    const stage = createRequestTransformStage({
      getTransformers: () => [],
      resigner: createResigner({ consumerId: 'gateway', secret: 'x'.repeat(16) }),
    })
    await stage.run(ctx)
    expect(ctx.upstreamHeaders.get('authorization')).toBe(null)
    expect(ctx.upstreamHeaders.get('x-consumer-id')).toBe('gateway')
    expect(ctx.upstreamHeaders.get('x-signature')).toContain('t=')
  })

  test('rota passthrough: mantém creds do cliente', async () => {
    const ctx = makeContext({
      method: 'POST',
      body: '{}',
      headers: { 'x-consumer-id': 'client', authorization: 'Bearer keep' },
    })
    ctx.route = routeMatch({ upstreamAuth: 'passthrough' })
    const stage = createRequestTransformStage({ getTransformers: () => [] })
    await stage.run(ctx)
    expect(ctx.upstreamHeaders.get('authorization')).toBe('Bearer keep')
    expect(ctx.upstreamHeaders.get('x-consumer-id')).toBe('client')
  })

  test('rota sem upstreamAuth (default): remove creds do cliente', async () => {
    const ctx = makeContext({
      method: 'POST',
      body: '{}',
      headers: { 'x-signature': 't=1,v1=a', authorization: 'Bearer leak' },
    })
    ctx.route = routeMatch({})
    const stage = createRequestTransformStage({ getTransformers: () => [] })
    await stage.run(ctx)
    expect(ctx.upstreamHeaders.get('authorization')).toBe(null)
    expect(ctx.upstreamHeaders.get('x-signature')).toBe(null)
  })

  test('principal HMAC autenticado é re-injetado como x-consumer-id confiável', async () => {
    const ctx = makeContext({
      method: 'POST',
      body: '{}',
      // O cliente manda o próprio x-consumer-id (credencial de borda) — o valor
      // que chega ao upstream deve ser o AUTENTICADO, nunca o do header cru.
      headers: { 'x-consumer-id': 'spoofado', 'x-signature': 't=1,v1=a' },
    })
    ctx.route = routeMatch({})
    ctx.principal = { kind: 'hmac', subject: 'funnel' }
    const stage = createRequestTransformStage({ getTransformers: () => [] })
    await stage.run(ctx)
    expect(ctx.upstreamHeaders.get('x-consumer-id')).toBe('funnel')
    expect(ctx.upstreamHeaders.get('x-signature')).toBe(null)
  })

  test('sem principal (rota pública): x-consumer-id NÃO chega ao upstream', async () => {
    const ctx = makeContext({
      method: 'POST',
      body: '{}',
      headers: { 'x-consumer-id': 'spoofado' },
    })
    ctx.route = routeMatch({})
    const stage = createRequestTransformStage({ getTransformers: () => [] })
    await stage.run(ctx)
    expect(ctx.upstreamHeaders.get('x-consumer-id')).toBe(null)
  })

  test('principal JWT não vira x-consumer-id (só HMAC é consumer S2S)', async () => {
    const ctx = makeContext({ method: 'POST', body: '{}', headers: {} })
    ctx.route = routeMatch({})
    ctx.principal = { kind: 'jwt', subject: 'user-1' }
    const stage = createRequestTransformStage({ getTransformers: () => [] })
    await stage.run(ctx)
    expect(ctx.upstreamHeaders.get('x-consumer-id')).toBe(null)
  })
})
