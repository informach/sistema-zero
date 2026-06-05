import { describe, expect, test } from 'bun:test'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'

const r = (o: { id: string; methods: string[]; pathPattern: string }) =>
  routeConfigSchema.parse({ ...o, service: 'p' })

const registry = new RouteRegistry([
  r({ id: 'get', methods: ['GET'], pathPattern: '/payments/:id' }),
  r({ id: 'health', methods: ['GET'], pathPattern: '/payments/health' }),
  r({ id: 'list', methods: ['GET', 'POST'], pathPattern: '/payments' }),
  r({ id: 'my-list', methods: ['GET'], pathPattern: '/payments/my' }),
  r({ id: 'my-get', methods: ['GET'], pathPattern: '/payments/my/:id' }),
  r({ id: 'wild', methods: ['GET'], pathPattern: '/files/*' }),
])

describe('RouteRegistry', () => {
  test('rota estática vence param (longest-prefix/specificity)', () => {
    expect(registry.resolve('GET', '/payments/health', 'v1')?.route.id).toBe('health')
  })

  test('/payments/my (JWT) NÃO cai na rota HMAC /payments/:id', () => {
    // Crítico p/ o app community: literal `my` vence o param `:id`; sem isso a
    // lista de compras exigiria assinatura HMAC (quebra o self-service).
    expect(registry.resolve('GET', '/payments/my', 'v1')?.route.id).toBe('my-list')
    const detail = registry.resolve('GET', '/payments/my/abc-123', 'v1')
    expect(detail?.route.id).toBe('my-get')
    expect(detail?.params.id).toBe('abc-123')
    // Ids comuns continuam caindo na rota consumer.
    expect(registry.resolve('GET', '/payments/uuid-qualquer', 'v1')?.route.id).toBe('get')
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

  test('%-encoding malformado num param NÃO lança (vira o valor bruto, não 500)', () => {
    // decodeURIComponent('%zz') lançaria URIError → o pipeline viraria 500 +
    // log de erro alertável a cada request de scanner. O valor fica como veio.
    const m = registry.resolve('GET', '/payments/%zz', 'v1')
    expect(m?.route.id).toBe('get')
    expect(m?.params.id).toBe('%zz')
    // Encoding válido segue decodificado normalmente.
    expect(registry.resolve('GET', '/payments/a%20b', 'v1')?.params.id).toBe('a b')
  })
})
