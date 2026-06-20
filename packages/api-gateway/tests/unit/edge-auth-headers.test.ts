import { describe, expect, test } from 'bun:test'
import { createRequestTransformStage } from '../../src/application/pipeline/stages/request-transform.stage'
import type { RouteConfig } from '../../src/infrastructure/config/gateway-config.schema'
import {
  EDGE_AUTH_HEADERS,
  headerSafeValue,
  injectIdentityHeaders,
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

describe('headerSafeValue / injectIdentityHeaders', () => {
  test('ASCII imprimível passa cru; não-ASCII sai URI-encoded', () => {
    expect(headerSafeValue('Maria Silva')).toBe('Maria Silva')
    expect(headerSafeValue('maria@example.com')).toBe('maria@example.com')
    expect(headerSafeValue('André Rocha de Oliveira')).toBe(
      encodeURIComponent('André Rocha de Oliveira'),
    )
    expect(headerSafeValue('Zoë 🚀')).toBe(encodeURIComponent('Zoë 🚀'))
  })

  test('nome com acento NÃO lança no headers.set (era 500 p/ todo usuário acentuado)', () => {
    const h = new Headers()
    injectIdentityHeaders(h, {
      id: 'user-1',
      email: 'andre@example.com',
      firstName: 'André',
      lastName: 'Rocha de Oliveira',
      role: 'customer',
      status: 'active',
    })
    expect(h.get('x-auth-user-name')).toBe(encodeURIComponent('André Rocha de Oliveira'))
    expect(h.get('x-auth-user-email')).toBe('andre@example.com')
  })

  test('sessão de PERFIL: x-auth-account-id é injetado; o valor forjado do cliente é descartado', () => {
    const h = new Headers({ 'x-auth-account-id': 'conta-forjada' })
    injectIdentityHeaders(h, {
      id: 'profile-1', // sub = perfil de criança
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
      accountId: 'conta-do-pai',
    })
    expect(h.get('x-auth-user-id')).toBe('profile-1')
    expect(h.get('x-auth-account-id')).toBe('conta-do-pai')
  })

  test('sessão da CONTA (sem accountId): x-auth-account-id fica AUSENTE (entrada do cliente removida)', () => {
    const h = new Headers({ 'x-auth-account-id': 'conta-forjada' })
    injectIdentityHeaders(h, {
      id: 'conta-1',
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
    })
    expect(h.get('x-auth-account-id')).toBe(null)
  })

  test('sessão de PERFIL: x-auth-profile-name injetado (URI-encode em acento); valor forjado descartado', () => {
    const h = new Headers({ 'x-auth-profile-name': 'forjado' })
    injectIdentityHeaders(h, {
      id: 'profile-1',
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
      accountId: 'conta-do-pai',
      profileName: 'Antônia',
    })
    // Acento → URI-encoded (headers.set lança com não-ASCII cru); o consumidor decodifica.
    expect(h.get('x-auth-profile-name')).toBe(encodeURIComponent('Antônia'))
  })

  test('sessão da CONTA (sem profileName): x-auth-profile-name fica AUSENTE (entrada do cliente removida)', () => {
    const h = new Headers({ 'x-auth-profile-name': 'forjado' })
    injectIdentityHeaders(h, {
      id: 'conta-1',
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
    })
    expect(h.get('x-auth-profile-name')).toBe(null)
  })

  test('sessão de PERFIL: x-auth-profile-public injetado (true/false); forjado do cliente descartado', () => {
    const pub = new Headers({ 'x-auth-profile-public': 'true' })
    injectIdentityHeaders(pub, {
      id: 'p1',
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
      accountId: 'conta-do-pai',
      profilePublic: true,
    })
    expect(pub.get('x-auth-profile-public')).toBe('true')

    const priv = new Headers({ 'x-auth-profile-public': 'true' }) // forjado p/ "true"
    injectIdentityHeaders(priv, {
      id: 'p2',
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
      accountId: 'conta-do-pai',
      profilePublic: false,
    })
    // O valor forjado do cliente é descartado e substituído pelo real (false).
    expect(priv.get('x-auth-profile-public')).toBe('false')
  })

  test('sessão da CONTA (sem profilePublic): x-auth-profile-public fica AUSENTE', () => {
    const h = new Headers({ 'x-auth-profile-public': 'true' })
    injectIdentityHeaders(h, {
      id: 'conta-1',
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
    })
    expect(h.get('x-auth-profile-public')).toBe(null)
  })

  test('sessão de IMPERSONAÇÃO: x-auth-impersonator-id é injetado; o valor forjado do cliente é descartado', () => {
    const h = new Headers({ 'x-auth-impersonator-id': 'admin-forjado' })
    injectIdentityHeaders(h, {
      id: 'aluno-1', // sub = usuário-alvo
      email: 'aluno@example.com',
      firstName: 'Aluno',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
      impersonatorId: 'admin-real',
    })
    expect(h.get('x-auth-user-id')).toBe('aluno-1')
    expect(h.get('x-auth-impersonator-id')).toBe('admin-real')
  })

  test('sessão normal (sem impersonatorId): x-auth-impersonator-id fica AUSENTE (entrada do cliente removida)', () => {
    const h = new Headers({ 'x-auth-impersonator-id': 'admin-forjado' })
    injectIdentityHeaders(h, {
      id: 'conta-1',
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
    })
    expect(h.get('x-auth-impersonator-id')).toBe(null)
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

  test('sessão de perfil: x-auth-account-id confiável é injetado e o spoof do cliente é descartado', async () => {
    const ctx = makeContext({
      method: 'GET',
      headers: { 'x-auth-account-id': 'conta-forjada', 'x-auth-user-id': 'id-forjado' },
    })
    ctx.route = routeMatch({})
    ctx.user = {
      id: 'profile-1',
      email: 'pai@example.com',
      firstName: 'Pai',
      lastName: 'Silva',
      role: 'customer',
      status: 'active',
      accountId: 'conta-do-pai',
    }
    const stage = createRequestTransformStage({ getTransformers: () => [] })
    await stage.run(ctx)
    expect(ctx.upstreamHeaders.get('x-auth-user-id')).toBe('profile-1')
    expect(ctx.upstreamHeaders.get('x-auth-account-id')).toBe('conta-do-pai')
  })

  test('x-internal-token do cliente é removido SEMPRE — inclusive em passthrough', async () => {
    for (const upstreamAuth of [undefined, 'passthrough' as const]) {
      const ctx = makeContext({
        method: 'POST',
        body: '{}',
        headers: { 'x-internal-token': 'forjado' },
      })
      ctx.route = routeMatch(upstreamAuth ? { upstreamAuth } : {})
      const stage = createRequestTransformStage({ getTransformers: () => [] })
      await stage.run(ctx)
      expect(ctx.upstreamHeaders.get('x-internal-token')).toBe(null)
    }
  })
})
