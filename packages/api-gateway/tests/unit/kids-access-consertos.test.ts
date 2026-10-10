import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  canonicalHmacMessage,
  KIDS_IDENTITY_HEADERS,
  type KidsSessionClaim,
  signHmac,
} from '@sistemazero/core/security'
import { SignJWT } from 'jose'
import realConfig from '../../gateway.config'
import type { Principal } from '../../src/application/auth/auth-strategy.port'
import { createClaimsUserResolver } from '../../src/application/auth/claims-user-resolver'
import { createJwtStrategy } from '../../src/application/auth/jwt.strategy'
import { kidsMayAccess } from '../../src/application/auth/kids-access-policy'
import { createRequestTransformStage } from '../../src/application/pipeline/stages/request-transform.stage'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import type {
  GatewayConfigInput,
  RouteConfig,
} from '../../src/infrastructure/config/gateway-config.schema'
import { injectIdentityHeaders } from '../../src/infrastructure/proxy/header-rules'
import { fakeForwarder, makeContext } from '../helpers'

const secret = 'isolated-kids-gateway-test-secret-32'
const student: KidsSessionClaim = {
  kind: 'student',
  sessionId: randomUUID(),
  deviceId: randomUUID(),
  grantId: randomUUID(),
}
const parent: KidsSessionClaim = {
  kind: 'parent',
  sessionId: randomUUID(),
  authenticatedAt: 1_800_000_000,
}

async function bearer(claims: Record<string, unknown>, sub = randomUUID()) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret))
}

describe('política Kids no caminho canônico', () => {
  test('barras repetidas, codificação e ".." não furam as regras', () => {
    for (const path of [
      '/members//parents/report-prefs',
      '//members/parents/report-prefs',
      '/members/%70arents/report-prefs',
      '/members/courses/../parents/report-prefs',
      '/members/%2e%2e/parents',
      '/members/x%2f..%2fparents',
      '/members//admin/members',
      '/members/ADMIN/members',
      '/payments//my',
    ])
      expect(kidsMayAccess(student, path, 'GET', 'andre')).toBe(false)
    expect(kidsMayAccess(student, '/members//learning/session', 'POST', 'andre')).toBe(true)
    expect(kidsMayAccess(parent, '/members//parents/report-prefs', 'GET', 'pai')).toBe(true)
    expect(kidsMayAccess(parent, '/members/parents/../learning/session', 'POST', 'pai')).toBe(false)
  })
})

describe('estratégia JWT do aluno', () => {
  test('pedido proibido é recusado ANTES da ida ao Auth', async () => {
    let validations = 0
    const strategy = createJwtStrategy({
      hs256Secret: secret,
      validateKidsSession: async () => {
        validations++
        return true
      },
    })
    const token = await bearer({ kids: student, pfl: { accountId: randomUUID() } })
    const forbidden = makeContext({
      url: 'http://gateway.test/members//parents/report-prefs',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(await strategy.authenticate(forbidden)).toMatchObject({ ok: false, status: 403 })
    expect(validations).toBe(0)
    const allowed = makeContext({
      url: 'http://gateway.test/members/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect((await strategy.authenticate(allowed)).ok).toBe(true)
    expect(validations).toBe(1)
  })

  test('aluno com papel de equipe continua sem admin, área interna, financeiro e pais', async () => {
    const strategy = createJwtStrategy({
      hs256Secret: secret,
      validateKidsSession: async () => true,
    })
    const token = await bearer({
      role: 'admin',
      status: 'active',
      kids: student,
      pfl: { accountId: randomUUID(), name: 'Ana' },
    })
    for (const [method, path] of [
      ['GET', '/members/admin/members'],
      ['POST', '/auth/admin/users'],
      ['GET', '/members/internal/profile-allowance'],
      ['POST', '/members/internal/device-avatars'],
      ['GET', '/payments/my'],
      ['GET', '/payments/admin/payments'],
      ['GET', '/referrals/me/ambassador'],
      ['GET', '/referrals/admin/conversions'],
      ['GET', '/helpdesk/portal/tickets'],
      ['GET', '/members/parents/children-stats'],
      ['GET', '/hub/admin/reports'],
      // Rotas com papel exigido fora de /admin: o contexto de aluno barra antes do RBAC.
      ['POST', '/catalog/products'],
      ['PATCH', '/catalog/offers/oferta'],
      ['GET', '/marketing/posts'],
      ['GET', '/helpdesk/tickets'],
    ]) {
      const ctx = makeContext({
        method,
        url: `http://gateway.test${path}`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect({ path, result: await strategy.authenticate(ctx) }).toMatchObject({
        path,
        result: { ok: false, status: 403 },
      })
    }
  })
})

describe('identidade do aluno sem a ficha do responsável', () => {
  const resolver = createClaimsUserResolver()
  const principal = (claims: Record<string, unknown>): Principal => ({
    kind: 'jwt',
    subject: 'perfil-1',
    claims,
  })

  test('aluno resolve sem e-mail/nome; adulto sem eles continua sem resolver', async () => {
    const user = await resolver.resolve(
      principal({
        role: 'customer',
        status: 'active',
        kids: student,
        pfl: { accountId: 'conta-1', name: 'Ana' },
      }),
    )
    expect(user).toMatchObject({
      id: 'perfil-1',
      accountId: 'conta-1',
      profileName: 'Ana',
      email: '',
      kidsContext: 'student',
    })
    expect(user?.kidsAuthTime).toBeUndefined()
    expect(await resolver.resolve(principal({ role: 'customer', status: 'active' }))).toBeNull()
    // Aluno sem a conta (pfl) não tem identidade de acesso.
    expect(
      await resolver.resolve(principal({ role: 'customer', status: 'active', kids: student })),
    ).toBeNull()
  })

  test('responsável leva o contexto e a hora do login aos serviços', async () => {
    const user = await resolver.resolve(
      principal({
        email: 'pai@example.com',
        firstName: 'Pai',
        lastName: 'Silva',
        role: 'customer',
        status: 'active',
        kids: parent,
      }),
    )
    expect(user).toMatchObject({ kidsContext: 'parent', kidsAuthTime: parent.authenticatedAt })
  })

  test('headers Kids: injetados a partir das claims, nunca aceitos da entrada', async () => {
    const out = new Headers({
      [KIDS_IDENTITY_HEADERS.context]: 'parent',
      [KIDS_IDENTITY_HEADERS.authTime]: '9999999999',
    })
    injectIdentityHeaders(out, {
      id: 'perfil-1',
      email: '',
      firstName: '',
      lastName: '',
      role: 'customer',
      status: 'active',
      accountId: 'conta-1',
      profileName: 'Ana',
      kidsContext: 'student',
    })
    expect(out.get(KIDS_IDENTITY_HEADERS.context)).toBe('student')
    expect(out.get(KIDS_IDENTITY_HEADERS.authTime)).toBeNull()
    expect(out.get('x-auth-user-email')).toBeNull()
    expect(out.get('x-auth-user-name')).toBeNull()
    expect(out.get('x-auth-profile-name')).toBe('Ana')

    // Rota sem usuário resolvido (pública): o valor forjado pelo cliente some.
    const stage = createRequestTransformStage({ getTransformers: () => [] })
    const ctx = makeContext({
      method: 'POST',
      url: 'http://gateway.test/auth/profiles/x',
      headers: {
        [KIDS_IDENTITY_HEADERS.context]: 'parent',
        [KIDS_IDENTITY_HEADERS.authTime]: String(Math.floor(Date.now() / 1000)),
      },
    })
    ctx.route = {
      route: {
        id: 'r',
        methods: ['POST'],
        pathPattern: '/auth/profiles/:id',
        service: 'auth',
        upstreamGroup: 'default',
        auth: 'public',
        transforms: [],
        stripPrefix: false,
      } as RouteConfig,
      params: {},
      version: 'v1',
    }
    await stage.run(ctx)
    expect(ctx.upstreamHeaders.get(KIDS_IDENTITY_HEADERS.context)).toBeNull()
    expect(ctx.upstreamHeaders.get(KIDS_IDENTITY_HEADERS.authTime)).toBeNull()
  })
})

describe('rotas do BFF Kids na configuração real', () => {
  const find = (id: string) => realConfig.routes.find((route) => route.id === id)

  test('miniaturas: teto por navegador (campo assinado), não um balde único do BFF', () => {
    expect(find('members-internal-device-avatars')?.rateLimit).toMatchObject({
      by: 'json-field',
      field: 'rateLimitKey',
    })
  })

  test('conferência assinada pelo BFF sai do limite anônimo global; sem assinatura continua nele', async () => {
    const route = find('auth-kids-session-validate')
    if (!route) throw new Error('rota de conferência ausente')
    expect(route).toMatchObject({
      upstreamAuth: 'passthrough',
      auth: { strategies: ['hmac'], allowedConsumers: ['member-shell'] },
      rateLimit: { by: 'principal' },
    })
    const config: GatewayConfigInput = {
      consumers: [
        {
          id: 'member-shell',
          hmacSecret: 'member-shell-secret-16+',
          allowedCidrs: ['203.0.113.0/24'],
        },
      ],
      services: {
        auth: { name: 'auth', upstreamGroups: { default: [{ url: 'http://auth', id: 'a' }] } },
      },
      routes: [route],
    }
    const seen: (string | null)[] = []
    const app = await createApplication(
      loadEnv({
        TRUST_PROXY: 'true',
        TRUSTED_PROXY_HOPS: '1',
        GLOBAL_RATE_LIMIT_PER_MINUTE: '2',
      }),
      {
        rawConfig: config,
        forwarder: fakeForwarder((r) => {
          seen.push(r.headers.get('authorization'))
          return Response.json({ valid: true })
        }),
      },
    )
    const call = (signed: boolean) => {
      const headers = new Headers({
        authorization: 'Bearer token-da-crianca',
        'x-forwarded-for': '203.0.113.7',
      })
      if (signed) {
        const ts = Math.floor(Date.now() / 1000)
        const signature = signHmac(
          'member-shell-secret-16+',
          canonicalHmacMessage({ method: 'POST', path: '/auth/kids/session/validate', body: '' }),
          ts,
        )
        headers.set('x-consumer-id', 'member-shell')
        headers.set('x-signature', `t=${ts},v1=${signature}`)
      }
      return app.handle(
        new Request('http://gw.local/auth/kids/session/validate', { method: 'POST', headers }),
      )
    }
    for (let i = 0; i < 5; i++) expect((await call(true)).status).toBe(200)
    expect(seen.every((value) => value === 'Bearer token-da-crianca')).toBe(true)
    expect((await call(false)).status).toBe(200)
    expect((await call(false)).status).toBe(200)
    expect((await call(false)).status).toBe(429)
  })
})
