import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { SignJWT } from 'jose'
import { type Application, createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import type { GatewayConfigInput } from '../../src/infrastructure/config/gateway-config.schema'
import { fakeForwarder } from '../helpers'

/**
 * Auth+Authz de usuário no gateway: verificação HS256 (segredo compartilhado),
 * resolução do usuário a partir das claims, RBAC por rota (role/status) e injeção
 * dos headers de identidade confiável (X-Auth-*) — incluindo o strip anti-spoof.
 */
const SECRET = 'gateway-hs256-shared-secret-32bytes!!'
const SECRET_KEY = new TextEncoder().encode(SECRET)
const ISSUER = 'sistemazero-auth'
const AUDIENCE = 'sistemazero'

let app: Application
let lastForwardHeaders: Headers | undefined

function signUser(claims: Record<string, unknown>, sub = 'user-1'): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(SECRET_KEY)
}

const FULL_CLAIMS = {
  email: 'maria@example.com',
  firstName: 'Maria',
  lastName: 'Silva',
  role: 'customer',
  status: 'active',
  phone: '+5511999998888',
  signupSource: 'funnel',
}

function get(path: string, token?: string, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...extraHeaders }
  if (token) headers.authorization = `Bearer ${token}`
  return new Request(`http://gw.local${path}`, { headers })
}

beforeAll(async () => {
  const config: GatewayConfigInput = {
    services: {
      svc: { name: 'svc', upstreamGroups: { default: [{ url: 'http://up', id: 'a' }] } },
    },
    routes: [
      // Autenticado, sem RBAC.
      {
        id: 'me',
        methods: ['GET'],
        pathPattern: '/me',
        service: 'svc',
        auth: { mode: 'any', strategies: ['jwt'] },
      },
      // RBAC por papel.
      {
        id: 'admin',
        methods: ['GET'],
        pathPattern: '/admin',
        service: 'svc',
        auth: { mode: 'any', strategies: ['jwt'] },
        authorize: { roles: ['admin', 'staff'] },
      },
      // Exige usuário resolvido e ativo (authorize vazio → default statuses=['active']).
      {
        id: 'active-only',
        methods: ['GET'],
        pathPattern: '/active',
        service: 'svc',
        auth: { mode: 'any', strategies: ['jwt'] },
        authorize: {},
      },
    ],
  }
  app = await createApplication(
    loadEnv({ JWT_HS256_SECRET: SECRET, JWT_ISSUER: ISSUER, JWT_AUDIENCE: AUDIENCE }),
    {
      rawConfig: config,
      forwarder: fakeForwarder((req) => {
        lastForwardHeaders = req.headers
        return new Response('ok')
      }),
    },
  )
})

afterAll(async () => {
  await app.stop().catch(() => {})
})

describe('JWT auth + RBAC (HS256)', () => {
  test('token HS256 válido → 200 e injeta X-Auth-* confiável no upstream', async () => {
    const token = await signUser(FULL_CLAIMS)
    const res = await app.handle(get('/me', token))
    expect(res.status).toBe(200)
    expect(lastForwardHeaders?.get('x-auth-user-id')).toBe('user-1')
    expect(lastForwardHeaders?.get('x-auth-user-email')).toBe('maria@example.com')
    expect(lastForwardHeaders?.get('x-auth-user-name')).toBe('Maria Silva')
    expect(lastForwardHeaders?.get('x-auth-user-role')).toBe('customer')
    expect(lastForwardHeaders?.get('x-auth-user-status')).toBe('active')
    expect(lastForwardHeaders?.get('x-auth-user-phone')).toBe('+5511999998888')
    expect(lastForwardHeaders?.get('x-auth-user-source')).toBe('funnel')
  })

  test('nome com acento → 200 e name chega URI-encoded (regressão: era 500 no headers.set)', async () => {
    const token = await signUser(
      {
        ...FULL_CLAIMS,
        email: 'andre@example.com',
        firstName: 'André',
        lastName: 'Rocha de Oliveira',
      },
      'user-andre',
    )
    const res = await app.handle(get('/me', token))
    expect(res.status).toBe(200)
    expect(lastForwardHeaders?.get('x-auth-user-name')).toBe(
      encodeURIComponent('André Rocha de Oliveira'),
    )
    expect(lastForwardHeaders?.get('x-auth-user-email')).toBe('andre@example.com')
  })

  test('header X-Auth-* forjado pelo cliente é removido e sobrescrito pelo gateway', async () => {
    const token = await signUser(FULL_CLAIMS)
    const res = await app.handle(get('/me', token, { 'x-auth-user-role': 'admin' }))
    expect(res.status).toBe(200)
    // O valor vem do token (customer), não do header forjado (admin).
    expect(lastForwardHeaders?.get('x-auth-user-role')).toBe('customer')
  })

  test('sem token → 401', async () => {
    expect((await app.handle(get('/me'))).status).toBe(401)
  })

  test('RBAC: papel insuficiente → 403', async () => {
    const token = await signUser(FULL_CLAIMS) // role customer
    expect((await app.handle(get('/admin', token))).status).toBe(403)
  })

  test('RBAC: papel forjado no header não burla (usa a role do token) → 403', async () => {
    const token = await signUser(FULL_CLAIMS) // role customer
    const res = await app.handle(get('/admin', token, { 'x-auth-user-role': 'admin' }))
    expect(res.status).toBe(403)
  })

  test('RBAC: papel permitido → 200', async () => {
    const token = await signUser({ ...FULL_CLAIMS, role: 'admin' }, 'admin-1')
    expect((await app.handle(get('/admin', token))).status).toBe(200)
  })

  test('status gate: conta suspensa → 403', async () => {
    const token = await signUser({ ...FULL_CLAIMS, status: 'suspended' })
    expect((await app.handle(get('/active', token))).status).toBe(403)
  })

  test('status gate: conta ativa → 200', async () => {
    const token = await signUser(FULL_CLAIMS)
    expect((await app.handle(get('/active', token))).status).toBe(200)
  })

  test('token sem claims de usuário em rota com authorize → 401 (usuário não resolvido)', async () => {
    const token = await signUser({ scope: 'x' }) // sem email/firstName/role/status
    expect((await app.handle(get('/active', token))).status).toBe(401)
  })

  test('token sem claims de usuário em rota só-autenticada → 200 (autenticado, sem usuário)', async () => {
    const token = await signUser({ scope: 'x' })
    const res = await app.handle(get('/me', token))
    expect(res.status).toBe(200)
    // Sem usuário resolvido → não injeta identidade.
    expect(lastForwardHeaders?.get('x-auth-user-id')).toBeNull()
  })
})
