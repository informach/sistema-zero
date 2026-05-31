import { describe, expect, test } from 'bun:test'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'

const r = (o: { id: string; methods: string[]; pathPattern: string }) =>
  routeConfigSchema.parse({ ...o, service: 'p' })

const registry = new RouteRegistry([
  r({ id: 'get', methods: ['GET'], pathPattern: '/payments/:id' }),
  r({ id: 'health', methods: ['GET'], pathPattern: '/payments/health' }),
  r({ id: 'list', methods: ['GET', 'POST'], pathPattern: '/payments' }),
  r({ id: 'wild', methods: ['GET'], pathPattern: '/files/*' }),
])

describe('RouteRegistry', () => {
  test('rota estática vence param (longest-prefix/specificity)', () => {
    expect(registry.resolve('GET', '/payments/health', 'v1')?.route.id).toBe('health')
  })

  test('captura params', () => {
    const m = registry.resolve('GET', '/payments/123', 'v1')
    expect(m?.route.id).toBe('get')
    expect(m?.params.id).toBe('123')
  })

  test('rota exata e filtro por método', () => {
    expect(registry.resolve('GET', '/payments', 'v1')?.route.id).toBe('list')
    expect(registry.resolve('POST', '/payments', 'v1')?.route.id).toBe('list')
    expect(registry.resolve('DELETE', '/payments', 'v1')).toBeUndefined()
  })

  test('wildcard casa o resto', () => {
    const m = registry.resolve('GET', '/files/a/b/c.png', 'v1')
    expect(m?.route.id).toBe('wild')
    expect(m?.params['*']).toBe('a/b/c.png')
  })

  test('rota inexistente → undefined', () => {
    expect(registry.resolve('GET', '/unknown', 'v1')).toBeUndefined()
  })
})
