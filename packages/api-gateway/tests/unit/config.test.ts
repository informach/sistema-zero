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
})
