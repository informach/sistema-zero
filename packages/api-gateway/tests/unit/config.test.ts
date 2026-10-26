import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { SECTION_PYTHON_PROJECT_TEST_BODY_BYTES } from '@sistemazero/core/learning'
import realConfig from '../../gateway.config'
import { loadEnv } from '../../src/infrastructure/config/env'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { loadGatewayConfig } from '../../src/infrastructure/config/load-gateway-config'
import { RouteRegistry } from '../../src/infrastructure/routing/route-registry'

const env = loadEnv({})
const service = { name: 'p', upstreamGroups: { default: [{ url: 'http://p' }] } }

describe('loadGatewayConfig', () => {
  test('política de regularização tem leitura staff e escrita admin, limitada e auditada', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(
      registry.resolve('GET', '/payments/admin/subscription-recovery/policy', 'v1')?.route,
    ).toMatchObject({
      id: 'payments-admin-recovery-policy-read',
      auth: { strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
    })
    expect(
      registry.resolve('PUT', '/payments/admin/subscription-recovery/policy', 'v1')?.route,
    ).toMatchObject({
      id: 'payments-admin-recovery-policy-write',
      auth: { strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      maxBodyBytes: 1024,
      audit: {},
    })
    expect(
      registry.resolve('POST', '/payments/admin/subscription-recovery/policy', 'v1'),
    ).toBeUndefined()
  })
  test('retirada de mensagem exige consumidor HMAC e rota própria limitada', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(registry.resolve('POST', '/messaging/messages/id/suppress', 'v1')?.route).toMatchObject({
      id: 'messaging-message-suppress',
      service: 'messaging',
      maxBodyBytes: 1024,
      auth: { required: true, strategies: ['hmac'] },
    })
    expect(registry.resolve('DELETE', '/messaging/messages/id/suppress', 'v1')).toBeUndefined()
  })
  test('alteração de cartão usa rotas próprias autenticadas e limites de escrita', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    for (const [method, path, id] of [
      ['GET', '/payments/my/card-config', 'payments-my-card-config'],
      ['GET', '/payments/my/subscriptions/sub/card-intents', 'payments-my-card-intent-read'],
      ['POST', '/payments/my/subscriptions/sub/card-intents', 'payments-my-card-intent-create'],
      [
        'GET',
        '/payments/my/subscriptions/sub/card-intents/intent',
        'payments-my-card-intent-status',
      ],
      ['POST', '/payments/my/subscriptions/sub/card-intents/intent', 'payments-my-card-update'],
    ]) {
      const route = registry.resolve(method!, path!, 'v1')?.route
      expect(route).toMatchObject({
        id,
        service: 'payments',
        auth: { required: true, strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
      })
      if (method === 'POST') expect(route).toMatchObject({ maxBodyBytes: 1024, audit: {} })
      expect(registry.resolve('PUT', path!, 'v1')).toBeUndefined()
    }
  })
  test('jornada adulta tem leitura autenticada e configuração restrita à equipe', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(registry.resolve('GET', '/members/journey/adult', 'v1')?.route).toMatchObject({
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
    })
    for (const method of ['GET', 'PUT'])
      expect(registry.resolve(method, '/members/admin/journey/adult', 'v1')?.route).toMatchObject({
        auth: { strategies: ['jwt'] },
        authorize: { statuses: ['active'], roles: ['superadmin', 'admin', 'staff'] },
      })
  })
  test('live execution resolves its exact authenticated bounded route before generic room actions', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(
      registry.resolve('POST', '/members/live/workspaces/project/runtime', 'v1')?.route,
    ).toMatchObject({
      id: 'members-live-runtime',
      methods: ['POST'],
      maxBodyBytes: 2_000_000,
      auth: { required: true, strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
    })
  })
  test('Studio lesson admission and execution have exact authenticated POST routes', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    for (const suffix of ['context', 'runtime']) {
      const path = `/members/lessons/lesson/blocks/block/studio-${suffix}`
      expect(registry.resolve('POST', path, 'v1')?.route).toMatchObject({
        id: `members-studio-lesson-${suffix}`,
        service: 'members',
        auth: { required: true, strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
      })
      for (const method of ['GET', 'PATCH', 'DELETE'])
        expect(registry.resolve(method, path, 'v1')).toBeUndefined()
      expect(registry.resolve('POST', `${path}/other`, 'v1')).toBeUndefined()
    }
  })
  test('saved live publication has its own exact authenticated bounded route, independent of writer runtime', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    const path = '/members/live/workspaces/project/publication-runtime'
    expect(registry.resolve('POST', path, 'v1')?.route).toMatchObject({
      id: 'members-studio-live-publication-runtime',
      maxBodyBytes: 2_000_000,
      auth: { required: true, strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
    })
    for (const method of ['GET', 'PATCH', 'DELETE'])
      expect(registry.resolve(method, path, 'v1')?.route.id).not.toBe(
        'members-studio-live-publication-runtime',
      )
  })
  test('Studio authoring catalog is an exact staff GET route, never a public execution grant', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(
      registry.resolve('GET', '/members/admin/studio/authoring-options', 'v1')?.route,
    ).toMatchObject({
      id: 'members-admin-studio-authoring-options',
      service: 'members',
      auth: { required: true, strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
    })
    for (const method of ['POST', 'PATCH', 'DELETE'] as const)
      expect(
        registry.resolve(method, '/members/admin/studio/authoring-options', 'v1'),
      ).toBeUndefined()
    expect(
      registry.resolve('GET', '/members/admin/studio/authoring-options/execute', 'v1'),
    ).toBeUndefined()
  })
  test('Instagram publica apenas o webhook exato; inbox exige equipe e atribuição exige HMAC do marketing', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(registry.resolve('POST', '/marketing/webhooks/instagram', 'v1')?.route.auth).toBe(
      'public',
    )
    for (const path of [
      '/marketing/webhooks/instagram/extra',
      '/marketing/workspace/engagement/accounts',
    ])
      expect(registry.resolve('POST', path, 'v1')?.route).toMatchObject({
        auth: { strategies: ['jwt'] },
        authorize: { statuses: ['active'], roles: ['superadmin', 'admin', 'staff'] },
      })
    expect(
      registry.resolve('POST', '/funnel/internal/marketing-attribution', 'v1')?.route,
    ).toMatchObject({
      auth: { strategies: ['hmac'], allowedConsumers: ['marketing'] },
      maxBodyBytes: 8192,
    })
  })
  test('publicação da KB exige admin e vence o wildcard staff do Helpdesk', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    for (const action of ['publish', 'unpublish', 'archive']) {
      expect(registry.resolve('POST', `/helpdesk/kb/article/${action}`, 'v1')?.route).toMatchObject(
        {
          id: `helpdesk-kb-${action}`,
          authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
          audit: {},
        },
      )
    }
    expect(registry.resolve('POST', '/helpdesk/kb', 'v1')?.route.authorize?.roles).toContain(
      'staff',
    )
    expect(
      registry.resolve('PATCH', '/helpdesk/kb/article', 'v1')?.route.authorize?.roles,
    ).toContain('staff')
  })
  test('staff facade preserves user credentials only to auth; delegated messaging stays HMAC auth-only', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(registry.resolve('POST', '/auth/staff/operations', 'v1')?.route).toMatchObject({
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'], roles: ['superadmin', 'admin', 'staff'] },
      upstreamAuth: 'passthrough',
      timeoutMs: 65000,
    })
    expect(registry.resolve('POST', '/messaging/staff/send', 'v1')?.route).toMatchObject({
      auth: { strategies: ['hmac'], allowedConsumers: ['auth'] },
    })
    expect(registry.resolve('POST', '/messaging/send', 'v1')?.route).toMatchObject({
      auth: { strategies: ['hmac'] },
    })
  })
  test('Studio credentials, usage and reconciliation require member-shell HMAC, never a browser JWT', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    for (const endpoint of ['account', 'usage', 'reconcile', 'builder/availability']) {
      const route = registry.resolve('POST', `/members/internal/studio-ai/${endpoint}`, 'v1')?.route
      expect(route).toMatchObject({
        auth: { strategies: ['hmac'], allowedConsumers: ['member-shell'] },
        maxBodyBytes: 4096,
      })
      expect(route?.audit).toBeUndefined()
    }
  })
  test('browser session routes are bounded POST-only identity endpoints', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    for (const action of ['exchange', 'access', 'disconnect']) {
      const path = `/auth/browser/session/${action}`
      expect(registry.resolve('POST', path, 'v1')?.route).toMatchObject({
        id: `auth-browser-${action}`,
        service: 'auth',
        upstreamAuth: 'passthrough',
        maxBodyBytes: 4096,
      })
      expect(registry.resolve('GET', path, 'v1')).toBeUndefined()
      expect(registry.resolve('DELETE', path, 'v1')).toBeUndefined()
    }
  })
  test('live boundaries preserve actors and reserve material registration for the BFF', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(registry.resolve('GET', '/members/live/catalog', 'v1')?.route).toMatchObject({
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
    })
    expect(registry.resolve('POST', '/members/admin/live/programs', 'v1')?.route).toMatchObject({
      authorize: { roles: ['superadmin', 'admin'] },
    })
    // Cursos ao vivo: turma do curso (admin, auditada); gravação ao Vimeo pela equipe da turma.
    expect(
      registry.resolve('POST', '/members/admin/live/courses/c/cohorts', 'v1')?.route,
    ).toMatchObject({
      id: 'members-admin-live-course-cohort-create',
      authorize: { roles: ['superadmin', 'admin'] },
      audit: {},
    })
    expect(
      registry.resolve('GET', '/members/admin/live/occurrences/o/recording/source', 'v1')?.route,
    ).toMatchObject({
      id: 'members-live-recording-source',
      authorize: { roles: ['superadmin', 'admin', 'staff'] },
    })
    expect(
      registry.resolve('PUT', '/members/admin/live/occurrences/o/recording/vimeo', 'v1')?.route,
    ).toMatchObject({
      id: 'members-live-recording-vimeo',
      authorize: { roles: ['superadmin', 'admin', 'staff'] },
      audit: {},
    })
    // O funil do Pensa v2: leitura da equipe, sem cair em outro padrão de admin.
    expect(registry.resolve('GET', '/members/admin/pensa/funnel', 'v1')?.route).toMatchObject({
      id: 'members-admin-pensa-funnel',
      authorize: { roles: ['superadmin', 'admin', 'staff'] },
    })
    expect(registry.resolve('POST', '/members/admin/pensa/funnel', 'v1')).toBeUndefined()
    // The child's project by block stays under the authenticated child routes.
    expect(registry.resolve('GET', '/members/live/workspaces', 'v1')?.route.id).toBe('members-live')
    expect(
      registry.resolve('POST', '/members/admin/live/workspaces/a/cursor', 'v1')?.route.id,
    ).toBe('members-live-cursor')
    expect(
      registry.resolve('POST', '/members/admin/live/workspaces/a/return', 'v1')?.route,
    ).toMatchObject({ authorize: { roles: ['superadmin', 'admin', 'staff'] } })
    expect(registry.resolve('POST', '/members/internal/live/materials', 'v1')?.route).toMatchObject(
      { auth: { strategies: ['hmac'], allowedConsumers: ['member-shell'] }, maxBodyBytes: 4096 },
    )
    expect(registry.resolve('GET', '/members/internal/live/materials', 'v1')).toBeUndefined()
    // Cohort edits (status, assigned teachers): admin-only and audited.
    expect(registry.resolve('PATCH', '/members/admin/live/cohorts/a', 'v1')?.route).toMatchObject({
      id: 'members-admin-live-cohort-update',
      authorize: { roles: ['superadmin', 'admin'] },
      audit: {},
    })
    // Cursos ao vivo: as anotações da professora são leitura de equipe (o members confere a
    // professora atribuída), nunca da criança; não há escrita nesse caminho.
    expect(
      registry.resolve('GET', '/members/admin/live/lessons/a/teacher-notes', 'v1')?.route,
    ).toMatchObject({
      id: 'members-admin-live-teacher-notes',
      service: 'members',
      auth: { strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
    })
    expect(
      registry.resolve('POST', '/members/admin/live/lessons/a/teacher-notes', 'v1')?.route.id,
    ).not.toBe('members-admin-live-teacher-notes')
  })
  test('self-service mutante da conta é autenticado no gateway e preserva o Bearer', () => {
    const byId = new Map(realConfig.routes.map((route) => [route.id, route]))

    for (const id of ['auth-me-update', 'auth-me-password']) {
      expect(byId.get(id)).toMatchObject({
        auth: { required: true, mode: 'any', strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
        upstreamAuth: 'passthrough',
      })
    }
  })

  test('config real expõe o batch de perfis somente com JWT staff+', () => {
    const route = realConfig.routes.find((item) => item.id === 'auth-admin-profiles-batch')
    expect(route).toMatchObject({
      methods: ['POST'],
      pathPattern: '/auth/admin/profiles/batch',
      service: 'auth',
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
    })
    expect(route?.auth).not.toBe('public')
  })

  test('"Como fazer": a criança lê com qualquer conta ativa; a escrita é admin+ com auditoria', () => {
    const byId = new Map(realConfig.routes.map((route) => [route.id, route]))
    expect(byId.get('members-help-read')).toMatchObject({
      methods: ['GET'],
      pathPattern: '/members/help/*',
      service: 'members',
      auth: { required: true, mode: 'any', strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
    })
    // Sem `roles`: perfil só com o gratuito ou o Desafio também lê.
    expect(byId.get('members-help-read')?.authorize).not.toHaveProperty('roles')
    expect(byId.get('members-admin-help-read')).toMatchObject({
      methods: ['GET'],
      pathPattern: '/members/admin/help/*',
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
    })
    expect(byId.get('members-admin-help-write')).toMatchObject({
      methods: ['POST', 'PATCH', 'PUT'],
      pathPattern: '/members/admin/help/*',
      authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
      audit: {},
    })
    expect(byId.get('members-admin-help-write')?.maxBodyBytes).toBeGreaterThan(64 * 1024)
  })

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

  test('rate limit por campo JSON exige que HMAC autentique o corpo', async () => {
    const route = {
      id: 'body-rate-limit',
      methods: ['POST'] as const,
      pathPattern: '/x',
      service: 'p',
      rateLimit: { max: 10, by: 'json-field' as const, field: 'actor.userId' },
    }

    await expect(
      loadGatewayConfig(env, {
        services: { p: service },
        routes: [
          {
            ...route,
            auth: { required: true, mode: 'any', strategies: ['jwt', 'hmac'] },
          },
        ],
      }),
    ).rejects.toThrow(/autenticado por HMAC/)

    const cfg = await loadGatewayConfig(env, {
      consumers: [{ id: 'member-shell', hmacSecret: 'secret-with-16-chars' }],
      services: { p: service },
      routes: [
        {
          ...route,
          auth: { required: true, mode: 'any', strategies: ['hmac'] },
        },
      ],
    })
    expect(cfg.routes[0]?.rateLimit).toMatchObject({ by: 'json-field', field: 'actor.userId' })
  })

  test('produção: rota jwt sem JWT_ISSUER/JWT_AUDIENCE → erro', async () => {
    const prodEnv = loadEnv({
      NODE_ENV: 'production',
      TRUST_PROXY: 'true',
      METRICS_TOKEN: 'metrics-token-com-16-chars',
      MEMBERS_INTERNAL_TOKEN: 'members-internal-16chars',
      CATALOG_INTERNAL_TOKEN: 'catalog-internal-16chars',
      MESSAGING_INTERNAL_TOKEN: 'messaging-internal-16ch',
      MEMBER_SHELL_HMAC_SECRET: 'member-shell-hmac-secret-16ch',
      AUTH_HMAC_SECRET: 'auth-hmac-secret-16chrs',
      AUTH_INTERNAL_TOKEN: 'auth-internal-16-chars!',
      PAYMENTS_INTERNAL_TOKEN: 'payments-internal-16chrs',
      FISCAL_INTERNAL_TOKEN: 'fiscal-internal-token-16',
      FISCAL_HMAC_SECRET: 'fiscal-hmac-secret-16ch',
      HUB_INTERNAL_TOKEN: 'hub-internal-token-16chrs',
      MARKETING_INTERNAL_TOKEN: 'marketing-internal-16ch!',
      MARKETING_HMAC_SECRET: 'marketing-hmac-secret-16',
      HELPDESK_INTERNAL_TOKEN: 'helpdesk-internal-16chr!',
      REFERRALS_INTERNAL_TOKEN: 'referrals-internal-16c!',
      REFERRALS_HMAC_SECRET: 'referrals-hmac-16chars!',
      PAYMENTS_URL: 'http://payments.railway.internal:3001',
      AUTH_URL: 'http://auth.railway.internal:3002',
      FUNNEL_URL: 'http://funnel.railway.internal:4321',
      CATALOG_URL: 'http://catalog.railway.internal:3003',
      MEMBERS_URL: 'http://members.railway.internal:3004',
      MESSAGING_URL: 'http://messaging.railway.internal:3006',
      FISCAL_URL: 'http://fiscal.railway.internal:3009',
      HUB_URL: 'http://hub.railway.internal:3010',
      REFERRALS_URL: 'http://referrals.railway.internal:3012',
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
      MEMBER_SHELL_HMAC_SECRET: 'member-shell-hmac-secret-16ch',
      AUTH_HMAC_SECRET: 'auth-hmac-secret-16chrs',
      AUTH_INTERNAL_TOKEN: 'auth-internal-16-chars!',
      PAYMENTS_INTERNAL_TOKEN: 'payments-internal-16chrs',
      FISCAL_INTERNAL_TOKEN: 'fiscal-internal-token-16',
      FISCAL_HMAC_SECRET: 'fiscal-hmac-secret-16ch',
      HUB_INTERNAL_TOKEN: 'hub-internal-token-16chrs',
      MARKETING_INTERNAL_TOKEN: 'marketing-internal-16ch!',
      MARKETING_HMAC_SECRET: 'marketing-hmac-secret-16',
      HELPDESK_INTERNAL_TOKEN: 'helpdesk-internal-16chr!',
      REFERRALS_INTERNAL_TOKEN: 'referrals-internal-16c!',
      REFERRALS_HMAC_SECRET: 'referrals-hmac-16chars!',
      PAYMENTS_URL: 'http://payments.railway.internal:3001',
      AUTH_URL: 'http://auth.railway.internal:3002',
      FUNNEL_URL: 'http://funnel.railway.internal:4321',
      CATALOG_URL: 'http://catalog.railway.internal:3003',
      MEMBERS_URL: 'http://members.railway.internal:3004',
      MESSAGING_URL: 'http://messaging.railway.internal:3006',
      FISCAL_URL: 'http://fiscal.railway.internal:3009',
      HUB_URL: 'http://hub.railway.internal:3010',
      REFERRALS_URL: 'http://referrals.railway.internal:3012',
      JWT_HS256_SECRET: 'segredo-hs256-com-mais-de-32-caracteres',
      JWT_ISSUER: 'sistemazero-auth',
      JWT_AUDIENCE: 'sistemazero',
    })
    const cfg = await loadGatewayConfig(withIssuer, { services: { p: service }, routes })
    expect(cfg.routes).toHaveLength(1)
  })
})

// O boot real valida a config inteira (fail-fast), mas nenhum teste a CARREGAVA — então
// invariantes que valem só sobre as rotas REAIS ficavam sem rede. O subprocesso prova
// o carregamento com credenciais de fixture; as demais asserções conferem as rotas exportadas.
describe('gateway.config.ts (configuração real)', () => {
  async function bootRealConfig(bodyLimit?: string, paymentsSecret?: string) {
    const child = Bun.spawn(
      [
        process.execPath,
        '-e',
        `import { loadEnv } from './src/infrastructure/config/env';
         import { loadGatewayConfig } from './src/infrastructure/config/load-gateway-config';
         const config = await loadGatewayConfig(loadEnv(process.env));
         console.log(JSON.stringify({routes: config.routes.length,
           builderLimit: config.routes.find(r => r.id === 'members-internal-studio-builder')?.maxBodyBytes,
           paymentsRoutes: config.consumers.find(c => c.id === 'payments')?.allowedRouteIds}));`,
      ],
      {
        cwd: fileURLToPath(new URL('../..', import.meta.url)),
        env: {
          NODE_ENV: 'test',
          JWT_JWKS_URL: 'http://localhost/jwks',
          GATEWAY_CONSUMER_ID: 'gateway',
          GATEWAY_HMAC_SECRET: 'gateway-test-secret-with-32-characters',
          FUNNEL_HMAC_SECRET: 'funnel-test-secret-with-32-characters',
          FUNNEL_INTERNAL_TOKEN: 'funnel-test-token-with-32-characters',
          ...(bodyLimit ? { MAX_REQUEST_BODY_BYTES: bodyLimit } : {}),
          ...(paymentsSecret ? { PAYMENTS_HMAC_SECRET: paymentsSecret } : {}),
        },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    return { code, stdout, stderr }
  }

  test('carrega todas as rotas reais com o teto de corpo padrão', async () => {
    const result = await bootRealConfig()
    expect(result.stderr).toBe('')
    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      routes: realConfig.routes.length,
      builderLimit: 3_004_096,
    })
  })

  test('recusa teto explícito que impede o corpo do builder do Studio', async () => {
    const result = await bootRealConfig('2097152')
    expect(result.code).not.toBe(0)
    expect(result.stderr).toMatch(/members-internal-studio-builder.*MAX_REQUEST_BODY_BYTES/)
  })

  test('o teto padrão comporta a verificação Python; um teto explícito menor continua recusado', async () => {
    expect(loadEnv({}).MAX_REQUEST_BODY_BYTES).toBe(SECTION_PYTHON_PROJECT_TEST_BODY_BYTES)
    const result = await bootRealConfig('3004096')
    expect(result.code).not.toBe(0)
    expect(result.stderr).toMatch(
      /members-admin-python-project-checks-test.*MAX_REQUEST_BODY_BYTES/,
    )
  })

  test('Payments só é cadastrado com segredo próprio e recebe quatro capacidades de comunicação', async () => {
    const result = await bootRealConfig(undefined, 'qa-payments-secret-with-32-characters')
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(JSON.parse(result.stdout).paymentsRoutes).toEqual([
      'messaging-send',
      'messaging-message-get',
      'messaging-message-suppress',
      'messaging-intent-suppress',
    ])
    const ids = new Set(realConfig.routes.map((route) => route.id))
    for (const id of JSON.parse(result.stdout).paymentsRoutes) expect(ids.has(id)).toBe(true)
  })

  test('consulta do curso-presente é exclusiva do referrals e re-assinada para members', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    const matched = registry.resolve('GET', '/members/webhooks/gift-course/cade-todo-mundo', 'v1')
    expect(matched?.route).toMatchObject({
      id: 'members-webhook-gift-course',
      service: 'members',
      auth: { strategies: ['hmac'], allowedConsumers: ['referrals'] },
      upstreamAuth: 'resign',
    })
    expect(matched?.params.slug).toBe('cade-todo-mundo')
  })

  test('gallery preparation belongs to the active student; confirmation requires a signed actor', () => {
    const prepare = realConfig.routes.find((route) => route.id === 'members-gallery-prepare')
    const commit = realConfig.routes.find((route) => route.id === 'members-gallery-commit')
    expect(prepare).toMatchObject({
      methods: ['POST'],
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
    })
    expect(commit).toMatchObject({
      methods: ['POST'],
      auth: { strategies: ['hmac'] },
      rateLimit: { by: 'json-field', field: 'actor.userId' },
    })
    expect(commit?.maxBodyBytes).toBeGreaterThanOrEqual(1_500_000)
  })
  test('project checks reach members through the real route registry with a project-sized body', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    const matched = registry.resolve(
      'POST',
      '/members/lessons/lesson/sections/section/project-check',
      'v1',
    )
    expect(matched?.route).toMatchObject({
      service: 'members',
      auth: { required: true, strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      maxBodyBytes: 2 * 1024 * 1024,
      rateLimit: { by: 'principal' },
      timeoutMs: 160_000,
    })
    expect(
      registry.resolve('POST', '/members/admin/project-checks/test', 'v1')?.route,
    ).toMatchObject({
      service: 'members',
      auth: { required: true, strategies: ['jwt'] },
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      maxBodyBytes: 2 * 1024 * 1024,
      timeoutMs: 160_000,
    })
  })
  /**
   * A cor do perfil. O teto de 60/min por principal é CIRCUITO DE SEGURANÇA — foi ele que pegou o
   * laço de `setTheme` martelando a rota antiga. Quem junta os cliques é o cliente.
   */
  test('a cor do perfil atende GET e PUT em /members/preferences, com token interno', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    for (const metodo of ['GET', 'PUT'] as const) {
      const casado = registry.resolve(metodo, '/members/preferences', 'v1')
      expect({ metodo, id: casado?.route.id }).toEqual({ metodo, id: 'members-profile-palette' })
      expect(casado?.route).toMatchObject({
        service: 'members',
        auth: { required: true, strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      })
    }
    // Sem o `x-internal-token` o members recusa — e os `x-auth-user-*` seriam forjáveis. A lista
    // é condicional à env (vazia em dev), então o que se cobra é ser a MESMA das outras rotas de
    // aluno, não o conteúdo dela.
    const paleta = realConfig.routes.find((r) => r.id === 'members-profile-palette')
    const vizinha = realConfig.routes.find((r) => r.id === 'members-section-help')
    expect(paleta?.transforms).toBe(vizinha?.transforms)
    // ⚠️ A rota LEGADA morreu na etapa 7. Se ela voltar, volta junto o mapeamento `padrao ↔ null`
    // que o catálogo de cores aposentou.
    expect(registry.resolve('PUT', '/members/preferences/kids', 'v1')).toBeUndefined()
  })

  test('seções e atividades preservam JWT ativo, token interno e limites nas rotas explícitas', () => {
    const routes = realConfig.routes.filter(
      (route) => route.id.startsWith('members-learning-') || route.id === 'members-section-help',
    )
    expect(routes).toHaveLength(4)
    for (const route of routes) {
      expect(route).toMatchObject({
        service: 'members',
        auth: { required: true, strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
        rateLimit: { by: 'principal' },
      })
      expect(route.transforms).toBeDefined()
      expect(route.pathPattern).not.toContain('*')
      expect(route.maxBodyBytes).toBeLessThanOrEqual(64 * 1024)
    }
  })
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

  test('portal do helpdesk aceita somente JWT de conta ativa e conserva o token interno', () => {
    const byId = new Map(realConfig.routes.map((route) => [route.id, route]))
    for (const id of ['helpdesk-portal-read', 'helpdesk-portal-write']) {
      expect(byId.get(id)).toMatchObject({
        pathPattern: '/helpdesk/portal/*',
        service: 'helpdesk',
        auth: { required: true, mode: 'any', strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
      })
      expect(byId.get(id)?.transforms).toBeDefined()
    }
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

  test('rankings do aluno e do admin preservam autenticação e token interno', () => {
    const byId = new Map(realConfig.routes.map((route) => [route.id, route]))
    expect(byId.get('members-gamification-ranking')).toMatchObject({
      methods: ['GET'],
      pathPattern: '/members/gamification/ranking',
      authorize: { statuses: ['active'] },
    })
    expect(byId.get('members-admin-gamification-ranking')).toMatchObject({
      methods: ['GET'],
      pathPattern: '/members/admin/gamification/ranking',
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
    })
    expect(byId.get('members-gamification-ranking')?.transforms).toBeDefined()
    expect(byId.get('members-admin-gamification-ranking')?.transforms).toBeDefined()
  })

  test('restauração de entrega tem rota explícita e auditada; review não usa wildcard', () => {
    const byId = new Map(realConfig.routes.map((route) => [route.id, route]))
    const review = byId.get('members-admin-studio-submissions-write')
    const restore = byId.get('members-admin-studio-submissions-restore')

    expect(review?.pathPattern).toBe('/members/admin/studio-submissions/:blockId/:userId/review')
    expect(restore).toMatchObject({
      methods: ['POST'],
      pathPattern: '/members/admin/studio-submissions/:blockId/:userId/restore-previous',
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      audit: {},
    })
  })

  test('runtime público é restrito ao BFF assinado, com cota por publicação e corpo limitado', () => {
    expect(
      realConfig.routes.find((route) => route.id === 'members-studio-public-runtime'),
    ).toMatchObject({
      methods: ['POST'],
      pathPattern: '/members/internal/studio/public-runtime',
      auth: { required: true, strategies: ['hmac'], allowedConsumers: ['member-shell'] },
      maxBodyBytes: 2_000_000,
      rateLimit: { max: 120, windowMs: 60_000, by: 'json-field', field: 'context.playId' },
    })
  })

  test('cover reconciliation is a signed member-shell route, separate from public play', () => {
    const registry = new RouteRegistry(
      realConfig.routes.map((route) => routeConfigSchema.parse(route)),
    )
    expect(registry.resolve('GET', '/hub/internal/studio-cover/123', 'v1')?.route).toMatchObject({
      id: 'hub-studio-cover-reference',
      service: 'hub',
      auth: { required: true, strategies: ['hmac'], allowedConsumers: ['member-shell'] },
      rateLimit: { max: 300, windowMs: 60_000, by: 'principal' },
    })
    expect(registry.resolve('POST', '/hub/internal/studio-cover/123', 'v1')).toBeUndefined()
    expect(
      registry.resolve('POST', '/hub/internal/studio-artifact-cleanups/drain', 'v1')?.route,
    ).toMatchObject({
      id: 'hub-studio-artifact-cleanups-drain',
      service: 'hub',
      auth: { required: true, strategies: ['hmac'], allowedConsumers: ['member-shell'] },
    })
    expect(
      registry.resolve('GET', '/hub/internal/studio-artifact-cleanups/drain', 'v1'),
    ).toBeUndefined()
    expect(
      registry.resolve('POST', '/hub/internal/studio-reservation-cleanups/drain', 'v1')?.route,
    ).toMatchObject({
      id: 'hub-studio-reservation-cleanups-drain',
      service: 'hub',
      auth: { required: true, strategies: ['hmac'], allowedConsumers: ['member-shell'] },
    })
    expect(
      registry.resolve('GET', '/hub/internal/studio-reservation-cleanups/drain', 'v1'),
    ).toBeUndefined()
    expect(registry.resolve('GET', '/hub/internal/studio-play/123', 'v1')?.route.auth).toBe(
      'public',
    )
  })

  test('análise Python usa sessão ativa e cota independente da execução', () => {
    const analysis = realConfig.routes.find(
      (route) => route.id === 'members-studio-python-analysis',
    )
    const execution = realConfig.routes.find((route) => route.id === 'members-studio-free-runtime')
    expect(analysis).toMatchObject({
      methods: ['POST'],
      pathPattern: '/members/studio/python-analysis',
      auth: { required: true, strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      maxBodyBytes: 2_000_000,
      rateLimit: { max: 600, windowMs: 60_000, by: 'principal' },
    })
    expect(analysis?.transforms).toEqual(execution?.transforms)
    expect(execution?.rateLimit).toEqual({ max: 120, windowMs: 60_000, by: 'principal' })
  })

  test('runtime livre exige sessão ativa, transporte interno e candidato limitado sem wildcard', () => {
    for (const [id, path, methods] of [
      ['members-studio-free-options', '/members/studio/free-options', ['GET']],
      ['members-studio-free-runtime', '/members/studio/free-runtime', ['POST']],
    ] as const) {
      const route = realConfig.routes.find((candidate) => candidate.id === id)
      expect(route).toMatchObject({
        pathPattern: path,
        methods,
        authorize: { statuses: ['active'] },
      })
      expect(route?.auth).not.toBe('public')
      expect(route?.transforms).toBeDefined()
      expect(route?.rateLimit).toBeDefined()
      if (id === 'members-studio-free-runtime') expect(route?.maxBodyBytes).toBe(2_000_000)
    }
  })

  test('autoria Python exige equipe ativa e transporte interno com candidato limitado', () => {
    const route = realConfig.routes.find(
      (candidate) => candidate.id === 'members-admin-studio-authoring-runtime',
    )
    expect(route).toMatchObject({
      methods: ['POST'],
      pathPattern: '/members/admin/studio/authoring-runtime',
      authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
      maxBodyBytes: 2_000_000,
    })
    expect(route?.auth).not.toBe('public')
    expect(route?.transforms).toBeDefined()
  })

  test('persistência gerada pelo BFF do Zappy exige HMAC; demais rotas preservam JWT', () => {
    const byId = new Map(realConfig.routes.map((route) => [route.id, route]))
    type RouteMethod = (typeof realConfig.routes)[number]['methods'][number]
    const expected = new Map<string, RouteMethod[]>([
      ['members-zappy-history', ['GET', 'DELETE']],
      ['members-internal-zappy-questions', ['POST']],
      ['members-internal-zappy-response', ['PUT']],
      ['members-zappy-feedback', ['POST']],
      ['members-zappy-knowledge-search', ['POST']],
      ['members-admin-zappy-metrics', ['GET']],
    ])

    for (const [id, methods] of expected) {
      const route = byId.get(id)
      expect(route?.methods, id).toEqual(methods)
      expect(route?.auth).not.toBe('public')
    }
    expect(byId.get('members-internal-zappy-questions')?.auth).toMatchObject({
      strategies: ['hmac'],
    })
    expect(byId.get('members-internal-zappy-response')?.auth).toMatchObject({
      strategies: ['hmac'],
    })
    expect(byId.has('members-zappy-questions')).toBe(false)
    expect(byId.has('members-zappy-response')).toBe(false)
  })

  test('rate limit HMAC do Zappy é isolado pelo ator autenticado no corpo', () => {
    const byId = new Map(realConfig.routes.map((route) => [route.id, route]))

    for (const id of ['members-internal-zappy-questions', 'members-internal-zappy-response']) {
      expect(byId.get(id)?.rateLimit).toMatchObject({
        by: 'json-field',
        field: 'actor.userId',
      })
    }
  })

  test('registro de download obrigatório só aceita o BFF autenticado por HMAC', () => {
    const route = realConfig.routes.find(
      (candidate) => candidate.id === 'members-internal-material-downloads',
    )
    expect(route).toMatchObject({
      methods: ['POST'],
      pathPattern: '/members/internal/material-downloads',
      auth: { required: true, strategies: ['hmac'], allowedConsumers: ['member-shell'] },
      rateLimit: { by: 'json-field', field: 'actor.userId' },
    })
  })

  test('backfill usa lotes suficientes para não esgotar o limite com bases pequenas', () => {
    const route = realConfig.routes.find(
      (candidate) => candidate.id === 'members-admin-zappy-knowledge-backfill',
    )

    expect(route?.rateLimit?.max).toBeGreaterThanOrEqual(60)
  })

  test('reserva das criações aceita o corpo com miniatura + até 128 partes (≥ 64 KB); commit idem', () => {
    const byId = new Map(realConfig.routes.map((route) => [route.id, route]))
    // Miniatura (12 k chars) + 128 × `{hash: <64 hex>, bytes: n}` (~90 bytes cada) ≈ 24 KB:
    // 32 KB deixava margem pequena; 64 KB é o teto "json pequeno" do gateway.
    expect(byId.get('members-creations-upload')?.maxBodyBytes).toBeGreaterThanOrEqual(64 * 1024)
    // `uploadedParts` com 128 hashes (~9 KB) cabe no commit.
    expect(byId.get('members-creations-commit')?.maxBodyBytes).toBeGreaterThanOrEqual(16 * 1024)
  })
})
