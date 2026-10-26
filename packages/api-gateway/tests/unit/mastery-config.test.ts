import { expect, test } from 'bun:test'
import config from '../../gateway.config'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'

test('Maestrias expose exact authenticated learner and staff routes without granting arbitrary writes', () => {
  const registry = new RouteRegistry(config.routes.map((route) => routeConfigSchema.parse(route)))
  for (const path of ['/members/journey/masteries', '/members/journey/masteries/evidence'])
    expect(registry.resolve('GET', path, 'v1')?.route).toMatchObject({
      auth: { required: true, strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
    })
  const submit = registry.resolve(
    'POST',
    '/members/journey/masteries/python2d/levels/1/submissions',
    'v1',
  )?.route
  expect(submit?.maxBodyBytes).toBe(16 * 1024)
  for (const [method, path] of [
    ['GET', '/members/admin/journey/masteries/submissions'],
    ['GET', '/members/admin/journey/masteries/submissions/uuid'],
    ['POST', '/members/admin/journey/masteries/submissions/uuid/review'],
    ['POST', '/members/admin/studio/mastery-review-runtime'],
  ] as const)
    expect(registry.resolve(method, path, 'v1')?.route).toMatchObject({
      auth: { strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
    })
  for (const [method, path] of [
    ['DELETE', '/members/admin/journey/masteries/submissions/uuid'],
    ['POST', '/members/admin/journey/masteries/grant'],
    ['PUT', '/members/journey/masteries/python2d'],
    ['POST', '/members/journey/masteries/evidence'],
  ] as const)
    expect(registry.resolve(method, path, 'v1')).toBeUndefined()
})
