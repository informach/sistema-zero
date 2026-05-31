import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { type Application, createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import type { GatewayConfigInput } from '../../src/infrastructure/config/gateway-config.schema'
import { fakeForwarder } from '../helpers'

/**
 * Auth JWT REAL: gera um par de chaves (jose), serve um JWKS local de verdade, e
 * valida que o gateway aceita um token assinado e rejeita um inválido. Fecha a
 * lacuna de "JWT nunca testado contra um JWKS real".
 */
let jwks: ReturnType<typeof Bun.serve>
let app: Application
let signToken: (claims?: Record<string, unknown>) => Promise<string>
let signNoSub: () => Promise<string>

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
  const jwk = await exportJWK(publicKey)
  jwk.kid = 'test-key'
  jwk.alg = 'RS256'
  jwks = Bun.serve({
    port: 0,
    fetch: () =>
      new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { 'content-type': 'application/json' },
      }),
  })
  signToken = (claims = {}) =>
    new SignJWT({ scope: 'payments:read', ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://issuer.test')
      .setAudience('sistema-zero')
      .setSubject('user-123')
      .setExpirationTime('5m')
      .sign(privateKey)
  // Token válido em tudo MENOS o subject (sem `sub`).
  signNoSub = () =>
    new SignJWT({ scope: 'payments:read' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://issuer.test')
      .setAudience('sistema-zero')
      .setExpirationTime('5m')
      .sign(privateKey)

  const config: GatewayConfigInput = {
    services: {
      svc: { name: 'svc', upstreamGroups: { default: [{ url: 'http://up', id: 'a' }] } },
    },
    routes: [
      {
        id: 'protected',
        methods: ['GET'],
        pathPattern: '/protected',
        service: 'svc',
        auth: { mode: 'any', strategies: ['jwt'] },
      },
    ],
  }
  app = await createApplication(
    loadEnv({
      JWT_JWKS_URL: `http://localhost:${jwks.port}/jwks`,
      JWT_ISSUER: 'https://issuer.test',
      JWT_AUDIENCE: 'sistema-zero',
    }),
    { rawConfig: config, forwarder: fakeForwarder(() => new Response('ok')) },
  )
})

afterAll(async () => {
  await app.stop().catch(() => {})
  jwks.stop(true)
})

describe('JWT auth (JWKS real)', () => {
  test('sem token → 401', async () => {
    expect((await app.handle(new Request('http://gw.local/protected'))).status).toBe(401)
  })

  test('token inválido → 401', async () => {
    const res = await app.handle(
      new Request('http://gw.local/protected', { headers: { authorization: 'Bearer not.a.jwt' } }),
    )
    expect(res.status).toBe(401)
  })

  test('token válido (verificado via JWKS) → 200', async () => {
    const token = await signToken()
    const res = await app.handle(
      new Request('http://gw.local/protected', { headers: { authorization: `Bearer ${token}` } }),
    )
    expect(res.status).toBe(200)
  })

  test('token sem subject (sub) → 401', async () => {
    const token = await signNoSub()
    const res = await app.handle(
      new Request('http://gw.local/protected', { headers: { authorization: `Bearer ${token}` } }),
    )
    expect(res.status).toBe(401)
  })

  test('issuer errado → 401', async () => {
    const bad = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://evil.test')
      .setAudience('sistema-zero')
      .setSubject('x')
      .setExpirationTime('5m')
      // chave diferente também invalidaria; aqui o issuer é o suficiente
      .sign((await generateKeyPair('RS256')).privateKey)
    const res = await app.handle(
      new Request('http://gw.local/protected', { headers: { authorization: `Bearer ${bad}` } }),
    )
    expect(res.status).toBe(401)
  })
})
