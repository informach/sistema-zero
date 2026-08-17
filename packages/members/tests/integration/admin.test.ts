import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'
import type { EntitlementStatus } from '../../src/domain/entitlement/entitlement.status'
import type { InMemoryEntitlementRepository } from '../fakes/in-memory'
import { buildApp, offerWithCourse, seedSampleCourse } from '../helpers'

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const C = '33333333-3333-3333-3333-333333333333'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const adminHeaders = { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' }

const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const send = (
  app: App,
  path: string,
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )

/** Semeia uma matrícula com status explícito (controla grantedAt p/ a ordenação). */
function seedEnt(
  entitlements: InMemoryEntitlementRepository,
  opts: {
    userId: string
    courseRef: string
    status?: EntitlementStatus
    grantedAt?: Date
    expiresAt?: Date | null
  },
): EntitlementAggregate {
  const now = opts.grantedAt ?? new Date('2026-06-01T00:00:00.000Z')
  const productId = randomUUID()
  const e = EntitlementAggregate.grant({
    id: randomUUID(),
    userId: opts.userId,
    productId,
    productKind: 'course',
    accessType: 'course',
    courseRef: opts.courseRef,
    offerId: null,
    snapshot: {
      offerId: '',
      offerSlug: '',
      productId,
      sku: '',
      name: 'Curso',
      kind: 'course',
      accessType: 'course',
      courseRef: opts.courseRef,
      fulfillment: { accessType: 'course', courseRef: opts.courseRef },
      resolvedAt: now.toISOString(),
    },
    sourceKind: 'manual',
    sourceId: `seed-${productId}`,
    subscriptionId: null,
    grantedAt: now,
    expiresAt: opts.expiresAt ?? null,
    idempotencyKey: `seed:${productId}`,
  })
  if (opts.status === 'revoked') e.revoke(new Date(now.getTime() + 1000))
  if (opts.status === 'expired') e.expire(new Date(now.getTime() + 1000))
  entitlements.seed(e)
  return e
}

describe('Members HTTP — admin: listagem de membros', () => {
  function seedThree() {
    const built = buildApp()
    const { entitlements } = built
    // A: 1 ativa + 1 revogada (curso-x), grant mais recente
    seedEnt(entitlements, {
      userId: A,
      courseRef: 'curso-x',
      status: 'active',
      grantedAt: new Date('2026-06-03T00:00:00.000Z'),
    })
    seedEnt(entitlements, {
      userId: A,
      courseRef: 'curso-y',
      status: 'revoked',
      grantedAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    // B: 1 ativa (curso-x), grant intermediário
    seedEnt(entitlements, {
      userId: B,
      courseRef: 'curso-x',
      status: 'active',
      grantedAt: new Date('2026-06-02T00:00:00.000Z'),
    })
    // C: 1 expirada (curso-y), grant mais antigo
    seedEnt(entitlements, {
      userId: C,
      courseRef: 'curso-y',
      status: 'expired',
      grantedAt: new Date('2026-05-01T00:00:00.000Z'),
    })
    return built
  }

  test('lista membros distintos com sumário; total = nº de membros (não de matrículas)', async () => {
    const { app } = seedThree()
    const res = await get(app, '/members/admin/members')
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.total).toBe(3) // 3 membros, ainda que A tenha 2 matrículas
    expect(body.items).toHaveLength(3)
    // Ordenado por último grant desc: A (06-03), B (06-02), C (05-01).
    expect(body.items.map((m: { userId: string }) => m.userId)).toEqual([A, B, C])
    const a = body.items[0]
    expect(a).toMatchObject({ userId: A, totalCount: 2, activeCount: 1 })
    expect([...a.courseRefs].sort()).toEqual(['curso-x', 'curso-y'])
  })

  test('filtro status=active mantém só membros com ≥1 matrícula ativa', async () => {
    const { app } = seedThree()
    const body = await readJson(await get(app, '/members/admin/members?status=active'))
    expect(body.total).toBe(2)
    expect(body.items.map((m: { userId: string }) => m.userId).sort()).toEqual([A, B])
  })

  test('filtro courseRef mantém só membros com aquele curso', async () => {
    const { app } = seedThree()
    const body = await readJson(await get(app, '/members/admin/members?courseRef=curso-y'))
    expect(body.items.map((m: { userId: string }) => m.userId).sort()).toEqual([A, C])
  })

  test('paginação: limit=1 devolve 1 item mas total é o nº de grupos', async () => {
    const { app } = seedThree()
    const body = await readJson(await get(app, '/members/admin/members?limit=1&offset=0'))
    expect(body.items).toHaveLength(1)
    expect(body.total).toBe(3)
    expect(body.items[0].userId).toBe(A)
  })

  test('detalhe do membro traz matrículas (todos status) + progresso por curso', async () => {
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses, 'curso-x')
    seedEnt(entitlements, { userId: A, courseRef: course.slug, status: 'active' })
    seedEnt(entitlements, { userId: A, courseRef: course.slug, status: 'revoked' })

    const body = await readJson(await get(app, `/members/admin/members/${A}`))
    expect(body.userId).toBe(A)
    expect(body.entitlements).toHaveLength(2)
    expect(body.entitlements.map((e: { status: string }) => e.status).sort()).toEqual([
      'active',
      'revoked',
    ])
    const prog = body.progress.find((p: { courseRef: string }) => p.courseRef === course.slug)
    expect(prog).toMatchObject({ totalLessons: 2, completedLessons: 0, percent: 0 })
  })

  test('⭐ matrícula com validade VENCIDA vem `active` na coluna, mas activeNow=false', async () => {
    // É o estado exato do incidente de 08/2026: a renovação não chegou, a validade
    // passou, e a coluna continua 'active' porque só cancelamento/varredura a mudam.
    // Sem o `activeNow`, o painel pintava "Ativo" de verde sobre acesso cortado.
    const { app, courses, entitlements } = buildApp()
    const course = seedSampleCourse(courses, 'curso-x')
    seedEnt(entitlements, {
      userId: A,
      courseRef: course.slug,
      status: 'active',
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    seedEnt(entitlements, { userId: A, courseRef: course.slug, status: 'active' }) // vitalícia

    const body = await readJson(await get(app, `/members/admin/members/${A}`))
    const vencida = body.entitlements.find((e: { expiresAt: string | null }) => e.expiresAt)
    const vitalicia = body.entitlements.find((e: { expiresAt: string | null }) => !e.expiresAt)
    expect(vencida.status).toBe('active')
    expect(vencida.activeNow).toBe(false)
    expect(vitalicia.activeNow).toBe(true)
  })
})

describe('Members HTTP — admin: concessão manual', () => {
  test('por curso: concede; re-conceder ATIVA é idempotente; após revogar → 409', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses, 'curso-x')

    const r1 = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'course',
      userId: A,
      courseRef: course.slug,
    })
    expect(r1.status).toBe(201)
    const b1 = await readJson(r1)
    expect(b1.granted).toHaveLength(1)
    expect(b1.granted[0]).toMatchObject({
      accessType: 'course',
      courseRef: course.slug,
      status: 'active',
    })
    const id = b1.granted[0].id

    // Re-conceder a mesma (ativa) → idempotente, devolve a existente.
    const r2 = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'course',
      userId: A,
      courseRef: course.slug,
    })
    expect(r2.status).toBe(201)
    expect((await readJson(r2)).granted[0].id).toBe(id)

    // Revoga e tenta conceder de novo → 409 (use estender p/ reativar).
    await send(app, `/members/admin/entitlements/${id}`, 'PATCH', { action: 'revoke' })
    const r3 = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'course',
      userId: A,
      courseRef: course.slug,
    })
    expect(r3.status).toBe(409)
    expect((await readJson(r3)).error.code).toBe('ENTITLEMENT_CONFLICT')
  })

  test('por oferta: resolve no catálogo e congela o snapshot', async () => {
    const { app, courses, catalog } = buildApp()
    const course = seedSampleCourse(courses, 'curso-x')
    catalog.set('oferta-x', offerWithCourse('oferta-x', course.slug))

    const res = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'offer',
      userId: A,
      offerRef: 'oferta-x',
    })
    expect(res.status).toBe(201)
    const body = await readJson(res)
    expect(body.granted).toHaveLength(1)
    expect(body.granted[0]).toMatchObject({ courseRef: course.slug, sourceKind: 'manual' })
  })

  test('por curso: matrícula active vencida não é tratada como idempotente', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses, 'curso-vencido')
    const body = {
      mode: 'course',
      userId: A,
      courseRef: course.slug,
      expiresAt: '2026-01-01T00:00:00.000Z',
    }

    const first = await send(app, '/members/admin/entitlements', 'POST', body)
    expect(first.status).toBe(201)

    const replay = await send(app, '/members/admin/entitlements', 'POST', body)
    expect(replay.status).toBe(409)
    expect((await readJson(replay)).error.code).toBe('ENTITLEMENT_CONFLICT')
  })

  test('por oferta multi-item: conflito em um item não concede os anteriores', async () => {
    const { app, courses, catalog, entitlements } = buildApp()
    const courseA = seedSampleCourse(courses, 'curso-a')
    const courseB = seedSampleCourse(courses, 'curso-b')
    const offerId = randomUUID()
    const productA = randomUUID()
    const productB = randomUUID()
    catalog.set('combo-x', {
      offerId,
      offerSlug: 'combo-x',
      items: [
        {
          productId: productA,
          sku: 'curso-a',
          name: 'Curso A',
          kind: 'course',
          isPrimary: true,
          fulfillment: { accessType: 'course', courseRef: courseA.slug },
        },
        {
          productId: productB,
          sku: 'curso-b',
          name: 'Curso B',
          kind: 'course',
          isPrimary: false,
          fulfillment: { accessType: 'course', courseRef: courseB.slug },
        },
      ],
    })
    const existing = EntitlementAggregate.grant({
      id: randomUUID(),
      userId: A,
      productId: productB,
      productKind: 'course',
      accessType: 'course',
      courseRef: courseB.slug,
      offerId,
      snapshot: {
        offerId,
        offerSlug: 'combo-x',
        productId: productB,
        sku: 'curso-b',
        name: 'Curso B',
        kind: 'course',
        accessType: 'course',
        courseRef: courseB.slug,
        fulfillment: { accessType: 'course', courseRef: courseB.slug },
        resolvedAt: '2026-01-01T00:00:00.000Z',
      },
      sourceKind: 'manual',
      sourceId: 'manual',
      subscriptionId: null,
      grantedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: null,
      idempotencyKey: `manual:${A}:${productB}`,
    })
    existing.revoke(new Date('2026-01-02T00:00:00.000Z'))
    entitlements.seed(existing)

    const res = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'offer',
      userId: A,
      offerRef: 'combo-x',
    })
    expect(res.status).toBe(409)

    const persisted = await entitlements.listByUserId(A)
    expect(persisted).toHaveLength(1)
    expect(persisted[0]?.courseRef).toBe(courseB.slug)
    expect(persisted[0]?.status).toBe('revoked')
  })

  test('por oferta inexistente → 404 OFFER_NOT_FOUND', async () => {
    const { app } = buildApp()
    const res = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'offer',
      userId: A,
      offerRef: 'nao-existe',
    })
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('OFFER_NOT_FOUND')
  })
})

describe('Members HTTP — admin: gestão de matrícula', () => {
  async function grantOne(app: App, courseRef: string, expiresAt?: string) {
    const r = await send(app, '/members/admin/entitlements', 'POST', {
      mode: 'course',
      userId: A,
      courseRef,
      expiresAt: expiresAt ?? null,
    })
    return (await readJson(r)).granted[0]
  }

  test('revogar/expirar mudam o status', async () => {
    const { app, courses, hubCalls } = buildApp()
    const course = seedSampleCourse(courses, 'curso-x')
    const ent = await grantOne(app, course.slug)

    const revoked = await send(app, `/members/admin/entitlements/${ent.id}`, 'PATCH', {
      action: 'revoke',
    })
    expect(revoked.status).toBe(200)
    expect((await readJson(revoked)).status).toBe('revoked')
    expect(hubCalls).toContainEqual({ userId: A, event: 'revoke' })
  })

  test('estender exige expiresAt → 400 sem ele; com ele move a validade', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses, 'curso-x')
    const ent = await grantOne(app, course.slug, '2026-07-01T00:00:00.000Z')

    const bad = await send(app, `/members/admin/entitlements/${ent.id}`, 'PATCH', {
      action: 'extend',
    })
    expect(bad.status).toBe(400)

    const ok = await send(app, `/members/admin/entitlements/${ent.id}`, 'PATCH', {
      action: 'extend',
      expiresAt: '2027-01-01T00:00:00.000Z',
    })
    expect(ok.status).toBe(200)
    expect((await readJson(ok)).expiresAt).toBe('2027-01-01T00:00:00.000Z')
  })

  test('estender com validade no PASSADO → 400 (não no-op silencioso que ainda responde 200)', async () => {
    const { app, courses } = buildApp() // clock 2026-06-02
    const course = seedSampleCourse(courses, 'curso-x')
    const ent = await grantOne(app, course.slug, '2026-07-01T00:00:00.000Z')

    const res = await send(app, `/members/admin/entitlements/${ent.id}`, 'PATCH', {
      action: 'extend',
      expiresAt: '2026-01-01T00:00:00.000Z', // passado (clock = 2026-06)
    })
    expect(res.status).toBe(400)
  })

  test('id inexistente → 404 ENTITLEMENT_NOT_FOUND', async () => {
    const { app } = buildApp()
    const res = await send(app, `/members/admin/entitlements/${randomUUID()}`, 'PATCH', {
      action: 'revoke',
    })
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('ENTITLEMENT_NOT_FOUND')
  })

  test('estender uma REVOGADA reativa (caminho documentado de recuperação)', async () => {
    const { app, courses } = buildApp()
    const course = seedSampleCourse(courses, 'curso-x')
    const ent = await grantOne(app, course.slug)

    await send(app, `/members/admin/entitlements/${ent.id}`, 'PATCH', { action: 'revoke' })

    // Antes era um no-op silencioso (extendTo nunca toca revoked) — o fluxo
    // "revogada? use estender" do grant manual ficava quebrado.
    const res = await send(app, `/members/admin/entitlements/${ent.id}`, 'PATCH', {
      action: 'extend',
      expiresAt: '2027-01-01T00:00:00.000Z',
    })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.status).toBe('active')
    expect(body.expiresAt).toBe('2027-01-01T00:00:00.000Z')
    expect(body.revokedAt).toBeNull()
  })
})

describe('Members HTTP — admin: RBAC (defesa em profundidade)', () => {
  test('com requireAdmin: sem role → 401; role insuficiente → 403; admin → 200', async () => {
    const { app } = buildApp({ requireAdmin: true })
    expect((await get(app, '/members/admin/members')).status).toBe(401)
    expect(
      (await get(app, '/members/admin/members', { 'x-auth-user-role': 'customer' })).status,
    ).toBe(403)
    expect((await get(app, '/members/admin/members', adminHeaders)).status).toBe(200)
  })

  test('token interno também nas rotas admin: ausente/errado → 401; correto → 200', async () => {
    const TOKEN = 'token-interno-gateway-0123456789'
    const { app } = buildApp({ internalToken: TOKEN, requireAdmin: true })
    // Headers de admin forjados NÃO bastam sem o token do gateway — é o que
    // impede um processo na rede interna de virar admin chamando direto.
    expect((await get(app, '/members/admin/members', adminHeaders)).status).toBe(401)
    expect(
      (await get(app, '/members/admin/members', { ...adminHeaders, 'x-internal-token': 'errado' }))
        .status,
    ).toBe(401)
    expect(
      (await get(app, '/members/admin/members', { ...adminHeaders, 'x-internal-token': TOKEN }))
        .status,
    ).toBe(200)
  })
})
