import type { GatewayConfigInput } from './gateway-config.schema'

type Route = NonNullable<GatewayConfigInput['routes']>[number]
type Service = GatewayConfigInput['services'][string]

/**
 * Arquipélago Vagalume (@sistemazero/arquipelago-api): o jogo fala com o próprio serviço, sem
 * passar por nenhum serviço da plataforma. Só entra na config quando `ARQUIPELAGO_URL` existe
 * (rollout de infraestrutura à parte), então o gateway de quem ainda não tem o serviço segue
 * idêntico. Quem é a pessoa vem do JWT (x-auth-* injetados); o serviço exige o token interno.
 * O escopo do Kids (`kidsMayAccess`) libera `/arquipelago/*` ao aluno e só a família (limite,
 * permissões e a leitura da semana) ao responsável.
 */
export function arquipelagoGateway(opts: {
  url: string
  transforms: Route['transforms']
  resilience: Omit<Service, 'name' | 'upstreamGroups'>
}): { service: Service; routes: Route[] } {
  const leituraDaEquipe = {
    service: 'arquipelago',
    auth: { required: true, mode: 'any', strategies: ['jwt'] },
    authorize: { roles: ['superadmin', 'admin', 'staff'], statuses: ['active'] },
    transforms: opts.transforms,
    rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
  } satisfies Partial<Route>
  const escritaDaEquipe = {
    ...leituraDaEquipe,
    authorize: { roles: ['superadmin', 'admin'], statuses: ['active'] },
    // Dois projetos do Estúdio (inicial e gabarito) e o resto do desafio.
    maxBodyBytes: 4 * 1024 * 1024,
    audit: {},
    rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
  } satisfies Partial<Route>
  const jogador = {
    service: 'arquipelago',
    auth: { required: true, mode: 'any', strategies: ['jwt'] },
    authorize: { statuses: ['active'] },
    transforms: opts.transforms,
  } satisfies Partial<Route>
  return {
    service: {
      name: 'arquipelago',
      upstreamGroups: { default: [{ url: opts.url, healthCheckPath: '/healthz' }] },
      ...opts.resilience,
      // Sem nova tentativa: um PUT do salvamento que gravou mas perdeu a resposta, repetido com a
      // mesma revisão, voltaria 409 e o jogo diria "salvo em outro aparelho" sem ser.
      retry: { maxRetries: 0, baseDelayMs: 50, maxDelayMs: 1_000 },
    },
    routes: [
      ...[
        '/arquipelago/minijogos',
        '/arquipelago/minijogos/:id',
        '/arquipelago/familia/minijogos/:perfil',
        '/arquipelago/familia/minijogos/:perfil/:id',
      ].map((pathPattern, i) => ({
        ...jogador,
        id: `arquipelago-minijogos-${i}`,
        methods: ['GET'] as ['GET'],
        pathPattern,
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' as const },
      })),
      {
        ...leituraDaEquipe,
        id: 'arquipelago-equipe-medicao',
        methods: ['GET'],
        pathPattern: '/arquipelago/equipe/medicao',
        rateLimit: { max: 12, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-acesso',
        methods: ['GET'],
        pathPattern: '/arquipelago/acesso',
        rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-salvamento-get',
        methods: ['GET'],
        pathPattern: '/arquipelago/salvamento',
        rateLimit: { max: 120, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-salvamento-put',
        methods: ['PUT'],
        pathPattern: '/arquipelago/salvamento',
        // Salvamento de até 64 KB mais a revisão.
        maxBodyBytes: 96 * 1024,
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-tempo',
        methods: ['POST'],
        pathPattern: '/arquipelago/tempo/recuperar',
        maxBodyBytes: 1024,
        rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-tempo-sessao',
        methods: ['POST'],
        pathPattern: '/arquipelago/tempo/sessao',
        maxBodyBytes: 1024,
        rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-cartas',
        methods: ['GET'],
        pathPattern: '/arquipelago/cartas',
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      // A galeria (29/10/2026): ler o que ela comprou e o saldo, e comprar uma aparência. Comprar
      // gasta moedas pelo Members: corpo pequeno e um ritmo de quem toca num botão.
      // Recordes da família e visitas (fase3-12): só leitura, de quem joga. Fora de
      // `/arquipelago/familia/` (a área dos pais); o serviço confere a conta e a permissão.
      {
        ...jogador,
        id: 'arquipelago-irmaos',
        methods: ['GET'],
        pathPattern: '/arquipelago/irmaos',
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-irmao-casa',
        methods: ['GET'],
        pathPattern: '/arquipelago/irmaos/:perfilId/casa',
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-galeria',
        methods: ['GET'],
        pathPattern: '/arquipelago/galeria',
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-galeria-compras',
        methods: ['POST'],
        pathPattern: '/arquipelago/galeria/compras',
        maxBodyBytes: 1024,
        rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
      },
      // Desafios de quem joga (o serviço decide se estão ligados: ARQUIPELAGO_DESAFIOS). Conferir
      // leva o projeto do Estúdio e roda o jogo no executor pelo Members: corpo e prazo das aulas.
      {
        ...jogador,
        id: 'arquipelago-desafios',
        methods: ['GET'],
        pathPattern: '/arquipelago/desafios',
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-desafio-abrir',
        methods: ['GET'],
        pathPattern: '/arquipelago/desafios/:id',
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-desafio-verificar',
        methods: ['POST'],
        pathPattern: '/arquipelago/desafios/:id/verificar',
        maxBodyBytes: 4 * 1024 * 1024,
        timeoutMs: 165_000,
        rateLimit: { max: 10, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-desafio-recompensa-vista',
        methods: ['POST'],
        pathPattern: '/arquipelago/desafios/:id/recompensa-vista',
        maxBodyBytes: 1024,
        rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-familia-limite',
        methods: ['GET', 'PUT'],
        pathPattern: '/arquipelago/familia/limite',
        maxBodyBytes: 1024,
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      // A área dos pais (28/10/2026): a semana das crianças e as permissões de visita.
      {
        ...jogador,
        id: 'arquipelago-familia-semana',
        methods: ['GET'],
        pathPattern: '/arquipelago/familia/semana',
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      {
        ...jogador,
        id: 'arquipelago-familia-permissoes',
        methods: ['GET', 'PUT'],
        pathPattern: '/arquipelago/familia/permissoes',
        maxBodyBytes: 1024,
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
      },
      // Seção Jogo do Admin: leitura para a equipe, escrita só para a administração. Rotas
      // explícitas (nenhum curinga transforma staff em quem publica). Analisar e publicar rodam o
      // jogo no executor pelo Members: prazo longo, como o "Testar agora" das aulas.
      {
        ...leituraDaEquipe,
        id: 'arquipelago-admin-desafios-ler',
        methods: ['GET'],
        pathPattern: '/arquipelago/admin/desafios',
      },
      {
        ...leituraDaEquipe,
        id: 'arquipelago-admin-desafio-ler',
        methods: ['GET'],
        pathPattern: '/arquipelago/admin/desafios/:id',
      },
      {
        ...leituraDaEquipe,
        id: 'arquipelago-admin-cobertura',
        methods: ['GET'],
        pathPattern: '/arquipelago/admin/cobertura',
      },
      {
        ...leituraDaEquipe,
        id: 'arquipelago-admin-desafio-analisar',
        methods: ['POST'],
        pathPattern: '/arquipelago/admin/desafios/:id/analisar',
        maxBodyBytes: 1024,
        timeoutMs: 165_000,
        rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
      },
      {
        ...escritaDaEquipe,
        id: 'arquipelago-admin-desafio-criar',
        methods: ['POST'],
        pathPattern: '/arquipelago/admin/desafios',
        audit: { targetResponseField: 'resumo.id' },
      },
      {
        ...escritaDaEquipe,
        id: 'arquipelago-admin-desafio-gravar',
        methods: ['PUT'],
        pathPattern: '/arquipelago/admin/desafios/:id',
      },
      {
        ...escritaDaEquipe,
        id: 'arquipelago-admin-desafio-publicar',
        methods: ['POST'],
        pathPattern: '/arquipelago/admin/desafios/:id/publicar',
        maxBodyBytes: 1024,
        timeoutMs: 165_000,
        rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
      },
      ...(['arquivar', 'reativar'] as const).map<Route>((acao) => ({
        ...escritaDaEquipe,
        id: `arquipelago-admin-desafio-${acao}`,
        methods: ['POST'],
        pathPattern: `/arquipelago/admin/desafios/:id/${acao}`,
        maxBodyBytes: 1024,
      })),
      // Manifesto de desafios (28/10/2026): conferir é leitura (prévia, roda a análise), aplicar é
      // escrita. O Admin manda o pacote grande em lotes que cabem no corpo e no prazo.
      {
        ...leituraDaEquipe,
        id: 'arquipelago-admin-desafio-manifesto',
        methods: ['GET'],
        pathPattern: '/arquipelago/admin/desafios/:id/manifesto',
      },
      {
        ...leituraDaEquipe,
        id: 'arquipelago-admin-manifestos-exportar',
        methods: ['GET'],
        pathPattern: '/arquipelago/admin/manifestos/exportar',
        rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
      },
      {
        ...leituraDaEquipe,
        id: 'arquipelago-admin-manifestos-conferir',
        methods: ['POST'],
        pathPattern: '/arquipelago/admin/manifestos/conferir',
        maxBodyBytes: 4 * 1024 * 1024,
        timeoutMs: 165_000,
        rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
      },
      {
        ...escritaDaEquipe,
        id: 'arquipelago-admin-manifestos-aplicar',
        methods: ['POST'],
        pathPattern: '/arquipelago/admin/manifestos/aplicar',
        timeoutMs: 165_000,
        rateLimit: { max: 20, windowMs: 60_000, by: 'principal' },
      },
      // O cliente compilado (manifesto + arquivos com hash). Público como qualquer JS de página;
      // o member-shell o repassa na mesma origem do Kids.
      {
        id: 'arquipelago-cliente',
        methods: ['GET'],
        pathPattern: '/arquipelago/cliente/:arquivo',
        service: 'arquipelago',
        auth: 'public',
        transforms: opts.transforms,
        rateLimit: { max: 600, windowMs: 60_000, by: 'ip' },
      },
    ],
  }
}
