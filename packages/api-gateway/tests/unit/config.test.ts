import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'
import { loadGatewayConfig } from '../../src/infrastructure/config/load-gateway-config'

const env = loadEnv({})
const service = { name: 'p', upstreamGroups: { default: [{ url: 'http://p' }] } }

describe('loadGatewayConfig', () => {
  test('valida e aplica defaults', async () => {
    const cfg = await loadGatewayConfig(env, {
      services: { p: service },
      routes: [{ id: 'r', methods: ['GET'], pathPattern: '/x', service: 'p' }],
    })
    expect(cfg.defaultVersion).toBe('v1')
    expect(cfg.routes[0]?.upstreamGroup).toBe('default')
    expect(cfg.services.p?.loadBalancer).toBe('round-robin')
  })

  test('rota apontando para serviço inexistente → erro', async () => {
    await expect(
      loadGatewayConfig(env, {
        services: {},
        routes: [{ id: 'r', methods: ['GET'], pathPattern: '/x', service: 'missing' }],
      }),
    ).rejects.toThrow(/serviço/)
  })

  test('rota jwt sem JWT_JWKS_URL → erro', async () => {
    await expect(
      loadGatewayConfig(env, {
        services: { p: service },
        routes: [
          {
            id: 'r',
            methods: ['GET'],
            pathPattern: '/x',
            service: 'p',
            auth: { strategies: ['jwt'] },
          },
        ],
      }),
    ).rejects.toThrow(/jwt/)
  })

  test('rota jwt COM JWT_JWKS_URL → ok', async () => {
    const envJwt = loadEnv({ JWT_JWKS_URL: 'http://localhost/jwks' })
    const cfg = await loadGatewayConfig(envJwt, {
      services: { p: service },
      routes: [
        {
          id: 'r',
          methods: ['GET'],
          pathPattern: '/x',
          service: 'p',
          auth: { strategies: ['jwt'] },
        },
      ],
    })
    expect(cfg.routes[0]?.auth).not.toBe('public')
  })

  test('consumer com hmacSecret vazio → erro (não sobe com auth desabilitada)', async () => {
    await expect(
      loadGatewayConfig(env, {
        consumers: [{ id: 'c', hmacSecret: '' }],
        services: { p: service },
        routes: [{ id: 'r', methods: ['GET'], pathPattern: '/x', service: 'p' }],
      }),
    ).rejects.toThrow(/hmacSecret/)
  })

  test('upstream com url inválida → erro', async () => {
    await expect(
      loadGatewayConfig(env, {
        services: { p: { name: 'p', upstreamGroups: { default: [{ url: 'not-a-url' }] } } },
        routes: [{ id: 'r', methods: ['GET'], pathPattern: '/x', service: 'p' }],
      }),
    ).rejects.toThrow()
  })

  test('transform de tipo desconhecido → erro', async () => {
    await expect(
      loadGatewayConfig(
        env,
        {
          services: { p: service },
          routes: [
            {
              id: 'r',
              methods: ['GET'],
              pathPattern: '/x',
              service: 'p',
              transforms: [{ type: 'header-injct' }],
            },
          ],
        },
        { validTransformTypes: ['header-inject', 'path-rewrite'] },
      ),
    ).rejects.toThrow(/desconhecido/)
  })

  test('header-inject com valor vazio → erro', async () => {
    await expect(
      loadGatewayConfig(
        env,
        {
          services: { p: service },
          routes: [
            {
              id: 'r',
              methods: ['GET'],
              pathPattern: '/x',
              service: 'p',
              transforms: [{ type: 'header-inject', options: { headers: { 'x-tok': '' } } }],
            },
          ],
        },
        { validTransformTypes: ['header-inject'] },
      ),
    ).rejects.toThrow(/vazio/)
  })

  test('CORS por rota só aceita origins — campo fantasma (methods etc.) falha no boot', async () => {
    await expect(
      loadGatewayConfig(env, {
        services: { p: service },
        routes: [
          {
            id: 'r',
            methods: ['GET'],
            pathPattern: '/x',
            service: 'p',
            // `methods` por rota nunca foi aplicado (preflight é da config global):
            // o schema estrito rejeita em vez de ignorar em silêncio.
            cors: { origins: ['https://x.com'], methods: ['GET'] },
          },
        ],
      }),
    ).rejects.toThrow(/cors/)
  })

  test('CORS por rota com só origins → ok', async () => {
    const cfg = await loadGatewayConfig(env, {
      services: { p: service },
      routes: [
        {
          id: 'r',
          methods: ['GET'],
          pathPattern: '/x',
          service: 'p',
          cors: { origins: ['https://x.com'] },
        },
      ],
    })
    expect(cfg.routes[0]?.cors?.origins).toEqual(['https://x.com'])
  })

  test('maxBodyBytes por rota acima do teto global → erro (o servidor venceria)', async () => {
    await expect(
      loadGatewayConfig(env, {
        services: { p: service },
        routes: [
          {
            id: 'r',
            methods: ['POST'],
            pathPattern: '/x',
            service: 'p',
            maxBodyBytes: env.MAX_REQUEST_BODY_BYTES + 1,
          },
        ],
      }),
    ).rejects.toThrow(/maxBodyBytes/)
    // Igual ou abaixo do global → ok (afinar é o uso esperado).
    const cfg = await loadGatewayConfig(env, {
      services: { p: service },
      routes: [
        {
          id: 'r',
          methods: ['POST'],
          pathPattern: '/x',
          service: 'p',
          maxBodyBytes: 64 * 1024,
        },
      ],
    })
    expect(cfg.routes[0]?.maxBodyBytes).toBe(64 * 1024)
  })

  test('produção: rota jwt sem JWT_ISSUER/JWT_AUDIENCE → erro', async () => {
    const prodEnv = loadEnv({
      NODE_ENV: 'production',
      TRUST_PROXY: 'true',
      METRICS_TOKEN: 'metrics-token-com-16-chars',
      MEMBERS_INTERNAL_TOKEN: 'members-internal-16chars',
      CATALOG_INTERNAL_TOKEN: 'catalog-internal-16chars',
      MESSAGING_INTERNAL_TOKEN: 'messaging-internal-16ch',
      AUTH_INTERNAL_TOKEN: 'auth-internal-16-chars!',
      PAYMENTS_INTERNAL_TOKEN: 'payments-internal-16chrs',
      JWT_HS256_SECRET: 'segredo-hs256-com-mais-de-32-caracteres',
    })
    const routes = [
      { id: 'r', methods: ['GET'], pathPattern: '/x', service: 'p', auth: { strategies: ['jwt'] } },
    ]
    await expect(loadGatewayConfig(prodEnv, { services: { p: service }, routes })).rejects.toThrow(
      /JWT_ISSUER/,
    )

    const withIssuer = loadEnv({
      NODE_ENV: 'production',
      TRUST_PROXY: 'true',
      METRICS_TOKEN: 'metrics-token-com-16-chars',
      MEMBERS_INTERNAL_TOKEN: 'members-internal-16chars',
      CATALOG_INTERNAL_TOKEN: 'catalog-internal-16chars',
      MESSAGING_INTERNAL_TOKEN: 'messaging-internal-16ch',
      AUTH_INTERNAL_TOKEN: 'auth-internal-16-chars!',
      PAYMENTS_INTERNAL_TOKEN: 'payments-internal-16chrs',
      JWT_HS256_SECRET: 'segredo-hs256-com-mais-de-32-caracteres',
      JWT_ISSUER: 'sistemazero-auth',
      JWT_AUDIENCE: 'sistemazero',
    })
    const cfg = await loadGatewayConfig(withIssuer, { services: { p: service }, routes })
    expect(cfg.routes).toHaveLength(1)
  })
})
