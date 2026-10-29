import { expect, test } from 'bun:test'
import { kidsMayAccess } from '../../src/application/auth/kids-access-policy'
import { arquipelagoGateway } from '../../src/infrastructure/config/arquipelago-routes'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'

test('medição só para equipe ativa, rota explícita GET e limite próprio', () => {
  const game = arquipelagoGateway({
    url: 'http://local:3015',
    transforms: [],
    resilience: { timeoutMs: 15_000 },
  })
  const registry = new RouteRegistry(game.routes.map((r) => routeConfigSchema.parse(r)))
  const route = registry.resolve('GET', '/arquipelago/equipe/medicao', 'v1')?.route
  expect(route).toMatchObject({
    authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
    auth: { strategies: ['jwt'] },
    rateLimit: { max: 12, windowMs: 60_000 },
  })
  expect(registry.resolve('POST', '/arquipelago/equipe/medicao', 'v1')).toBeUndefined()
  expect(registry.resolve('GET', '/arquipelago/equipe/medicao/pessoa', 'v1')).toBeUndefined()
})
test('contexto Kids não acessa medição mesmo com papel de equipe na conta', () => {
  const sessionId = crypto.randomUUID()
  for (const path of ['/arquipelago/equipe/medicao', '/arquipelago/EQUIPE/medicao']) {
    expect(
      kidsMayAccess(
        { kind: 'parent', sessionId, authenticatedAt: 1 },
        path,
        'GET',
        crypto.randomUUID(),
      ),
    ).toBe(false)
    expect(
      kidsMayAccess(
        { kind: 'student', sessionId, deviceId: crypto.randomUUID(), grantId: crypto.randomUUID() },
        path,
        'GET',
        crypto.randomUUID(),
      ),
    ).toBe(false)
  }
})
