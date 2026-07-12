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
  r({ id: 'my-subscriptions', methods: ['GET'], pathPattern: '/payments/my/subscriptions' }),
  r({
    id: 'my-subscription-cancel',
    methods: ['DELETE'],
    pathPattern: '/payments/my/subscriptions/:id',
  }),
  // Assinaturas do funil (checkout recorrente): literal próprio, fora de /payments.
  r({ id: 'subscriptions-create', methods: ['POST'], pathPattern: '/subscriptions' }),
  r({ id: 'wild', methods: ['GET'], pathPattern: '/files/*' }),
  r({ id: 'members-courses', methods: ['GET'], pathPattern: '/members/courses' }),
  r({ id: 'members-course-detail', methods: ['GET'], pathPattern: '/members/courses/:slug' }),
  r({ id: 'gamification-me', methods: ['GET'], pathPattern: '/members/gamification/me' }),
  r({ id: 'avatar-get', methods: ['GET'], pathPattern: '/members/avatar' }),
  r({ id: 'avatar-equip', methods: ['PUT'], pathPattern: '/members/avatar' }),
  r({ id: 'avatar-buy', methods: ['POST'], pathPattern: '/members/avatar/parts/:partId/buy' }),
  r({ id: 'avatars-batch', methods: ['GET'], pathPattern: '/members/avatars' }),
  // Quota de IA por conta: consume do aluno (3 seg) + leitura admin (3 seg).
  r({ id: 'ai-usage-consume', methods: ['POST'], pathPattern: '/members/ai-usage/consume' }),
  r({ id: 'ai-usage-admin', methods: ['GET'], pathPattern: '/members/admin/ai-usage' }),
  r({ id: 'members-access', methods: ['GET'], pathPattern: '/members/access' }),
  r({ id: 'hub-thread-get', methods: ['GET'], pathPattern: '/hub/threads/:id' }),
  r({ id: 'hub-my-threads', methods: ['GET'], pathPattern: '/hub/my-threads' }),
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
  r({ id: 'user-delete', methods: ['DELETE'], pathPattern: '/auth/admin/users/:id' }),
  r({
    id: 'user-impersonate',
    methods: ['POST'],
    pathPattern: '/auth/admin/users/:id/impersonate',
  }),
  // Purga de usuário (exclusão em cascata): members explícito + hub explícito ganha
  // do wildcard `/hub/admin/*` por especificidade.
  r({
    id: 'members-member-detail',
    methods: ['GET'],
    pathPattern: '/members/admin/members/:userId',
  }),
  r({ id: 'members-purge', methods: ['DELETE'], pathPattern: '/members/admin/users/:id/data' }),
  r({ id: 'hub-admin-write', methods: ['POST', 'PATCH', 'DELETE'], pathPattern: '/hub/admin/*' }),
  r({ id: 'hub-purge', methods: ['DELETE'], pathPattern: '/hub/admin/users/:id/data' }),
  // Recados (professor↔aluno): rotas do aluno (literais + :id) e wildcards do admin.
  r({ id: 'tt-list', methods: ['GET'], pathPattern: '/members/teacher-threads' }),
  r({ id: 'tt-unread', methods: ['GET'], pathPattern: '/members/teacher-threads/unread-count' }),
  r({ id: 'tt-get', methods: ['GET'], pathPattern: '/members/teacher-threads/:id' }),
  r({ id: 'tt-reply', methods: ['POST'], pathPattern: '/members/teacher-threads/:id/messages' }),
  r({ id: 'tt-read', methods: ['POST'], pathPattern: '/members/teacher-threads/:id/read' }),
  r({ id: 'tt-admin-read', methods: ['GET'], pathPattern: '/members/admin/teacher-threads/*' }),
  r({ id: 'tt-admin-write', methods: ['POST'], pathPattern: '/members/admin/teacher-threads/*' }),
  // Desafio do mês (Sala do Professor): wildcards read/write no literal `challenge`.
  r({ id: 'challenge-admin-read', methods: ['GET'], pathPattern: '/members/admin/challenge/*' }),
  r({
    id: 'challenge-admin-write',
    methods: ['PUT', 'POST', 'PATCH', 'DELETE'],
    pathPattern: '/members/admin/challenge/*',
  }),
  // Fila global de entregas (literal 3 seg) + wildcard da autoria p/ provar a não-colisão.
  r({
    id: 'studio-subs-global',
    methods: ['GET'],
    pathPattern: '/members/admin/studio-submissions',
  }),
  r({
    id: 'members-admin-courses-read',
    methods: ['GET'],
    pathPattern: '/members/admin/courses/*',
  }),
  // Pensa (planejamento guiado) — literal `pensa` no 2º segmento.
  r({ id: 'pensa-projects', methods: ['GET', 'POST'], pathPattern: '/members/pensa/projects' }),
  r({
    id: 'pensa-project',
    methods: ['GET', 'PATCH'],
    pathPattern: '/members/pensa/projects/:projectId',
  }),
  r({
    id: 'pensa-cycle-create',
    methods: ['POST'],
    pathPattern: '/members/pensa/projects/:projectId/cycles',
  }),
  r({
    id: 'pensa-studio-snapshot',
    methods: ['GET', 'PUT'],
    pathPattern: '/members/pensa/projects/:projectId/studio-snapshot',
  }),
  r({
    id: 'pensa-stage',
    methods: ['GET'],
    pathPattern: '/members/pensa/cycles/:cycleId/stages/:stage',
  }),
  r({
    id: 'pensa-conversation',
    methods: ['PUT'],
    pathPattern: '/members/pensa/cycles/:cycleId/stages/:stage/conversation',
  }),
  r({
    id: 'pensa-advance',
    methods: ['POST'],
    pathPattern: '/members/pensa/cycles/:cycleId/advance',
  }),
  r({
    id: 'pensa-tasks-replace',
    methods: ['PUT', 'POST'],
    pathPattern: '/members/pensa/cycles/:cycleId/tasks',
  }),
  r({
    id: 'pensa-task-update',
    methods: ['PATCH', 'DELETE'],
    pathPattern: '/members/pensa/tasks/:taskId',
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

  test('/payments/my/subscriptions (literal) VENCE /payments/my/:id (param)', () => {
    // "Minhas assinaturas": sem a precedência, a lista cairia no detalhe de
    // compra com id "subscriptions" (400 de uuid no serviço).
    expect(registry.resolve('GET', '/payments/my/subscriptions', 'v1')?.route.id).toBe(
      'my-subscriptions',
    )
    const cancel = registry.resolve('DELETE', '/payments/my/subscriptions/sub-1', 'v1')
    expect(cancel?.route.id).toBe('my-subscription-cancel')
    expect(cancel?.params.id).toBe('sub-1')
    // O GET de detalhe de compra segue funcionando.
    expect(registry.resolve('GET', '/payments/my/abc-999', 'v1')?.route.id).toBe('my-get')
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

  test('POST /subscriptions (checkout recorrente) resolve na própria rota', () => {
    expect(registry.resolve('POST', '/subscriptions', 'v1')?.route.id).toBe('subscriptions-create')
    // Só o POST é exposto; GET/DELETE de assinatura do consumer não existem na borda.
    expect(registry.resolve('GET', '/subscriptions', 'v1')).toBeUndefined()
    expect(registry.resolve('DELETE', '/subscriptions/abc', 'v1')).toBeUndefined()
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

  test('exclusão de usuário: DELETE distingue do GET pelo método; purgas resolvem certo', () => {
    // DELETE /auth/admin/users/:id (mesmo path do GET) cai no delete, não no get.
    expect(registry.resolve('DELETE', '/auth/admin/users/u-1', 'v1')?.route.id).toBe('user-delete')
    expect(registry.resolve('GET', '/auth/admin/users/u-1', 'v1')?.route.id).toBe('user-get')
    // Purga em members: 5 segmentos, não colide com /members/admin/members/:userId.
    expect(registry.resolve('DELETE', '/members/admin/users/u-1/data', 'v1')?.route.id).toBe(
      'members-purge',
    )
    // Purga em hub: rota EXPLÍCITA vence o wildcard /hub/admin/* por especificidade.
    const hubPurge = registry.resolve('DELETE', '/hub/admin/users/u-1/data', 'v1')
    expect(hubPurge?.route.id).toBe('hub-purge')
    expect(hubPurge?.params.id).toBe('u-1')
    // Outro DELETE admin do hub (não-users) segue caindo no wildcard.
    expect(registry.resolve('DELETE', '/hub/admin/channels/c-1', 'v1')?.route.id).toBe(
      'hub-admin-write',
    )
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

  test('/members/avatars (lote, com "s") é literal distinto de /members/avatar', () => {
    expect(registry.resolve('GET', '/members/avatars', 'v1')?.route.id).toBe('avatars-batch')
    // "avatars" ≠ "avatar": o lote nunca é confundido com o get do próprio avatar.
    expect(registry.resolve('GET', '/members/avatar', 'v1')?.route.id).toBe('avatar-get')
  })

  test('quota de IA: /members/ai-usage/consume e /members/admin/ai-usage resolvem certo', () => {
    expect(registry.resolve('POST', '/members/ai-usage/consume', 'v1')?.route.id).toBe(
      'ai-usage-consume',
    )
    // Literal `ai-usage` não colide com `/members/access` nem `/members/avatar*`.
    expect(registry.resolve('GET', '/members/access', 'v1')?.route.id).toBe('members-access')
    // A leitura admin (3 seg) não cai em /members/admin/members/:userId.
    expect(registry.resolve('GET', '/members/admin/ai-usage', 'v1')?.route.id).toBe(
      'ai-usage-admin',
    )
    expect(registry.resolve('GET', '/members/admin/members/u-1', 'v1')?.route.id).toBe(
      'members-member-detail',
    )
    // Métodos não declarados não são expostos.
    expect(registry.resolve('GET', '/members/ai-usage/consume', 'v1')).toBeUndefined()
    expect(registry.resolve('POST', '/members/admin/ai-usage', 'v1')).toBeUndefined()
  })

  test('/hub/my-threads (literal) não colide com /hub/threads/:id', () => {
    expect(registry.resolve('GET', '/hub/my-threads', 'v1')?.route.id).toBe('hub-my-threads')
    const t = registry.resolve('GET', '/hub/threads/abc-123', 'v1')
    expect(t?.route.id).toBe('hub-thread-get')
    expect(t?.params.id).toBe('abc-123')
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

  test('recados do aluno: literal unread-count vence :id; reply/read por sufixo', () => {
    expect(registry.resolve('GET', '/members/teacher-threads', 'v1')?.route.id).toBe('tt-list')
    expect(registry.resolve('GET', '/members/teacher-threads/unread-count', 'v1')?.route.id).toBe(
      'tt-unread',
    )
    const get = registry.resolve('GET', '/members/teacher-threads/th-1', 'v1')
    expect(get?.route.id).toBe('tt-get')
    expect(get?.params.id).toBe('th-1')
    expect(registry.resolve('POST', '/members/teacher-threads/th-1/messages', 'v1')?.route.id).toBe(
      'tt-reply',
    )
    expect(registry.resolve('POST', '/members/teacher-threads/th-1/read', 'v1')?.route.id).toBe(
      'tt-read',
    )
  })

  test('recados do professor: wildcard cobre lista/by-context/:id sem colidir com members-admin', () => {
    // Cauda vazia: o wildcard casa o próprio /teacher-threads (lista + criação).
    expect(registry.resolve('GET', '/members/admin/teacher-threads', 'v1')?.route.id).toBe(
      'tt-admin-read',
    )
    expect(registry.resolve('POST', '/members/admin/teacher-threads', 'v1')?.route.id).toBe(
      'tt-admin-write',
    )
    expect(
      registry.resolve('GET', '/members/admin/teacher-threads/by-context', 'v1')?.route.id,
    ).toBe('tt-admin-read')
    expect(
      registry.resolve('POST', '/members/admin/teacher-threads/th-1/messages', 'v1')?.route.id,
    ).toBe('tt-admin-write')
    // Não rouba a ficha do aluno (/members/admin/members/:userId).
    expect(registry.resolve('GET', '/members/admin/members/u-1', 'v1')?.route.id).toBe(
      'members-member-detail',
    )
  })

  test('desafio do mês: wildcard cobre months/themes sem colidir com a ficha do aluno', () => {
    expect(registry.resolve('GET', '/members/admin/challenge/months', 'v1')?.route.id).toBe(
      'challenge-admin-read',
    )
    expect(registry.resolve('PUT', '/members/admin/challenge/months/2026-08', 'v1')?.route.id).toBe(
      'challenge-admin-write',
    )
    expect(
      registry.resolve('DELETE', '/members/admin/challenge/months/2026-08', 'v1')?.route.id,
    ).toBe('challenge-admin-write')
    expect(registry.resolve('POST', '/members/admin/challenge/themes', 'v1')?.route.id).toBe(
      'challenge-admin-write',
    )
    expect(registry.resolve('PATCH', '/members/admin/challenge/themes/t-1', 'v1')?.route.id).toBe(
      'challenge-admin-write',
    )
    // A ficha do aluno segue no param dela.
    expect(registry.resolve('GET', '/members/admin/members/u-1', 'v1')?.route.id).toBe(
      'members-member-detail',
    )
  })

  test('fila global de entregas: literal vence e não colide com autoria/ficha', () => {
    expect(registry.resolve('GET', '/members/admin/studio-submissions', 'v1')?.route.id).toBe(
      'studio-subs-global',
    )
    // A autoria segue no wildcard e a ficha do aluno no param.
    expect(registry.resolve('GET', '/members/admin/courses/c-1', 'v1')?.route.id).toBe(
      'members-admin-courses-read',
    )
    expect(registry.resolve('GET', '/members/admin/members/u-1', 'v1')?.route.id).toBe(
      'members-member-detail',
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

  test('pensa: rotas por nº de segmentos/método; não colidem entre si nem com cursos', () => {
    expect(registry.resolve('GET', '/members/pensa/projects', 'v1')?.route.id).toBe(
      'pensa-projects',
    )
    expect(registry.resolve('POST', '/members/pensa/projects', 'v1')?.route.id).toBe(
      'pensa-projects',
    )
    const detail = registry.resolve('PATCH', '/members/pensa/projects/p-1', 'v1')
    expect(detail?.route.id).toBe('pensa-project')
    expect(detail?.params.projectId).toBe('p-1')
    // 5 segmentos (cycles/snapshot) não caem no detalhe de 4; literais distintos não colidem.
    expect(registry.resolve('POST', '/members/pensa/projects/p-1/cycles', 'v1')?.route.id).toBe(
      'pensa-cycle-create',
    )
    expect(
      registry.resolve('GET', '/members/pensa/projects/p-1/studio-snapshot', 'v1')?.route.id,
    ).toBe('pensa-studio-snapshot')
    expect(
      registry.resolve('PUT', '/members/pensa/projects/p-1/studio-snapshot', 'v1')?.route.id,
    ).toBe('pensa-studio-snapshot')
    // Stage (5 seg, GET) ≠ conversation (6 seg, PUT).
    const stage = registry.resolve('GET', '/members/pensa/cycles/c-1/stages/z', 'v1')
    expect(stage?.route.id).toBe('pensa-stage')
    expect(stage?.params.stage).toBe('z')
    expect(
      registry.resolve('PUT', '/members/pensa/cycles/c-1/stages/z/conversation', 'v1')?.route.id,
    ).toBe('pensa-conversation')
    expect(registry.resolve('POST', '/members/pensa/cycles/c-1/advance', 'v1')?.route.id).toBe(
      'pensa-advance',
    )
    expect(registry.resolve('PATCH', '/members/pensa/tasks/t-1', 'v1')?.route.id).toBe(
      'pensa-task-update',
    )
    // Autoria manual: POST /cycles/:id/tasks (append) e DELETE /tasks/:id (apagar).
    expect(registry.resolve('POST', '/members/pensa/cycles/c-1/tasks', 'v1')?.route.id).toBe(
      'pensa-tasks-replace',
    )
    expect(registry.resolve('PUT', '/members/pensa/cycles/c-1/tasks', 'v1')?.route.id).toBe(
      'pensa-tasks-replace',
    )
    expect(registry.resolve('DELETE', '/members/pensa/tasks/t-1', 'v1')?.route.id).toBe(
      'pensa-task-update',
    )
    // Literal `pensa` nunca cai em /members/courses/:slug.
    expect(registry.resolve('GET', '/members/courses/pensa', 'v1')?.route.id).toBe(
      'members-course-detail',
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
