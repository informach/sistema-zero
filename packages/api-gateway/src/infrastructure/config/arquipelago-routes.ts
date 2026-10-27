import type { GatewayConfigInput } from './gateway-config.schema'

type Route = NonNullable<GatewayConfigInput['routes']>[number]
type Service = GatewayConfigInput['services'][string]

/**
 * Arquipélago Vagalume (@sistemazero/arquipelago-api): o jogo fala com o próprio serviço, sem
 * passar por nenhum serviço da plataforma. Só entra na config quando `ARQUIPELAGO_URL` existe
 * (rollout de infraestrutura à parte), então o gateway de quem ainda não tem o serviço segue
 * idêntico. Quem é a pessoa vem do JWT (x-auth-* injetados); o serviço exige o token interno.
 * O escopo do Kids (`kidsMayAccess`) libera `/arquipelago/*` ao aluno e só o limite da família
 * ao responsável.
 */
export function arquipelagoGateway(opts: {
  url: string
  transforms: Route['transforms']
  resilience: Omit<Service, 'name' | 'upstreamGroups'>
}): { service: Service; routes: Route[] } {
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
        pathPattern: '/arquipelago/tempo',
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
      {
        ...jogador,
        id: 'arquipelago-familia-limite',
        methods: ['GET', 'PUT'],
        pathPattern: '/arquipelago/familia/limite',
        maxBodyBytes: 1024,
        rateLimit: { max: 60, windowMs: 60_000, by: 'principal' },
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
