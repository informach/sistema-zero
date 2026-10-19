import { expect, test } from 'bun:test'
import realConfig from '../../gateway.config'
import { createAuthorizationStage } from '../../src/application/pipeline/stages/authorization.stage'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'
import { makeContext } from '../helpers'

const base = '/members/admin/journey/kids'
const id = '11111111-1111-4111-8111-111111111111'
const reads = [
  ['GET', base],
  ['GET', `${base}/history`],
  ['POST', `${base}/preview`],
  ['GET', `${base}/preparations/${id}`],
] as const
const mutations = [
  ['POST', `${base}/preparations`],
  ['POST', `${base}/preparations/${id}/advance`],
  ['POST', `${base}/preparations/${id}/publish`],
] as const
const registry = () =>
  new RouteRegistry(realConfig.routes.map((route) => routeConfigSchema.parse(route)))

test('Kids configuration declares only its seven bounded JWT routes, with separate read and mutation roles', () => {
  const routes = registry()
  for (const [method, path] of [...reads, ...mutations]) {
    const match = routes.resolve(method, path, 'v1')
    expect(match?.route).toMatchObject({
      service: 'members',
      auth: { required: true, strategies: ['jwt'] },
      authorize: {
        statuses: ['active'],
        roles: reads.some(([readMethod, readPath]) => readMethod === method && readPath === path)
          ? ['superadmin', 'admin', 'staff']
          : ['superadmin', 'admin'],
      },
    })
    if (method === 'POST') expect(match?.route.maxBodyBytes).toBe(512 * 1024)
  }
  for (const [method, path] of [
    ['PUT', base],
    ['DELETE', base],
    ['POST', `${base}/internal`],
    ['POST', `${base}/preparations/${id}/grant`],
  ] as const)
    expect(routes.resolve(method, path, 'v1')).toBeUndefined()
})

test('Kids route policies run through the actual authorization stage for resolved active staff/admin accounts', async () => {
  const routes = registry()
  for (const [method, path] of [...reads, ...mutations]) {
    const match = routes.resolve(method, path, 'v1')
    expect(match).toBeDefined()
    for (const role of ['customer', 'staff', 'admin', 'superadmin']) {
      for (const status of ['active', 'blocked']) {
        const context = makeContext({ method, url: `http://gateway.test${path}` })
        context.route = match!
        context.user = { id, email: '', firstName: 'Equipe', lastName: '', role, status }
        const response = await createAuthorizationStage().run(context)
        const allowed =
          status === 'active' &&
          (role === 'admin' ||
            role === 'superadmin' ||
            (role === 'staff' && reads.some(([m, p]) => m === method && p === path)))
        expect(response?.status ?? 200).toBe(allowed ? 200 : 403)
      }
    }
    const anonymous = makeContext({ method })
    anonymous.route = match!
    expect((await createAuthorizationStage().run(anonymous))?.status).toBe(401)
  }
})
