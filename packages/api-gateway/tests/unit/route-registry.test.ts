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
  r({ id: 'members-courses', methods: ['GET'], pathPattern: '/members/courses' }),
  r({ id: 'members-course-detail', methods: ['GET'], pathPattern: '/members/courses/:slug' }),
  r({ id: 'gamification-me', methods: ['GET'], pathPattern: '/members/gamification/me' }),
  r({ id: 'avatar-get', methods: ['GET'], pathPattern: '/members/avatar' }),
  r({ id: 'avatar-equip', methods: ['PUT'], pathPattern: '/members/avatar' }),
  r({ id: 'avatar-buy', methods: ['POST'], pathPattern: '/members/avatar/parts/:partId/buy' }),
  r({ id: 'room-get', methods: ['GET'], pathPattern: '/members/room' }),
  r({ id: 'room-save', methods: ['PUT'], pathPattern: '/members/room' }),
  r({ id: 'room-buy', methods: ['POST'], pathPattern: '/members/room/items/:itemId/buy' }),
  r({ id: 'missions-me', methods: ['GET'], pathPattern: '/members/gamification/missions/me' }),
  r({
    id: 'mission-claim',
    methods: ['POST'],
    pathPattern: '/members/gamification/missions/:slug/claim',
  }),
  r({
    id: 'freeze-buy',
    methods: ['POST'],
    pathPattern: '/members/gamification/streak-freeze/buy',
  }),
  r({ id: 'vacation', methods: ['PUT'], pathPattern: '/members/gamification/vacation' }),
  r({ id: 'league-me', methods: ['GET'], pathPattern: '/members/gamification/league/me' }),
  r({
    id: 'members-profile-public',
    methods: ['GET'],
    pathPattern: '/members/profiles/:profileId/public',
  }),
  r({ id: 'profile-select', methods: ['POST'], pathPattern: '/auth/profiles/:id/select' }),
  r({
    id: 'auth-internal-profile-public',
    methods: ['GET'],
    pathPattern: '/auth/internal/profiles/:id/public',
  }),
  r({ id: 'user-get', methods: ['GET'], pathPattern: '/auth/admin/users/:id' }),
  r({
    id: 'user-impersonate',
    methods: ['POST'],
    pathPattern: '/auth/admin/users/:id/impersonate',
  }),
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

  test('/auth/admin/users/:id/impersonate NÃO colide com /auth/admin/users/:id', () => {
    // O matcher exige nº igual de segmentos: 4 segmentos (impersonate) nunca caem
    // na rota de 3 (detalhe do usuário) — e vice-versa.
    const m = registry.resolve('POST', '/auth/admin/users/u-123/impersonate', 'v1')
    expect(m?.route.id).toBe('user-impersonate')
    expect(m?.params.id).toBe('u-123')
    expect(registry.resolve('GET', '/auth/admin/users/u-123', 'v1')?.route.id).toBe('user-get')
    // POST no detalhe (sem /impersonate) não existe → undefined.
    expect(registry.resolve('POST', '/auth/admin/users/u-123', 'v1')).toBeUndefined()
  })

  test('/members/gamification/me resolve na rota própria (não colide com /members/courses/:slug)', () => {
    expect(registry.resolve('GET', '/members/gamification/me', 'v1')?.route.id).toBe(
      'gamification-me',
    )
    expect(registry.resolve('GET', '/members/courses/meu-curso', 'v1')?.route.id).toBe(
      'members-course-detail',
    )
    // Sem POST/PUT declarados → método não exposto.
    expect(registry.resolve('POST', '/members/gamification/me', 'v1')).toBeUndefined()
  })

  test('/members/avatar resolve por método; /parts/:id/buy (4 seg) não colide', () => {
    expect(registry.resolve('GET', '/members/avatar', 'v1')?.route.id).toBe('avatar-get')
    expect(registry.resolve('PUT', '/members/avatar', 'v1')?.route.id).toBe('avatar-equip')
    const buy = registry.resolve('POST', '/members/avatar/parts/cabelo-cacheado/buy', 'v1')
    expect(buy?.route.id).toBe('avatar-buy')
    expect(buy?.params.partId).toBe('cabelo-cacheado')
    // 2 segmentos (avatar) nunca caem no buy de 4 segmentos.
    expect(registry.resolve('POST', '/members/avatar', 'v1')).toBeUndefined()
  })

  test('/members/room resolve por método; /items/:id/buy (4 seg) não colide', () => {
    expect(registry.resolve('GET', '/members/room', 'v1')?.route.id).toBe('room-get')
    expect(registry.resolve('PUT', '/members/room', 'v1')?.route.id).toBe('room-save')
    const buy = registry.resolve('POST', '/members/room/items/sofa/buy', 'v1')
    expect(buy?.route.id).toBe('room-buy')
    expect(buy?.params.itemId).toBe('sofa')
  })

  test('missões: /missions/me (estático) vence /missions/:slug/claim; rotas distintas', () => {
    expect(registry.resolve('GET', '/members/gamification/missions/me', 'v1')?.route.id).toBe(
      'missions-me',
    )
    const claim = registry.resolve('POST', '/members/gamification/missions/daily-quiz/claim', 'v1')
    expect(claim?.route.id).toBe('mission-claim')
    expect(claim?.params.slug).toBe('daily-quiz')
    expect(
      registry.resolve('POST', '/members/gamification/streak-freeze/buy', 'v1')?.route.id,
    ).toBe('freeze-buy')
    expect(registry.resolve('PUT', '/members/gamification/vacation', 'v1')?.route.id).toBe(
      'vacation',
    )
    expect(registry.resolve('GET', '/members/gamification/league/me', 'v1')?.route.id).toBe(
      'league-me',
    )
  })

  test('perfil público: /members/profiles/:id/public e /auth/internal/profiles/:id/public', () => {
    const m = registry.resolve('GET', '/members/profiles/abc-123/public', 'v1')
    expect(m?.route.id).toBe('members-profile-public')
    expect(m?.params.profileId).toBe('abc-123')
    // O auth-internal (5 seg) não colide com /auth/profiles/:id/select (4 seg).
    const a = registry.resolve('GET', '/auth/internal/profiles/abc-123/public', 'v1')
    expect(a?.route.id).toBe('auth-internal-profile-public')
    expect(a?.params.id).toBe('abc-123')
    expect(registry.resolve('POST', '/auth/profiles/abc-123/select', 'v1')?.route.id).toBe(
      'profile-select',
    )
  })

  test('showcase-thread-studio (kid-driven) NÃO colide com showcase-thread', () => {
    // Dois literais distintos de 3 segmentos — o matcher resolve cada um no seu id.
    const reg = new RouteRegistry([
      r({ id: 'sc', methods: ['POST'], pathPattern: '/hub/internal/showcase-thread' }),
      r({
        id: 'sc-studio',
        methods: ['POST'],
        pathPattern: '/hub/internal/showcase-thread-studio',
      }),
    ])
    expect(reg.resolve('POST', '/hub/internal/showcase-thread', 'v1')?.route.id).toBe('sc')
    expect(reg.resolve('POST', '/hub/internal/showcase-thread-studio', 'v1')?.route.id).toBe(
      'sc-studio',
    )
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
