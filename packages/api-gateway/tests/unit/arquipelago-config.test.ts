import { describe, expect, test } from 'bun:test'
import realConfig from '../../gateway.config'
import { arquipelagoGateway } from '../../src/infrastructure/config/arquipelago-routes'
import { loadEnv } from '../../src/infrastructure/config/env'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { loadGatewayConfig } from '../../src/infrastructure/config/load-gateway-config'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'

const transforms = [
  { type: 'header-inject' as const, options: { headers: { 'x-internal-token': 'x'.repeat(24) } } },
]

describe('Arquipélago Vagalume no gateway', () => {
  test('sem ARQUIPELAGO_URL o gateway não ganha serviço nem rota do jogo', () => {
    expect(process.env.ARQUIPELAGO_URL).toBeUndefined()
    expect(realConfig.services.arquipelago).toBeUndefined()
    expect(realConfig.routes.some((r) => r.pathPattern.startsWith('/arquipelago'))).toBe(false)
  })

  test('com a URL, a config completa valida e as rotas resolvem com o perfil certo', async () => {
    const jogo = arquipelagoGateway({
      url: 'http://arquipelago.local:3015',
      transforms,
      resilience: { timeoutMs: 15_000 },
    })
    // Sem nova tentativa: o PUT repetido com a mesma revisão viraria um falso "outro aparelho".
    expect(jogo.service.retry).toMatchObject({ maxRetries: 0 })
    // A config do jogo sozinha passa pelas mesmas validações do boot...
    await loadGatewayConfig(loadEnv({ JWT_HS256_SECRET: 'j'.repeat(40) }), {
      services: { arquipelago: jogo.service },
      routes: jogo.routes,
    })
    // ...e, junto das rotas reais, não colide com nenhuma delas.
    const ids = new Set(realConfig.routes.map((r) => r.id))
    expect(jogo.routes.filter((r) => ids.has(r.id))).toEqual([])
    const registry = new RouteRegistry(
      [...realConfig.routes, ...jogo.routes].map((r) => routeConfigSchema.parse(r)),
    )
    const salvar = registry.resolve('PUT', '/arquipelago/salvamento', 'v1')?.route
    expect(salvar).toMatchObject({
      id: 'arquipelago-salvamento-put',
      service: 'arquipelago',
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      maxBodyBytes: 96 * 1024,
    })
    expect(salvar?.transforms).toEqual(transforms)
    expect(registry.resolve('GET', '/arquipelago/acesso', 'v1')?.route.id).toBe(
      'arquipelago-acesso',
    )
    expect(registry.resolve('POST', '/arquipelago/tempo', 'v1')?.route.id).toBe('arquipelago-tempo')
    expect(registry.resolve('PUT', '/arquipelago/familia/limite', 'v1')?.route.id).toBe(
      'arquipelago-familia-limite',
    )
    expect(
      registry.resolve('GET', '/arquipelago/cliente/manifesto.json', 'v1')?.route,
    ).toMatchObject({
      id: 'arquipelago-cliente',
      auth: 'public',
    })
    expect(registry.resolve('DELETE', '/arquipelago/salvamento', 'v1')).toBeUndefined()
  })
})
