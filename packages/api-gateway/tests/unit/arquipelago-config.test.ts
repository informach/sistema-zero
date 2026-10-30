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
  test('convites adultos exigem JWT, não usam código na URL e têm corpo e frequência limitados', () => {
    const jogo = arquipelagoGateway({
      url: 'http://jogo.local',
      transforms,
      resilience: { timeoutMs: 15000 },
    })
    const r = jogo.routes.filter(
      (r) => r.id.startsWith('arquipelago-visita-adulta-') || r.id === 'arquipelago-convite-adulto',
    )
    expect(r).toHaveLength(3)
    for (const rota of r) {
      expect(rota.maxBodyBytes).toBe(1024)
      expect(rota.auth).toMatchObject({ required: true, strategies: ['jwt'] })
      expect(rota.rateLimit?.by).toBe('principal')
      expect(rota.pathPattern).not.toContain(':')
    }
    expect(r.find((r) => r.id === 'arquipelago-convite-adulto')?.methods).toEqual([
      'GET',
      'POST',
      'DELETE',
    ])
    expect(r.find((r) => r.id === 'arquipelago-visita-adulta-abrir')?.methods).toEqual(['POST'])
  })
  test('Mural próprio exige JWT ativo e limite por identidade', () => {
    expect(realConfig.routes.find((r) => r.id === 'hub-my-playable-showcase')).toMatchObject({
      methods: ['GET'],
      pathPattern: '/hub/my-playable-showcase',
      service: 'hub',
      auth: { required: true, strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    })
  })
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
    for (const acao of ['iniciar', 'concluir']) {
      expect(
        registry.resolve('POST', `/arquipelago/profissoes/${acao}`, 'v1')?.route,
      ).toMatchObject({
        auth: { strategies: ['jwt'] },
        authorize: { statuses: ['active'] },
        maxBodyBytes: 4096,
        rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
      })
      expect(registry.resolve('GET', `/arquipelago/profissoes/${acao}`, 'v1')).toBeUndefined()
    }
    const salvar = registry.resolve('PUT', '/arquipelago/salvamento', 'v1')?.route
    expect(registry.resolve('PUT', '/arquipelago/fantasmas', 'v1')?.route).toMatchObject({
      maxBodyBytes: 129 * 1024,
      auth: { strategies: ['jwt'] },
      rateLimit: { max: 12, windowMs: 60000, by: 'principal' },
    })
    expect(registry.resolve('GET', '/arquipelago/fantasmas/bosque-copas', 'v1')?.route.id).toBe(
      'arquipelago-fantasma-ler-0',
    )
    expect(
      registry.resolve(
        'GET',
        '/arquipelago/irmaos/11111111-1111-4111-8111-111111111111/fantasmas/bosque-copas',
        'v1',
      )?.route.id,
    ).toBe('arquipelago-fantasma-ler-1')
    expect(registry.resolve('POST', '/arquipelago/fantasmas', 'v1')).toBeUndefined()
    expect(registry.resolve('POST', '/arquipelago/insumos/comprar', 'v1')?.route).toMatchObject({
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      maxBodyBytes: 1024,
      rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
    })
    expect(registry.resolve('GET', '/arquipelago/insumos/pendente', 'v1')?.route.id).toBe(
      'arquipelago-insumos-pendente',
    )
    expect(registry.resolve('GET', '/arquipelago/insumos/comprar', 'v1')).toBeUndefined()
    expect(registry.resolve('POST', '/arquipelago/pedidos/entregar', 'v1')?.route).toMatchObject({
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      maxBodyBytes: 1024,
      rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
    })
    expect(registry.resolve('GET', '/arquipelago/pedidos/pendentes', 'v1')?.route.id).toBe(
      'arquipelago-pedidos-pendentes',
    )
    expect(registry.resolve('GET', '/arquipelago/pedidos/entregar', 'v1')).toBeUndefined()
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
    expect(registry.resolve('POST', '/arquipelago/tempo/recuperar', 'v1')?.route.id).toBe(
      'arquipelago-tempo',
    )
    expect(registry.resolve('POST', '/arquipelago/tempo/sessao', 'v1')?.route).toMatchObject({
      id: 'arquipelago-tempo-sessao',
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      maxBodyBytes: 1024,
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    })
    expect(registry.resolve('GET', '/arquipelago/cartas', 'v1')?.route.id).toBe(
      'arquipelago-cartas',
    )
    // Desafios de quem joga: o literal `desafios` e o `:id`; conferir com corpo e prazo das aulas.
    expect(registry.resolve('GET', '/arquipelago/desafios/cores', 'v1')?.route).toMatchObject({
      id: 'arquipelago-cores-conquistadas',
      auth: { strategies: ['jwt'] },
      authorize: { statuses: ['active'] },
      rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
    })
    expect(registry.resolve('POST', '/arquipelago/desafios/cores', 'v1')).toBeUndefined()
    const desafio = '22222222-2222-4222-8222-222222222222'
    expect(registry.resolve('GET', '/arquipelago/desafios', 'v1')?.route.id).toBe(
      'arquipelago-desafios',
    )
    expect(registry.resolve('GET', `/arquipelago/desafios/${desafio}`, 'v1')?.route.id).toBe(
      'arquipelago-desafio-abrir',
    )
    expect(
      registry.resolve('POST', `/arquipelago/desafios/${desafio}/verificar`, 'v1')?.route,
    ).toMatchObject({
      id: 'arquipelago-desafio-verificar',
      authorize: { statuses: ['active'] },
      maxBodyBytes: 4 * 1024 * 1024,
      timeoutMs: 165_000,
      rateLimit: { max: 10 },
    })
    expect(
      registry.resolve('POST', `/arquipelago/desafios/${desafio}/recompensa-vista`, 'v1')?.route.id,
    ).toBe('arquipelago-desafio-recompensa-vista')
    expect(registry.resolve('DELETE', `/arquipelago/desafios/${desafio}`, 'v1')).toBeUndefined()
    expect(registry.resolve('PUT', '/arquipelago/familia/limite', 'v1')?.route.id).toBe(
      'arquipelago-familia-limite',
    )
    expect(registry.resolve('GET', '/arquipelago/galeria', 'v1')?.route.id).toBe(
      'arquipelago-galeria',
    )
    expect(registry.resolve('POST', '/arquipelago/galeria/compras', 'v1')?.route).toMatchObject({
      id: 'arquipelago-galeria-compras',
      maxBodyBytes: 1024,
    })
    expect(registry.resolve('GET', '/arquipelago/galeria/compras', 'v1')).toBeUndefined()
    // Recordes da família e visitas (fase3-12): só leitura, fora de /familia/.
    expect(registry.resolve('GET', '/arquipelago/irmaos', 'v1')?.route.id).toBe(
      'arquipelago-irmaos',
    )
    expect(registry.resolve('GET', `/arquipelago/irmaos/${desafio}/casa`, 'v1')?.route.id).toBe(
      'arquipelago-irmao-casa',
    )
    expect(registry.resolve('POST', '/arquipelago/irmaos', 'v1')).toBeUndefined()
    expect(registry.resolve('PUT', `/arquipelago/irmaos/${desafio}/casa`, 'v1')).toBeUndefined()
    expect(registry.resolve('GET', '/arquipelago/familia/semana', 'v1')?.route.id).toBe(
      'arquipelago-familia-semana',
    )
    expect(registry.resolve('PUT', '/arquipelago/familia/semana', 'v1')).toBeUndefined()
    for (const metodo of ['GET', 'PUT']) {
      expect(
        registry.resolve(metodo, '/arquipelago/familia/permissoes', 'v1')?.route,
      ).toMatchObject({
        id: 'arquipelago-familia-permissoes',
        maxBodyBytes: 1024,
      })
    }
    expect(
      registry.resolve('GET', '/arquipelago/cliente/manifesto.json', 'v1')?.route,
    ).toMatchObject({
      id: 'arquipelago-cliente',
      auth: 'public',
    })
    expect(registry.resolve('DELETE', '/arquipelago/salvamento', 'v1')).toBeUndefined()
    // Seção Jogo do Admin: rotas explícitas, leitura para a equipe e escrita para a administração.
    const id = '11111111-1111-4111-8111-111111111111'
    const ler = registry.resolve('GET', `/arquipelago/admin/desafios/${id}`, 'v1')?.route
    expect(ler).toMatchObject({
      id: 'arquipelago-admin-desafio-ler',
      authorize: { roles: ['superadmin', 'admin', 'staff'] },
    })
    const publicar = registry.resolve('POST', `/arquipelago/admin/desafios/${id}/publicar`, 'v1')
    expect(publicar?.route).toMatchObject({
      id: 'arquipelago-admin-desafio-publicar',
      authorize: { roles: ['superadmin', 'admin'] },
      timeoutMs: 165_000,
      audit: {},
    })
    expect(registry.resolve('POST', '/arquipelago/admin/desafios', 'v1')?.route).toMatchObject({
      id: 'arquipelago-admin-desafio-criar',
      maxBodyBytes: 4 * 1024 * 1024,
      authorize: { roles: ['superadmin', 'admin'] },
    })
    expect(registry.resolve('PUT', `/arquipelago/admin/desafios/${id}`, 'v1')?.route.id).toBe(
      'arquipelago-admin-desafio-gravar',
    )
    expect(
      registry.resolve('POST', `/arquipelago/admin/desafios/${id}/analisar`, 'v1')?.route,
    ).toMatchObject({ authorize: { roles: ['superadmin', 'admin', 'staff'] } })
    // Manifesto: staff confere e exporta; aplicar é só da administração.
    expect(
      registry.resolve('POST', '/arquipelago/admin/manifestos/conferir', 'v1')?.route,
    ).toMatchObject({ authorize: { roles: ['superadmin', 'admin', 'staff'] } })
    expect(
      registry.resolve('POST', '/arquipelago/admin/manifestos/aplicar', 'v1')?.route,
    ).toMatchObject({
      id: 'arquipelago-admin-manifestos-aplicar',
      authorize: { roles: ['superadmin', 'admin'] },
      maxBodyBytes: 4 * 1024 * 1024,
    })
    expect(
      registry.resolve('GET', `/arquipelago/admin/desafios/${id}/manifesto`, 'v1')?.route.id,
    ).toBe('arquipelago-admin-desafio-manifesto')
    expect(registry.resolve('GET', '/arquipelago/admin/manifestos/exportar', 'v1')?.route.id).toBe(
      'arquipelago-admin-manifestos-exportar',
    )
    expect(registry.resolve('DELETE', `/arquipelago/admin/desafios/${id}`, 'v1')).toBeUndefined()
  })
})
