import { expect, test } from 'bun:test'
import config from '../../gateway.config'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'

const cases = [
  ['GET', '/payments/admin/subscription-recovery/review', ['superadmin', 'admin', 'staff']],
  [
    'POST',
    '/payments/admin/subscription-recovery/payments/id/confirm-period',
    ['superadmin', 'admin'],
  ],
  ['POST', '/payments/admin/subscription-recovery/payments/id/admit', ['superadmin', 'admin']],
  [
    'POST',
    '/payments/admin/subscription-recovery/operations/id/confirm-payment',
    ['superadmin', 'admin'],
  ],
  [
    'POST',
    '/payments/admin/subscription-recovery/cases/id/resolve-subsequent-payment',
    ['superadmin', 'admin'],
  ],
] as const
for (const [method, path, roles] of cases)
  test(`${method} ${path}: financial review is reachable with explicit RBAC`, () => {
    const registry = new RouteRegistry(config.routes.map((route) => routeConfigSchema.parse(route)))
    const route = registry.resolve(method, path, 'v1')?.route
    expect(route).toMatchObject({
      service: 'payments',
      auth: { required: true, strategies: ['jwt'] },
      authorize: { roles: [...roles], statuses: ['active'] },
    })
    if (method === 'POST') expect(route).toMatchObject({ maxBodyBytes: 1024, audit: {} })
    expect(registry.resolve('DELETE', path, 'v1')).toBeUndefined()
  })
for (const suffix of ['retry-intents', 'retry-intents/intent'])
  for (const method of ['GET', 'POST'])
    test(`${method} ${suffix}: the purchaser can regularize the original cycle`, () => {
      const registry = new RouteRegistry(
        config.routes.map((route) => routeConfigSchema.parse(route)),
      )
      const path = `/payments/my/subscriptions/sub/${suffix}`
      const route = registry.resolve(method, path, 'v1')?.route
      expect(route).toMatchObject({
        service: 'payments',
        auth: { required: true, strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
      })
      if (method === 'POST') expect(route).toMatchObject({ maxBodyBytes: 1024, audit: {} })
      expect(registry.resolve('DELETE', path, 'v1')).toBeUndefined()
    })
