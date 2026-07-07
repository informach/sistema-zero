import { describe, expect, test } from 'bun:test'
import realConfig from '../../gateway.config'
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

  test('audit exige que todos os métodos da rota sejam mutantes', async () => {
    await expect(
      loadGatewayConfig(env, {
        services: { p: service },
        routes: [
          {
            id: 'audit-mixed',
            methods: ['GET', 'POST'],
            pathPattern: '/x',
            service: 'p',
            audit: {},
          },
        ],
      }),
    ).rejects.toThrow(/métodos não mutantes: GET/)

    const cfg = await loadGatewayConfig(env, {
      services: { p: service },
      routes: [
        {
          id: 'audit-write',
          methods: ['POST', 'PATCH'],
          pathPattern: '/x',
          service: 'p',
          audit: {},
        },
      ],
    })
    expect(cfg.routes[0]?.audit).toEqual({})
  })

  test('produção: rota jwt sem JWT_ISSUER/JWT_AUDIENCE → erro', async () => {
    const prodEnv = loadEnv({
      NODE_ENV: 'production',
      TRUST_PROXY: 'true',
      METRICS_TOKEN: 'metrics-token-com-16-chars',
      MEMBERS_INTERNAL_TOKEN: 'members-internal-16chars',
      CATALOG_INTERNAL_TOKEN: 'catalog-internal-16chars',
      MESSAGING_INTERNAL_TOKEN: 'messaging-internal-16ch',
      AUTH_HMAC_SECRET: 'auth-hmac-secret-16chrs',
      AUTH_INTERNAL_TOKEN: 'auth-internal-16-chars!',
      PAYMENTS_INTERNAL_TOKEN: 'payments-internal-16chrs',
      FISCAL_INTERNAL_TOKEN: 'fiscal-internal-token-16',
      FISCAL_HMAC_SECRET: 'fiscal-hmac-secret-16ch',
      HUB_INTERNAL_TOKEN: 'hub-internal-token-16chrs',
      MARKETING_INTERNAL_TOKEN: 'marketing-internal-16ch!',
      MARKETING_HMAC_SECRET: 'marketing-hmac-secret-16',
      PAYMENTS_URL: 'http://payments.railway.internal:3001',
      AUTH_URL: 'http://auth.railway.internal:3002',
      FUNNEL_URL: 'http://funnel.railway.internal:4321',
      CATALOG_URL: 'http://catalog.railway.internal:3003',
      MEMBERS_URL: 'http://members.railway.internal:3004',
      MESSAGING_URL: 'http://messaging.railway.internal:3006',
      FISCAL_URL: 'http://fiscal.railway.internal:3009',
      HUB_URL: 'http://hub.railway.internal:3010',
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
      AUTH_HMAC_SECRET: 'auth-hmac-secret-16chrs',
      AUTH_INTERNAL_TOKEN: 'auth-internal-16-chars!',
      PAYMENTS_INTERNAL_TOKEN: 'payments-internal-16chrs',
      FISCAL_INTERNAL_TOKEN: 'fiscal-internal-token-16',
      FISCAL_HMAC_SECRET: 'fiscal-hmac-secret-16ch',
      HUB_INTERNAL_TOKEN: 'hub-internal-token-16chrs',
      MARKETING_INTERNAL_TOKEN: 'marketing-internal-16ch!',
      MARKETING_HMAC_SECRET: 'marketing-hmac-secret-16',
      PAYMENTS_URL: 'http://payments.railway.internal:3001',
      AUTH_URL: 'http://auth.railway.internal:3002',
      FUNNEL_URL: 'http://funnel.railway.internal:4321',
      CATALOG_URL: 'http://catalog.railway.internal:3003',
      MEMBERS_URL: 'http://members.railway.internal:3004',
      MESSAGING_URL: 'http://messaging.railway.internal:3006',
      FISCAL_URL: 'http://fiscal.railway.internal:3009',
      HUB_URL: 'http://hub.railway.internal:3010',
      JWT_HS256_SECRET: 'segredo-hs256-com-mais-de-32-caracteres',
      JWT_ISSUER: 'sistemazero-auth',
      JWT_AUDIENCE: 'sistemazero',
    })
    const cfg = await loadGatewayConfig(withIssuer, { services: { p: service }, routes })
    expect(cfg.routes).toHaveLength(1)
  })
})

// O boot real valida a config inteira (fail-fast), mas nenhum teste a CARREGAVA — então
// invariantes que valem só sobre as rotas REAIS (audit em rota mutante, ids únicos, novas
// rotas presentes) ficavam sem rede. Asserimos direto sobre o objeto exportado (estático).
describe('gateway.config.ts (configuração real)', () => {
  const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

  test('toda rota audit-marcada declara SÓ métodos mutantes', () => {
    const audited = realConfig.routes.filter((r) => r.audit)
    expect(audited.length).toBeGreaterThan(0) // guarda contra remoção silenciosa do recurso
    for (const r of audited) {
      for (const method of r.methods) {
        expect(MUTATING.has(method)).toBe(true)
      }
    }
  })

  test('ids de rota são únicos', () => {
    const ids = realConfig.routes.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('rotas novas (analytics + leitura de auditoria) presentes como GET autenticado', () => {
    const byId = new Map(realConfig.routes.map((r) => [r.id, r]))
    for (const id of [
      'members-admin-analytics-overview',
      'members-admin-analytics-funnel',
      'auth-admin-audit-list',
    ]) {
      const route = byId.get(id)
      expect(route?.methods).toEqual(['GET'])
      expect(route?.auth).not.toBe('public')
    }
  })
})
